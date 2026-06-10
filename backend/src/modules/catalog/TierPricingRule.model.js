'use strict';

const mongoose = require('mongoose');

/**
 * TierPricingRule - optional DB override for tier discount percentages.
 * Defaults (from discountMap): standard=0%, silver=5%, gold=10%, platinum=15%
 */
const tierPricingRuleSchema = new mongoose.Schema(
  {
    tier: { type: String, enum: ['standard', 'silver', 'gold', 'platinum'], required: true, unique: true },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    label:       { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const TierPricingRule = mongoose.models.TierPricingRule || mongoose.model('TierPricingRule', tierPricingRuleSchema);
module.exports = TierPricingRule;