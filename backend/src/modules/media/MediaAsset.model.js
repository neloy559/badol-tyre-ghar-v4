'use strict';

const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['product', 'logo', 'banner', 'other'],
      default: 'other',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    size:   { type: Number, default: 0 },   // bytes
    format: { type: String, default: '' },  // jpeg | png | webp
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

mediaAssetSchema.index({ type: 1 });
mediaAssetSchema.index({ createdAt: -1 });
mediaAssetSchema.index({ uploadedBy: 1 });

const MediaAsset =
  mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);

module.exports = MediaAsset;
