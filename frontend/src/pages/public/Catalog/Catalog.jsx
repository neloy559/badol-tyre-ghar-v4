import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, SlidersHorizontal } from 'lucide-react';
import useFetch from '../../../hooks/useFetch';
import { usePdfDownload } from '../../../hooks/usePdfDownload';
import { useAuth } from '../../../context/AuthContext';
import ProductGrid from '../../../components/catalog/ProductGrid/ProductGrid';
import FilterSidebar from '../../../components/catalog/FilterSidebar/FilterSidebar';
import SearchInput from '../../../components/ui/SearchInput/SearchInput';
import { Pagination } from '../../../components/ui/Pagination/Pagination';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import { PAGINATION_LIMIT } from '../../../utils/constants';
import styles from './Catalog.module.css';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { download, generating, canDownload } = usePdfDownload();
  const { loading: authLoading } = useAuth();
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';

  // Count active filters for badge
  const activeFilterCount = (category ? category.split(',').length : 0) + (brand ? brand.split(',').length : 0);

  const queryString = new URLSearchParams({
    page: page.toString(),
    limit: PAGINATION_LIMIT.toString(),
    ...(search && { search }),
    ...(category && { category }),
    ...(brand && { brand })
  }).toString();

  const { data, loading, error } = useFetch(`/catalog?${queryString}`, !authLoading);

  useEffect(() => {
    document.title = 'Catalog — Badol Tyre Ghar';
  }, []);

  function handleSearchChange(newSearch) {
    const newParams = new URLSearchParams(searchParams);
    if (newSearch) {
      newParams.set('search', newSearch);
    } else {
      newParams.delete('search');
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }

  function handlePageChange(newPage) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleClearFilters() {
    setSearchParams({});
  }

  function handlePdfDownload() {
    const categoryParam = searchParams.get('category');
    const label = categoryParam
      ? categoryParam.split(',').map(c => c.charAt(0).toUpperCase() + c.slice(1)).join('_')
      : 'All_Products';
    download(categoryParam, label);
  }

  const products = data?.products || [];
  const pagination = data?.pagination || {};
  const totalProducts = pagination.total || 0;

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Product Catalog</h1>
            <button
              type="button"
              className={styles.pdfBtn}
              onClick={handlePdfDownload}
              disabled={!canDownload || generating}
              title={!canDownload ? 'Available for approved dealers only' : ''}
            >
              <Download size={18} />
              {generating ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>

          {/* Mobile filter toggle */}
          <button
            type="button"
            className={`${styles.filterToggle} ${activeFilterCount > 0 ? styles.filterToggleActive : ''}`}
            onClick={() => setShowFilters(prev => !prev)}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className={styles.main}>
          {/* Sidebar: always visible on desktop, toggle on mobile */}
          <FilterSidebar mobileOpen={showFilters} onMobileClose={() => setShowFilters(false)} />

          <div className={styles.content}>
            <div className={styles.toolbar}>
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by name, brand, size..."
              />
              <span className={styles.resultCount}>
                {totalProducts} product{totalProducts !== 1 ? 's' : ''} found
              </span>
            </div>

            <ProductGrid
              products={products}
              loading={loading}
              error={error}
              onClearFilters={handleClearFilters}
            />

            {!loading && !error && pagination.totalPages > 1 && (
              <div className={styles.paginationWrap}>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
