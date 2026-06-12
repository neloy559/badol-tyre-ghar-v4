'use strict';

const { getDiscountPercent } = require('./tierPricingService');

/**
 * computePrice — computes the final price for a single product variant.
 *
 * Computation order:
 * 1. Base price: wholesalePrice (dealer/sales_partner) or retailPrice (everyone else)
 * 2. Apply user.discountMultiplier (admin-set extra %, if > 0)
 * 3. Apply tier discount (from tierPricingService)
 * 4. Apply best matching campaign discount
 * 5. Round to 2 decimal places; clamp to minimum 0
 *
 * Pricing is SERVER-SIDE ONLY. The frontend never computes prices.
 *
 * @param {object} variant         - Product variant { retailPrice, wholesalePrice, ... }
 * @param {object} user            - Requesting user { role, tier, discountMultiplier }
 * @param {Array}  activeCampaigns - Active campaign documents from DB
 * @param {object} [product]       - Parent product (for campaign matching by category/brand)
 * @returns {Promise<number>} Final computed price
 */
async function computePrice(variant, user, activeCampaigns = [], product = null) {
  // Security: pending/rejected dealers must NOT receive wholesale pricing.
  // A dealer is only eligible if explicitly approved — role alone is insufficient.
  const isDealerRole = user && (user.role === 'dealer' || user.role === 'sales_partner') &&
                       user.registrationStatus === 'approved';
  const isAdminRole  = user && (user.role === 'admin' || user.role === 'editor');

  // Step 1: Base price selection
  let price = (isDealerRole || isAdminRole)
    ? (variant.wholesalePrice || 0)
    : (variant.retailPrice || 0);

  // Step 2: Apply dealer's individual discountMultiplier (admin-set)
  if (isDealerRole && user.discountMultiplier && user.discountMultiplier > 0) {
    price = price * (1 - user.discountMultiplier / 100);
  }

  // Step 3: Apply tier discount
  if (isDealerRole && user.tier) {
    const tierDiscount = await getDiscountPercent(user.tier);
    if (tierDiscount > 0) {
      price = price * (1 - tierDiscount / 100);
    }
  }

  // Step 4: Apply best matching campaign discount
  if (activeCampaigns && activeCampaigns.length > 0 && product) {
    const matchingCampaign = findBestCampaign(activeCampaigns, product);
    if (matchingCampaign) {
      if (matchingCampaign.type === 'percent') {
        price = price * (1 - matchingCampaign.value / 100);
      } else if (matchingCampaign.type === 'flat') {
        price = price - matchingCampaign.value;
      }
    }
  }

  // Step 5: Round and clamp
  return roundPrice(Math.max(0, price));
}

/**
 * findBestCampaign — finds the campaign that gives the lowest final price.
 * Matches by: direct productId, category, or brand.
 *
 * @param {Array}  campaigns - Active campaign documents
 * @param {object} product   - Product document { _id, category, brand }
 * @returns {object|null} The best-discount campaign, or null if none match
 */
function findBestCampaign(campaigns, product) {
  const productId  = product._id?.toString();
  const categoryId = (product.category?._id || product.category)?.toString();
  const brandId    = (product.brand?._id    || product.brand)?.toString();

  const matching = campaigns.filter((c) => {
    if (!c.isActive || c.isDeleted) return false;
    if (new Date(c.endDate) < new Date()) return false;

    const appliesTo = c.appliesTo || {};

    const matchProduct  = appliesTo.products?.some(id => id.toString() === productId);
    const matchCategory = appliesTo.categories?.some(id => id.toString() === categoryId);
    const matchBrand    = appliesTo.brands?.some(id => id.toString() === brandId);

    return matchProduct || matchCategory || matchBrand;
  });

  if (matching.length === 0) return null;

  // Pick the campaign that produces the lowest price (highest effective discount)
  return matching.reduce((best, current) => {
    if (!best) return current;
    const bestDiscount    = effectiveDiscount(best);
    const currentDiscount = effectiveDiscount(current);
    return currentDiscount > bestDiscount ? current : best;
  }, null);
}

/**
 * effectiveDiscount — normalizes percent and flat discounts for comparison.
 * Returns a comparable "discount score" (higher = more discount).
 */
function effectiveDiscount(campaign) {
  if (campaign.type === 'percent') return campaign.value;
  // For flat discounts, treat as a rough percentage (imprecise but sufficient for sorting)
  return campaign.value;
}

/**
 * roundPrice — rounds to 2 decimal places.
 * Uses the standard banker's rounding to avoid floating point drift.
 */
function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

// -- Stock label thresholds
const LOW_STOCK_THRESHOLD = 20;

/**
 * getStockLabel -- converts a stock number into a UI-friendly label.
 * 'limited' threshold is LOW_STOCK_THRESHOLD to give buyers a sense of urgency.
 *
 * @param {number} stock
 * @returns {'out_of_stock'|'limited'|'in_stock'}
 */
function getStockLabel(stock) {
  if (stock <= 0) {
    return 'out_of_stock';
  } else if (stock <= LOW_STOCK_THRESHOLD) {
    return 'limited';
  } else {
    return 'in_stock';
  }
}

module.exports = { computePrice, findBestCampaign, roundPrice, getStockLabel };
