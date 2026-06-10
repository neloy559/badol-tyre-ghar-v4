'use strict';

const { createAuditLog } = require('../utils/auditLogger');

/**
 * activityLogger — writes an AuditLog for every mutating admin/editor request.
 * Fire-and-forget: never blocks the response pipeline.
 * Attach AFTER protect() on admin routes.
 */
function activityLogger(req, res, next) {
  const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];
  const isAdminOrEditor =
    req.user && (req.user.role === 'admin' || req.user.role === 'editor');
  const isMutating = MUTATING_METHODS.includes(req.method);

  if (isAdminOrEditor && isMutating) {
    const action = `${req.method} ${req.originalUrl}`;
    const adminId = req.user.userId || req.user._id || req.user.id;

    createAuditLog({
      adminId,
      action,
      targetId: req.params.id || null,
      details: {
        body: req.body || {},
        query: req.query || {},
      },
    }).catch((err) => {
      console.warn('[activityLogger] Failed to write AuditLog:', err.message);
    });
  }

  return next();
}

module.exports = activityLogger;
