'use strict';

const jwt = require('jsonwebtoken');
const sendResponse = require('../utils/sendResponse');

/**
 * protect — verifies JWT from Authorization header.
 * Attaches decoded user object to req.user.
 * Returns 401 if token is missing or invalid.
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendResponse(res, 401, false, 'Authentication required.', null);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendResponse(res, 401, false, 'Token expired.', null);
    }
    return sendResponse(res, 401, false, 'Invalid token.', null);
  }
}

/**
 * restrictTo — role-based access gate.
 * Must be used after protect().
 * Returns 403 if user role is not in the allowed list.
 *
 * @param {...string} roles - Allowed roles
 */
function restrictTo(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return sendResponse(res, 401, false, 'Authentication required.', null);
    }

    if (!roles.includes(req.user.role)) {
      return sendResponse(res, 403, false, 'Access denied.', null);
    }

    return next();
  };
}

/**
 * optionalAuth — attaches req.user if a valid token is present.
 * Does NOT return an error if no token is provided — sets req.user = null.
 * Use on public routes that have role-aware behavior.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch {
    // Invalid or expired token — treat as unauthenticated
    req.user = null;
  }

  return next();
}

module.exports = { protect, restrictTo, optionalAuth };
