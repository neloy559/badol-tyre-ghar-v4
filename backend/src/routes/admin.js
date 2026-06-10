'use strict';

const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const catalogAdminRoutes = require('../modules/catalog/catalog.admin.routes');
router.use('/catalog', restrictTo('admin', 'editor'), catalogAdminRoutes);

const campaignRoutes = require('../modules/catalog/campaign.routes');
router.use('/campaigns', restrictTo('admin'), campaignRoutes);

const mediaRoutes = require('../modules/media/media.routes');
router.use('/media', restrictTo('admin', 'editor'), mediaRoutes);

const notificationRoutes = require('../modules/notifications/notifications.routes');
router.use('/notifications', restrictTo('admin'), notificationRoutes);

const inquiryAdminRoutes = require('../modules/catalog/inquiry.admin.routes');
router.use('/inquiries', restrictTo('admin'), inquiryAdminRoutes);

const siteConfigAdminRoutes = require('../modules/siteConfig/siteConfig.admin.routes');
router.use('/site-config', restrictTo('admin'), siteConfigAdminRoutes);

const usersRoutes = require('../modules/users/users.routes');
router.use('/', restrictTo('admin', 'editor'), usersRoutes);

const ordersRoutes = require('../modules/orders/orders.routes');
router.use('/orders', restrictTo('admin', 'editor'), ordersRoutes);

module.exports = router;
