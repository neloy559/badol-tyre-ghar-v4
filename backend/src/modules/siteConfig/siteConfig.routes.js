'use strict';

const express = require('express');
const siteConfigController = require('./siteConfig.controller');

const router = express.Router();

// Public route
router.get('/', siteConfigController.getSiteConfig);

module.exports = router;
