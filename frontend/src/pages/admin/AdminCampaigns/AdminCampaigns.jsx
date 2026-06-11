import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import api from '../../../services/api';
import { formatDate } from '../../../utils/formatters';
import styles from './AdminCampaigns.module.css';

const EMPTY_FORM = {
  name: '', type: 'percent', value: '', startDate: '', endDate: '',
  isActive: true,
};

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get('/admin/campaigns');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setCampaigns(Array.isArray(json.data) ? json.data : (json.data?.campaigns || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setFormError(''); setShowForm(true); }
  function openEdit(c) {
    setForm({
      name: c.name || '', type: c.type || 'percent',
      value: c.value ?? '', isActive: c.isActive ?? true,
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate:   c.endDate   ? c.endDate.slice(0, 10)   : '',
    });
    setEditId(c._id); setFormError(''); setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Campaign name is required.'); return; }
    if (!form.value || isNaN(Number(form.value))) { setFormError('Discount value must be a number.'); return; }
    if (!form.startDate || !form.endDate) { setFormError('Start and end dates are required.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { ...form, value: Number(form.value) };
      const res = editId
        ? await api.patch(`/admin/campaigns/${editId}`, payload)
        : await api.post('/admin/campaigns', payload);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete campaign "${name}"?`)) return;
    await api.delete(`/admin/campaigns/${id}`);
    fetchCampaigns();
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Campaigns — BTG Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Campaigns</h1>
          <p className={styles.subtitle}>Manage discount campaigns</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={openCreate}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Form */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>{editId ? 'Edit Campaign' : 'New Campaign'}</h2>
          {formError && <div className={styles.formError}>{formError}</div>}
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Campaign name" />
            </div>
            <div className={styles.field}>
              <label>Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (৳)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Discount Value *</label>
              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percent' ? '10' : '100'} />
            </div>
            <div className={styles.field}>
              <label>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label>End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label>Active</label>
              <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className={styles.empty}>No campaigns yet. Create one above.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Name</th><th>Type</th><th>Value</th><th>Start</th><th>End</th><th>Active</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c._id}>
                  <td className={styles.nameCell}>{c.name}</td>
                  <td className={styles.cell}>{c.type}</td>
                  <td className={styles.cell}>{c.type === 'percent' ? `${c.value}%` : `৳ ${c.value}`}</td>
                  <td className={styles.cell}>{formatDate(c.startDate)}</td>
                  <td className={styles.cell}>{formatDate(c.endDate)}</td>
                  <td className={styles.cell}>
                    <span className={c.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={styles.cell}>
                    <div className={styles.actions}>
                      <button type="button" className={styles.iconBtn} onClick={() => openEdit(c)} title="Edit"><Edit2 size={15} /></button>
                      <button type="button" className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(c._id, c.name)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
