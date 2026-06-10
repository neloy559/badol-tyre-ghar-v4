'use strict';

const express = require('express');
const notificationsController = require('./notifications.controller');

const router = express.Router();

router.get('/unread-count', notificationsController.getUnreadCount);
router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markRead);
router.patch('/read-all', notificationsController.markAllRead);

module.exports = router;
