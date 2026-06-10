import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { DEFAULT_SITE_NAME } from '../../../utils/constants';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function handleProfileClick() {
    if (user?.role === 'admin' || user?.role === 'editor') {
      navigate('/admin');
    } else {
      navigate('/profile');
    }
    setMenuOpen(false);
  }

  return (
    <nav className={styles.navbar} ref={menuRef}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <img
            src="/assets/branding/logo.jpeg"
            alt={DEFAULT_SITE_NAME}
            className={styles.logoImg}
          />
          <span className={styles.logoText}>{DEFAULT_SITE_NAME}</span>
        </Link>

        {/* Desktop Nav */}
        <div className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Catalog
          </NavLink>
        </div>

        {/* Desktop Actions */}
        <div className={styles.actions}>
          <button type="button" className={styles.cartBtn} onClick={() => navigate('/cart')}>
            <ShoppingCart size={22} />
            {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
          </button>

          {user ? (
            <button type="button" className={`${styles.authBtn} ${styles.profileBtn}`} onClick={handleProfileClick}>
              <User size={18} />
              <span className={styles.profileName}>{user.profile?.name || user.profile?.businessName || 'Profile'}</span>
            </button>
          ) : (
            <Link to="/login" className={`${styles.authBtn} ${styles.loginBtn}`}>
              Sign In
            </Link>
          )}

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.mobileLink} ${isActive ? styles.mobileActive : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) => `${styles.mobileLink} ${isActive ? styles.mobileActive : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Catalog
          </NavLink>
          {!user && (
            <Link
              to="/register"
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              Become a Dealer
            </Link>
          )}
          <div className={styles.mobileDivider} />
          {user ? (
            <button type="button" className={styles.mobileProfileBtn} onClick={handleProfileClick}>
              <User size={18} />
              <span>{user.profile?.name || user.profile?.businessName || 'Profile'}</span>
            </button>
          ) : (
            <Link
              to="/login"
              className={`${styles.mobileLink} ${styles.mobilePrimary}`}
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
