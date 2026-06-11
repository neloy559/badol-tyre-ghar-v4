import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { usePasswordStrength } from '../../../hooks/usePasswordStrength';
import api from '../../../services/api';
import styles from './Register.module.css';

function StrengthBar({ strength }) {
  const levels = { weak: 1, medium: 2, strong: 3 };
  const colors = { weak: '#dc2626', medium: '#d97706', strong: '#16a34a' };
  return (
    <div className={styles.strengthBar}>
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className={styles.strengthSegment}
          style={{ background: n <= levels[strength] ? colors[strength] : '#e5e7eb' }}
        />
      ))}
      <span style={{ color: colors[strength], fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
        {strength}
      </span>
    </div>
  );
}

function MatchIndicator({ match }) {
  return (
    <div className={styles.matchIndicator}>
      {match ? (
        <><CheckCircle size={14} color="#16a34a" /><span style={{ color: '#16a34a' }}>Passwords match</span></>
      ) : (
        <><XCircle size={14} color="#dc2626" /><span style={{ color: '#dc2626' }}>Passwords do not match</span></>
      )}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function Register() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [tab, setTab] = useState('dealer'); // 'customer' | 'dealer'

  // ── Customer state ────────────────────────────
  const [cName,     setCName]     = useState('');
  const [cPhone,    setCPhone]    = useState('');
  const [cPass,     setCPass]     = useState('');
  const [cConfirm,  setCConfirm]  = useState('');
  const [cShowPass, setCShowPass] = useState(false);
  const [cShowConf, setCShowConf] = useState(false);
  const [cError,    setCError]    = useState('');
  const [cLoading,  setCLoading]  = useState(false);
  const cStrength = usePasswordStrength(cPass);

  // ── Dealer state ──────────────────────────────
  const [dBiz,      setDBiz]      = useState('');
  const [dOwner,    setDOwner]    = useState('');
  const [dPhone,    setDPhone]    = useState('');
  const [dAddress,  setDAddress]  = useState('');
  const [dPass,     setDPass]     = useState('');
  const [dConfirm,  setDConfirm]  = useState('');
  const [dShowPass, setDShowPass] = useState(false);
  const [dShowConf, setDShowConf] = useState(false);
  const [dError,    setDError]    = useState('');
  const [dLoading,  setDLoading]  = useState(false);
  const [dSuccess,  setDSuccess]  = useState(false);
  const dStrength = usePasswordStrength(dPass);

  // ── Customer submit ───────────────────────────
  async function handleCustomerSubmit(e) {
    e.preventDefault();
    if (!cName.trim())           { setCError('Name is required.'); return; }
    if (!cPhone.trim())          { setCError('Phone number is required.'); return; }
    if (cPhone.trim().length < 11) { setCError('Enter a valid phone number.'); return; }
    if (!cPass)                  { setCError('Password is required.'); return; }
    if (cPass.length < 6)        { setCError('Password must be at least 6 characters.'); return; }
    if (cPass !== cConfirm)      { setCError('Passwords do not match.'); return; }
    setCError(''); setCLoading(true);
    try {
      const res  = await api.post('/auth/register', { role: 'customer', name: cName.trim(), phone: cPhone.trim(), password: cPass });
      const json = await res.json();
      if (!res.ok) { setCError(json.message || 'Registration failed.'); return; }
      login(json.data.accessToken, json.data.user);
      navigate('/catalog');
    } catch { setCError('Network error. Please try again.'); }
    finally  { setCLoading(false); }
  }

  // ── Dealer submit ─────────────────────────────
  async function handleDealerSubmit(e) {
    e.preventDefault();
    if (!dBiz.trim())            { setDError('Business name is required.'); return; }
    if (!dOwner.trim())          { setDError('Owner name is required.'); return; }
    if (!dPhone.trim())          { setDError('Phone number is required.'); return; }
    if (dPhone.trim().length < 11) { setDError('Enter a valid phone number.'); return; }
    if (!dAddress.trim())        { setDError('Address is required.'); return; }
    if (!dPass)                  { setDError('Password is required.'); return; }
    if (dPass.length < 6)        { setDError('Password must be at least 6 characters.'); return; }
    if (dPass !== dConfirm)      { setDError('Passwords do not match.'); return; }
    setDError(''); setDLoading(true);
    try {
      const res  = await api.post('/auth/dealer/register', {
        businessName: dBiz.trim(), ownerName: dOwner.trim(),
        phone: dPhone.trim(), address: dAddress.trim(), password: dPass,
      });
      const json = await res.json();
      if (!res.ok) { setDError(json.message || 'Registration failed.'); return; }
      login(json.data.accessToken, json.data.user);
      setDSuccess(true);
      setTimeout(() => navigate('/profile'), 1800);
    } catch { setDError('Network error. Please try again.'); }
    finally  { setDLoading(false); }
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Register — Badol Tyre Ghar</title>
        <meta name="description" content="Register as a dealer to access wholesale pricing on tyres, tubes and accessories." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://badol-tyre-ghar.vercel.app/register" />
      </Helmet>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <img src="/assets/branding/logo.jpeg" alt="BTG" className={styles.logo} />
          <span className={styles.logoText}>Badol Tyre Ghar</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'dealer' ? styles.tabActive : ''}`}
            onClick={() => setTab('dealer')}
          >
            🏪 Apply as Dealer
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'customer' ? styles.tabActive : ''}`}
            onClick={() => setTab('customer')}
          >
            👤 Browse Account
          </button>
        </div>

        {/* ── DEALER FORM ── */}
        {tab === 'dealer' && (
          <form onSubmit={handleDealerSubmit} noValidate>
            {dSuccess ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✅</div>
                <h2>Application Submitted!</h2>
                <p>Your dealer application is under review. We'll get back to you within 1–3 business days.</p>
              </div>
            ) : (
              <>
                <p className={styles.formNote}>
                  Get <strong>wholesale pricing</strong> on all products after admin approval.
                </p>

                {dError && <div className={styles.errorBox}>{dError}</div>}

                <div className={styles.field}>
                  <label>Business Name <span className={styles.req}>*</span></label>
                  <input type="text" value={dBiz} onChange={e => setDBiz(e.target.value)} placeholder="Your shop / company name" />
                </div>

                <div className={styles.field}>
                  <label>Owner Name <span className={styles.req}>*</span></label>
                  <input type="text" value={dOwner} onChange={e => setDOwner(e.target.value)} placeholder="Full name of owner" />
                </div>

                <div className={styles.field}>
                  <label>Phone Number <span className={styles.req}>*</span></label>
                  <input type="tel" value={dPhone} onChange={e => setDPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>

                <div className={styles.field}>
                  <label>Business Address <span className={styles.req}>*</span></label>
                  <textarea value={dAddress} onChange={e => setDAddress(e.target.value)} placeholder="Full address" rows={3} />
                </div>

                <PasswordField label="Password *" value={dPass} onChange={setDPass} show={dShowPass} onToggle={() => setDShowPass(p => !p)} />
                {dPass && <StrengthBar strength={dStrength} />}

                <PasswordField label="Confirm Password *" value={dConfirm} onChange={setDConfirm} show={dShowConf} onToggle={() => setDShowConf(p => !p)} />
                {dConfirm && <MatchIndicator match={dPass === dConfirm} />}

                <button type="submit" className={styles.submitBtn} disabled={dLoading}>
                  {dLoading ? 'Submitting...' : 'Submit Dealer Application'}
                </button>
              </>
            )}
          </form>
        )}

        {/* ── CUSTOMER FORM ── */}
        {tab === 'customer' && (
          <form onSubmit={handleCustomerSubmit} noValidate>
            <p className={styles.formNote}>
              Browse the catalog. Pricing is only visible to approved dealers.
            </p>

            {cError && <div className={styles.errorBox}>{cError}</div>}

            <div className={styles.field}>
              <label>Full Name <span className={styles.req}>*</span></label>
              <input type="text" value={cName} onChange={e => setCName(e.target.value)} placeholder="Your name" />
            </div>

            <div className={styles.field}>
              <label>Phone Number <span className={styles.req}>*</span></label>
              <input type="tel" value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>

            <PasswordField label="Password *" value={cPass} onChange={setCPass} show={cShowPass} onToggle={() => setCShowPass(p => !p)} />
            {cPass && <StrengthBar strength={cStrength} />}

            <PasswordField label="Confirm Password *" value={cConfirm} onChange={setCConfirm} show={cShowConf} onToggle={() => setCShowConf(p => !p)} />
            {cConfirm && <MatchIndicator match={cPass === cConfirm} />}

            <button type="submit" className={styles.submitBtn} disabled={cLoading}>
              {cLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
