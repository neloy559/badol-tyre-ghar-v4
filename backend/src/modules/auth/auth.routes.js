'use strict';

const express        = require('express');
const authController = require('./auth.controller');
const { protect }         = require('../../middleware/auth');
const { loginLimiter, registerLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', registerLimiter, authController.registerCustomer);

// POST /api/v1/auth/dealer/register
router.post('/dealer/register', registerLimiter, authController.registerDealer);

// POST /api/v1/auth/login
router.post('/login', loginLimiter, authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refreshToken);

// POST /api/v1/auth/logout  (requires valid access token)
router.post('/logout', protect, authController.logout);

// GET /api/v1/auth/me  (requires valid access token)
router.get('/me', protect, authController.getMe);

module.exports = router;
