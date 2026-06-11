import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Upload, Trash2, Image } from 'lucide-react';
import api from '../../../services/api';
import { formatDate } from '../../../utils/formatters';
import styles from './AdminMedia.module.css';

const TYPE_OPTS = ['product', 'logo', 'banner', 'other'];

export default function AdminMedia() {
  const [assets, setAssets]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('product');
  const fileRef = useRef(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (typeFilter) params.set('type', typeFilter);
      const res  = await api.get(`/admin/media?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setAssets(json.data?.assets || json.data || []);
      setPagination(json.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', uploadType);
      const res  = await api.upload('/admin/media/upload', fd);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      fetchAssets();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this media asset? This will also remove it from Cloudinary.')) return;
    const res  = await api.delete(`/admin/media/${id}`);
    const json = await res.json();
    if (!res.ok) { alert(json.message); return; }
    fetchAssets();
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => alert('URL copied!'));
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Media Library — BTG Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Media Library</h1>
          <p className={styles.subtitle}>{pagination?.total ?? '—'} assets</p>
        </div>
        <div className={styles.uploadRow}>
          <select className={styles.typeSelect} value={uploadType} onChange={e => setUploadType(e.target.value)}>
            {TYPE_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <label className={`${styles.uploadBtn} ${uploading ? styles.uploading : ''}`}>
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload'}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Filter */}
      <div className={styles.filterRow}>
        <label>Filter by type:</label>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {TYPE_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading media...</div>
      ) : assets.length === 0 ? (
        <div className={styles.empty}>No media assets. Upload something above.</div>
      ) : (
        <div className={styles.grid}>
          {assets.map(asset => (
            <div key={asset._id} className={styles.assetCard}>
              <div className={styles.imageWrap} onClick={() => copyUrl(asset.cloudinaryUrl)} title="Click to copy URL">
                <img src={asset.cloudinaryUrl} alt={asset.filename} className={styles.assetImg}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div className={styles.imgFallback} style={{ display: 'none' }}>
                  <Image size={32} />
                </div>
              </div>
              <div className={styles.assetInfo}>
                <div className={styles.assetName} title={asset.filename}>{asset.filename}</div>
                <div className={styles.assetMeta}>
                  <span className={styles.typeBadge}>{asset.type}</span>
                  <span className={styles.assetDate}>{formatDate(asset.createdAt)}</span>
                </div>
              </div>
              <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(asset._id)} title="Delete">
                <Trash2 size={15} />
              </button>
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
