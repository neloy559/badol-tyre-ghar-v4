'use strict';

const SiteConfig = require('./SiteConfig.model');

const DEFAULT_CONFIG = {
  siteName: 'Badol Tyre Ghar',
  whatsappNumber: '',
  supportEmail: '',
  maintenanceMode: false,
  announcementBanner: {
    enabled: false,
    message: '',
    type: 'info',
  },
  dealerApplicationsEnabled: true,
};

/**
 * getSiteConfig — retrieves the site configuration.
 * Returns default config if no document exists in DB.
 *
 * @returns {Promise<object>}
 */
async function getSiteConfig() {
  const config = await SiteConfig.findOne()
    .maxTimeMS(5000) // Security: Query timeout
    .lean();

  if (!config) {
    return DEFAULT_CONFIG;
  }

  return config;
}

/**
 * updateSiteConfig — updates or creates the site configuration.
 * Uses upsert to ensure only one config document exists.
 *
 * @param {object} data - Configuration fields to update
 * @returns {Promise<object>}
 */
async function updateSiteConfig(data) {
  const config = await SiteConfig.findOneAndUpdate(
    {},
    data,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return config;
}

module.exports = { getSiteConfig, updateSiteConfig };
