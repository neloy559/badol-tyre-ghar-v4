import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({ mobileOpen = false, onMobileClose }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);

  // Fetch categories and brands from API
  const { data: categoriesData } = useFetch('/categories');
  const { data: brandsData } = useFetch('/brands');

  const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.categories || []);
  const brands = Array.isArray(brandsData) ? brandsData : (brandsData?.brands || []);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const brandParam = searchParams.get('brand');

    setSelectedCategories(categoryParam ? categoryParam.split(',') : []);
    setSelectedBrands(brandParam ? brandParam.split(',') : []);
  }, [searchParams]);

  function handleCategoryChange(slug) {
    const newCategories = selectedCategories.includes(slug)
      ? selectedCategories.filter(c => c !== slug)
      : [...selectedCategories, slug];
    updateParams('category', newCategories);
  }

  function handleBrandChange(slug) {
    const newBrands = selectedBrands.includes(slug)
      ? selectedBrands.filter(b => b !== slug)
      : [...selectedBrands, slug];
    updateParams('brand', newBrands);
  }

  function updateParams(key, values) {
    const newParams = new URLSearchParams(searchParams);
    if (values.length > 0) {
      newParams.set(key, values.join(','));
    } else {
      newParams.delete(key);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }

  function handleClearAll() {
    const newParams = new URLSearchParams();
    const searchQuery = searchParams.get('search');
    if (searchQuery) newParams.set('search', searchQuery);
    setSearchParams(newParams);
  }

  const hasFilters = selectedCategories.length > 0 || selectedBrands.length > 0;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className={styles.backdrop}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <div className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <div className={styles.headerActions}>
            {hasFilters && (
              <button type="button" className={styles.clearBtn} onClick={handleClearAll}>
                Clear All
              </button>
            )}
            {/* Mobile close button */}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onMobileClose}
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Categories</h3>
          <div className={styles.checkboxGroup}>
            {categories.length === 0 && (
              <p className={styles.emptyText}>No categories available</p>
            )}
            {categories.map(cat => (
              <label key={cat._id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.slug)}
                  onChange={() => handleCategoryChange(cat.slug)}
                />
                <span>{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Brands */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Brands</h3>
          <div className={styles.checkboxGroup}>
            {brands.length === 0 && (
              <p className={styles.emptyText}>No brands available</p>
            )}
            {brands.map(brand => (
              <label key={brand._id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.slug)}
                  onChange={() => handleBrandChange(brand.slug)}
                />
                <span>{brand.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mobile apply button */}
        <button
          type="button"
          className={styles.applyBtn}
          onClick={onMobileClose}
        >
          Apply Filters
        </button>
      </div>
    </>
  );
}
