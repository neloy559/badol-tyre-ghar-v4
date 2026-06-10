'use strict';

const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const User = require('../../src/modules/users/User.model');

beforeAll(async () => {
  const testUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  await mongoose.connect(testUri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth — Customer Registration', () => {
  it('should register customer and return accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '01712345678',
        password: 'test123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.phone).toBe('01712345678');
    expect(res.body.data.user.registrationStatus).toBe('approved');
  });

  it('should reject duplicate phone', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '01712345678',
        password: 'test123'
      });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another User',
        phone: '01712345678',
        password: 'test456'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already registered');
  });

  it('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        phone: '01799999999',
        password: 'test123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid phone format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '1234',
        password: 'test123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '01712345678'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth — Dealer Registration', () => {
  it('should register dealer with pending status', async () => {
    const res = await request(app)
      .post('/api/v1/auth/dealer/register')
      .send({
        businessName: 'Test Tyres Ltd',
        ownerName: 'Test Owner',
        phone: '01811111111',
        address: 'Dhaka',
        password: 'test123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('dealer');
    expect(res.body.data.user.registrationStatus).toBe('pending');
    expect(res.body.data.user.tier).toBe('standard');
  });

  it('should reject duplicate phone for dealer', async () => {
    await request(app)
      .post('/api/v1/auth/dealer/register')
      .send({
        businessName: 'Test Tyres Ltd',
        ownerName: 'Test Owner',
        phone: '01811111111',
        address: 'Dhaka',
        password: 'test123'
      });

    const res = await request(app)
      .post('/api/v1/auth/dealer/register')
      .send({
        businessName: 'Another Tyres Ltd',
        ownerName: 'Another Owner',
        phone: '01811111111',
        address: 'Chittagong',
        password: 'test456'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing business name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/dealer/register')
      .send({
        ownerName: 'Test Owner',
        phone: '01811111111',
        address: 'Dhaka',
        password: 'test123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth — Login', () => {
  let customerPhone;
  let customerPassword;
  let dealerPhone;

  beforeEach(async () => {
    customerPhone = '01712345678';
    customerPassword = 'test123';
    dealerPhone = '01811111111';

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Customer',
        phone: customerPhone,
        password: customerPassword
      });

    await request(app)
      .post('/api/v1/auth/dealer/register')
      .send({
        businessName: 'Test Tyres',
        ownerName: 'Test Owner',
        phone: dealerPhone,
        address: 'Dhaka',
        password: 'dealer123'
      });
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: customerPhone,
        password: customerPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.phone).toBe(customerPhone);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: customerPhone,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials.');
  });

  it('should block pending dealer login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: dealerPhone,
        password: 'dealer123'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('pending approval');
  });

  it('should reject non-existent phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: '01799999999',
        password: 'test123'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials.');
  });

  it('should reject missing phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        password: 'test123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth — Protected Routes', () => {
  it('should return 401 for /me without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for /logout without token', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return user profile with valid token', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '01712345678',
        password: 'test123'
      });

    const token = registerRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('01712345678');
  });
});

describe('Auth — Token Refresh', () => {
  it('should return 401 without refresh token cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should refresh token with valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '01712345678',
        password: 'test123'
      });

    const cookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });
});

describe('Auth — Logout', () => {
  it('should logout successfully with valid token', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        phone: '01712345678',
        password: 'test123'
      });

    const token = registerRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Logged out');
  });
});
