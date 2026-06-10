'use strict';

/**
 * sendResponse — standardized API response helper.
 * All controllers use this — no ad-hoc res.json() calls.
 *
 * @param {object} res           - Express response object
 * @param {number} statusCode    - HTTP status code
 * @param {boolean} success      - Operation success flag
 * @param {string} message       - Human-readable message
 * @param {*} data               - Response payload (null if none)
 * @param {object} [pagination]  - { page, limit, total, totalPages }
 */
function sendResponse(res, statusCode, success, message, data, pagination) {
  const body = {
    success,
    message,
    data: data !== undefined ? data : null,
  };

  if (pagination) {
    body.pagination = pagination;
  }

  return res.status(statusCode).json(body);
}

module.exports = sendResponse;
