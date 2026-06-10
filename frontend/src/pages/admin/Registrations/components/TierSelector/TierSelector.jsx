import React from 'react';
import styles from './TierSelector.module.css';

const TIERS = [
  { value: 'standard', label: 'Standard' },
  { value: 'silver',   label: 'Silver' },
  { value: 'gold',     label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
];

export default function TierSelector({ currentTier, onChange }) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Dealer Tier</label>
      <select
        className={`${styles.select} ${styles[`tier_${currentTier}`]}`}
        value={currentTier}
        onChange={(e) => onChange(e.target.value)}
      >
        {TIERS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}
