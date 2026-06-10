import React from 'react';
import styles from './SkeletonCard.module.css';

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.image}></div>
      <div className={styles.content}>
        <div className={styles.title}></div>
        <div className={styles.subtitle}></div>
        <div className={styles.price}></div>
      </div>
    </div>
  );
}
