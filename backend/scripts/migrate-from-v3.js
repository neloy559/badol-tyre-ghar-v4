'use strict';
/**
 * Master Migration: btg_v3 → btg_v4
 * Pulls real products, categories, brands, site config from v3
 * Maps v3 schema → v4 schema
 * Usage: node --env-file=.env scripts/migrate-from-v3.js
 */

const mongoose = require('mongoose');

// ── v4 models ──────────────────────────────────────────────
const ProductV4  = require('../src/modules/catalog/Product.model');
const CategoryV4 = require('../src/modules/catalog/Category.model');
const BrandV4    = require('../src/modules/catalog/Brand.model');
const SiteConfig = require('../src/modules/siteConfig/SiteConfig.model');

// ── v3 connection string (same cluster, different DB) ──────
const V3_URI = process.env.MONGODB_URI.replace('/btg_v4?', '/btg_v3?');
const V4_URI = process.env.MONGODB_URI;

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('🚀 BTG v3 → v4 Migration Starting...\n');

  // ── Connect both DBs ───────────────────────────────────────
  const v3Conn = await mongoose.createConnection(V3_URI).asPromise();
  const v4Conn = await mongoose.createConnection(V4_URI).asPromise();
  console.log('✅ Connected to btg_v3 (source)');
  console.log('✅ Connected to btg_v4 (destination)\n');

  // ── v3 schemas (minimal, just enough to read) ──────────────
  const BrandSchemaV3 = new mongoose.Schema({ name: String, slug: String, logo: String, isActive: Boolean }, { strict: false });
  const CategorySchemaV3 = new mongoose.Schema({ name: String, slug: String, image: String, isActive: Boolean }, { strict: false });
  const ProductSchemaV3 = new mongoose.Schema({}, { strict: false });
  const SiteConfigSchemaV3 = new mongoose.Schema({}, { strict: false });

  const BrandV3    = v3Conn.model('Brand',      BrandSchemaV3);
  const CatV3      = v3Conn.model('Category',   CategorySchemaV3);
  const ProdV3     = v3Conn.model('Product',    ProductSchemaV3);
  const SiteV3     = v3Conn.model('SiteConfig', SiteConfigSchemaV3);

  // ── v4 models using v4 connection ─────────────────────────
  const CatV4Model     = v4Conn.model('Category',   CategoryV4.schema);
  const BrandV4Model   = v4Conn.model('Brand',       BrandV4.schema);
  const ProdV4Model    = v4Conn.model('Product',     ProductV4.schema);
  const SiteV4Model    = v4Conn.model('SiteConfig',  SiteConfig.schema);

  // ── Step 1: Clear v4 catalog data ─────────────────────────
  console.log('🗑️  Clearing existing v4 catalog data...');
  await ProdV4Model.deleteMany({});
  await CatV4Model.deleteMany({});
  await BrandV4Model.deleteMany({});
  console.log('   Done.\n');

  // ── Step 2: Migrate Categories ────────────────────────────
  const v3Cats = await CatV3.find({}).lean();
  console.log(`📁 Migrating ${v3Cats.length} categories...`);
  const catIdMap = {}; // v3 _id → v4 _id

  for (const cat of v3Cats) {
    try {
      const slug = cat.slug || slugify(cat.name);
      const newCat = await CatV4Model.create({
        name:         cat.name,
        slug:         slug,
        isActive:     cat.isActive !== false,
        displayOrder: cat.displayOrder || 0,
      });
      catIdMap[cat._id.toString()] = newCat._id;
      console.log(`   ✓ ${cat.name}`);
    } catch (e) {
      console.log(`   ✗ ${cat.name}: ${e.message}`);
    }
  }

  // ── Step 3: Migrate Brands ────────────────────────────────
  const v3Brands = await BrandV3.find({}).lean();
  console.log(`\n🏷️  Migrating ${v3Brands.length} brands...`);
  const brandIdMap = {}; // v3 _id → v4 _id

  for (const brand of v3Brands) {
    try {
      const slug = brand.slug || slugify(brand.name);
      const newBrand = await BrandV4Model.create({
        name:     brand.name,
        slug:     slug,
        logo:     brand.logo || '',
        isActive: brand.isActive !== false,
      });
      brandIdMap[brand._id.toString()] = newBrand._id;
      console.log(`   ✓ ${brand.name} ${brand.logo ? '(has logo)' : ''}`);
    } catch (e) {
      console.log(`   ✗ ${brand.name}: ${e.message}`);
    }
  }

  // ── Step 4: Migrate Products ──────────────────────────────
  const v3Prods = await ProdV3.find({ isDeleted: { $ne: true } }).lean();
  console.log(`\n📦 Migrating ${v3Prods.length} products...`);

  let ok = 0;
  let failed = 0;

  for (const p of v3Prods) {
    try {
      const catId   = p.category   ? catIdMap[p.category.toString()]   : null;
      const brandId = p.brand      ? brandIdMap[p.brand.toString()]     : null;

      // Skip if no category or brand mapping
      if (!catId || !brandId) {
        console.log(`   ⚠️  ${p.name} — missing cat/brand mapping, skipping`);
        failed++;
        continue;
      }

      // Map v3 variants → v4 variants
      const variants = (p.variants || []).map(v => ({
        sku:            v.sku || p.sku,
        ply:            v.ply ? parseInt(v.ply) || null : null,
        retailPrice:    v.pricing?.retail    || 0,
        wholesalePrice: v.pricing?.wholesale || 0,
        stock:          v.inventory?.stock   || 0,
      })).filter(v => v.retailPrice > 0 || v.wholesalePrice > 0);

      // If no variants, create one from top-level data
      if (variants.length === 0) {
        variants.push({
          sku:            p.sku,
          ply:            null,
          retailPrice:    0,
          wholesalePrice: 0,
          stock:          0,
        });
      }

      // Build slug — ensure uniqueness
      const baseSlug = p.slug || slugify(p.name);
      const slug     = baseSlug + '-' + slugify(p.sku);

      await ProdV4Model.create({
        name:       p.name,
        slug:       slug,
        sku:        p.sku,
        category:   catId,
        brand:      brandId,
        images:     p.media || [],
        specs: {
          size:    p.commonSpecs?.size    || '',
          pattern: p.commonSpecs?.pattern || p.categorySpecs?.pattern || '',
          rim:     p.commonSpecs?.rim     || '',
          origin:  p.commonSpecs?.origin  || '',
        },
        variants:   variants,
        isVisible:  p.isVisible !== false,
        showPrice:  p.showPrice !== false,
        searchTags: [...(p.searchTags || []), ...(p.customTags || [])],
        viewCount:  p.meta?.views || 0,
        isDeleted:  false,
      });

      ok++;
      process.stdout.write(`   ✓ ${p.name} (${variants.length} variants, ${variants.reduce((s,v)=>s+v.stock,0)} stock)\n`);
    } catch (e) {
      console.log(`   ✗ ${p.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n   ✅ Products: ${ok} migrated, ${failed} failed\n`);

  // ── Step 5: Migrate Site Config ───────────────────────────
  console.log('⚙️  Migrating site config...');
  try {
    const v3Config = await SiteV3.findOne({}).lean();
    if (v3Config) {
      await SiteV4Model.deleteMany({});
      await SiteV4Model.create({
        siteName:        v3Config.siteName       || 'Badol Tyre Ghar',
        whatsappNumber:  v3Config.whatsappNumber || v3Config.adminWhatsapp || '8801647794452',
        supportEmail:    v3Config.email          || '',
      });
      console.log('   ✓ Site config migrated');
    } else {
      console.log('   ⚠️  No site config found in v3');
    }
  } catch (e) {
    console.log(`   ✗ Site config: ${e.message}`);
  }

  // ── Summary ────────────────────────────────────────────────
  const finalCats   = await CatV4Model.countDocuments();
  const finalBrands = await BrandV4Model.countDocuments();
  const finalProds  = await ProdV4Model.countDocuments();

  console.log('\n═══════════════════════════════════════');
  console.log('✅ MIGRATION COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`   Categories : ${finalCats}`);
  console.log(`   Brands     : ${finalBrands}`);
  console.log(`   Products   : ${finalProds}`);
  console.log('═══════════════════════════════════════\n');

  await v3Conn.close();
  await v4Conn.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
