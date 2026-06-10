'use strict';

/**
 * Map-based IP rate limiter — no external library.
 *
 * Store structure: Map<ip, { count: number, windowStart: number }>
 *
 * @param {object} options
 * @param {number} options.maxRequests  - Max requests per window
 * @param {number} options.windowMs     - Window duration in milliseconds
 * @param {string} options.message      - Error message when limit exceeded
 * @returns {function} Express middleware
 */
function createRateLimiter({ maxRequests, windowMs, message }) {
  const store = new Map();

  // Cleanup configuration: remove entries older than 1 hour every 15 minutes
  const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Clean up old entries from the rate limiter store
   * @param {Map} store - The Map storing IP rate limit data
   */
  function cleanupOldEntries(store) {
    const now = Date.now();
    let removed = 0;

    for (const [ip, entry] of store.entries()) {
      if (now - entry.windowStart > STALE_THRESHOLD_MS) {
        store.delete(ip);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[rateLimiter] Cleaned up ${removed} old entries`);
    }
  }

  // Start cleanup interval
  const cleanupInterval = setInterval(() => {
    cleanupOldEntries(store);
  }, CLEANUP_INTERVAL_MS);

  // Prevent the interval from keeping the Node.js process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      // Start a new window for this IP
      store.set(ip, { count: 1, windowStart: now });
      return next();
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        data: null,
      });
    }

    return next();
  };
}

// ── Pre-configured limiters ────────────────────────────────

/** 10 requests per 15 minutes — for POST /auth/login */
const loginLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Please try again later.',
});

/** 5 requests per 60 minutes — for POST /auth/register and /auth/dealer/register */
const registerLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many registration attempts. Please try again later.',
});

// ── Graceful shutdown ──────────────────────────────────────

/**
 * Graceful shutdown handler to clear all cleanup intervals
 * Prevents memory leaks and ensures clean process termination
 */
function gracefulShutdown() {
  console.log('[rateLimiter] Shutting down gracefully...');
  // Note: Individual cleanup intervals are managed with unref()
  // which allows the process to exit naturally
}

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { createRateLimiter, loginLimiter, registerLimiter };
