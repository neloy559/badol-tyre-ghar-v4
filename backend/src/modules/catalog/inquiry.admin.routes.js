'use strict';

const express = require('express');
const inquiryController = require('./inquiry.controller');

const router = express.Router();

// Admin-only endpoints
router.get('/', inquiryController.getInquiries);
router.patch('/:id/status', inquiryController.updateInquiryStatus);
router.patch('/:id/note', inquiryController.addInquiryNote);

module.exports = router;
