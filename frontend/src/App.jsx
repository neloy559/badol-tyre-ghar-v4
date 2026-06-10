import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, RoleGate } from './components/auth/ProtectedRoute';
import AnnouncementBanner from './components/layout/AnnouncementBanner/AnnouncementBanner';
import api from './services/api';
import { DEFAULT_SITE_NAME } from './utils/constants';

const Home          = lazy(() => import('./pages/public/Home/Home'));
const Catalog       = lazy(() => import('./pages/public/Catalog/Catalog'));
const ProductDetail = lazy(() => import('./pages/public/ProductDetail/ProductDetail'));
const Cart          = lazy(() => import('./pages/public/Cart/Cart'));
const Login         = lazy(() => import('./pages/auth/Login/Login'));
const Register      = lazy(() => import('./pages/auth/Register/Register'));
const Profile       = lazy(() => import('./pages/dealer/Profile/Profile'));
const NotFound      = lazy(() => import('./pages/NotFound'));

// Admin pages — lazy loaded
const AdminLayout       = lazy(() => import('./components/layout/AdminLayout/AdminLayout'));
const Dashboard         = lazy(() => import('./pages/admin/Dashboard/Dashboard'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

// Fetch and apply site config on mount
function SiteConfigLoader() {
  useEffect(() => {
    api.get('/site-config').then(async res => {
      if (!res || !res.ok) return;
      const json = await res.json();
      const siteName = json.data?.siteName;
      if (siteName) document.title = siteName;
    }).catch(() => {
      document.title = DEFAULT_SITE_NAME;
    });
  }, []);
  return null;
}

export default function App() {
  return (
    <Suspense fallback={<div className="page-loader">Loading...</div>}>
      <ScrollToTop />
      <SiteConfigLoader />
      <AnnouncementBanner />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/catalog"   element={<Catalog />} />
        <Route path="/catalog/:slug" element={<ProductDetail />} />
        <Route path="/cart"      element={<Cart />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin/*"   element={
          <ProtectedRoute>
            <RoleGate allowedRoles={['admin', 'editor']}>
              <AdminLayout />
            </RoleGate>
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
