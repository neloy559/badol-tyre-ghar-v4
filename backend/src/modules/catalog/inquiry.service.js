'use strict';

const Inquiry = require('./Inquiry.model');
const Product = require('./Product.model');
const { createNotificationForAllAdmins } = require('../notifications/notifications.service');
const { createOrderFromInquiry } = require('../orders/orders.service');

/**
 * buildWhatsappMessage — formats inquiry items into a WhatsApp message.
 * Populates product names to build a human-readable message.
 *
 * @param {Array} items - [{ productId, variantSku, quantity }]
 * @returns {Promise<string>}
 */
async function buildWhatsappMessage(items) {
  let message = 'BTG Inquiry:\n\n';

  for (const item of items) {
    const product = await Product.findById(item.productId)
      .select('name')
      .maxTimeMS(5000) // Security: Query timeout
      .lean();
    const productName = product ? product.name : 'Unknown Product';
    const sku = item.variantSku || 'N/A';
    const quantity = item.quantity || 1;

    message += `${quantity}x ${productName} (SKU: ${sku})\n`;
  }

  return message;
}

/**
 * createInquiry — creates a new inquiry from customer/guest.
 * Fires a notification to all admins (fire-and-forget).
 *
 * @param {object} params
 * @param {object|null} params.user - req.user object (null for guests)
 * @param {Array} params.items - [{ productId, variantSku, quantity }]
 * @returns {Promise<object>}
 * @throws {statusCode: 400} if items array is empty or invalid
 */
async function createInquiry({ user, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { statusCode: 400, message: 'Inquiry must contain at least one item.' };
  }

  // Validate each item
  for (const item of items) {
    if (!item.productId) {
      throw { statusCode: 400, message: 'Each item must have a productId.' };
    }
    if (!item.variantSku) {
      throw { statusCode: 400, message: 'Each item must have a variantSku.' };
    }
    if (item.quantity && item.quantity < 1) {
      throw { statusCode: 400, message: 'Item quantity must be at least 1.' };
    }
  }

  // Build WhatsApp message
  const whatsappMessage = await buildWhatsappMessage(items);

  // Create inquiry
  const inquiry = await Inquiry.create({
    user: user?._id || null,
    items,
    whatsappMessage,
  });

  // Fire-and-forget notification to all admins
  createNotificationForAllAdmins({
    type: 'new_inquiry',
    title: 'New Inquiry Received',
    message: `A new inquiry with ${items.length} item(s) has been submitted.`,
    link: `/admin/inquiries/${inquiry._id}`,
  }).catch((err) => {
    console.warn('[inquiry] Failed to send notification to admins:', err.message);
  });

  return inquiry;
}

/**
 * getInquiries — retrieves inquiries with optional filtering.
 *
 * @param {object} filters - { status?: string }
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {Promise<object>} { inquiries, total }
 */
async function getInquiries(filters = {}, page = 1, limit = 20) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  const skip = (page - 1) * limit;

  const inquiries = await Inquiry.find(query)
    .populate('user', 'name phone email')
    .populate('items.productId', 'name sku')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000) // Security: Query timeout prevents slow query DoS
    .lean();

  const total = await Inquiry.countDocuments(query);

  return { inquiries, total };
}

/**
 * updateInquiryStatus — updates inquiry status with validation.
 * Valid transitions: inquired → replied → converted
 *
 * @param {string} id - Inquiry ObjectId
 * @param {string} status - New status
 * @param {string} adminId - Admin ObjectId (for audit)
 * @returns {Promise<object>}
 * @throws {statusCode: 404} if inquiry not found
 * @throws {statusCode: 400} if status transition is invalid
 */
async function updateInquiryStatus(id, status, adminId) {
  const inquiry = await Inquiry.findById(id)
    .maxTimeMS(5000); // Security: Query timeout

  if (!inquiry) {
    throw { statusCode: 404, message: 'Inquiry not found.' };
  }

  const validStatuses = ['inquired', 'replied', 'converted'];

  if (!validStatuses.includes(status)) {
    throw { statusCode: 400, message: 'Invalid status value.' };
  }

  // Validate status transition
  const currentStatus = inquiry.status;

  if (currentStatus === 'inquired' && status === 'converted') {
    throw {
      statusCode: 400,
      message: 'Cannot move from "inquired" to "converted" without "replied" status.',
    };
  }

  if (currentStatus === 'replied' && status === 'inquired') {
    throw {
      statusCode: 400,
      message: 'Cannot move from "replied" back to "inquired".',
    };
  }

  if (currentStatus === 'converted') {
    throw {
      statusCode: 400,
      message: 'Cannot change status of a converted inquiry.',
    };
  }

  inquiry.status = status;
  await inquiry.save();

  // When an inquiry is converted → auto-create an Order record (fire-and-forget)
  if (status === 'converted') {
    createOrderFromInquiry(inquiry._id.toString())
      .catch(err => console.warn('[inquiry] Auto order creation failed:', err.message));
  }

  return inquiry;
}

/**
 * addInquiryNote — adds or updates an admin note on an inquiry.
 *
 * @param {string} id - Inquiry ObjectId
 * @param {string} adminNote - Note content
 * @param {string} adminId - Admin ObjectId (for audit)
 * @returns {Promise<object>}
 * @throws {statusCode: 404} if inquiry not found
 */
async function addInquiryNote(id, adminNote, adminId) {
  const inquiry = await Inquiry.findById(id)
    .maxTimeMS(5000); // Security: Query timeout

  if (!inquiry) {
    throw { statusCode: 404, message: 'Inquiry not found.' };
  }

  inquiry.adminNote = adminNote || '';
  await inquiry.save();

  return inquiry;
}

module.exports = {
  createInquiry,
  getInquiries,
  updateInquiryStatus,
  addInquiryNote,
};
