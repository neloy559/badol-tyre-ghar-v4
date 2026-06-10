'use strict';

const express = require('express');
const siteConfigController = require('./siteConfig.controller');

const router = express.Router();

// Admin routes
router.get('/', siteConfigController.getSiteConfig);
router.patch('/', siteConfigController.updateSiteConfig);

module.exports = router;
