/**
 * Import Products from CSV to MongoDB
 * Usage: node --env-file=.env scripts/import-products.js
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import models
const Product = require('../src/modules/catalog/Product.model');
const Category = require('../src/modules/catalog/Category.model');
const Brand = require('../src/modules/catalog/Brand.model');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/btg-v4';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    data.push(row);
  }
  
  return data;
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Extract unique categories and brands
function extractCategoriesAndBrands(products) {
  const categories = new Set();
  const brands = new Set();
  
  products.forEach(product => {
    if (product.pattern) {
      categories.add(product.pattern);
    }
    if (product.name) {
      // Extract brand from product name (first word)
      const brandName = product.name.split(' ')[0];
      brands.add(brandName);
    }
  });
  
  return {
    categories: Array.from(categories),
    brands: Array.from(brands),
  };
}

async function createCategoriesAndBrands(products) {
  const { categories, brands } = extractCategoriesAndBrands(products);
  
  console.log(`\n📁 Creating ${categories.length} categories...`);
  const categoryMap = {};
  
  for (const categoryName of categories) {
    const slug = generateSlug(categoryName);
    let category = await Category.findOne({ slug });
    
    if (!category) {
      category = await Category.create({
        name: categoryName,
        slug,
        description: `${categoryName} tyres category`,
        isActive: true,
      });
      console.log(`  ✓ Created category: ${categoryName}`);
    } else {
      console.log(`  → Category exists: ${categoryName}`);
    }
    
    categoryMap[categoryName] = category._id;
  }
  
  console.log(`\n🏷️  Creating ${brands.length} brands...`);
  const brandMap = {};
  
  for (const brandName of brands) {
    const slug = generateSlug(brandName);
    let brand = await Brand.findOne({ slug });
    
    if (!brand) {
      brand = await Brand.create({
        name: brandName,
        slug,
        description: `${brandName} brand tyres`,
        isActive: true,
      });
      console.log(`  ✓ Created brand: ${brandName}`);
    } else {
      console.log(`  → Brand exists: ${brandName}`);
    }
    
    brandMap[brandName] = brand._id;
  }
  
  return { categoryMap, brandMap };
}

async function importProducts() {
  console.log('🚀 Starting product import...\n');
  
  // Parse CSV
  const csvPath = path.join(__dirname, '../BTG_Product_Catalog.csv');
  const products = parseCSV(csvPath);
  console.log(`📄 Found ${products.length} products in CSV\n`);
  
  // Create categories and brands
  const { categoryMap, brandMap } = await createCategoriesAndBrands(products);
  
  // Import products
  console.log(`\n📦 Importing ${products.length} products...`);
  let imported = 0;
  let skipped = 0;
  
  for (const row of products) {
    try {
      // Check if product already exists
      const existingProduct = await Product.findOne({ sku: row.sku });
      if (existingProduct) {
        console.log(`  → Skipped (exists): ${row.name}`);
        skipped++;
        continue;
      }
      
      // Extract brand from name
      const brandName = row.name.split(' ')[0];
      const categoryName = row.pattern || 'Standard';
      
      // Create product
      const product = await Product.create({
        sku: row.sku,
        name: row.name,
        slug: generateSlug(row.name),
        brand: brandMap[brandName],
        category: categoryMap[categoryName],
        basePrice: parseInt(row.wholesalePrice) || 0,
        retailPrice: parseInt(row.retailPrice) || 0,
        stock: parseInt(row.stock) || 0,
        specifications: {
          size: row.size,
          pattern: row.pattern,
          plyRating: row.ply,
          designModel: row.designModel,
        },
        description: `${row.name} - ${row.size} - ${row.pattern}`,
        isActive: true,
        isFeatured: false,
      });
      
      console.log(`  ✓ Imported: ${product.name}`);
      imported++;
      
    } catch (error) {
      console.error(`  ✗ Error importing ${row.name}:`, error.message);
    }
  }
  
  console.log('\n✅ Import completed!');
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${products.length}`);
}

async function main() {
  try {
    await connectDB();
    await importProducts();
    
    console.log('\n🎉 All done! Disconnecting...');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
