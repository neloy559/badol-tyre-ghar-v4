import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar/Navbar';
import Footer from '../components/layout/Footer/Footer';
import styles from './NotFound.module.css';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '404 — Page Not Found | Badol Tyre Ghar';
  }, []);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>Page Not Found</h1>
        <p className={styles.message}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            ← Go Back
          </button>
          <Link to="/" className={styles.homeBtn}>
            Go to Homepage
          </Link>
          <Link to="/catalog" className={styles.catalogBtn}>
            Browse Catalog
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
