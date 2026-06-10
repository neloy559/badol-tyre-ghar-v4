'use strict';

const Notification = require('./Notification.model');
const User = require('../users/User.model');

/**
 * createNotification — creates a single notification for a specific user.
 *
 * @param {object} params
 * @param {string} params.recipientId - User ObjectId
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.link] - Optional link URL
 * @returns {Promise<object>}
 */
async function createNotification({ recipientId, type, title, message, link = '' }) {
  const notification = await Notification.create({
    recipientId,
    type,
    title,
    message,
    link,
  });

  return notification;
}

/**
 * createNotificationForAllAdmins — inserts one notification per admin user.
 * Called fire-and-forget from auth.service when a dealer registers.
 * Failures are silently logged — they must never block the registration response.
 *
 * @param {object} params
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.link] - Optional link URL
 * @returns {Promise<void>}
 */
async function createNotificationForAllAdmins({ type, title, message, link = '' }) {
  const adminUsers = await User.find({ role: 'admin', isDeleted: false })
    .select('_id')
    .maxTimeMS(5000) // Security: Query timeout
    .limit(100) // Security: Reasonable admin limit
    .lean();

  if (adminUsers.length === 0) {
    return;
  }

  const notificationDocuments = [];
  for (const admin of adminUsers) {
    notificationDocuments.push({
      recipientId: admin._id,
      type,
      title,
      message,
      link,
    });
  }

  await Notification.insertMany(notificationDocuments);
}

/**
 * getNotifications — retrieves notifications for a specific user.
 * Returns the 50 most recent notifications sorted by creation time.
 *
 * @param {string} userId - User ObjectId
 * @returns {Promise<Array>}
 */
async function getNotifications(userId) {
  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .maxTimeMS(5000) // Security: Query timeout
    .lean();

  return notifications;
}

/**
 * getUnreadCount — counts unread notifications for a user.
 *
 * @param {string} userId - User ObjectId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  const count = await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
  });

  return count;
}

/**
 * markRead — marks a single notification as read.
 *
 * @param {string} notificationId - Notification ObjectId
 * @param {string} userId - User ObjectId (for authorization)
 * @returns {Promise<object>}
 * @throws {statusCode: 404} if notification not found or not owned by user
 */
async function markRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw { statusCode: 404, message: 'Notification not found.' };
  }

  return notification;
}

/**
 * markAllRead — marks all unread notifications for a user as read.
 *
 * @param {string} userId - User ObjectId
 * @returns {Promise<number>} Number of updated notifications
 */
async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true }
  );

  return result.modifiedCount;
}

module.exports = {
  createNotification,
  createNotificationForAllAdmins,
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};