'use strict';

const notificationsService = require('./notifications.service');
const sendResponse = require('../../utils/sendResponse');

/**
 * getUnreadCount — returns count of unread notifications for current user.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user.userId);
    return sendResponse(res, 200, true, 'Unread count fetched.', { count });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * getNotifications — retrieves 50 most recent notifications for current user.
 */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await notificationsService.getNotifications(req.user.userId);
    return sendResponse(res, 200, true, 'Notifications fetched.', notifications);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * markRead — marks a single notification as read.
 */
exports.markRead = async (req, res) => {
  try {
    const notification = await notificationsService.markRead(
      req.params.id,
      req.user.userId
    );
    return sendResponse(res, 200, true, 'Notification marked as read.', notification);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};

/**
 * markAllRead — marks all unread notifications as read.
 */
exports.markAllRead = async (req, res) => {
  try {
    const count = await notificationsService.markAllRead(req.user.userId);
    return sendResponse(res, 200, true, 'All notifications marked as read.', { count });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode < 500
        ? err.message
        : process.env.NODE_ENV !== 'production'
        ? err.message
        : 'Internal server error.';
    return sendResponse(res, statusCode, false, message, null);
  }
};
