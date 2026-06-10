'use strict';

const express = require('express');
const catalogController = require('./catalog.controller');

const router = express.Router();

router.get('/', catalogController.getCategories);

module.exports = router;
