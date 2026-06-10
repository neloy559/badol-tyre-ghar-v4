import React from 'react';
import { Package } from 'lucide-react';
import ProductCard from '../ProductCard/ProductCard';
import { SkeletonCard } from '../../ui/SkeletonCard/SkeletonCard';
import styles from './ProductGrid.module.css';

export default function ProductGrid({ products, loading, error, onClearFilters }) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <Package size={48} />
        </div>
        <h2 className={styles.emptyTitle}>Error Loading Products</h2>
        <p className={styles.emptyText}>{error}</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <Package size={48} />
        </div>
        <h2 className={styles.emptyTitle}>No Products Found</h2>
        <p className={styles.emptyText}>
          Try adjusting your filters or search terms
        </p>
        {onClearFilters && (
          <button className={styles.clearBtn} onClick={onClearFilters}>
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <ProductCard key={product._id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
