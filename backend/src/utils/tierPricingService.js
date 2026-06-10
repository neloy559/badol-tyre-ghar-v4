'use strict';

const TierPricingRule = require('../modules/catalog/TierPricingRule.model');

/**
 * discountMap — THE SINGLE DEFINITION of tier discount percentages.
 * Import this from anywhere that needs tier discount values.
 * DO NOT hardcode tier discounts in any other file.
 *
 * @type {{ standard: number, silver: number, gold: number, platinum: number }}
 */
const discountMap = {
  standard: 0,
  silver:   5,
  gold:     10,
  platinum: 15,
};

// ── In-memory cache ────────────────────────────────────────
let cache          = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * getDiscountPercent — returns the discount % for a given tier.
 *
 * Resolution order:
 * 1. In-memory cache (if < 60s old)
 * 2. TierPricingRule collection in MongoDB
 * 3. discountMap defaults (if DB unreachable)
 *
 * @param {string} tier - 'standard' | 'silver' | 'gold' | 'platinum'
 * @returns {Promise<number>} discount percentage (0-100)
 */
async function getDiscountPercent(tier) {
  const now = Date.now();

  // Refresh cache if stale
  if (!cache || now - cacheTimestamp > CACHE_TTL_MS) {
    try {
      const rules = await TierPricingRule.find({}).lean();
      cache = {};
      for (const rule of rules) {
        cache[rule.tier] = rule.discountPercent;
      }
      cacheTimestamp = now;
    } catch (err) {
      console.warn('[tierPricingService] DB unreachable, using discountMap defaults:', err.message);
      cache = { ...discountMap };
    }
  }

  if (!(tier in discountMap)) {
    console.warn(`[tierPricingService] Unknown tier "${tier}", applying 0% discount.`);
    return 0;
  }

  // DB override if present, otherwise use discountMap default
  return cache[tier] !== undefined ? cache[tier] : discountMap[tier];
}

/**
 * invalidateCache — forces next call to re-read from DB.
 * Call after admin changes tier pricing rules.
 */
function invalidateCache() {
  cache          = null;
  cacheTimestamp = 0;
}

module.exports = { discountMap, getDiscountPercent, invalidateCache };
