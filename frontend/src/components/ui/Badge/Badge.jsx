import React from 'react';
import styles from './Badge.module.css';

export default function Badge({ children, variant = 'default', className = '' }) {
  let variantClass = styles.default;
  if (variant === 'success') variantClass = styles.success;
  if (variant === 'warning') variantClass = styles.warning;
  if (variant === 'danger')  variantClass = styles.danger;
  if (variant === 'info')    variantClass = styles.info;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
