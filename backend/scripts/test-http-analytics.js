/**
 * Manual HTTP smoke test for the analytics endpoint.
 *
 * Usage:
 *   ADMIN_PHONE=01XXXXXXXXX ADMIN_PASSWORD=yourpassword node scripts/test-http-analytics.js
 *
 * Requires the backend to be running on localhost:3000.
 */

'use strict';

const http = require('http');

const ADMIN_PHONE    = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PHONE || !ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PHONE and ADMIN_PASSWORD are required environment variables.');
  process.exit(1);
}

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/api/v1' + path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, res => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(out) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/api/v1' + path, method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    };
    const req = http.request(opts, res => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(out) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const login = await httpPost('/auth/login', { phone: ADMIN_PHONE, password: ADMIN_PASSWORD });
  console.log('Login:', login.status, login.body.message);

  if (login.status !== 200) {
    console.error('Login failed:', login.body.message);
    process.exit(1);
  }

  const token = login.body.data.accessToken;

  const analytics = await httpGet('/admin/analytics/summary', token);
  console.log('Analytics:', analytics.status, analytics.body.message);

  if (analytics.status === 200) {
    const d = analytics.body.data;
    console.log('  Products:', d.totalProducts);
    console.log('  Dealers:', d.totalDealers);
    console.log('  Active:', d.activeDealers);
    console.log('  Pending:', d.pendingRegistrations);
    console.log('  BrandChart:', d.productsByBrand?.length, 'items');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
