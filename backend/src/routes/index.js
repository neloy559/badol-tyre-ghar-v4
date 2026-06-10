'use strict';

const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// -- Mounted Modules
const authRoutes = require('../modules/auth/auth.routes');
const catalogRoutes = require('../modules/catalog/catalog.routes');
const categoriesRoutes = require('../modules/catalog/categories.routes');
const brandsRoutes = require('../modules/catalog/brands.routes');
const inquiryRoutes = require('../modules/catalog/inquiry.routes');
const siteConfigRoutes = require('../modules/siteConfig/siteConfig.routes');
const ordersService = require('../modules/orders/orders.service');
const sendResponse  = require('../utils/sendResponse');

router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/categories', categoriesRoutes);
router.use('/brands', brandsRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/site-config', siteConfigRoutes);

// Dealer: view own orders + stats (requires login)
router.get('/my/orders', protect, async (req, res) => {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await ordersService.getDealerOrders(req.user.userId, page, limit);
    return sendResponse(res, 200, true, 'Orders fetched.', result.orders, {
      page: result.page, limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (err) {
    return sendResponse(res, err.statusCode || 500, false, err.message, null);
  }
});

router.get('/my/orders/stats', protect, async (req, res) => {
  try {
    const stats = await ordersService.getOrderStats(req.user.userId);
    return sendResponse(res, 200, true, 'Stats fetched.', stats);
  } catch (err) {
    return sendResponse(res, err.statusCode || 500, false, err.message, null);
  }
});

// Ping
router.get('/ping', (req, res) => {
  res.status(200).json({ success: true, message: 'pong', data: null });
});

module.exports = router;
