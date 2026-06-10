'use strict';

const express = require('express');
const catalogController = require('./catalog.controller');

const router = express.Router();

// ── Static routes FIRST (must come before /:id) ──────────────────────
router.get('/search-logs',    catalogController.getSearchLogs);
router.get('/export/csv',     catalogController.exportCsv);
router.post('/bulk',          catalogController.bulkCreateProducts);
router.patch('/bulk-markup',  catalogController.bulkMarkup);

// ── Collection routes ─────────────────────────────────────────────────
router.get('/',   catalogController.getAdminProducts);
router.post('/',  catalogController.createProduct);

// ── Per-resource routes (/:id must come LAST) ─────────────────────────
router.get('/:id',                catalogController.getProductBySlug);
router.patch('/:id',              catalogController.updateProduct);
router.delete('/:id',             catalogController.softDeleteProduct);
router.patch('/:id/visibility',   catalogController.toggleVisibility);
router.patch('/:id/show-price',   catalogController.toggleShowPrice);

module.exports = router;
