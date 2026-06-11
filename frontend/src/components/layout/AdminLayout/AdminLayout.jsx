import React, { lazy, useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingBag, MessageSquare,
  Megaphone, Image, Bell, Settings, Menu, X, LogOut, ClipboardList, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useViewAs } from '../../../context/ViewAsContext';
import api from '../../../services/api';
import styles from './AdminLayout.module.css';

const Dashboard          = lazy(() => import('../../../pages/admin/Dashboard/Dashboard'));
const Registrations      = lazy(() => import('../../../pages/admin/Registrations/Registrations'));
const AdminCatalog       = lazy(() => import('../../../pages/admin/AdminCatalog/AdminCatalog'));
const AdminInquiries     = lazy(() => import('../../../pages/admin/AdminInquiries/AdminInquiries'));
const AdminCampaigns     = lazy(() => import('../../../pages/admin/AdminCampaigns/AdminCampaigns'));
const AdminMedia         = lazy(() => import('../../../pages/admin/AdminMedia/AdminMedia'));
const AdminNotifications = lazy(() => import('../../../pages/admin/AdminNotifications/AdminNotifications'));
const AdminSiteConfig    = lazy(() => import('../../../pages/admin/AdminSiteConfig/AdminSiteConfig'));
const AdminOrders        = lazy(() => import('../../../pages/admin/AdminOrders/AdminOrders'));

const NAV = [
  { to: '/admin',                label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { to: '/admin/registrations',  label: 'Registrations',  icon: Users },
  { to: '/admin/catalog',        label: 'Catalog',        icon: ShoppingBag },
  { to: '/admin/inquiries',      label: 'Inquiries',      icon: MessageSquare },
  { to: '/admin/orders',         label: 'Orders',         icon: ClipboardList },
  { to: '/admin/campaigns',      label: 'Campaigns',      icon: Megaphone },
  { to: '/admin/media',          label: 'Media',          icon: Image },
  { to: '/admin/notifications',  label: 'Notifications',  icon: Bell },
  { to: '/admin/site-config',    label: 'Site Config',    icon: Settings },
];

// Tier label display
const TIER_LABELS = { standard: 'Standard', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

export default function AdminLayout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { viewAsDealer, activateViewAs, clearViewAs } = useViewAs();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dealers list for the ViewAs dropdown
  const [dealers, setDealers]       = useState([]);
  const [showViewAs, setShowViewAs] = useState(false);

  useEffect(() => {
    // Fetch approved dealers on mount for the dropdown
    api.get('/admin/dealers?registrationStatus=approved&limit=100')
      .then(r => r.json())
      .then(json => {
        if (Array.isArray(json.data)) setDealers(json.data);
      })
      .catch(() => {});
  }, []);

  function isActive(path, exact = false) {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  async function handleLogout() {
    clearViewAs();
    await logout();
    navigate('/login');
  }

  function handleSelectDealer(dealer) {
    activateViewAs(dealer);
    setShowViewAs(false);
  }

  function handleClearViewAs() {
    clearViewAs();
    setShowViewAs(false);
  }

  const displayName = user?.profile?.name || user?.profile?.businessName || 'Admin';

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandRow}>
            <img src="/assets/branding/logo.jpeg" alt="BTG" className={styles.brandLogo} />
            <div>
              <h2 className={styles.sidebarTitle}>BTG Admin</h2>
              <p className={styles.sidebarUser}>{displayName}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeMobile}
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={`${styles.navLink} ${isActive(to, exact) ? styles.active : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {/* ViewAs section */}
          <div className={styles.viewAsSection}>
            <button
              type="button"
              className={`${styles.viewAsToggle} ${viewAsDealer ? styles.viewAsActive : ''}`}
              onClick={() => setShowViewAs(v => !v)}
            >
              <Eye size={14} />
              {viewAsDealer
                ? `Preview: ${viewAsDealer.profile?.businessName || viewAsDealer.profile?.name || 'Dealer'}`
                : 'Preview As Dealer'
              }
            </button>

            {showViewAs && (
              <div className={styles.viewAsDropdown}>
                {/* Guest option */}
                <button
                  type="button"
                  className={`${styles.viewAsOption} ${!viewAsDealer ? styles.viewAsOptionActive : ''}`}
                  onClick={handleClearViewAs}
                >
                  <span className={styles.viewAsOptionName}>Guest / Public</span>
                  <span className={styles.viewAsOptionMeta}>No prices</span>
                </button>

                {/* Approved dealers */}
                {dealers.length === 0 && (
                  <p className={styles.viewAsEmpty}>No approved dealers yet.</p>
                )}
                {dealers.map(dealer => {
                  const name = dealer.profile?.businessName || dealer.profile?.name || dealer.phone;
                  const tier = dealer.tier || 'standard';
                  const isSelected = viewAsDealer?._id === dealer._id;
                  return (
                    <button
                      key={dealer._id}
                      type="button"
                      className={`${styles.viewAsOption} ${isSelected ? styles.viewAsOptionActive : ''}`}
                      onClick={() => handleSelectDealer(dealer)}
                    >
                      <span className={styles.viewAsOptionName}>{name}</span>
                      <span className={styles.viewAsOptionMeta}>{TIER_LABELS[tier] || tier}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/" className={styles.viewSiteBtn} target="_blank">
            ↗ View Site
          </Link>
          <button type="button" onClick={handleLogout} className={styles.logoutButton}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.contentWrap}>
        {/* Active ViewAs banner */}
        {viewAsDealer && (
          <div className={styles.viewAsBanner}>
            <Eye size={15} />
            <span>
              Previewing as <strong>{viewAsDealer.profile?.businessName || viewAsDealer.profile?.name || 'Dealer'}</strong>
              {' · '}{TIER_LABELS[viewAsDealer.tier] || viewAsDealer.tier} tier
              {' · '}<a href="/catalog" target="_blank" className={styles.viewAsBannerLink}>Open Catalog ↗</a>
            </span>
            <button type="button" className={styles.viewAsBannerClose} onClick={clearViewAs}>
              <X size={14} /> Exit Preview
            </button>
          </div>
        )}

        {/* Mobile top bar */}
        <header className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className={styles.mobileTitle}>BTG Admin</span>
        </header>

        <main className={styles.main}>
          <Routes>
            <Route index                element={<Dashboard />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="catalog"       element={<AdminCatalog />} />
            <Route path="inquiries"     element={<AdminInquiries />} />
            <Route path="campaigns"     element={<AdminCampaigns />} />
            <Route path="media"         element={<AdminMedia />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="site-config"   element={<AdminSiteConfig />} />
            <Route path="orders"        element={<AdminOrders />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
