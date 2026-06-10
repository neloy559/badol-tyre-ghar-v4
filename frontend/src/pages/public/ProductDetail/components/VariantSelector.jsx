import React from 'react';
import styles from './VariantSelector.module.css';

export default function VariantSelector({ variants = [], selectedSku, onSelect, category }) {
  if (!variants || variants.length === 0) return null;

  // Category-specific logic: Tyres show PLY, Tubes/Flaps do NOT
  const categorySlug = (
    typeof category === 'object' ? (category?.slug || '') : (category || '')
  ).toLowerCase();
  const showPly = categorySlug.includes('tyre') && !categorySlug.includes('tube');

  // Deduplicate variants by SKU
  const seen = new Set();
  const uniqueVariants = variants.filter(v => {
    if (!v.sku || seen.has(v.sku)) return false;
    seen.add(v.sku);
    return true;
  });

  // Single variant — show as info strip, not a selector
  if (uniqueVariants.length === 1) {
    const v = uniqueVariants[0];
    return (
      <div className={styles.singleVariant}>
        {showPly && v.ply && (
          <span className={styles.singleChip}>
            <span className={styles.chipLabel}>PLY</span>
            <span className={styles.chipVal}>{v.ply}</span>
          </span>
        )}
        {v.designModel && (
          <span className={styles.singleChip}>
            <span className={styles.chipLabel}>Model</span>
            <span className={styles.chipVal}>{v.designModel}</span>
          </span>
        )}
        {v.sku && (
          <span className={styles.singleChip}>
            <span className={styles.chipLabel}>SKU</span>
            <span className={styles.chipVal}>{v.sku}</span>
          </span>
        )}
      </div>
    );
  }

  // Multiple variants — show selector
  return (
    <div className={styles.selector}>
      <label className={styles.label}>
        Select Variant{showPly ? ' / PLY Rating' : ''}
      </label>
      <div className={styles.grid}>
        {uniqueVariants.map((variant) => {
          const isActive   = variant.sku === selectedSku;
          const isDisabled = variant.stockStatus === 'out_of_stock';

          return (
            <button
              key={variant.sku}
              type="button"
              className={`${styles.chip} ${isActive ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={() => !isDisabled && onSelect(variant.sku)}
              disabled={isDisabled}
              title={isDisabled ? 'Out of stock' : ''}
            >
              {showPly && variant.ply ? (
                <span className={styles.ply}>{variant.ply} PLY</span>
              ) : null}
              {variant.designModel ? (
                <span className={styles.model}>{variant.designModel}</span>
              ) : null}
              {!variant.ply && !variant.designModel ? (
                <span className={styles.model}>{variant.sku}</span>
              ) : null}
              {isDisabled && <span className={styles.outTag}>Out of Stock</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
