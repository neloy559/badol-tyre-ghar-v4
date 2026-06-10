'use strict';
/**
 * Fix existing products — add proper variants with pricing and stock
 * Usage: node --env-file=.env scripts/fix-products.js
 */

const fs   = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Product  = require('../src/modules/catalog/Product.model');
const Category = require('../src/modules/catalog/Category.model');
const Brand    = require('../src/modules/catalog/Brand.model');

const MONGODB_URI = process.env.MONGODB_URI;

// ── Parse CSV ──────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const lines   = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row    = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB Connected\n');

  const csvPath  = path.join(__dirname, '../BTG_Product_Catalog.csv');
  const rows     = parseCSV(csvPath);

  // Drop existing products so we start clean
  await Product.deleteMany({});
  await Category.deleteMany({});
  await Brand.deleteMany({});
  console.log('🗑️  Cleared old products, categories, brands\n');

  // ── Re-create categories ──────────────────────────────────────────────
  const categoryMap = {};
  const uniqueCategories = [...new Set(rows.map(r => r.pattern).filter(Boolean))];

  for (const name of uniqueCategories) {
    const slug = slugify(name);
    const cat  = await Category.create({ name, slug, isActive: true });
    categoryMap[name] = cat._id;
    console.log(`  📁 Category: ${name}`);
  }

  // ── Re-create brands ──────────────────────────────────────────────────
  const brandMap = {};
  const uniqueBrands = [...new Set(rows.map(r => r.name.split(' ')[0]).filter(Boolean))];

  for (const name of uniqueBrands) {
    const slug  = slugify(name);
    const brand = await Brand.create({ name, slug, isActive: true });
    brandMap[name] = brand._id;
    console.log(`  🏷️  Brand: ${name}`);
  }

  console.log('\n📦 Importing products with variants...\n');

  let ok = 0;
  for (const row of rows) {
    try {
      const brandName    = row.name.split(' ')[0];
      const categoryName = row.pattern;
      const brandId      = brandMap[brandName];
      const categoryId   = categoryMap[categoryName];

      if (!brandId || !categoryId) {
        console.log(`  ✗ Skipping ${row.name} — missing brand or category`);
        continue;
      }

      const wholesalePrice = parseInt(row.wholesalePrice) || 0;
      const retailPrice    = parseInt(row.retailPrice)    || 0;
      const stock          = parseInt(row.stock)          || 0;
      const ply            = isNaN(parseInt(row.ply)) ? null : parseInt(row.ply);

      await Product.create({
        name:  row.name,
        slug:  slugify(row.name) + '-' + slugify(row.sku),
        sku:   row.sku,
        category: categoryId,
        brand:    brandId,
        images:   [],
        specs: {
          size:    row.size    || '',
          pattern: row.pattern || '',
        },
        // Variant holds the pricing + stock (as per the schema)
        variants: [
          {
            sku:            row.sku,
            ply:            ply,
            retailPrice:    retailPrice,
            wholesalePrice: wholesalePrice,
            stock:          stock,
          }
        ],
        isVisible:  true,
        showPrice:  false,
        searchTags: [row.name, brandName, row.size, row.pattern].filter(Boolean),
      });

      console.log(`  ✓ ${row.name} — Stock: ${stock}, Wholesale: ৳${wholesalePrice}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ Error on ${row.name}:`, err.message);
    }
  }

  console.log(`\n✅ Done! Imported ${ok}/${rows.length} products`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
