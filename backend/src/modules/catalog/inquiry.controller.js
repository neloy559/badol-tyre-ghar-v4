'use strict';

const inquiryService = require('./inquiry.service');
const sendResponse = require('../../utils/sendResponse');
const { createAuditLog } = require('../../utils/auditLogger');

/**
 * createInquiry — public endpoint (optionalAuth).
 * Allows guests and authenticated users to submit inquiries.
 */
exports.createInquiry = async (req, res) => {
  try {
    const inquiry = await inquiryService.createInquiry({
      user: req.user,
      items: req.body.items,
    });

    return sendResponse(res, 201, true, 'Inquiry submitted successfully.', inquiry);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * getInquiries — admin endpoint to retrieve inquiries.
 */
exports.getInquiries = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await inquiryService.getInquiries(filters, page, limit);

    const totalPages = Math.ceil(result.total / limit);

    const pagination = {
      page,
      limit,
      total: result.total,
      totalPages,
    };

    return sendResponse(res, 200, true, 'Inquiries fetched.', result.inquiries, pagination);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * updateInquiryStatus — admin endpoint to update inquiry status.
 */
exports.updateInquiryStatus = async (req, res) => {
  try {
    const inquiry = await inquiryService.updateInquiryStatus(
      req.params.id,
      req.body.status,
      req.user.userId
    );

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'INQUIRY_STATUS_UPDATE',
      targetId: inquiry._id.toString(),
      details: { newStatus: inquiry.status },
    }).catch((err) => {
      console.warn('[inquiry] Audit log failed:', err.message);
    });

    return sendResponse(res, 200, true, 'Inquiry status updated.', inquiry);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * addInquiryNote — admin endpoint to add/update inquiry note.
 */
exports.addInquiryNote = async (req, res) => {
  try {
    const inquiry = await inquiryService.addInquiryNote(
      req.params.id,
      req.body.adminNote,
      req.user.userId
    );

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'INQUIRY_NOTE_UPDATE',
      targetId: inquiry._id.toString(),
      details: { note: req.body.adminNote },
    }).catch((err) => {
      console.warn('[inquiry] Audit log failed:', err.message);
    });

    return sendResponse(res, 200, true, 'Inquiry note updated.', inquiry);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};
