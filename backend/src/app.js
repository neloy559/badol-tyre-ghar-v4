'use strict';

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// -- CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Origin ' + origin + ' not allowed'));
  },
  credentials: true,
}));

app.use(cookieParser());

// -- Request Size Limits (Security: Prevent DoS via large payloads)
// Limit request body to 1MB to prevent resource exhaustion attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// -- Dev Logger (no morgan)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(new Date().toISOString() + ' ' + req.method + ' ' + req.originalUrl);
    next();
  });
}

// -- Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success:     true,
    message:     'BTG v4 API is healthy',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// -- API Routes
const apiRoutes   = require('./routes/index');
const adminRoutes = require('./routes/admin');
const sitemapRoutes = require('./modules/catalog/sitemap.routes');
app.use('/api/v1', apiRoutes);
app.use('/api/v1/admin', adminRoutes);

// -- Sitemap & Robots (root level — no /api/v1 prefix, required by search engines)
app.use('/', sitemapRoutes);

// -- 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.', data: null });
});

// -- Global Error Handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const isDev       = process.env.NODE_ENV !== 'production';
  const statusCode  = err.statusCode || 500;
  const message     = isDev ? err.message : 'Internal server error.';
  console.error('Unhandled Error:', err.stack);
  res.status(statusCode).json({ success: false, message, data: null });
});

module.exports = app;
