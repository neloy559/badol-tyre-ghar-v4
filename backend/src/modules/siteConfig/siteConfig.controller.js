'use strict';

const siteConfigService = require('./siteConfig.service');
const sendResponse = require('../../utils/sendResponse');
const { createAuditLog } = require('../../utils/auditLogger');

/**
 * getSiteConfig — retrieves site configuration (public or admin).
 */
exports.getSiteConfig = async (req, res) => {
  try {
    const config = await siteConfigService.getSiteConfig();
    return sendResponse(res, 200, true, 'Site configuration fetched.', config);
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
 * updateSiteConfig — updates site configuration (admin only).
 */
exports.updateSiteConfig = async (req, res) => {
  try {
    const config = await siteConfigService.updateSiteConfig(req.body);

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'SITE_CONFIG_UPDATE',
      targetId: config._id.toString(),
      details: { updates: req.body },
    }).catch((err) => {
      console.warn('[siteConfig] Audit log failed:', err.message);
    });

    return sendResponse(res, 200, true, 'Site configuration updated.', config);
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
