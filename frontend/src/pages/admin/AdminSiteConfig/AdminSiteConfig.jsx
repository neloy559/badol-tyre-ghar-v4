import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../../../services/api';
import styles from './AdminSiteConfig.module.css';

const EMPTY = {
  siteName: '', whatsappNumber: '', supportEmail: '',
  maintenanceMode: false, dealerApplicationsEnabled: true,
  announcementBanner: { enabled: false, message: '', type: 'info' },
};

export default function AdminSiteConfig() {
  const [config, setConfig]   = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { document.title = 'Site Config — BTG Admin'; }, []);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res  = await api.get('/admin/site-config');
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setConfig({ ...EMPTY, ...json.data });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  function set(field, value) {
    setConfig(prev => ({ ...prev, [field]: value }));
  }

  function setBanner(field, value) {
    setConfig(prev => ({ ...prev, announcementBanner: { ...prev.announcementBanner, [field]: value } }));
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res  = await api.patch('/admin/site-config', config);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setSuccess('Configuration saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading}>Loading configuration...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Site Configuration</h1>
          <p className={styles.subtitle}>Global settings for the BTG platform</p>
        </div>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error   && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.successMsg}>{success}</div>}

      <div className={styles.sections}>

        {/* General */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>General</h2>
          <div className={styles.grid}>
            <Field label="Site Name" value={config.siteName} onChange={v => set('siteName', v)} />
            <Field label="WhatsApp Number" value={config.whatsappNumber} onChange={v => set('whatsappNumber', v)} placeholder="+8801XXXXXXXXX" />
            <Field label="Support Email" value={config.supportEmail} onChange={v => set('supportEmail', v)} type="email" />
          </div>
        </section>

        {/* Toggles */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Access Control</h2>
          <div className={styles.toggles}>
            <Toggle
              label="Maintenance Mode"
              description="When enabled, the public site shows a maintenance message."
              value={config.maintenanceMode}
              onChange={v => set('maintenanceMode', v)}
              danger
            />
            <Toggle
              label="Dealer Applications"
              description="Allow new dealer registration applications."
              value={config.dealerApplicationsEnabled}
              onChange={v => set('dealerApplicationsEnabled', v)}
            />
          </div>
        </section>

        {/* Announcement Banner */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Announcement Banner</h2>
          <Toggle
            label="Show Banner"
            description="Display a banner on all public pages."
            value={config.announcementBanner?.enabled}
            onChange={v => setBanner('enabled', v)}
          />
          {config.announcementBanner?.enabled && (
            <div className={styles.grid} style={{ marginTop: '1rem' }}>
              <div className={styles.fieldFull}>
                <label className={styles.fieldLabel}>Message</label>
                <input
                  className={styles.input}
                  value={config.announcementBanner?.message || ''}
                  onChange={e => setBanner('message', e.target.value)}
                  placeholder="Announcement message..."
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Type</label>
                <select
                  className={styles.input}
                  value={config.announcementBanner?.type || 'info'}
                  onChange={e => setBanner('type', e.target.value)}
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="success">Success (Green)</option>
                  <option value="danger">Danger (Red)</option>
                </select>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type={type}
        className={styles.input}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Toggle({ label, description, value, onChange, danger = false }) {
  return (
    <div className={`${styles.toggleRow} ${danger && value ? styles.dangerRow : ''}`}>
      <div className={styles.toggleInfo}>
        <div className={styles.toggleLabel}>{label}</div>
        <div className={styles.toggleDesc}>{description}</div>
      </div>
      <button
        type="button"
        className={`${styles.toggle} ${value ? (danger ? styles.toggleDanger : styles.toggleOn) : styles.toggleOff}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}
