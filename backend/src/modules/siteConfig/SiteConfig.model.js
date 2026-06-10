'use strict';

const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: 'Badol Tyre Ghar',
    },
    whatsappNumber: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: '',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    announcementBanner: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      type: {
        type: String,
        enum: ['info', 'warning', 'success'],
        default: 'info',
      },
    },
    dealerApplicationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure only one SiteConfig document exists
siteConfigSchema.index({}, { unique: true });

const SiteConfig =
  mongoose.models.SiteConfig || mongoose.model('SiteConfig', siteConfigSchema);

module.exports = SiteConfig;
