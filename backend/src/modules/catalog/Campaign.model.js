'use strict';

const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required.'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['percent', 'flat'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    appliesTo: {
      products:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      brands:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }],
    },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    isActive:  { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient active campaign lookup
campaignSchema.index({ isActive: 1, isDeleted: 1, endDate: 1 });

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
