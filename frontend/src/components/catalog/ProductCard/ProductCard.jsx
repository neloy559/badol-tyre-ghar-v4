import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getCategoryLogo, STOCK_LABELS } from '../../../utils/constants';
import { formatPrice, getCategorySlug, getStockStatus } from '../../../utils/formatters';
import { cardImage } from '../../../utils/imageUtils';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, priority = false }) {
  const { user, isDealer } = useAuth();
  const navigate = useNavigate();

  if (!product) return null;

  const firstVariant  = product.variants?.[0];
  const totalStock    = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
  const stockStatus   = product.stockStatus || getStockStatus(totalStock);
  const stockInfo     = STOCK_LABELS[stockStatus] || STOCK_LABELS.out_of_stock;
  const categorySlug  = getCategorySlug(product.category);
  const categoryName  = typeof product.category === 'object' ? product.category?.name : product.category;

  // Raw image → Cloudinary-transformed URL (400×300, WebP/AVIF, q_auto)
  const rawSrc    = product.images?.[0] || product.image || null;
  const imageSrc  = rawSrc ? cardImage(rawSrc) : getCategoryLogo(categorySlug);
  const fallback  = getCategoryLogo(categorySlug);

  let priceDisplay = null;
  if (isDealer && firstVariant?.tierPrice != null) {
    priceDisplay = formatPrice(firstVariant.tierPrice);
  } else if (!user || (user.role === 'dealer' && user.registrationStatus === 'pending')) {
    priceDisplay = null;
  } else if (firstVariant?.price != null) {
    priceDisplay = formatPrice(firstVariant.price);
  }

  return (
    <div className={styles.card} onClick={() => navigate(`/catalog/${product.slug}`)}>
      <div className={styles.imageWrap}>
        <img
          src={imageSrc}
          alt={product.name}
          className={styles.image}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : 'low'}
          onError={e => {
            e.target.onerror = null;
            e.target.src = fallback;
          }}
        />
        <span className={`${styles.badge} ${styles[stockInfo.cls.replace(/-/g, '')]}`}>
          {stockInfo.text}
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.category}>{categoryName}</div>
        <h3 className={styles.name}>{product.name}</h3>
        {product.specs?.size && (
          <div className={styles.specs}>Size: {product.specs.size}</div>
        )}
        <div className={styles.footer}>
          {priceDisplay
            ? <div className={styles.price}>{priceDisplay}</div>
            : <div className={styles.callForPrice}>Call for Price</div>
          }
        </div>
      </div>
    </div>
  );
}
