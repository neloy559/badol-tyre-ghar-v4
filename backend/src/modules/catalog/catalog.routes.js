'use strict';

const express = require('express');
const catalogController = require('./catalog.controller');
const { optionalAuth } = require('../../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, catalogController.getProducts);
router.get('/:slug', optionalAuth, catalogController.getProductBySlug);

module.exports = router;
