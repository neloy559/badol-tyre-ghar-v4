import React from 'react';
import styles from './Pagination.module.css';

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showMax = 5;

  let start = Math.max(1, currentPage - Math.floor(showMax / 2));
  let end = Math.min(totalPages, start + showMax - 1);

  if (end - start < showMax - 1) {
    start = Math.max(1, end - showMax + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        className={`${styles.button} ${!hasPrev ? styles.disabled : ''}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev}
      >
        Previous
      </button>

      <div className={styles.pages}>
        {start > 1 && (
          <>
            <button className={styles.pageButton} onClick={() => onPageChange(1)}>
              1
            </button>
            {start > 2 && <span className={styles.ellipsis}>...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            className={`${styles.pageButton} ${page === currentPage ? styles.active : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className={styles.ellipsis}>...</span>}
            <button className={styles.pageButton} onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
      </div>

      <button
        className={`${styles.button} ${!hasNext ? styles.disabled : ''}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
      >
        Next
      </button>
    </div>
  );
}
