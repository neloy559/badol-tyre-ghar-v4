'use strict';

const express = require('express');
const { restrictTo } = require('../../middleware/auth');
const usersController = require('./users.controller');

const router = express.Router();

// Read access — admin and editor
router.get('/dealers',                  usersController.getDealers);
router.get('/dealers/:id',              usersController.getDealerById);
router.get('/registrations/count',      usersController.getPendingCount);
router.get('/analytics/summary',        usersController.getAnalyticsSummary);

// Write access — admin ONLY (business-critical mutations)
router.patch('/dealers/:id/approve',    restrictTo('admin'), usersController.approveDealer);
router.patch('/dealers/:id/reject',     restrictTo('admin'), usersController.rejectDealer);
router.patch('/dealers/:id/tier',       restrictTo('admin'), usersController.changeTier);
router.patch('/dealers/:id/status',     restrictTo('admin'), usersController.softDeleteDealer);

module.exports = router;
