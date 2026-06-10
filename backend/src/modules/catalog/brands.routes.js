'use strict';

const express = require('express');
const catalogController = require('./catalog.controller');

const router = express.Router();

router.get('/', catalogController.getBrands);

module.exports = router;
