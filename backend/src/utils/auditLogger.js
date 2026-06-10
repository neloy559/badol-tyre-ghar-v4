'use strict';

// Lazy-require to avoid circular dependency issues at module load time
let AuditLog;

function getAuditLogModel() {
  if (!AuditLog) {
    AuditLog = require('./AuditLog.model');
  }
  return AuditLog;
}

/**
 * createAuditLog — appends an immutable audit record.
 * Append-only: no update or delete operations exposed.
 *
 * @param {object} params
 * @param {string} params.adminId    - ObjectId of acting admin/editor
 * @param {string} params.action     - Descriptive string (e.g. "PRODUCT_UPDATE")
 * @param {string} [params.targetId] - ObjectId of affected document
 * @param {object} [params.details]  - Context: { old, new } or any object
 * @returns {Promise<object>}
 */
async function createAuditLog({ adminId, action, targetId = null, details = {} }) {
  const AuditLogModel = getAuditLogModel();
  return AuditLogModel.create({ adminId, action, targetId, details });
}

module.exports = { createAuditLog };
