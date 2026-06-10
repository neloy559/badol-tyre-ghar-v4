import React, { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import api from '../../../services/api';
import { formatDate, formatPrice, downloadBlob } from '../../../utils/formatters';
import InvoiceDocument from '../../../components/pdf/InvoiceDocument';
import styles from './AdminOrders.module.css';

const ORDER_STATUSES   = ['pending', 'confirmed', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];
const PAYMENT_METHODS  = ['cash', 'bkash', 'bank', 'other'];

const STATUS_CLS = {
  pending:   styles.statusPending,
  confirmed: styles.statusConfirmed,
  delivered: styles.statusDelivered,
  cancelled: styles.statusCancelled,
};

const PAY_CLS = {
  unpaid:  styles.payUnpaid,
  partial: styles.payPartial,
  paid:    styles.payPaid,
};

export default function AdminOrders() {
  const [orders, setOrders]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [payFilter,    setPayFilter]    = useState('');
  const [expandedId,   setExpandedId]   = useState(null);
  const [editing,      setEditing]      = useState({});
  const [saving,       setSaving]       = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(null);
  const [siteConfig,   setSiteConfig]   = useState({});

  useEffect(() => { document.title = 'Orders — BTG Admin'; }, []);

  useEffect(() => {
    api.get('/site-config')
      .then(r => r.json())
      .then(j => setSiteConfig(j.data || {}))
      .catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set('status',       statusFilter);
      if (payFilter)    params.set('paymentStatus', payFilter);
      const res  = await api.get(`/admin/orders?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setOrders(Array.isArray(json.data) ? json.data : []);
      setPagination(json.pagination || null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, statusFilter, payFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function startEdit(order) {
    setEditing(prev => ({
      ...prev,
      [order._id]: {
        status:        order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || '',
        amountPaid:    order.amountPaid    || 0,
        discount:      order.discount      || 0,
        adminNote:     order.adminNote     || '',
      },
    }));
  }

  function setField(orderId, field, value) {
    setEditing(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  }

  async function saveOrder(orderId) {
    setSaving(orderId);
    try {
      const res  = await api.patch(`/admin/orders/${orderId}`, editing[orderId]);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setEditing(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      fetchOrders();
    } catch (err) { alert(err.message); }
    finally { setSaving(null); }
  }

  async function downloadInvoice(order) {
    setGeneratingPdf(order._id);
    try {
      // Fetch full populated order
      const res      = await api.get(`/admin/orders/${order._id}`);
      const json     = await res.json();
      const fullOrder = json.data || order;

      const blob = await pdf(
        <InvoiceDocument
          order={fullOrder}
          siteName={siteConfig.siteName || 'Badol Tyre Ghar'}
          whatsappNumber={siteConfig.whatsappNumber || ''}
        />
      ).toBlob();

      const invoiceNo = String(order._id).slice(-8).toUpperCase();
      downloadBlob(blob, `INV-${invoiceNo}.pdf`);
    } catch (err) {
      alert('Failed to generate invoice: ' + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>{pagination?.total ?? '—'} total orders</p>
        </div>
        <div className={styles.filters}>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1); }}>
            <option value="">All Payment</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className={styles.empty}>
          No orders yet. Orders are created automatically when an inquiry is marked as "converted".
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {orders.map(order => {
              const isExpanded = expandedId === order._id;
              const isEditing  = !!editing[order._id];
              const ed         = editing[order._id] || {};
              const dealerName = order.dealer?.profile?.businessName
                || order.dealer?.profile?.name
                || order.dealerName
                || 'Guest';

              return (
                <div key={order._id} className={styles.card}>
                  {/* Header row */}
                  <div
                    className={styles.cardHeader}
                    onClick={() => setExpandedId(isExpanded ? null : order._id)}
                  >
                    <div className={styles.cardLeft}>
                      <span className={styles.orderId}>#{String(order._id).slice(-6).toUpperCase()}</span>
                      <span className={`${styles.statusBadge} ${STATUS_CLS[order.status] || ''}`}>
                        {order.status}
                      </span>
                      <span className={`${styles.payBadge} ${PAY_CLS[order.paymentStatus] || ''}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    <div className={styles.cardMid}>
                      <span className={styles.dealer}>{dealerName}</span>
                      <span className={styles.date}>{formatDate(order.createdAt)}</span>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.total}>{formatPrice(order.grandTotal)}</span>
                      <span className={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={styles.expanded}>
                      {/* Items */}
                      <div className={styles.itemsSection}>
                        <h4 className={styles.sectionLabel}>Items</h4>
                        <div className={styles.itemsTable}>
                          {(order.items || []).map((item, i) => (
                            <div key={i} className={styles.itemRow}>
                              <span className={styles.itemName}>{item.productName || 'Product'}</span>
                              <span className={styles.itemSku}>SKU: {item.variantSku}</span>
                              <span className={styles.itemQty}>{item.quantity}×</span>
                              <span className={styles.itemPrice}>{formatPrice(item.unitPrice)}</span>
                              <span className={styles.itemTotal}>{formatPrice(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                        <div className={styles.totalsRow}>
                          <span>Subtotal</span>
                          <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        {order.discount > 0 && (
                          <div className={styles.totalsRow}>
                            <span>Discount</span>
                            <span className={styles.discountAmt}>− {formatPrice(order.discount)}</span>
                          </div>
                        )}
                        <div className={`${styles.totalsRow} ${styles.grandRow}`}>
                          <span>Grand Total</span>
                          <span>{formatPrice(order.grandTotal)}</span>
                        </div>
                        <div className={styles.totalsRow}>
                          <span>Amount Paid</span>
                          <span className={styles.paidAmt}>{formatPrice(order.amountPaid)}</span>
                        </div>
                        <div className={`${styles.totalsRow} ${styles.dueRow}`}>
                          <span>Balance Due</span>
                          <span>{formatPrice(Math.max(0, (order.grandTotal || 0) - (order.amountPaid || 0)))}</span>
                        </div>
                      </div>

                      {/* Action buttons / Edit panel */}
                      {!isEditing ? (
                        <div className={styles.actionBtns}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => startEdit(order)}
                          >
                            Edit Order
                          </button>
                          <button
                            type="button"
                            className={styles.invoiceBtn}
                            onClick={() => downloadInvoice(order)}
                            disabled={generatingPdf === order._id}
                          >
                            <Download size={14} />
                            {generatingPdf === order._id ? 'Generating...' : 'Download Invoice'}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.editPanel}>
                          <h4 className={styles.sectionLabel}>Update Order</h4>
                          <div className={styles.editGrid}>
                            <div className={styles.field}>
                              <label>Order Status</label>
                              <select
                                value={ed.status}
                                onChange={e => setField(order._id, 'status', e.target.value)}
                              >
                                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label>Payment Status</label>
                              <select
                                value={ed.paymentStatus}
                                onChange={e => setField(order._id, 'paymentStatus', e.target.value)}
                              >
                                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label>Payment Method</label>
                              <select
                                value={ed.paymentMethod}
                                onChange={e => setField(order._id, 'paymentMethod', e.target.value)}
                              >
                                <option value="">—</option>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label>Amount Paid (৳)</label>
                              <input
                                type="number" min="0"
                                value={ed.amountPaid}
                                onChange={e => setField(order._id, 'amountPaid', Number(e.target.value))}
                              />
                            </div>
                            <div className={styles.field}>
                              <label>Discount (৳)</label>
                              <input
                                type="number" min="0"
                                value={ed.discount}
                                onChange={e => setField(order._id, 'discount', Number(e.target.value))}
                              />
                            </div>
                            <div className={`${styles.field} ${styles.fieldFull}`}>
                              <label>Admin Note</label>
                              <textarea
                                rows={2}
                                value={ed.adminNote}
                                onChange={e => setField(order._id, 'adminNote', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className={styles.editActions}>
                            <button
                              type="button"
                              className={styles.saveBtn}
                              onClick={() => saveOrder(order._id)}
                              disabled={saving === order._id}
                            >
                              {saving === order._id ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              type="button"
                              className={styles.cancelBtn}
                              onClick={() => setEditing(prev => {
                                const n = { ...prev };
                                delete n[order._id];
                                return n;
                              })}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>
                ← Prev
              </button>
              <span className={styles.pageInfo}>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className={styles.pageBtn}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
