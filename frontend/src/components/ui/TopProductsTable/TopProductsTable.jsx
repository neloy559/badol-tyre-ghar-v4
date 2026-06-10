import React from 'react';
import { Eye } from 'lucide-react';
import styles from './TopProductsTable.module.css';

export default function TopProductsTable({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Top Viewed Products</h3>
        <p className={styles.empty}>No data available</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Top Viewed Products</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankColumn}>#</th>
              <th>Product Name</th>
              <th className={styles.viewsColumn}>Views</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product._id || product.slug}>
                <td className={styles.rank}>{index + 1}</td>
                <td className={styles.productName}>{product.name}</td>
                <td className={styles.views}>
                  <Eye size={14} className={styles.eyeIcon} />
                  {product.viewCount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
