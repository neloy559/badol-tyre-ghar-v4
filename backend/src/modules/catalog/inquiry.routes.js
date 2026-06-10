'use strict';

const express = require('express');
const { optionalAuth } = require('../../middleware/auth');
const inquiryController = require('./inquiry.controller');

const router = express.Router();

// Public endpoint — allows guest and authenticated submissions
router.post('/', optionalAuth, inquiryController.createInquiry);

module.exports = router;
