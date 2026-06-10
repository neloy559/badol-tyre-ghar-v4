import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { DEFAULT_SITE_NAME, WHATSAPP_NUMBER } from '../../../utils/constants';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* About Section */}
        <div className={styles.section}>
          <h3 className={styles.title}>{DEFAULT_SITE_NAME}</h3>
          <p className={styles.text}>
            Your trusted partner for quality tyres, tubes, and accessories.
            Wholesale pricing for approved dealers.
          </p>
          <div className={styles.socialLinks}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <Facebook size={18} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <Instagram size={18} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <Twitter size={18} />
            </a>
          </div>
        </div>

        {/* Contact Section */}
        <div className={styles.section}>
          <h3 className={styles.title}>Contact Us</h3>
          <a href={`tel:${WHATSAPP_NUMBER}`} className={styles.link}>
            <Phone size={16} />
            <span>{WHATSAPP_NUMBER || '+880 1XXX-XXXXXX'}</span>
          </a>
          <a href="mailto:info@badoltyreghar.com" className={styles.link}>
            <Mail size={16} />
            <span>info@badoltyreghar.com</span>
          </a>
          <div className={styles.link}>
            <MapPin size={16} />
            <span>Dhaka, Bangladesh</span>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className={styles.section}>
          <h3 className={styles.title}>Quick Links</h3>
          <a href="/" className={styles.link}>Home</a>
          <a href="/catalog" className={styles.link}>Catalog</a>
          <a href="/register" className={styles.link}>Become a Dealer</a>
          <a href="/login" className={styles.link}>Login</a>
        </div>

        {/* Business Hours */}
        <div className={styles.section}>
          <h3 className={styles.title}>Business Hours</h3>
          <p className={styles.text}>Saturday - Thursday</p>
          <p className={styles.text}>9:00 AM - 6:00 PM</p>
          <p className={styles.text}>Friday: Closed</p>
        </div>
      </div>

      <div className={styles.bottom}>
        &copy; {currentYear} {DEFAULT_SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
