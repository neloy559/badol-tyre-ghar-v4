'use strict';

const express = require('express');
const usersController = require('./users.controller');

const router = express.Router();

router.get('/dealers', usersController.getDealers);
router.get('/dealers/:id', usersController.getDealerById);
router.patch('/dealers/:id/approve', usersController.approveDealer);
router.patch('/dealers/:id/reject', usersController.rejectDealer);
router.patch('/dealers/:id/tier', usersController.changeTier);
router.patch('/dealers/:id/status', usersController.softDeleteDealer);
router.get('/registrations/count', usersController.getPendingCount);

// Analytics endpoint - accessible to admin and editor
router.get('/analytics/summary', usersController.getAnalyticsSummary);

module.exports = router;
