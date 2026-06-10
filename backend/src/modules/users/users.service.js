'use strict';

const User = require('./User.model');
const { createAuditLog } = require('../../utils/auditLogger');
const { createNotificationForAllAdmins } = require('../notifications/notifications.service');

async function getDealers(filters) {
  const page  = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip  = (page - 1) * limit;

  const query = { role: 'dealer', isDeleted: false };

  if (filters.registrationStatus) {
    query.registrationStatus = filters.registrationStatus;
  }
  if (filters.tier) {
    query.tier = filters.tier;
  }

  const total = await User.countDocuments(query);
  const dealers = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000) // Security: Query timeout prevents slow query DoS
    .lean();

  return { total, page, limit, dealers };
}

async function getDealerById(id) {
  const dealer = await User.findById(id)
    .select('-password')
    .maxTimeMS(5000) // Security: Query timeout
    .lean();
  if (!dealer) {
    throw { statusCode: 404, message: 'Dealer not found.' };
  }
  return dealer;
}

async function approveDealer(id, adminId) {
  const dealer = await User.findByIdAndUpdate(
    id,
    { registrationStatus: 'approved', isVerified: true, tier: 'standard' },
    { new: true }
  )
  .select('-password')
  .maxTimeMS(5000); // Security: Query timeout

  if (!dealer) {
    throw { statusCode: 404, message: 'Dealer not found.' };
  }

  await createAuditLog({
    adminId,
    action: 'DEALER_APPROVE',
    targetId: id,
    details: { dealerName: dealer.profile?.businessName || 'N/A' },
  });

  createNotificationForAllAdmins({
    type: 'system',
    title: 'Dealer Approved',
    message: dealer.profile?.businessName + ' has been approved.',
    link: '/admin/dealers/' + id,
  }).catch(err => console.warn('[users] notification error:', err.message));

  return dealer;
}

async function rejectDealer(id, reason, adminId) {
  const dealer = await User.findByIdAndUpdate(
    id,
    { registrationStatus: 'rejected', rejectionReason: reason },
    { new: true }
  )
  .select('-password')
  .maxTimeMS(5000); // Security: Query timeout

  if (!dealer) {
    throw { statusCode: 404, message: 'Dealer not found.' };
  }

  await createAuditLog({
    adminId,
    action: 'DEALER_REJECT',
    targetId: id,
    details: { dealerName: dealer.profile?.businessName || 'N/A', reason },
  });

  createNotificationForAllAdmins({
    type: 'system',
    title: 'Dealer Rejected',
    message: dealer.profile?.businessName + ' application was rejected.',
    link: '/admin/dealers/' + id,
  }).catch(err => console.warn('[users] notification error:', err.message));

  return dealer;
}

async function changeTier(id, tier, adminId) {
  const dealer = await User.findById(id)
    .select('-password')
    .maxTimeMS(5000); // Security: Query timeout
  if (!dealer) {
    throw { statusCode: 404, message: 'Dealer not found.' };
  }

  const oldTier = dealer.tier;
  dealer.tier = tier;
  await dealer.save();

  await createAuditLog({
    adminId,
    action: 'TIER_CHANGE',
    targetId: id,
    details: { oldTier, newTier: tier, dealerName: dealer.profile?.businessName || 'N/A' },
  });

  return dealer;
}

async function softDeleteDealer(id, adminId) {
  const dealer = await User.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
    .select('-password')
    .maxTimeMS(5000); // Security: Query timeout
  if (!dealer) {
    throw { statusCode: 404, message: 'Dealer not found.' };
  }

  await createAuditLog({
    adminId,
    action: 'DEALER_DELETE',
    targetId: id,
    details: { dealerName: dealer.profile?.businessName || 'N/A' },
  });

  return dealer;
}

async function getPendingCount() {
  return User.countDocuments({ role: 'dealer', registrationStatus: 'pending', isDeleted: false });
}

module.exports = {
  getDealers,
  getDealerById,
  approveDealer,
  rejectDealer,
  changeTier,
  softDeleteDealer,
  getPendingCount,
};
