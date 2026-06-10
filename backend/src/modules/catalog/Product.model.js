'use strict';

const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    sku:           { type: String, required: true },
    ply:           { type: Number, default: null },
    retailPrice:   { type: Number, required: true, min: 0 },
    wholesalePrice:{ type: Number, required: true, min: 0 },
    stock:         { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name:  { type: String, required: [true, 'Product name is required.'], trim: true },
    slug:  { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku:   { type: String, required: true, unique: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand:    { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    images: [{ type: String }],
    specs: {
      size:    { type: String, default: '' },
      pattern: { type: String, default: '' },
      rim:     { type: String, default: '' },
      origin:  { type: String, default: '' },
    },
    variants:   [variantSchema],
    isVisible:  { type: Boolean, default: true },
    showPrice:  { type: Boolean, default: false },
    searchTags: [{ type: String }],
    viewCount:  { type: Number, default: 0, min: 0 },
    isDeleted:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// -- Indexes ------------------------------------------------
// SECURITY & PERFORMANCE: Indexes prevent slow queries that can be exploited for DoS attacks

// slug: Unique index for single product lookups
// Used in: GET /products/:slug (primary product detail endpoint)
// Ensures O(log n) lookup instead of O(n) collection scan
// slug index handled by unique: true in schema field

// sku: Unique index for product identification and admin operations
// Used in: Product creation, SKU-based lookups, inventory management
// sku index handled by unique: true in schema field

// category + isDeleted: Compound index for catalog filtering
// Used in: GET /products?category=X (most common catalog query)
// Allows efficient filtering by category while excluding deleted products
productSchema.index({ category: 1, isDeleted: 1 });

// brand + isDeleted: Compound index for brand-based filtering
// Used in: GET /products?brand=X (brand catalog pages)
// Allows efficient filtering by brand while excluding deleted products
productSchema.index({ brand: 1, isDeleted: 1 });

// isVisible + isDeleted: Compound index for public catalog queries
// Used in: Frontend catalog (only show visible, non-deleted products)
// Critical for customer-facing queries
productSchema.index({ isVisible: 1, isDeleted: 1 });

// Text search index: Full-text search across multiple fields
// Used in: GET /products?search=query (search functionality)
// Allows efficient text search across name, SKU, specs, and tags
productSchema.index(
  { name: 'text', sku: 'text', 'specs.size': 'text', 'specs.pattern': 'text', searchTags: 'text' },
  { name: 'product_text_index' }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
module.exports = Product;

