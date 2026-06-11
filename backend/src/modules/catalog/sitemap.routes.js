'use strict';

const express = require('express');
const Product = require('./Product.model');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://badol-tyre-ghar.vercel.app';

// Static pages with their priority and change frequency
const STATIC_PAGES = [
  { url: '/',         changefreq: 'weekly',  priority: '1.0' },
  { url: '/catalog',  changefreq: 'daily',   priority: '0.9' },
  { url: '/register', changefreq: 'monthly', priority: '0.6' },
];

/**
 * GET /sitemap.xml
 * Dynamically generates a sitemap with all visible, non-deleted product pages.
 * Google crawls this to discover and index product pages.
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Fetch all visible, non-deleted product slugs and updatedAt timestamps
    const products = await Product
      .find({ isVisible: true, isDeleted: false })
      .select('slug updatedAt')
      .maxTimeMS(5000)
      .lean();

    const now = new Date().toISOString().split('T')[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += '  <url>\n';
      xml += `    <loc>${FRONTEND_URL}${page.url}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Dynamic product pages
    for (const product of products) {
      const lastmod = product.updatedAt
        ? new Date(product.updatedAt).toISOString().split('T')[0]
        : now;

      xml += '  <url>\n';
      xml += `    <loc>${FRONTEND_URL}/catalog/${product.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    return res.status(200).send(xml);
  } catch (err) {
    console.warn('[sitemap] generation failed:', err.message);
    return res.status(500).send('<?xml version="1.0"?><error>Sitemap generation failed</error>');
  }
});

/**
 * GET /robots.txt
 * Tells search engine crawlers what to index and what to skip.
 * Points to the sitemap for discovery.
 */
router.get('/robots.txt', (req, res) => {
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /cart',
    'Disallow: /profile',
    '',
    `Sitemap: ${FRONTEND_URL}/sitemap.xml`,
  ].join('\n');

  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
  return res.status(200).send(robots);
});

module.exports = router;
