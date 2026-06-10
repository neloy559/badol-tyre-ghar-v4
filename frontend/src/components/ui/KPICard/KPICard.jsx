import React from 'react';
import styles from './KPICard.module.css';

export default function KPICard({ icon: Icon, label, value, subLabel }) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>
        {Icon && <Icon className={styles.icon} size={24} />}
      </div>
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value !== null && value !== undefined ? value.toLocaleString() : '—'}</p>
        {subLabel && <p className={styles.subLabel}>{subLabel}</p>}
      </div>
    </div>
  );
}
