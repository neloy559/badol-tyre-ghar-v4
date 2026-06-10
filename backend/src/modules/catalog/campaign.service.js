'use strict';

const Campaign = require('./Campaign.model');

/**
 * getCampaigns — retrieves all campaigns (admin view).
 * No filtering — shows active and inactive campaigns.
 *
 * @returns {Promise<Array>}
 */
async function getCampaigns() {
  const campaigns = await Campaign.find({ isDeleted: false })
    .populate('appliesTo.products', 'name sku')
    .populate('appliesTo.categories', 'name')
    .populate('appliesTo.brands', 'name')
    .sort({ createdAt: -1 })
    .maxTimeMS(5000) // Security: Query timeout
    .limit(500) // Security: Reasonable limit for campaigns
    .lean();

  return campaigns;
}

/**
 * createCampaign — creates a new promotional campaign.
 *
 * @param {object} data - Campaign payload
 * @returns {Promise<object>}
 * @throws {statusCode: 400} if validation fails
 */
async function createCampaign(data) {
  if (!data.name || !data.name.trim()) {
    throw { statusCode: 400, message: 'Campaign name is required.' };
  }

  if (!data.type || !['percent', 'flat'].includes(data.type)) {
    throw { statusCode: 400, message: 'Campaign type must be "percent" or "flat".' };
  }

  if (data.value == null || data.value < 0) {
    throw { statusCode: 400, message: 'Campaign value must be a positive number.' };
  }

  if (!data.startDate) {
    throw { statusCode: 400, message: 'Start date is required.' };
  }

  if (!data.endDate) {
    throw { statusCode: 400, message: 'End date is required.' };
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw { statusCode: 400, message: 'Invalid date format.' };
  }

  if (endDate <= startDate) {
    throw { statusCode: 400, message: 'End date must be after start date.' };
  }

  const campaign = await Campaign.create({
    name: data.name.trim(),
    type: data.type,
    value: data.value,
    appliesTo: {
      products: data.appliesTo?.products || [],
      categories: data.appliesTo?.categories || [],
      brands: data.appliesTo?.brands || [],
    },
    startDate,
    endDate,
    isActive: data.isActive !== undefined ? data.isActive : true,
  });

  return campaign;
}

/**
 * updateCampaign — updates an existing campaign.
 *
 * @param {string} id - Campaign ObjectId
 * @param {object} data - Fields to update
 * @returns {Promise<object>}
 * @throws {statusCode: 404} if campaign not found
 * @throws {statusCode: 400} if validation fails
 */
async function updateCampaign(id, data) {
  const campaign = await Campaign.findOne({ _id: id, isDeleted: false })
    .maxTimeMS(5000); // Security: Query timeout

  if (!campaign) {
    throw { statusCode: 404, message: 'Campaign not found.' };
  }

  if (data.name !== undefined) {
    if (!data.name || !data.name.trim()) {
      throw { statusCode: 400, message: 'Campaign name cannot be empty.' };
    }
    campaign.name = data.name.trim();
  }

  if (data.type !== undefined) {
    if (!['percent', 'flat'].includes(data.type)) {
      throw { statusCode: 400, message: 'Campaign type must be "percent" or "flat".' };
    }
    campaign.type = data.type;
  }

  if (data.value !== undefined) {
    if (data.value < 0) {
      throw { statusCode: 400, message: 'Campaign value must be a positive number.' };
    }
    campaign.value = data.value;
  }

  if (data.startDate !== undefined) {
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      throw { statusCode: 400, message: 'Invalid start date format.' };
    }
    campaign.startDate = startDate;
  }

  if (data.endDate !== undefined) {
    const endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime())) {
      throw { statusCode: 400, message: 'Invalid end date format.' };
    }
    campaign.endDate = endDate;
  }

  if (campaign.endDate <= campaign.startDate) {
    throw { statusCode: 400, message: 'End date must be after start date.' };
  }

  if (data.appliesTo !== undefined) {
    campaign.appliesTo = {
      products: data.appliesTo.products || [],
      categories: data.appliesTo.categories || [],
      brands: data.appliesTo.brands || [],
    };
  }

  if (data.isActive !== undefined) {
    campaign.isActive = data.isActive;
  }

  await campaign.save();
  return campaign;
}

/**
 * softDeleteCampaign — marks a campaign as deleted.
 * Sets isActive to false and isDeleted to true.
 *
 * @param {string} id - Campaign ObjectId
 * @returns {Promise<object>}
 * @throws {statusCode: 404} if campaign not found
 */
async function softDeleteCampaign(id) {
  const campaign = await Campaign.findOne({ _id: id, isDeleted: false })
    .maxTimeMS(5000); // Security: Query timeout

  if (!campaign) {
    throw { statusCode: 404, message: 'Campaign not found.' };
  }

  campaign.isActive = false;
  campaign.isDeleted = true;
  await campaign.save();

  return campaign;
}

/**
 * getActiveCampaignsForProduct — retrieves currently active campaigns
 * that apply to a specific product, category, or brand.
 * Used by catalog.service to apply campaign discounts on product fetch.
 *
 * Filters:
 * - isActive: true
 * - isDeleted: false
 * - endDate > now
 * - Matches by productId OR categoryId OR brandId
 *
 * @param {string} productId - Product ObjectId
 * @param {string} categoryId - Category ObjectId
 * @param {string} brandId - Brand ObjectId
 * @returns {Promise<Array>}
 */
async function getActiveCampaignsForProduct(productId, categoryId, brandId) {
  const now = new Date();

  const campaigns = await Campaign.find({
    isActive: true,
    isDeleted: false,
    endDate: { $gt: now },
    $or: [
      { 'appliesTo.products': productId },
      { 'appliesTo.categories': categoryId },
      { 'appliesTo.brands': brandId },
    ],
  })
    .sort({ value: -1 })
    .maxTimeMS(5000) // Security: Query timeout
    .limit(100) // Security: Reasonable limit
    .lean();

  return campaigns;
}

module.exports = {
  getCampaigns,
  createCampaign,
  updateCampaign,
  softDeleteCampaign,
  getActiveCampaignsForProduct,
};
