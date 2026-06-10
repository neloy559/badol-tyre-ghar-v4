'use strict';
const http = require('http');

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/api/v1' + path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
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
      headers: token ? { Authorization: 'Bearer ' + token } : {}
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
  // Login
  const login = await httpPost('/auth/login', { phone: '01700000000', password: 'admin123' });
  console.log('Login:', login.status, login.body.message);
  
  if (login.status !== 200) {
    console.log('Login failed:', login.body.message);
    process.exit(1);
  }
  
  const token = login.body.data.accessToken;
  
  // Test analytics
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
