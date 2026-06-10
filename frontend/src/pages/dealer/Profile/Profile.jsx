import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Download, Award, ShoppingBag, User, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { usePdfDownload } from '../../../hooks/usePdfDownload';
import useFetch from '../../../hooks/useFetch';
import { formatPrice, formatDate } from '../../../utils/formatters';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import styles from './Profile.module.css';

// Matches backend data-models.md
const TIER_META = {
  standard: { label: 'Standard',  color: '#6b7280', bg: '#f3f4f6', discount: '0%'  },
  silver:   { label: 'Silver',    color: '#374151', bg: '#e5e7eb', discount: '5%'  },
  gold:     { label: 'Gold',      color: '#92400e', bg: '#fef3c7', discount: '10%' },
  platinum: { label: 'Platinum',  color: '#1e3a5f', bg: '#dbeafe', discount: '15%' },
};

function TierBadge({ tier }) {
  const meta = TIER_META[tier] || TIER_META.standard;
  return (
    <span
      className={styles.tierBadge}
      style={{ color: meta.color, background: meta.bg }}
    >
      <Award size={14} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    approved: styles.statusApproved,
    pending:  styles.statusPending,
    rejected: styles.statusRejected,
  };
  return (
    <span className={`${styles.statusBadge} ${map[status] || ''}`}>
      {status}
    </span>
  );
}

