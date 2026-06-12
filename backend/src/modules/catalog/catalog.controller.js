'use strict';

const catalogService = require('./catalog.service');
const sendResponse   = require('../../utils/sendResponse');
const Product        = require('./Product.model');
const User           = require('../users/User.model');
const { createAuditLog } = require('../../utils/auditLogger');
const { validateQueryParams, sanitizeInteger } = require('../../utils/validators');

function handleError(res, err) {
  const statusCode = err.statusCode || 500;
  const isDev      = process.env.NODE_ENV !== 'production';
  const message    = statusCode < 500 ? err.message : (isDev ? err.message : 'Internal server error.');
  return sendResponse(res, statusCode, false, message, null);
}

/**
 * Resolves the effective user for pricing.
 * If the requesting user is admin and ?viewAs=<userId> is provided,
 * fetch that dealer's pricing profile and use it instead.
 * This allows admins to preview pricing as any dealer — without logging out.
 */
async function resolveEffectiveUser(req) {
  const viewAsId = req.query.viewAs;

  // Only admin can use viewAs
  if (!viewAsId || !req.user || req.user.role !== 'admin') {
    return req.user;
  }

  try {
    const dealer = await User
      .findOne({ _id: viewAsId, isDeleted: false })
      .select('role registrationStatus tier discountMultiplier')
      .maxTimeMS(5000)
      .lean();

    if (!dealer) return req.user;

    // Return a synthetic user object with dealer's pricing fields
    return {
      userId:             dealer._id.toString(),
      role:               dealer.role,
      registrationStatus: dealer.registrationStatus,
      tier:               dealer.tier,
      discountMultiplier: dealer.discountMultiplier || 0,
      _viewingAs:         true, // marker for logging/debugging
    };
  } catch (err) {
    console.warn('[catalog] viewAs lookup failed:', err.message);
    return req.user;
  }
}

exports.getProducts = async (req, res) => {
  try {
    const validation = validateQueryParams(req.query, ['search', 'category', 'brand', 'viewAs']);

    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }

    const page = sanitizeInteger(req.query.page, 1);
    const limit = sanitizeInteger(req.query.limit, 20);

    if (page < 1 || limit < 1 || limit > 100) {
      return sendResponse(res, 400, false, 'Invalid pagination parameters', null);
    }

    const effectiveUser = await resolveEffectiveUser(req);
    const result = await catalogService.getProducts(req.query, effectiveUser);
    return sendResponse(res, 200, true, 'Products fetched.', {
      products: result.products,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (typeof slug !== 'string' || !slug.trim()) {
      return sendResponse(res, 400, false, 'Invalid product slug', null);
    }

    const effectiveUser = await resolveEffectiveUser(req);
    const product = await catalogService.getProductBySlug(req.params.slug, effectiveUser);
    return sendResponse(res, 200, true, 'Product fetched.', product);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await catalogService.getCategories();
    return sendResponse(res, 200, true, 'Categories fetched.', categories);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getBrands = async (req, res) => {
  try {
    const brands = await catalogService.getBrands();
    return sendResponse(res, 200, true, 'Brands fetched.', brands);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const validation = validateQueryParams(req.query, ['search', 'category', 'brand']);
    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.errors.join(', '), null);
    }
    const page = sanitizeInteger(req.query.page, 1);
    const limit = sanitizeInteger(req.query.limit, 20);
    if (page < 1 || limit < 1 || limit > 100) {
      return sendResponse(res, 400, false, 'Invalid pagination parameters', null);
    }
    const result = await catalogService.getAdminProducts(req.query);
    return sendResponse(res, 200, true, 'Products fetched.', {
      products: result.products,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await catalogService.createProduct(req.body);
    await createAuditLog({
      adminId: req.user.userId,
      action: 'PRODUCT_CREATE',
      targetId: product._id.toString(),
      details: { name: product.name, sku: product.sku },
    });
    return sendResponse(res, 201, true, 'Product created.', product);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.bulkCreateProducts = async (req, res) => {
  try {
    const results = await catalogService.bulkCreateProducts(req.body.products || []);
    return sendResponse(res, 200, true, 'Bulk create completed.', results);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await catalogService.updateProduct(req.params.id, req.body);
    await createAuditLog({
      adminId: req.user.userId,
      action: 'PRODUCT_UPDATE',
      targetId: req.params.id,
      details: { changes: req.body },
    });
    return sendResponse(res, 200, true, 'Product updated.', product);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.softDeleteProduct = async (req, res) => {
  try {
    const product = await catalogService.softDeleteProduct(req.params.id);
    await createAuditLog({
      adminId: req.user.userId,
      action: 'PRODUCT_DELETE',
      targetId: req.params.id,
      details: { name: product.name },
    });
    return sendResponse(res, 200, true, 'Product deleted.', product);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.toggleVisibility = async (req, res) => {
  try {
    const product = await catalogService.toggleVisibility(req.params.id, req.body.isVisible);
    return sendResponse(res, 200, true, 'Visibility updated.', product);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.toggleShowPrice = async (req, res) => {
  try {
    const product = await catalogService.toggleShowPrice(req.params.id, req.body.showPrice);
    return sendResponse(res, 200, true, 'Show price updated.', product);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.bulkMarkup = async (req, res) => {
  try {
    const result = await catalogService.bulkMarkup(req.body);
    await createAuditLog({
      adminId: req.user.userId,
      action: 'PRODUCT_BULK_MARKUP',
      targetId: null,
      details: req.body,
    });
    return sendResponse(res, 200, true, 'Bulk markup applied.', result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getSearchLogs = async (req, res) => {
  try {
    // Input type validation for pagination
    const page  = sanitizeInteger(req.query.page, 1);
    const limit = sanitizeInteger(req.query.limit, 20);
    
    if (page < 1 || limit < 1 || limit > 100) {
      return sendResponse(res, 400, false, 'Invalid pagination parameters', null);
    }

    const result = await catalogService.getSearchLogs(page, limit);
    return sendResponse(res, 200, true, 'Search logs fetched.', result.logs, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate('brand', 'name')
      .populate('category', 'name')
      .maxTimeMS(10000) // Security: Query timeout (10s for export)
      .limit(10000) // Security: Reasonable limit for CSV export
      .lean();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=btg_products.csv');

    const header = 'sku,name,brand,category,size,pattern,ply,retailPrice,wholesalePrice,stock';
    const rows = [];
    for (const p of products) {
      for (const v of (p.variants || [])) {
        rows.push([
          v.sku || '', p.name, p.brand?.name || '', p.category?.name || '',
          p.specs?.size || '', p.specs?.pattern || '',
          v.ply || '', v.retailPrice, v.wholesalePrice, v.stock
        ].map(val => '"' + String(val).replace(/"/g,'""') + '"').join(','));
      }
    }
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    return handleError(res, err);
  }
};
