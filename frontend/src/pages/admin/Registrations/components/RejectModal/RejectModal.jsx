import React, { useState } from 'react';
import styles from './RejectModal.module.css';

export default function RejectModal({ businessName, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');

  function handleConfirm() {
    if (reason.trim().length < 10) {
      setError('Please provide at least 10 characters.');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Reject Dealer Application</h3>
        {businessName && (
          <p className={styles.businessName}>{businessName}</p>
        )}

        <label className={styles.label}>
          Rejection Reason <span className={styles.required}>*</span>
        </label>
        <textarea
          className={styles.textarea}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(''); }}
          placeholder="Explain why this application is being rejected..."
          rows={4}
        />
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            Confirm Rejection
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
