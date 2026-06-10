import React, { useState } from 'react';
import { formatDate } from '../../../../../utils/formatters';
import TierSelector from '../TierSelector/TierSelector';
import RejectModal from '../RejectModal/RejectModal';
import styles from './DealerCard.module.css';

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function DealerCard({ dealer, tab, onApprove, onReject, onTierChange }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approving, setApproving] = useState(false);

  const profile = dealer.profile || {};

  async function handleApprove() {
    setApproving(true);
    await onApprove(dealer._id);
    setApproving(false);
  }

  async function handleRejectConfirm(reason) {
    await onReject(dealer._id, reason);
    setShowRejectModal(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.businessName}>
            {profile.businessName || profile.name || 'Unknown Business'}
          </h3>
          <span className={`${styles.statusBadge} ${styles[`status_${dealer.registrationStatus}`]}`}>
            {STATUS_LABELS[dealer.registrationStatus] || dealer.registrationStatus}
          </span>
        </div>
        <p className={styles.appliedDate}>
          Registered on {formatDate(dealer.createdAt)}
        </p>
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Owner</span>
          <span className={styles.detailValue}>{profile.ownerName || profile.name || '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Phone</span>
          <span className={styles.detailValue}>{dealer.phone || '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Address</span>
          <span className={styles.detailValue}>{profile.address || '—'}</span>
        </div>
        {tab === 'approved' && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Current Tier</span>
            <span className={`${styles.tierBadge} ${styles[`tier_${dealer.tier}`]}`}>
              {dealer.tier ? dealer.tier.charAt(0).toUpperCase() + dealer.tier.slice(1) : 'Standard'}
            </span>
          </div>
        )}
        {tab === 'rejected' && dealer.rejectionReason && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Rejection Reason</span>
            <span className={`${styles.detailValue} ${styles.rejectionText}`}>
              {dealer.rejectionReason}
            </span>
          </div>
        )}
      </div>

      {tab === 'pending' && (
        <div className={styles.actions}>
          <button
            className={styles.approveBtn}
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? 'Approving...' : 'Approve'}
          </button>
          <button
            className={styles.rejectBtn}
            onClick={() => setShowRejectModal(true)}
          >
            Reject
          </button>
        </div>
      )}

      {tab === 'approved' && (
        <div className={styles.tierRow}>
          <TierSelector
            currentTier={dealer.tier || 'standard'}
            onChange={(tier) => onTierChange(dealer._id, tier)}
          />
        </div>
      )}

      {showRejectModal && (
        <RejectModal
          businessName={profile.businessName || profile.name}
          onConfirm={handleRejectConfirm}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
}
