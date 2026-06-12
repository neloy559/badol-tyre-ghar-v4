'use strict';

const ordersService = require('./orders.service');
const sendResponse  = require('../../utils/sendResponse');
const { createAuditLog } = require('../../utils/auditLogger');
const { sanitizeInteger, isValidObjectId } = require('../../utils/validators');

function handleError(res, err) {
  const statusCode = err.statusCode || 500;
  const isDev      = process.env.NODE_ENV !== 'production';
  const message    = statusCode < 500 ? err.message : (isDev ? err.message : 'Internal server error.');
  return sendResponse(res, statusCode, false, message, null);
}

exports.getOrders = async (req, res) => {
  try {
    const page  = sanitizeInteger(req.query.page,  1);
    const limit = Math.min(sanitizeInteger(req.query.limit, 20), 100); // Security: cap at 100
    const result = await ordersService.getOrders(req.query, page, limit);
    return sendResponse(res, 200, true, 'Orders fetched.', result.orders, {
      page: result.page, limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (err) { return handleError(res, err); }
};

exports.getOrderById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendResponse(res, 400, false, 'Invalid order ID format.', null);
    }
    const order = await ordersService.getOrderById(req.params.id);
    return sendResponse(res, 200, true, 'Order fetched.', order);
  } catch (err) { return handleError(res, err); }
};

exports.createFromInquiry = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.inquiryId)) {
      return sendResponse(res, 400, false, 'Invalid inquiry ID format.', null);
    }
    const order = await ordersService.createOrderFromInquiry(req.params.inquiryId);
    await createAuditLog({
      adminId:  req.user.userId,
      action:   'ORDER_CREATE',
      targetId: order._id.toString(),
      details:  { inquiryId: req.params.inquiryId },
    });
    return sendResponse(res, 201, true, 'Order created from inquiry.', order);
  } catch (err) { return handleError(res, err); }
};

exports.updateOrder = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendResponse(res, 400, false, 'Invalid order ID format.', null);
    }
    // Security: validate discount is non-negative before service processes it
    if (req.body.discount !== undefined) {
      const discount = Number(req.body.discount);
      if (isNaN(discount) || discount < 0) {
        return sendResponse(res, 400, false, 'Discount must be a non-negative number.', null);
      }
      req.body.discount = discount;
    }
    const order = await ordersService.updateOrder(req.params.id, req.body);
    await createAuditLog({
      adminId:  req.user.userId,
      action:   'ORDER_UPDATE',
      targetId: req.params.id,
      details:  req.body,
    });
    return sendResponse(res, 200, true, 'Order updated.', order);
  } catch (err) { return handleError(res, err); }
};

exports.getDealerOrders = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.dealerId)) {
      return sendResponse(res, 400, false, 'Invalid dealer ID format.', null);
    }
    const page  = sanitizeInteger(req.query.page,  1);
    const limit = sanitizeInteger(req.query.limit, 20);
    const result = await ordersService.getDealerOrders(req.params.dealerId, page, limit, req.user);
    return sendResponse(res, 200, true, 'Dealer orders fetched.', result.orders, {
      page: result.page, limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (err) { return handleError(res, err); }
};

exports.getOrderStats = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.dealerId)) {
      return sendResponse(res, 400, false, 'Invalid dealer ID format.', null);
    }
    const stats = await ordersService.getOrderStats(req.params.dealerId, req.user);
    return sendResponse(res, 200, true, 'Order stats fetched.', stats);
  } catch (err) { return handleError(res, err); }
};
