import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../../services/api';
import styles from './AnnouncementBanner.module.css';

// Cached so we don't re-fetch on every render
let _cached = null;

export default function AnnouncementBanner() {
  const [banner,    setBanner]    = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Use in-memory cache for the session — avoids re-fetching on every page nav
    if (_cached !== null) {
      setBanner(_cached);
      return;
    }

    api.get('/site-config').then(async res => {
      if (!res || !res.ok) return;
      const json = await res.json();
      const b = json.data?.announcementBanner;
      _cached = (b?.enabled && b?.message) ? b : false;
      setBanner(_cached);
    }).catch(() => {
      _cached = false;
    });
  }, []);

  if (!banner || dismissed) return null;

  return (
    <div className={`${styles.banner} ${styles[banner.type] || styles.info}`} role="banner">
      <span className={styles.message}>{banner.message}</span>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
      >
        <X size={16} />
      </button>
    </div>
  );
}
