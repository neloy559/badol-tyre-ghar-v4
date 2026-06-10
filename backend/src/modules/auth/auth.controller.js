'use strict';

const authService  = require('./auth.service');
const sendResponse = require('../../utils/sendResponse');
const { validateInputTypes } = require('../../utils/validators');

const COOKIE_NAME = 'btg_refresh';

// Dev: expose err.message. Production: generic 500 message for server errors.
function handleError(res, err) {
  const statusCode = err.statusCode || 500;
  const isDev      = process.env.NODE_ENV !== 'production';
  const message    = statusCode < 500
    ? err.message
    : (isDev ? err.message : 'Internal server error.');
  return sendResponse(res, statusCode, false, message, null);
}

exports.registerCustomer = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { name, phone, password } = req.body;
    const validation = validateInputTypes({
      name: { value: name, type: 'string', required: true },
      phone: { value: phone, type: 'string', required: true },
      password: { value: password, type: 'string', required: true },
    });

    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    const result = await authService.registerCustomer(req.body, res, req);
    return sendResponse(res, 201, true, 'Registration successful.', result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.registerDealer = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { businessName, ownerName, phone, address, password } = req.body;
    const validation = validateInputTypes({
      businessName: { value: businessName, type: 'string', required: true },
      ownerName: { value: ownerName, type: 'string', required: true },
      phone: { value: phone, type: 'string', required: true },
      address: { value: address, type: 'string', required: true },
      password: { value: password, type: 'string', required: true },
    });

    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    const result = await authService.registerDealer(req.body, res, req);
    return sendResponse(res, 201, true, 'Dealer application submitted. Pending admin approval.', result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.login = async (req, res) => {
  try {
    // Input type validation (prevent NoSQL injection)
    const { phone, password } = req.body;
    const validation = validateInputTypes({
      phone: { value: phone, type: 'string', required: true },
      password: { value: password, type: 'string', required: true },
    });

    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    const result = await authService.login(req.body, res, req);
    return sendResponse(res, 200, true, 'Login successful.', result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    const result   = await authService.refreshToken(rawToken, res, req);
    return sendResponse(res, 200, true, 'Token refreshed.', result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.logout = async (req, res) => {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    await authService.logout(rawToken, res);
    return sendResponse(res, 200, true, 'Logged out successfully.', null);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getMe = async (req, res) => {
  try {
    const currentUser = await authService.getMe(req.user.userId);
    return sendResponse(res, 200, true, 'User fetched.', currentUser);
  } catch (err) {
    return handleError(res, err);
  }
};