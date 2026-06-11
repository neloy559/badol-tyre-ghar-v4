import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!phone.trim()) {
      setError('Phone is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { phone: phone.trim(), password });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Login failed.');
        return;
      }

      login(json.data.accessToken, json.data.user);

      const role = json.data.user.role;
      if (role === 'admin' || role === 'editor') {
        navigate('/admin');
      } else {
        navigate('/catalog');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>Sign In — Badol Tyre Ghar</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Sign In</h1>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>

        <div className={styles.field}>
          <label>Password</label>
          <div className={styles.passwordWrap}>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p => !p)}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className={styles.link}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
