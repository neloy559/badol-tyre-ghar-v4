'use strict';

const express    = require('express');
const controller = require('./orders.controller');

const router = express.Router();

// Admin routes (protect + restrictTo applied at aggregator)
router.get('/',                              controller.getOrders);
router.get('/:id',                           controller.getOrderById);
router.post('/from-inquiry/:inquiryId',      controller.createFromInquiry);
router.patch('/:id',                         controller.updateOrder);
router.get('/dealer/:dealerId',              controller.getDealerOrders);
router.get('/dealer/:dealerId/stats',        controller.getOrderStats);

module.exports = router;
