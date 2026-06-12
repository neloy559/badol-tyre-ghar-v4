'use strict';

const Order   = require('./Order.model');
const Inquiry = require('../catalog/Inquiry.model');
const Product = require('../catalog/Product.model');
const User    = require('../users/User.model');

/**
 * createOrderFromInquiry — converts an inquiry into an Order record.
 * Called when admin marks an inquiry as "converted".
 *
 * @param {string} inquiryId
 * @returns {Promise<object>} Created order
 */
async function createOrderFromInquiry(inquiryId) {
  // Guard: prevent duplicate orders for the same inquiry
  const existingOrder = await Order.findOne({ inquiryId }).maxTimeMS(5000).lean();
  if (existingOrder) {
    throw { statusCode: 409, message: 'An order already exists for this inquiry.' };
  }

  const inquiry = await Inquiry.findById(inquiryId)
    .populate('user', 'profile phone')
    .populate('items.productId', 'name variants')
    .maxTimeMS(5000)
    .lean();

  if (!inquiry) {
    throw { statusCode: 404, message: 'Inquiry not found.' };
  }

  // Build order items with snapshot prices
  const orderItems = [];
  let subtotal = 0;

  for (const item of inquiry.items || []) {
    const product = item.productId;
    if (!product) continue;

    const variant = (product.variants || []).find(v => v.sku === item.variantSku);
    const unitPrice  = variant?.wholesalePrice || 0;
    const totalPrice = unitPrice * (item.quantity || 1);
    subtotal += totalPrice;

    orderItems.push({
      productId:   product._id,
      productName: product.name,
      variantSku:  item.variantSku,
      quantity:    item.quantity || 1,
      unitPrice,
      totalPrice,
    });
  }

  const dealer      = inquiry.user;
  const dealerName  = dealer?.profile?.businessName || dealer?.profile?.name || '';
  const dealerPhone = dealer?.phone || '';

  const order = await Order.create({
    inquiryId:   inquiry._id,
    dealer:      dealer?._id || null,
    dealerName,
    dealerPhone,
    items:       orderItems,
    subtotal,
    grandTotal:  subtotal,
  });

  return order;
}

/**
 * getOrders — list orders with optional filters.
 */
async function getOrders(filters = {}, page = 1, limit = 20) {
  const query = { isDeleted: false };

  if (filters.status)        query.status        = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.dealerId)      query.dealer        = filters.dealerId;

  const skip  = (page - 1) * limit;
  const total = await Order.countDocuments(query).maxTimeMS(5000);

  const orders = await Order.find(query)
    .populate('dealer', 'profile phone')
    .populate('inquiryId', 'status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000)
    .lean();

  return { orders, total, page, limit };
}

/**
 * getOrderById
 */
async function getOrderById(id) {
  const order = await Order.findOne({ _id: id, isDeleted: false })
    .populate('dealer', 'profile phone')
    .populate('items.productId', 'name slug images')
    .maxTimeMS(5000)
    .lean();

  if (!order) throw { statusCode: 404, message: 'Order not found.' };
  return order;
}

/**
 * updateOrder — update status, payment info, admin note.
 */
async function updateOrder(id, data) {
  const allowed = ['status', 'paymentStatus', 'paymentMethod', 'amountPaid', 'discount', 'adminNote'];
  const update  = {};

  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  // Recompute grandTotal if discount changed
  if (update.discount !== undefined) {
    const order = await Order.findById(id).maxTimeMS(5000);
    if (order) update.grandTotal = Math.max(0, order.subtotal - update.discount);
  }

  const order = await Order.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: update },
    { new: true, runValidators: true }
  ).maxTimeMS(5000);

  if (!order) throw { statusCode: 404, message: 'Order not found.' };
  return order;
}

/**
 * getDealerOrders — orders for a specific dealer.
 * Security: requestingUser must be admin/editor OR the dealer themselves.
 */
async function getDealerOrders(dealerId, page = 1, limit = 20, requestingUser = null) {
  // Authorization: dealers can only see their own orders
  if (requestingUser && requestingUser.role !== 'admin' && requestingUser.role !== 'editor') {
    if (requestingUser.userId.toString() !== dealerId.toString()) {
      throw { statusCode: 403, message: 'Access denied.' };
    }
  }

  const cappedLimit = Math.min(limit, 50); // Security: cap results
  const query = { dealer: dealerId, isDeleted: false };
  const skip  = (page - 1) * cappedLimit;
  const total = await Order.countDocuments(query).maxTimeMS(5000);

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(cappedLimit)
    .maxTimeMS(5000)
    .lean();

  return { orders, total, page, limit: cappedLimit };
}

/**
 * getOrderStats — summary stats for a dealer (total orders, total spend, unpaid).
 * Security: requestingUser must be admin/editor OR the dealer themselves.
 */
async function getOrderStats(dealerId, requestingUser = null) {
  // Authorization: dealers can only see their own stats
  if (requestingUser && requestingUser.role !== 'admin' && requestingUser.role !== 'editor') {
    if (requestingUser.userId.toString() !== dealerId.toString()) {
      throw { statusCode: 403, message: 'Access denied.' };
    }
  }

  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(dealerId)) {
    throw { statusCode: 400, message: 'Invalid dealer ID.' };
  }

  const [totals] = await Order.aggregate([
    { $match: { dealer: new mongoose.Types.ObjectId(dealerId), isDeleted: false } },
    { $group: {
      _id: null,
      totalOrders:  { $sum: 1 },
      totalSpend:   { $sum: '$grandTotal' },
      totalPaid:    { $sum: '$amountPaid' },
      pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
    }},
  ]).option({ maxTimeMS: 5000 });

  return totals || { totalOrders: 0, totalSpend: 0, totalPaid: 0, pendingCount: 0 };
}

module.exports = {
  createOrderFromInquiry,
  getOrders,
  getOrderById,
  updateOrder,
  getDealerOrders,
  getOrderStats,
};
