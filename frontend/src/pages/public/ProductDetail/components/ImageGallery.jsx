import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCategoryLogo } from '../../../../utils/constants';
import { heroImage, thumbImage } from '../../../../utils/imageUtils';
import styles from './ImageGallery.module.css';

export default function ImageGallery({ images = [], productName, category }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const touchEndX   = useRef(null);
  const SWIPE_THRESHOLD = 50; // px

  const fallback     = getCategoryLogo(category);
  // Apply Cloudinary transforms — keep fallback logos as-is
  const displayImages = (images.length > 0 ? images : [fallback]).map((img, i) =>
    i === 0 ? (heroImage(img) || img) : (heroImage(img) || img)
  );
  const thumbImages = (images.length > 0 ? images : [fallback]).map(img => thumbImage(img) || img);
  const hasMultiple   = displayImages.length > 1;

  const next = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % displayImages.length);
  }, [displayImages.length]);

  const prev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  // Reset to first image when product changes
  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  // Auto-rotate every 4s when multiple images exist
  useEffect(() => {
    if (!hasMultiple) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [hasMultiple, next]);

  // Touch handlers for swipe
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current   = null;
  }

  function handleTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      delta > 0 ? next() : prev();
    }
    touchStartX.current = null;
    touchEndX.current   = null;
  }

  return (
    <div className={styles.gallery}>
      {/* Main Image */}
      <div
        className={styles.mainWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.mainImageContainer}>
          <img
            key={activeIndex}
            src={displayImages[activeIndex]}
            alt={`${productName} — image ${activeIndex + 1}`}
            className={styles.mainImage}
            loading="eager"
            decoding="async"
            fetchpriority="high"
            onError={e => {
              e.target.onerror = null;
              e.target.src = fallback;
              e.target.classList.add(styles.fallback);
            }}
          />
        </div>

        {/* Nav buttons */}
        {hasMultiple && (
          <>
            <button
              type="button"
              className={`${styles.navButton} ${styles.prev}`}
              onClick={prev}
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.next}`}
              onClick={next}
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className={styles.dots}>
            {displayImages.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails — desktop only, hidden on mobile */}
      {hasMultiple && (
        <div className={styles.thumbnails}>
          {thumbImages.map((img, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.thumbnail} ${i === activeIndex ? styles.active : ''}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${i + 1}`}
                loading="lazy"
                decoding="async"
                onError={e => {
                  e.target.onerror = null;
                  e.target.src = fallback;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
