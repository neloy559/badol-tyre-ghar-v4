'use strict';

const usersService = require('./users.service');
const sendResponse = require('../../utils/sendResponse');
const User = require('./User.model');
const Product = require('../catalog/Product.model');
const AuditLog = require('../../utils/AuditLog.model');
const { validateInputTypes, validateQueryParams, sanitizeInteger } = require('../../utils/validators');

function handleError(res, err) {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  const message = statusCode < 500 ? err.message : (isDev ? err.message : 'Internal server error.');
  return sendResponse(res, statusCode, false, message, null);
}

exports.getDealers = async (req, res) => {
  try {
    // Input type validation for query parameters
    const validation = validateQueryParams(req.query, ['status', 'tier', 'search']);
    
    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    // Validate pagination
    const page = sanitizeInteger(req.query.page, 1);
    const limit = sanitizeInteger(req.query.limit, 20);
    
    if (page < 1 || limit < 1 || limit > 100) {
      return sendResponse(res, 400, false, 'Invalid pagination parameters', null);
    }

    const result = await usersService.getDealers(req.query);
    return sendResponse(res, 200, true, 'Dealers fetched.', result.dealers, {
      page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getDealerById = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { id } = req.params;
    if (typeof id !== 'string' || !id.trim()) {
      return sendResponse(res, 400, false, 'Invalid dealer ID', null);
    }

    const dealer = await usersService.getDealerById(req.params.id);
    return sendResponse(res, 200, true, 'Dealer fetched.', dealer);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.approveDealer = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { id } = req.params;
    if (typeof id !== 'string' || !id.trim()) {
      return sendResponse(res, 400, false, 'Invalid dealer ID', null);
    }

    const dealer = await usersService.approveDealer(req.params.id, req.user.userId);
    return sendResponse(res, 200, true, 'Dealer approved.', dealer);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.rejectDealer = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const validation = validateInputTypes({
      id: { value: id, type: 'string', required: true },
      rejectionReason: { value: rejectionReason, type: 'string', required: false },
    });

    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    const dealer = await usersService.rejectDealer(req.params.id, req.body.rejectionReason, req.user.userId);
    return sendResponse(res, 200, true, 'Dealer rejected.', dealer);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.changeTier = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { id } = req.params;
    const { tier } = req.body;
    
    const validation = validateInputTypes({
      id: { value: id, type: 'string', required: true },
      tier: { value: tier, type: 'string', required: true },
    });

    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    const dealer = await usersService.changeTier(req.params.id, req.body.tier, req.user.userId);
    return sendResponse(res, 200, true, 'Tier changed.', dealer);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.softDeleteDealer = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { id } = req.params;
    if (typeof id !== 'string' || !id.trim()) {
      return sendResponse(res, 400, false, 'Invalid dealer ID', null);
    }

    const dealer = await usersService.softDeleteDealer(req.params.id, req.user.userId);
    return sendResponse(res, 200, true, 'Dealer deleted.', dealer);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    const count = await usersService.getPendingCount();
    return sendResponse(res, 200, true, 'Pending count fetched.', { count });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalProducts, totalDealers, activeDealers, pendingRegistrations, productsByBrand, dealerRegistrationsRaw, topViewedProducts, recentActivity] = await Promise.all([
      Product.countDocuments({ isDeleted: false }),
      User.countDocuments({ role: 'dealer', isDeleted: false }),
      User.countDocuments({ role: 'dealer', registrationStatus: 'approved', isDeleted: false }),
      User.countDocuments({ role: 'dealer', registrationStatus: 'pending', isDeleted: false }),
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brand' } },
        { $unwind: '$brand' },
        { $project: { brand: '$brand.name', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).option({ maxTimeMS: 5000 }), // Security: Query timeout
      User.aggregate([
        { $match: { role: 'dealer', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]).option({ maxTimeMS: 5000 }), // Security: Query timeout
      Product.find({ isDeleted: false })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('name slug viewCount')
        .maxTimeMS(5000) // Security: Query timeout
        .lean(),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('adminId', 'profile.name')
        .maxTimeMS(5000) // Security: Query timeout
        .lean()
    ]);

    // Gap-fill dealer registrations for the last 30 days
    const dealerRegistrations = [];
    const registrationMap = {};
    dealerRegistrationsRaw.forEach(item => {
      registrationMap[item._id] = item.count;
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dealerRegistrations.push({
        date: dateStr,
        count: registrationMap[dateStr] || 0
      });
    }

    const summary = { totalProducts, totalDealers, activeDealers, pendingRegistrations, productsByBrand, dealerRegistrations, topViewedProducts, recentActivity };
    return sendResponse(res, 200, true, 'Analytics summary fetched.', summary);
  } catch (err) {
    return handleError(res, err);
  }
};