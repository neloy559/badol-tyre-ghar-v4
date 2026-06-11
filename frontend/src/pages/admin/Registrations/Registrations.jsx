import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../../../services/api';
import { Pagination } from '../../../components/ui/Pagination/Pagination';
import useFetch from '../../../hooks/useFetch';
import DealerCard from './components/DealerCard/DealerCard';
import styles from './Registrations.module.css';

export default function Registrations() {
  const [activeTab, setActiveTab]   = useState('pending');
  const [page, setPage]             = useState(1);
  const [dealers, setDealers]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const { data: pendingData } = useFetch('/admin/dealers/pending-count');
  const pendingCount = pendingData?.count || 0;

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/admin/dealers?registrationStatus=${activeTab}&page=${page}&limit=10`
      );
      if (!res || !res.ok) {
        const j = await res?.json().catch(() => ({}));
        throw new Error(j.message || 'Failed to fetch');
      }
      const json = await res.json();
      setDealers(Array.isArray(json.data) ? json.data : []);
      setPagination(json.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  async function handleApprove(id) {
    await api.patch(`/admin/dealers/${id}/approve`, {});
    fetchDealers();
  }

  async function handleReject(id, reason) {
    await api.patch(`/admin/dealers/${id}/reject`, { rejectionReason: reason });
    fetchDealers();
  }

  async function handleTierChange(id, tier) {
    await api.patch(`/admin/dealers/${id}/tier`, { tier });
    fetchDealers();
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Dealer Registrations — BTG Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.header}>
        <p className={styles.subtitle}>Manage dealer applications and tier assignments</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'pending' ? styles.activeTab : ''}`}
          onClick={() => switchTab('pending')}
        >
          Pending
          {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'approved' ? styles.activeTab : ''}`}
          onClick={() => switchTab('approved')}
        >
          Approved
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'rejected' ? styles.activeTab : ''}`}
          onClick={() => switchTab('rejected')}
        >
          Rejected
        </button>
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.stateContainer}>
            <p className={styles.loadingText}>Loading dealers...</p>
          </div>
        )}

        {error && !loading && (
          <div className={styles.stateContainer}>
            <p className={styles.errorText}>Failed to load dealers.</p>
            <button onClick={refetch} className={styles.retryBtn}>Retry</button>
          </div>
        )}

        {!loading && !error && dealers.length === 0 && (
          <div className={styles.stateContainer}>
            <p className={styles.emptyText}>No {activeTab} dealers.</p>
          </div>
        )}

        {!loading && !error && dealers.length > 0 && (
          <div className={styles.list}>
            {dealers.map(dealer => (
              <DealerCard
                key={dealer._id}
                dealer={dealer}
                tab={activeTab}
                onApprove={handleApprove}
                onReject={handleReject}
                onTierChange={handleTierChange}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
