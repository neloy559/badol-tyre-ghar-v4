import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { formatDate } from '../../../utils/formatters';
import styles from './AdminInquiries.module.css';

const STATUS_OPTS = ['inquired', 'replied', 'converted'];

const STATUS_COLORS = {
  inquired:  styles.statusInquired,
  replied:   styles.statusReplied,
  converted: styles.statusConverted,
};

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [note, setNote]           = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { document.title = 'Inquiries — BTG Admin'; }, []);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      const res  = await api.get(`/admin/inquiries?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setInquiries(json.data?.inquiries || json.data || []);
      setPagination(json.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  async function updateStatus(id, status) {
    const res  = await api.patch(`/admin/inquiries/${id}/status`, { status });
    const json = await res.json();
    if (!res.ok) { alert(json.message); return; }
    fetchInquiries();
  }

  async function saveNote(id) {
    setSavingNote(true);
    const res  = await api.patch(`/admin/inquiries/${id}/note`, { adminNote: note });
    const json = await res.json();
    if (!res.ok) { alert(json.message); }
    else { fetchInquiries(); setExpandedId(null); }
    setSavingNote(false);
  }

  function expand(inquiry) {
    setExpandedId(expandedId === inquiry._id ? null : inquiry._id);
    setNote(inquiry.adminNote || '');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Inquiries</h1>
          <p className={styles.subtitle}>{pagination?.total ?? '—'} total inquiries</p>
        </div>
        <select
          className={styles.filter}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading inquiries...</div>
      ) : inquiries.length === 0 ? (
        <div className={styles.empty}>No inquiries found.</div>
      ) : (
        <div className={styles.list}>
          {inquiries.map(inq => (
            <div key={inq._id} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => expand(inq)}>
                <div className={styles.cardLeft}>
                  <span className={`${styles.statusBadge} ${STATUS_COLORS[inq.status] || ''}`}>
                    {inq.status}
                  </span>
                  <span className={styles.itemCount}>{inq.items?.length} item(s)</span>
                  <span className={styles.date}>{formatDate(inq.createdAt)}</span>
                </div>
                <div className={styles.cardRight}>
                  {inq.user ? (
                    <span className={styles.customer}>
                      {inq.user.profile?.businessName || inq.user.profile?.name || inq.user.phone || 'Dealer'}
                    </span>
                  ) : (
                    <span className={styles.guest}>Guest</span>
                  )}
                  <span className={styles.expandIcon}>{expandedId === inq._id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === inq._id && (
                <div className={styles.expanded}>
                  {/* Items */}
                  <div className={styles.items}>
                    {inq.items?.map((item, i) => (
                      <div key={i} className={styles.itemRow}>
                        <span className={styles.itemQty}>{item.quantity}×</span>
                        <span className={styles.itemName}>
                          {typeof item.productId === 'object' ? item.productId?.name : item.productId}
                        </span>
                        <span className={styles.itemSku}>SKU: {item.variantSku}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status change */}
                  <div className={styles.statusRow}>
                    <label className={styles.label}>Update Status:</label>
                    <div className={styles.statusBtns}>
                      {STATUS_OPTS.map(s => (
                        <button
                          key={s}
                          type="button"
                          className={`${styles.statusBtn} ${inq.status === s ? styles.statusBtnActive : ''}`}
                          onClick={() => updateStatus(inq._id, s)}
                          disabled={inq.status === s}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div className={styles.noteRow}>
                    <label className={styles.label}>Admin Note:</label>
                    <textarea
                      className={styles.noteInput}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={3}
                      placeholder="Add a note for internal reference..."
                    />
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={() => saveNote(inq._id)}
                      disabled={savingNote}
                    >
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
          <span className={styles.pageInfo}>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}
