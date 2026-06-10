'use strict';

const campaignService = require('./campaign.service');
const sendResponse = require('../../utils/sendResponse');
const { createAuditLog } = require('../../utils/auditLogger');

/**
 * getCampaigns — retrieves all campaigns (admin).
 */
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await campaignService.getCampaigns();
    return sendResponse(res, 200, true, 'Campaigns fetched.', campaigns);
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
 * createCampaign — creates a new campaign and logs audit trail.
 */
exports.createCampaign = async (req, res) => {
  try {
    const campaign = await campaignService.createCampaign(req.body);

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'CAMPAIGN_CREATE',
      targetId: campaign._id.toString(),
      details: { name: campaign.name, type: campaign.type },
    }).catch((err) => {
      console.warn('[campaign] Audit log failed:', err.message);
    });

    return sendResponse(res, 201, true, 'Campaign created.', campaign);
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
 * updateCampaign — updates an existing campaign and logs audit trail.
 */
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await campaignService.updateCampaign(req.params.id, req.body);

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'CAMPAIGN_UPDATE',
      targetId: campaign._id.toString(),
      details: { updates: req.body },
    }).catch((err) => {
      console.warn('[campaign] Audit log failed:', err.message);
    });

    return sendResponse(res, 200, true, 'Campaign updated.', campaign);
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
 * deleteCampaign — soft-deletes a campaign and logs audit trail.
 */
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await campaignService.softDeleteCampaign(req.params.id);

    // Fire-and-forget audit log
    createAuditLog({
      adminId: req.user.userId,
      action: 'CAMPAIGN_DELETE',
      targetId: campaign._id.toString(),
      details: { name: campaign.name },
    }).catch((err) => {
      console.warn('[campaign] Audit log failed:', err.message);
    });

    return sendResponse(res, 200, true, 'Campaign deleted.', campaign);
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
