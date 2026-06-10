import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, setLogoutHandler } from '../services/api';
import { API_BASE_URL } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Derived — single source of truth for dealer check
  const isDealer = user && (
    user.role === 'admin' ||
    user.role === 'editor' ||
    (user.role === 'dealer' && user.registrationStatus === 'approved')
  );

  function login(accessToken, userData) {
    setAccessToken(accessToken);
    setUser(userData);
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    setAccessToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await api.get('/auth/me');
      if (res && res.ok) {
        const json = await res.json();
        setUser(json.data);
      }
    } catch {}
  }

  // Bootstrap on mount
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(API_BASE_URL + '/auth/refresh', { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const json  = await res.json();
          const token = json.data?.accessToken;
          setAccessToken(token);
          const meRes = await api.get('/auth/me');
          if (meRes && meRes.ok) {
            const meJson = await meRes.json();
            setUser(meJson.data);
          }
        }
      } catch {}
      finally { setLoading(false); }
    }
    setLogoutHandler(logout);
    init();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isDealer, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
