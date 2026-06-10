import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Shield, Truck, Download, MessageCircle } from 'lucide-react';
import useFetch from '../../../hooks/useFetch';
import { usePdfDownload } from '../../../hooks/usePdfDownload';
import { useAuth } from '../../../context/AuthContext';
import ProductCard from '../../../components/catalog/ProductCard/ProductCard';
import { SkeletonCard } from '../../../components/ui/SkeletonCard/SkeletonCard';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import { CATEGORIES, DEFAULT_SITE_NAME, WHATSAPP_NUMBER } from '../../../utils/constants';
import styles from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();
  const { download, generating, canDownload } = usePdfDownload();
  const { loading: authLoading } = useAuth();
  const { data: featuredData, loading: featuredLoading } = useFetch('/catalog?limit=12', !authLoading);

  useEffect(() => {
    document.title = `${DEFAULT_SITE_NAME} — Wholesale Tyres & Tubes`;
  }, []);

  const featuredProducts = featuredData?.products || [];

  function handleCategoryClick(slug) {
    navigate(`/catalog?category=${slug}`);
  }

  function handlePdfDownload(categorySlug, categoryLabel) {
    if (!canDownload) {
      return;
    }
    download(categorySlug, categoryLabel);
  }

  const whatsappLink = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=Hello! I'm interested in your products.`
    : '#';

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Your Trusted Tyre & Tube Partner</h1>
          <p className={styles.heroSubtitle}>
            Premium quality products at wholesale prices. Serving dealers across Bangladesh with reliability and excellence.
          </p>
          <div className={styles.heroActions}>
            <Link to="/catalog" className={`${styles.heroBtn} ${styles.primaryBtn}`}>
              Browse Catalog
            </Link>
            <Link to="/register" className={`${styles.heroBtn} ${styles.secondaryBtn}`}>
              Become a Dealer
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className={styles.trustStrip}>
        <div className={styles.trustContent}>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <Shield size={24} />
            </div>
            <span className={styles.trustLabel}>Genuine Products</span>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <Truck size={24} />
            </div>
            <span className={styles.trustLabel}>Fast Delivery</span>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <ShoppingBag size={24} />
            </div>
            <span className={styles.trustLabel}>Wholesale Pricing</span>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
          <p className={styles.sectionSubtitle}>
            Explore our wide range of products across different categories
          </p>
        </div>

        <div className={styles.categoryGrid}>
          {CATEGORIES.map(cat => (
            <div key={cat.slug} className={styles.categoryCard}>
              <div className={styles.categoryIcon}>
                <img src={cat.logo} alt={cat.label} className={styles.categoryIconImg} />
              </div>
              <h3 className={styles.categoryName}>{cat.label}</h3>
              <div className={styles.categoryActions}>
                <button
                  type="button"
                  className={styles.categoryBtn}
                  onClick={() => handleCategoryClick(cat.slug)}
                >
                  View Products
                </button>
                <button
                  type="button"
                  className={styles.categoryBtn}
                  onClick={() => handlePdfDownload(cat.slug, cat.label)}
                  disabled={!canDownload || generating}
                  title={!canDownload ? 'Available for approved dealers only' : ''}
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured Products</h2>
          <p className={styles.sectionSubtitle}>
            Check out our most popular and recently added products
          </p>
        </div>

        {featuredLoading ? (
          <div className={styles.productsGrid}>
            <SkeletonCard count={8} />
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className={styles.productsGrid}>
            {featuredProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      {/* WhatsApp CTA Section */}
      <section className={styles.section}>
        <div className={styles.whatsappCta}>
          <h2 className={styles.whatsappTitle}>Need Help? Let's Talk!</h2>
          <p className={styles.whatsappText}>
            Have questions or need assistance? Our team is ready to help you via WhatsApp.
          </p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={styles.whatsappBtn}>
            <MessageCircle size={24} />
            Chat on WhatsApp
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
