'use strict';

const Product  = require('./Product.model');
const Category = require('./Category.model');
const Brand    = require('./Brand.model');
const Campaign = require('./Campaign.model');
const SearchLog = require('./SearchLog.model');
const { computePrice } = require('../../utils/pricingService');
const { createNotificationForAllAdmins } = require('../notifications/notifications.service');

const LOW_STOCK_THRESHOLD = 20; // matches pricingService.getStockLabel

let campaignCache = null;
let campaignCacheTimestamp = 0;
const CAMPAIGN_CACHE_TTL_MS = 60 * 1000;

async function getActiveCampaigns() {
  const now = Date.now();
  if (!campaignCache || now - campaignCacheTimestamp > CAMPAIGN_CACHE_TTL_MS) {
    const nowDate = new Date();
    campaignCache = await Campaign.find({
      isActive: true,
      isDeleted: false,
      startDate: { $lte: nowDate },
      endDate: { $gte: nowDate },
    })
    .maxTimeMS(5000) // Security: Query timeout prevents resource exhaustion
    .lean();
    campaignCacheTimestamp = now;
  }
  return campaignCache;
}

function isApprovedDealer(user) {
  return user && (
    user.role === 'admin' ||
    user.role === 'editor' ||
    (user.role === 'dealer' && user.registrationStatus === 'approved')
  );
}

async function processVariantsForUser(variants, user, product, activeCampaigns) {
  const processed = [];
  const showPrices = isApprovedDealer(user);
  const { getStockLabel } = require('../../utils/pricingService');
  for (const variant of variants) {
    const processedVariant = {
      sku:         variant.sku,
      ply:         variant.ply,
      stock:       variant.stock,
      stockStatus: getStockLabel(variant.stock || 0),
    };
    if (showPrices) {
      const tierPrice = await computePrice(variant, user, activeCampaigns, product);
      processedVariant.tierPrice = tierPrice;
    }
    processed.push(processedVariant);
  }
  return processed;
}

async function getProducts(filters, user) {
  const page  = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip  = (page - 1) * limit;
  const query = { isVisible: true, isDeleted: false };

  if (filters.category) {
    const categorySlugs = filters.category.split(',').map(s => s.trim()).filter(Boolean);
    const categoryDocs = await Category.find({ slug: { $in: categorySlugs }, isActive: true })
      .maxTimeMS(5000);
    if (categoryDocs.length > 0) {
      query.category = { $in: categoryDocs.map(c => c._id) };
    }
  }
  if (filters.brand) {
    const brandSlugs = filters.brand.split(',').map(s => s.trim()).filter(Boolean);
    const brandDocs = await Brand.find({ slug: { $in: brandSlugs }, isActive: true })
      .maxTimeMS(5000);
    if (brandDocs.length > 0) {
      query.brand = { $in: brandDocs.map(b => b._id) };
    }
  }
  if (filters.search && filters.search.trim()) {
    query.$text = { $search: filters.search.trim() };
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .populate('brand', 'name slug')
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000) // Security: Query timeout prevents slow query DoS
    .lean();

  if (filters.search && filters.search.trim()) {
    const normalizedTerm = filters.search.trim().toLowerCase();
    SearchLog.findOneAndUpdate(
      { term: normalizedTerm },
      { $inc: { count: 1 }, $set: { resultCount: total, lastSearchedAt: new Date() } },
      { upsert: true }
    )
    .exec()
    .catch(err => console.warn('[catalog] SearchLog upsert failed:', err.message));
  }

  const activeCampaigns = await getActiveCampaigns();
  for (const product of products) {
    product.variants = await processVariantsForUser(product.variants || [], user, product, activeCampaigns);
  }
  return { total, page, limit, products };
}

async function getProductBySlug(slug, user) {
  const product = await Product.findOne({ slug, isVisible: true, isDeleted: false })
    .populate('category', 'name slug')
    .populate('brand', 'name slug')
    .maxTimeMS(5000) // Security: Query timeout
    .lean();
  if (!product) {
    throw { statusCode: 404, message: 'Product not found.' };
  }

  Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } })
    .exec()
    .catch(err => console.warn('[catalog] View count increment failed:', err.message));

  const activeCampaigns = await getActiveCampaigns();
  product.variants = await processVariantsForUser(product.variants || [], user, product, activeCampaigns);
  return product;
}

function generateSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function createProduct(data) {
  if (!data.slug) {
    data.slug = generateSlug(data.name);
  }
  return Product.create(data);
}

async function updateProduct(id, data) {
  const product = await Product.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .maxTimeMS(5000);
  if (!product) {
    throw { statusCode: 404, message: 'Product not found.' };
  }

  // Fire-and-forget low stock notifications
  // Check each updated variant; notify admins if stock dropped to limited/out_of_stock
  if (data.variants && Array.isArray(data.variants)) {
    const lowVariants = data.variants.filter(v =>
      v.stock != null && v.stock >= 0 && v.stock <= LOW_STOCK_THRESHOLD
    );
    if (lowVariants.length > 0) {
      const isOut = lowVariants.some(v => v.stock <= 0);
      const label = isOut ? 'OUT OF STOCK' : 'LOW STOCK';
      const skus  = lowVariants.map(v => `${v.sku} (${v.stock})`).join(', ');
      createNotificationForAllAdmins({
        type:    'low_stock',
        title:   `⚠️ ${label}: ${product.name}`,
        message: `Variant(s) with low/zero stock: ${skus}`,
        link:    `/admin/catalog`,
      }).catch(err => console.warn('[catalog] Low stock notification failed:', err.message));
    }
  }

  return product;
}

