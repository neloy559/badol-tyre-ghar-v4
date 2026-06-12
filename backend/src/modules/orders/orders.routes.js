'use strict';

const express    = require('express');
const controller = require('./orders.controller');

const router = express.Router();

// Admin routes (protect + restrictTo applied at aggregator)

// ── Static routes FIRST (must come before /:id) ───────────────────────
router.get('/dealer/:dealerId/stats',        controller.getOrderStats);
router.get('/dealer/:dealerId',              controller.getDealerOrders);
router.post('/from-inquiry/:inquiryId',      controller.createFromInquiry);

// ── Collection routes ─────────────────────────────────────────────────
router.get('/',                              controller.getOrders);

// ── Per-resource routes (/:id must come LAST) ─────────────────────────
router.get('/:id',                           controller.getOrderById);
router.patch('/:id',                         controller.updateOrder);

module.exports = router;