export default function Profile() {
  const { user, isDealer, loading: authLoading } = useAuth();
  const { download, generating } = usePdfDownload();

  // Fetch order stats for approved dealers
  const { data: statsData } = useFetch(
    isDealer ? '/my/orders/stats' : null,
    !authLoading && isDealer
  );
  const { data: ordersData, loading: ordersLoading } = useFetch(
    isDealer ? '/my/orders?limit=5' : null,
    !authLoading && isDealer
  );

  const stats  = statsData || {};
  const orders = ordersData || [];

  useEffect(() => {
    document.title = 'My Profile — Badol Tyre Ghar';
  }, []);

  if (!user) return null;

  const isDealer_role = user.role === 'dealer';
  const isPending  = isDealer_role && user.registrationStatus === 'pending';
  const isApproved = isDealer_role && user.registrationStatus === 'approved';
  const isRejected = isDealer_role && user.registrationStatus === 'rejected';
  const isCustomer = user.role === 'customer';
  const tier       = user.tier || 'standard';
  const tierMeta   = TIER_META[tier] || TIER_META.standard;

  return (
    <>
      <Navbar />
      <div className={styles.container}>

        {/* ── Status banners ── */}
        {isPending && (
          <div className={styles.pendingBanner}>
            <Clock size={20} className={styles.bannerIcon} />
            <div>
              <strong>Application Under Review</strong>
              <p>
                Your dealer application is being reviewed. Approval usually takes 1–3 business days.
                You'll get wholesale pricing access once approved.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className={styles.rejectedBanner}>
            <strong>Application Not Approved</strong>
            <p>Please contact us via WhatsApp or email for more information.</p>
          </div>
        )}

        {isCustomer && (
          <div className={styles.customerBanner}>
            <User size={18} />
            <div>
              Want wholesale pricing?{' '}
              <Link to="/register">Apply as a dealer</Link> to get approved dealer access.
            </div>
          </div>
        )}

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.avatarCircle}>
            {(user.profile?.name || user.profile?.businessName || user.profile?.ownerName || 'U')
              .charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={styles.title}>
              {user.profile?.businessName || user.profile?.name || 'My Profile'}
            </h1>
            <div className={styles.metaRow}>
              <StatusBadge status={user.registrationStatus} />
              {isDealer_role && <TierBadge tier={tier} />}
              <span className={styles.roleChip}>{user.role}</span>
            </div>
          </div>
        </div>

        <div className={styles.grid}>

          {/* ── Account info card ── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Account Information</h2>
            <div className={styles.infoList}>
              {user.profile?.businessName && (
                <InfoRow label="Business Name" value={user.profile.businessName} />
              )}
              {user.profile?.ownerName && (
                <InfoRow label="Owner Name" value={user.profile.ownerName} />
              )}
              {user.profile?.name && !user.profile?.ownerName && (
                <InfoRow label="Name" value={user.profile.name} />
              )}
              <InfoRow label="Phone" value={user.phone} />
              {user.email && <InfoRow label="Email" value={user.email} />}
              {user.profile?.address && (
                <InfoRow label="Address" value={user.profile.address} />
              )}
              <InfoRow label="Member Since" value={
                user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '—'
              } />
            </div>
          </div>

          {/* ── Dealer tier card — only for approved dealers ── */}
          {isApproved && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Pricing & Tier</h2>

              <div className={styles.tierCard} style={{ borderColor: tierMeta.color + '44', background: tierMeta.bg }}>
                <Award size={28} style={{ color: tierMeta.color }} />
                <div>
                  <div className={styles.tierName} style={{ color: tierMeta.color }}>
                    {tierMeta.label} Tier
                  </div>
                  <div className={styles.tierDiscount}>
                    {tierMeta.discount} extra discount on all wholesale orders
                  </div>
                </div>
              </div>

              {user.discountMultiplier > 0 && (
                <div className={styles.extraDiscount}>
                  + {user.discountMultiplier}% additional personal discount applied
                </div>
              )}

              <div className={styles.tierNote}>
                Your tier discount is automatically applied when you browse the catalog.
                Final price is shown on each product page.
              </div>

              <button
                type="button"
                className={styles.pdfBtn}
                onClick={() => download(null, 'All_Products')}
                disabled={generating}
              >
                <Download size={16} />
                {generating ? 'Generating PDF...' : 'Download Full Catalog (PDF)'}
              </button>
            </div>
          )}

          {/* ── Quick actions card ── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Quick Actions</h2>
            <div className={styles.actionList}>
              <Link to="/catalog" className={styles.actionBtn}>
                <ShoppingBag size={18} />
                Browse Catalog
              </Link>
              <Link to="/cart" className={styles.actionBtn}>
                🛒 View Cart
              </Link>
            </div>
          </div>

          {/* ── Order history — approved dealers only ── */}
          {isApproved && (
            <div className={`${styles.card} ${styles.ordersCard}`}>
              <h2 className={styles.cardTitle}>
                <Package size={18} style={{ display: 'inline', marginRight: 6 }} />
                Order History
              </h2>

              <div className={styles.statsRow}>
                <div className={styles.statBox}>
                  <span className={styles.statVal}>{stats.totalOrders ?? '—'}</span>
                  <span className={styles.statLabel}>Total Orders</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statVal}>
                    {stats.totalSpend != null ? formatPrice(stats.totalSpend) : '—'}
                  </span>
                  <span className={styles.statLabel}>Total Spend</span>
                </div>
                <div className={styles.statBox}>
                  <span className={`${styles.statVal} ${styles.dueVal}`}>
                    {stats.totalSpend != null && stats.totalPaid != null
                      ? formatPrice(Math.max(0, stats.totalSpend - stats.totalPaid))
                      : '—'}
                  </span>
                  <span className={styles.statLabel}>Balance Due</span>
                </div>
              </div>

              {ordersLoading ? (
                <p className={styles.ordersNote}>Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className={styles.ordersNote}>No orders yet.</p>
              ) : (
                <div className={styles.orderList}>
                  {orders.map(o => (
                    <div key={o._id} className={styles.orderRow}>
                      <div className={styles.orderLeft}>
                        <span className={styles.orderIdTag}>#{String(o._id).slice(-6).toUpperCase()}</span>
                        <span className={styles.orderDate}>{formatDate(o.createdAt)}</span>
                      </div>
                      <div className={styles.orderRight}>
                        <span className={`${styles.orderStatus} ${styles['os_' + o.status] || ''}`}>
                          {o.status}
                        </span>
                        <span className={styles.orderTotal}>{formatPrice(o.grandTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value || '—'}</span>
    </div>
  );
}