async function softDeleteProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  if (!product) {
    throw { statusCode: 404, message: 'Product not found.' };
  }
  return product;
}

async function bulkCreateProducts(array) {
  const results = { created: 0, failed: 0, errors: [] };
  for (const item of array) {
    try {
      if (!item.slug) {
        item.slug = generateSlug(item.name);
      }
      await Product.create(item);
      results.created += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({ sku: item.sku || 'unknown', message: err.message || 'Unknown error' });
    }
  }
  return results;
}

async function toggleVisibility(id, isVisible) {
  const product = await Product.findByIdAndUpdate(id, { isVisible }, { new: true });
  if (!product) {
    throw { statusCode: 404, message: 'Product not found.' };
  }
  return product;
}

async function toggleShowPrice(id, showPrice) {
  const product = await Product.findByIdAndUpdate(id, { showPrice }, { new: true });
  if (!product) {
    throw { statusCode: 404, message: 'Product not found.' };
  }
  return product;
}

async function bulkMarkup({ categoryId, brandId, adjustmentType, adjustmentValue }) {
  const query = { isDeleted: false };
  if (categoryId) query.category = categoryId;
  if (brandId) query.brand = brandId;
  const products = await Product.find(query)
    .select('_id variants')
    .maxTimeMS(5000) // Security: Query timeout
    .limit(10000); // Security: Reasonable limit for bulk operations
  const bulkOps = [];

  for (const product of products) {
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      let newRetail = variant.retailPrice;
      let newWholesale = variant.wholesalePrice;
      if (adjustmentType === 'percent') {
        newRetail = newRetail * (1 + adjustmentValue / 100);
        newWholesale = newWholesale * (1 + adjustmentValue / 100);
      } else if (adjustmentType === 'flat') {
        newRetail += adjustmentValue;
        newWholesale += adjustmentValue;
      }
      newRetail = Math.max(0, Math.round(newRetail * 100) / 100);
      newWholesale = Math.max(0, Math.round(newWholesale * 100) / 100);
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              ['variants.' + i + '.retailPrice']: newRetail,
              ['variants.' + i + '.wholesalePrice']: newWholesale,
            },
          },
        },
      });
    }
  }
  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }
  return { updated: products.length };
}

async function getCategories() {
  return Category.find({ isActive: true })
    .sort({ displayOrder: 1 })
    .maxTimeMS(5000) // Security: Query timeout
    .limit(100) // Security: Reasonable limit for categories
    .lean();
}

async function getBrands() {
  return Brand.find({ isActive: true })
    .sort({ name: 1 })
    .maxTimeMS(5000) // Security: Query timeout
    .limit(500) // Security: Reasonable limit for brands
    .lean();
}

async function createCategory(data) {
  return Category.create(data);
}

async function updateCategory(id, data) {
  const category = await Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!category) {
    throw { statusCode: 404, message: 'Category not found.' };
  }
  return category;
}

async function createBrand(data) {
  return Brand.create(data);
}

async function updateBrand(id, data) {
  const brand = await Brand.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!brand) {
    throw { statusCode: 404, message: 'Brand not found.' };
  }
  return brand;
}

// Admin-only: returns ALL products regardless of isVisible, so admins can toggle visibility back
async function getAdminProducts(filters) {
  const page  = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip  = (page - 1) * limit;

  // Admin sees everything — no isVisible filter, only exclude hard-deleted
  const query = { isDeleted: false };

  if (filters.search && filters.search.trim()) {
    query.$text = { $search: filters.search.trim() };
  }
  if (filters.category) {
    const categorySlugs = filters.category.split(',').map(s => s.trim()).filter(Boolean);
    const categoryDocs = await Category.find({ slug: { $in: categorySlugs }, isActive: true })
      .maxTimeMS(5000);
    if (categoryDocs.length > 0) {
      query.category = { $in: categoryDocs.map(c => c._id) };
    }
  }
  if (filters.brand) {
    const brandSlugs = filters.brand.split(',').map(s => s.trim()).filter(Boolean);
    const brandDocs = await Brand.find({ slug: { $in: brandSlugs }, isActive: true })
      .maxTimeMS(5000);
    if (brandDocs.length > 0) {
      query.brand = { $in: brandDocs.map(b => b._id) };
    }
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .populate('brand', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .maxTimeMS(5000) // Security: Query timeout prevents slow query DoS
    .lean();

  // Attach stock labels for each variant (admin sees raw prices, no tier pricing)
  const { getStockLabel } = require('../../utils/pricingService');
  for (const product of products) {
    product.variants = (product.variants || []).map(v => ({
      ...v,
      stockStatus: getStockLabel(v.stock || 0),
    }));
  }

  return { total, page, limit, products };
}

async function getSearchLogs(page, limit) {
  const skip = (page - 1) * limit;
  const total = await SearchLog.countDocuments();
  const logs = await SearchLog.find()
    .sort({ count: -1 })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000) // Security: Query timeout
    .lean();
  return { total, page, limit, logs };
}

module.exports = {
  getProducts,
  getAdminProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  softDeleteProduct,
  bulkCreateProducts,
  toggleVisibility,
  toggleShowPrice,
  bulkMarkup,
  getCategories,
  getBrands,
  createCategory,
  updateCategory,
  createBrand,
  updateBrand,
  getSearchLogs,
};
