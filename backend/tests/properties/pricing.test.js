'use strict';

const fc = require('fast-check');
const { computePrice, roundPrice, getStockLabel } = require('../../src/utils/pricingService');

// Mock tierPricingService to return deterministic tier discounts
// This ensures tests are repeatable and don't depend on DB state
jest.mock('../../src/utils/tierPricingService', () => ({
  discountMap: { standard: 0, silver: 5, gold: 10, platinum: 15 },
  getDiscountPercent: async (tier) => {
    const map = { standard: 0, silver: 5, gold: 10, platinum: 15 };
    return map[tier] || 0;
  },
}));

/**
 * Property-Based Tests for Pricing Service
 * Task 6.3 - Tests requirements 6.1, 6.2, 6.3, 6.6, 10.2, 10.3, 23.4, 23.5
 * 
 * These tests verify critical pricing invariants using fast-check to generate
 * random inputs. Each property must hold for ALL possible valid inputs.
 * 
 * Price ranges use realistic BDT values: 1000-100000 Taka
 * Tier discounts: standard=0%, silver=5%, gold=10%, platinum=15%
 */

describe('PBT — Pricing Properties (Task 6.3)', () => {
  
  /**
   * Property 1: Non-negative Price Invariant
   * 
   * REQUIREMENT: computePrice must NEVER return a negative price, regardless of:
   * - Base price value
   * - Tier discounts
   * - Campaign discounts
   * - Discount multipliers
   * 
   * WHY: Negative prices would break the business model and could be exploited.
   * The Math.max(0, price) in computePrice ensures this invariant.
   * 
   * Validates: Requirements 6.1, 6.6
   */
  it('Property 1: Non-negative Price Invariant — computePrice always ≥ 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 100000 }),  // Realistic BDT price range
        fc.constantFrom('standard', 'silver', 'gold', 'platinum'),
        fc.integer({ min: 0, max: 30 }),  // discountMultiplier 0-30%
        async (basePrice, tier, discountMultiplier) => {
          const variant = {
            retailPrice: basePrice,
            wholesalePrice: basePrice * 0.8
          };
          
          const user = {
            role: 'dealer',
            tier: tier,
            discountMultiplier: discountMultiplier
          };
          
          const result = await computePrice(variant, user, []);
          
          // Core invariant: price must never be negative
          return result >= 0;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Property 2: Combined Monotone Discount Invariant
   * 
   * REQUIREMENT: Campaigns must NEVER increase the price above what the user
   * would pay with only their tier discount applied. Campaigns are additional
   * discounts, not price increases.
   * 
   * WHY: This prevents malicious or misconfigured campaigns from actually
   * increasing prices. Users should never see a higher price when a campaign
   * is active.
   * 
   * Validates: Requirements 10.2, 10.3
   */
  it('Property 2: Combined Monotone Discount Invariant — campaigns never increase price', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 100000 }),
        fc.constantFrom('standard', 'silver', 'gold', 'platinum'),
        fc.constantFrom('percent', 'flat'),
        fc.integer({ min: 1, max: 50 }),  // campaign discount 1-50%
        async (basePrice, tier, campaignType, campaignValue) => {
          const variant = {
            retailPrice: basePrice,
            wholesalePrice: basePrice * 0.8
          };
          
          const user = {
            role: 'dealer',
            tier: tier,
            discountMultiplier: 0
          };
          
          // Mock product for campaign matching
          const product = {
            _id: 'test-product-123',
            category: 'test-category',
            brand: 'test-brand'
          };
          
          // Active campaign that applies to this product
          const campaign = {
            isActive: true,
            isDeleted: false,
            type: campaignType,
            value: campaignType === 'flat' ? Math.min(campaignValue * 10, basePrice * 0.1) : campaignValue,
            appliesTo: {
              products: ['test-product-123']
            },
            endDate: new Date(Date.now() + 86400000) // Tomorrow
          };
          
          // Price without campaign
          const priceWithoutCampaign = await computePrice(variant, user, [], product);
          
          // Price with campaign
          const priceWithCampaign = await computePrice(variant, user, [campaign], product);
          
          // Invariant: campaign should never increase price
          return priceWithCampaign <= priceWithoutCampaign;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Property 3: Tier Discount Monotonicity
   * 
   * REQUIREMENT: Higher tiers must result in lower or equal prices.
   * The ordering must be: platinum ≤ gold ≤ silver ≤ standard
   * 
   * WHY: This ensures the tier system works correctly. Platinum (15% discount)
   * should always be cheaper than gold (10%), which should be cheaper than
   * silver (5%), which should be cheaper than standard (0%).
   * 
   * Validates: Requirements 6.2, 6.3
   */
  it('Property 3: Tier Discount Monotonicity — platinum ≤ gold ≤ silver ≤ standard', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 100000 }),
        async (basePrice) => {
          const variant = {
            wholesalePrice: basePrice,
            retailPrice: basePrice * 1.2
          };

          // Compute price for each tier with identical conditions
          const standard = await computePrice(
            variant,
            { role: 'dealer', tier: 'standard', discountMultiplier: 0 },
            []
          );

          const silver = await computePrice(
            variant,
            { role: 'dealer', tier: 'silver', discountMultiplier: 0 },
            []
          );

          const gold = await computePrice(
            variant,
            { role: 'dealer', tier: 'gold', discountMultiplier: 0 },
            []
          );

          const platinum = await computePrice(
            variant,
            { role: 'dealer', tier: 'platinum', discountMultiplier: 0 },
            []
          );

          // Core invariant: higher tier = lower price
          const isMonotonic = platinum <= gold && gold <= silver && silver <= standard;
          
          if (!isMonotonic) {
            console.log('Tier monotonicity violation detected:', {
              basePrice,
              standard,
              silver,
              gold,
              platinum
            });
          }

          return isMonotonic;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Property 4: Price Rounding Idempotence
   * 
   * REQUIREMENT: Applying rounding twice must produce the same result as
   * applying it once. roundPrice(roundPrice(x)) === roundPrice(x)
   * 
   * WHY: This ensures rounding is a stable operation. Once a price is rounded,
   * it stays rounded. This prevents precision drift from repeated calculations.
   * 
   * Mathematical definition of idempotence: f(f(x)) = f(x)
   * 
   * Validates: Requirements 6.6, 23.4, 23.5
   */
  it('Property 4: Price Rounding Idempotence — rounding twice = rounding once', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (price) => {
          const roundedOnce = roundPrice(price);
          const roundedTwice = roundPrice(roundedOnce);
          
          // Idempotence: f(f(x)) must equal f(x)
          return roundedOnce === roundedTwice;
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('PBT — Stock Label Properties', () => {
  it('Property 1: stock label categories are exhaustive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 10000 }),
        (stock) => {
          const label = getStockLabel(stock);
          const validLabels = ['out_of_stock', 'limited', 'in_stock'];
          return validLabels.includes(label);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Property 2: zero stock is always out_of_stock', () => {
    const label = getStockLabel(0);
    expect(label).toBe('out_of_stock');
  });

  it('Property 3: negative stock is always out_of_stock', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (stock) => {
          const label = getStockLabel(stock);
          return label === 'out_of_stock';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: high stock is always in_stock', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        (stock) => {
          const label = getStockLabel(stock);
          return label === 'in_stock';
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 5: stock label is monotonic (never goes backward)', () => {
    const labels = ['out_of_stock', 'limited', 'in_stock'];
    const labelOrder = (label) => labels.indexOf(label);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (stock1, stock2) => {
          if (stock1 > stock2) {
            const label1 = getStockLabel(stock1);
            const label2 = getStockLabel(stock2);
            return labelOrder(label1) >= labelOrder(label2);
          }
          return true;
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe('PBT — Edge Cases', () => {
  it('handles zero base price', async () => {
    const variant = {
      retailPrice: 0,
      wholesalePrice: 0
    };
    const user = {
      role: 'dealer',
      tier: 'gold',
      discountMultiplier: 10
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBe(0);
  });

  it('handles extremely high prices', async () => {
    const variant = {
      retailPrice: 1000000000,
      wholesalePrice: 1000000000
    };
    const user = {
      role: 'dealer',
      tier: 'platinum',
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThanOrEqual(1000000000);
  });

  it('handles missing tier gracefully', async () => {
    const variant = {
      retailPrice: 5000,
      wholesalePrice: 4000
    };
    const user = {
      role: 'dealer',
      tier: null,
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBe(4000);
  });

  it('handles invalid tier gracefully', async () => {
    const variant = {
      retailPrice: 5000,
      wholesalePrice: 4000
    };
    const user = {
      role: 'dealer',
      tier: 'invalid_tier',
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBe(4000);
  });
});


/**
 * Additional Property Tests for Stock Label System
 * These tests verify the stock labeling logic works correctly.
 */
describe('PBT — Stock Label Properties', () => {
  it('Property: stock label categories are exhaustive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 10000 }),
        (stock) => {
          const label = getStockLabel(stock);
          const validLabels = ['out_of_stock', 'limited', 'in_stock'];
          return validLabels.includes(label);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Property: zero stock is always out_of_stock', () => {
    const label = getStockLabel(0);
    expect(label).toBe('out_of_stock');
  });

  it('Property: negative stock is always out_of_stock', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (stock) => {
          const label = getStockLabel(stock);
          return label === 'out_of_stock';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: high stock is always in_stock', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        (stock) => {
          const label = getStockLabel(stock);
          return label === 'in_stock';
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property: stock label is monotonic', () => {
    const labels = ['out_of_stock', 'limited', 'in_stock'];
    const labelOrder = (label) => labels.indexOf(label);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (stock1, stock2) => {
          if (stock1 > stock2) {
            const label1 = getStockLabel(stock1);
            const label2 = getStockLabel(stock2);
            return labelOrder(label1) >= labelOrder(label2);
          }
          return true;
        }
      ),
      { numRuns: 300 }
    );
  });
});

/**
 * Edge Case Tests
 * These verify behavior at boundary conditions.
 */
describe('PBT — Edge Cases', () => {
  it('handles zero base price', async () => {
    const variant = {
      retailPrice: 0,
      wholesalePrice: 0
    };
    const user = {
      role: 'dealer',
      tier: 'gold',
      discountMultiplier: 10
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBe(0);
  });

  it('handles extremely high prices', async () => {
    const variant = {
      retailPrice: 1000000000,
      wholesalePrice: 1000000000
    };
    const user = {
      role: 'dealer',
      tier: 'platinum',
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThanOrEqual(1000000000);
  });

  it('handles missing tier gracefully', async () => {
    const variant = {
      retailPrice: 5000,
      wholesalePrice: 4000
    };
    const user = {
      role: 'dealer',
      tier: null,
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBe(4000);
  });

  it('handles invalid tier gracefully', async () => {
    const variant = {
      retailPrice: 5000,
      wholesalePrice: 4000
    };
    const user = {
      role: 'dealer',
      tier: 'invalid_tier',
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    expect(price).toBe(4000);
  });

  it('handles customer role (no tier discounts)', async () => {
    const variant = {
      retailPrice: 5000,
      wholesalePrice: 4000
    };
    const user = {
      role: 'customer',
      tier: null,
      discountMultiplier: 0
    };
    const price = await computePrice(variant, user, []);
    // Customers pay retail price
    expect(price).toBe(5000);
  });

  it('handles discountMultiplier correctly', async () => {
    const variant = {
      retailPrice: 10000,
      wholesalePrice: 8000
    };
    const user = {
      role: 'dealer',
      tier: 'standard',
      discountMultiplier: 10  // 10% additional discount
    };
    const price = await computePrice(variant, user, []);
    // wholesalePrice 8000 - 10% = 7200
    expect(price).toBe(7200);
  });

  it('handles rounding edge cases', () => {
    expect(roundPrice(1234.56789)).toBe(1234.57);
    expect(roundPrice(1234.564)).toBe(1234.56);
    expect(roundPrice(1234.565)).toBe(1234.57); // banker's rounding
    expect(roundPrice(0.001)).toBe(0);
    expect(roundPrice(0.005)).toBe(0.01);
    expect(roundPrice(99.999)).toBe(100);
  });
});
