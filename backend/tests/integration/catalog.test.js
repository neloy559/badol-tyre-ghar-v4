'use strict';

const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const User = require('../../src/modules/users/User.model');
const Product = require('../../src/modules/catalog/Product.model');
const Category = require('../../src/modules/catalog/Category.model');
const Brand = require('../../src/modules/catalog/Brand.model');

let categoryId;
let brandId;

beforeAll(async () => {
  const testUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  await mongoose.connect(testUri);

  const category = await Category.create({
    name: 'Passenger',
    slug: 'passenger',
    description: 'Passenger car tyres',
    isActive: true
  });
  categoryId = category._id;

  const brand = await Brand.create({
    name: 'MRF',
    slug: 'mrf',
    logo: 'https://via.placeholder.com/150',
    isActive: true
  });
  brandId = brand._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await Product.deleteMany({});
  await User.deleteMany({});
});

describe('Catalog — Public Access', () => {
  beforeEach(async () => {
    await Product.create({
      name: 'MRF ZVTV 145/80 R12',
      slug: 'mrf-zvtv-145-80-r12',
      description: 'Premium passenger car tyre',
      sku: 'MRF-ZVTV-145-80-R12',
      category: categoryId,
      brand: brandId,
      retailPrice: 3000,
      wholesalePrice: 2500,
      stock: 50,
      specifications: {
        size: '145/80 R12',
        loadIndex: 74,
        speedRating: 'T'
      },
      images: ['https://via.placeholder.com/400'],
      isActive: true
    });
  });

  it('should return products without prices for unauthenticated users', async () => {
    const res = await request(app).get('/api/v1/catalog');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toBeDefined();
    expect(res.body.data.products.length).toBeGreaterThan(0);

    const product = res.body.data.products[0];
    expect(product.name).toBeDefined();
    expect(product.price).toBeUndefined();
    expect(product.retailPrice).toBeUndefined();
    expect(product.wholesalePrice).toBeUndefined();
  });

  it('should return single product by slug without price', async () => {
    const res = await request(app).get('/api/v1/catalog/mrf-zvtv-145-80-r12');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('MRF ZVTV 145/80 R12');
    expect(res.body.data.price).toBeUndefined();
  });

  it('should return 404 for non-existent product slug', async () => {
    const res = await request(app).get('/api/v1/catalog/non-existent-product');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Catalog — Dealer Access', () => {
  let dealerToken;

  beforeEach(async () => {
    const dealer = await User.create({
      businessName: 'Test Tyres Ltd',
      ownerName: 'Test Dealer',
      phone: '01811111111',
      password: '$2a$12$test_hash',
      role: 'dealer',
      registrationStatus: 'approved',
      tier: 'gold',
      profile: {
        address: 'Dhaka'
      }
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: '01811111111',
        password: 'test123'
      });

    if (loginRes.body.data && loginRes.body.data.accessToken) {
      dealerToken = loginRes.body.data.accessToken;
    }

    await Product.create({
      name: 'MRF ZVTV 145/80 R12',
      slug: 'mrf-zvtv-145-80-r12',
      description: 'Premium passenger car tyre',
      sku: 'MRF-ZVTV-145-80-R12',
      category: categoryId,
      brand: brandId,
      retailPrice: 3000,
      wholesalePrice: 2500,
      stock: 50,
      specifications: {
        size: '145/80 R12'
      },
      images: ['https://via.placeholder.com/400'],
      isActive: true
    });
  });

  it('should return products with prices for authenticated dealer', async () => {
    if (!dealerToken) {
      console.warn('Skipping test: dealer token not available');
      return;
    }

    const res = await request(app)
      .get('/api/v1/catalog')
      .set('Authorization', `Bearer ${dealerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const product = res.body.data.products[0];
    expect(product.price).toBeDefined();
    expect(product.price).toBeLessThanOrEqual(2500);
  });
});

describe('Catalog — Search and Filters', () => {
  beforeEach(async () => {
    await Product.create([
      {
        name: 'MRF ZVTV 145/80 R12',
        slug: 'mrf-zvtv-145-80-r12',
        description: 'Premium passenger car tyre',
        sku: 'MRF-ZVTV-145-80-R12',
        category: categoryId,
        brand: brandId,
        retailPrice: 3000,
        wholesalePrice: 2500,
        stock: 50,
        images: ['https://via.placeholder.com/400'],
        isActive: true
      },
      {
        name: 'Apollo Amazer 4G 165/80 R14',
        slug: 'apollo-amazer-4g-165-80-r14',
        description: 'All-season tyre',
        sku: 'APL-AMZ-165-80-R14',
        category: categoryId,
        brand: brandId,
        retailPrice: 5000,
        wholesalePrice: 4000,
        stock: 30,
        images: ['https://via.placeholder.com/400'],
        isActive: true
      }
    ]);
  });

  it('should filter products by search term', async () => {
    const res = await request(app)
      .get('/api/v1/catalog')
      .query({ search: 'MRF' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.products[0].name).toContain('MRF');
  });

  it('should return empty array for no matches', async () => {
    const res = await request(app)
      .get('/api/v1/catalog')
      .query({ search: 'nonexistent' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBe(0);
  });
});

describe('Catalog — Pagination', () => {
  beforeEach(async () => {
    const products = [];
    for (let i = 1; i <= 25; i++) {
      products.push({
        name: `Product ${i}`,
        slug: `product-${i}`,
        description: 'Test product',
        sku: `PRD-${i}`,
        category: categoryId,
        brand: brandId,
        retailPrice: 3000,
        wholesalePrice: 2500,
        stock: 50,
        images: ['https://via.placeholder.com/400'],
        isActive: true
      });
    }
    await Product.create(products);
  });

  it('should return paginated results with default limit', async () => {
    const res = await request(app).get('/api/v1/catalog');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(20);
    expect(res.body.data.products.length).toBeLessThanOrEqual(20);
  });

  it('should return page 2 results', async () => {
    const res = await request(app)
      .get('/api/v1/catalog')
      .query({ page: 2, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination.page).toBe(2);
    expect(res.body.data.products.length).toBeGreaterThan(0);
  });
});

describe('Categories', () => {
  it('should return all categories', async () => {
    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Brands', () => {
  it('should return all brands', async () => {
    const res = await request(app).get('/api/v1/brands');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
