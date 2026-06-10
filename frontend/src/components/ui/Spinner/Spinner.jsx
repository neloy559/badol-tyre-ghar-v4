import React from 'react';
import styles from './Spinner.module.css';

export default function Spinner({ size = 'md', className = '' }) {
  let sizeClass = styles.md;
  if (size === 'sm') sizeClass = styles.sm;
  if (size === 'lg') sizeClass = styles.lg;

  return (
    <div className={`${styles.spinner} ${sizeClass} ${className}`}></div>
  );
}
