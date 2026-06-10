import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye, EyeOff, Trash2, Search, Package,
  TrendingUp, Upload, BarChart2, ChevronDown, ChevronUp, Save, Plus, X
} from 'lucide-react';
import api from '../../../services/api';
import { formatPrice } from '../../../utils/formatters';
import { cardImage } from '../../../utils/imageUtils';
import { getCategoryLogo } from '../../../utils/constants';
import styles from './AdminCatalog.module.css';

const TABS = ['products', 'bulk-import', 'bulk-markup', 'search-logs'];

// ── helpers ───────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const obj  = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').replace(/"/g, '').trim();
    });
    return obj;
  });
}

// CSV row → product payload
function rowToProduct(row) {
  return {
    name:  row.name  || row.Name  || '',
    sku:   row.sku   || row.SKU   || '',
    slug:  (row.name || row.Name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    category: row.category || row.Category || '',
    brand:    row.brand    || row.Brand    || '',
    specs: {
      size:    row.size    || row.Size    || '',
      pattern: row.pattern || row.Pattern || '',
      rim:     row.rim     || row.Rim     || '',
      origin:  row.origin  || row.Origin  || '',
    },
    variants: [{
      sku:            row.variantSku || row.sku || row.SKU || '',
      ply:            row.ply ? Number(row.ply) : null,
      retailPrice:    Number(row.retailPrice    || row.RetailPrice    || 0),
      wholesalePrice: Number(row.wholesalePrice || row.WholesalePrice || 0),
      stock:          Number(row.stock          || row.Stock          || 0),
    }],
  };
}

// ── Main component ────────────────────────────────────────────────────

export default function AdminCatalog() {
  const [tab, setTab] = useState('products');

  return (
    <div className={styles.page}>
      <div className={styles.tabBar}>
        <button className={`${styles.tabBtn} ${tab === 'products'    ? styles.tabActive : ''}`} onClick={() => setTab('products')}>
          <Package size={15} /> Products
        </button>
        <button className={`${styles.tabBtn} ${tab === 'bulk-import' ? styles.tabActive : ''}`} onClick={() => setTab('bulk-import')}>
          <Upload size={15} /> Bulk Import
        </button>
        <button className={`${styles.tabBtn} ${tab === 'bulk-markup' ? styles.tabActive : ''}`} onClick={() => setTab('bulk-markup')}>
          <TrendingUp size={15} /> Bulk Markup
        </button>
        <button className={`${styles.tabBtn} ${tab === 'search-logs' ? styles.tabActive : ''}`} onClick={() => setTab('search-logs')}>
          <BarChart2 size={15} /> Search Logs
        </button>
      </div>

      {tab === 'products'    && <ProductsTab />}
      {tab === 'bulk-import' && <BulkImportTab />}
      {tab === 'bulk-markup' && <BulkMarkupTab />}
      {tab === 'search-logs' && <SearchLogsTab />}
    </div>
  );
}

// ── Tab: Products list ────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts]       = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);
  const [stockModal, setStockModal]   = useState(null); // { product, variantIdx }
  const [expandedId, setExpandedId]   = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { document.title = 'Catalog — BTG Admin'; }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      // Use admin endpoint — returns ALL products including hidden ones
      const res  = await api.get(`/admin/catalog?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setProducts(json.data?.products || []);
      setPagination(json.data?.pagination || null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function toggleVisibility(id, current) {
    await api.patch(`/admin/catalog/${id}/visibility`, { isVisible: !current });
    fetchProducts();
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await api.delete(`/admin/catalog/${id}`);
    fetchProducts();
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput); setPage(1);
  }

  return (
    <>
      <div className={styles.toolbar}>
        <form className={styles.searchRow} onSubmit={handleSearch}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input className={styles.searchInput} value={searchInput}
              onChange={e => setSearchInput(e.target.value)} placeholder="Search by name, SKU, size..." />
          </div>
          <button type="submit" className={styles.primaryBtn}>Search</button>
          {search && <button type="button" className={styles.ghostBtn}
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>}
        </form>
        <div className={styles.toolbarRight}>
          <span className={styles.total}>{pagination?.total ?? '—'} products</span>
          <button type="button" className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? <div className={styles.loading}>Loading products...</div> : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>Product</th><th>Category</th><th>Brand</th>
                <th>Variants / Stock</th><th>Visible</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {products.map(p => {
                  const catSlug = typeof p.category === 'object' ? p.category?.slug : p.category;
                  const imgSrc  = p.images?.[0] ? cardImage(p.images[0]) : getCategoryLogo(catSlug);
                  const isExpanded = expandedId === p._id;
                  return (
                    <React.Fragment key={p._id}>
                      <tr className={isExpanded ? styles.expandedRow : ''}>
                        <td>
                          <div className={styles.productCell}>
                            <img src={imgSrc} alt={p.name} className={styles.thumb}
                              onError={e => { e.target.onerror = null; e.target.src = getCategoryLogo(catSlug); }} />
                            <div>
                              <div className={styles.productName}>{p.name}</div>
                              <div className={styles.productSku}>{p.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.cell}>{typeof p.category === 'object' ? p.category?.name : p.category}</td>
                        <td className={styles.cell}>{typeof p.brand === 'object' ? p.brand?.name : p.brand}</td>
                        <td className={styles.cell}>
                          <button className={styles.variantToggle}
                            onClick={() => setExpandedId(isExpanded ? null : p._id)}>
                            {p.variants?.length} variant{p.variants?.length !== 1 ? 's' : ''}
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                        <td className={styles.cell}>
                          <button type="button"
                            className={`${styles.iconBtn} ${p.isVisible ? styles.visibleBtn : styles.hiddenBtn}`}
                            onClick={() => toggleVisibility(p._id, p.isVisible)}
                            title={p.isVisible ? 'Visible — click to hide' : 'Hidden — click to show'}>
                            {p.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        </td>
                        <td className={styles.cell}>
                          <button type="button"
                            className={`${styles.iconBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDelete(p._id, p.name)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {/* Variant rows */}
                      {isExpanded && p.variants?.map((v, idx) => (
                        <tr key={v.sku} className={styles.variantRow}>
                          <td colSpan={2} className={styles.variantCell}>
                            <span className={styles.variantLabel}>SKU: {v.sku}</span>
                            {v.ply && <span className={styles.variantChip}>{v.ply} PLY</span>}
                          </td>
                          <td className={styles.variantCell}>
                            <span className={`${styles.stockStatus} ${styles[v.stockStatus] || ''}`}>
                              {v.stockStatus?.replace('_', ' ') || '—'}
                            </span>
                          </td>
                          <td className={styles.variantCell}>
                            <span className={styles.stockNum}>Stock: {v.stock ?? '—'}</span>
                          </td>
                          <td colSpan={2} className={styles.variantCell}>
                            <button type="button" className={styles.updateStockBtn}
                              onClick={() => setStockModal({ product: p, variantIdx: idx, variant: v })}>
                              Update Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
              <span className={styles.pageInfo}>Page {pagination.page} of {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}

      {stockModal && (
        <StockModal
          product={stockModal.product}
          variant={stockModal.variant}
          onClose={() => setStockModal(null)}
          onSaved={() => { setStockModal(null); fetchProducts(); }}
        />
      )}

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchProducts(); }}
        />
      )}
    </>
  );
}

// ── Stock Update Modal ────────────────────────────────────────────────

function StockModal({ product, variant, onClose, onSaved }) {
  const [stock, setStock]   = useState(String(variant.stock ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave() {
    const val = parseInt(stock, 10);
    if (isNaN(val) || val < 0) { setError('Stock must be 0 or more.'); return; }
    setSaving(true); setError('');
    try {
      // Update via PATCH product — send updated variant in variants array
      // Backend updateProduct accepts { variants: [...] } merge via $set
      const updatedVariants = product.variants.map(v =>
        v.sku === variant.sku
          ? { sku: v.sku, ply: v.ply, retailPrice: v.retailPrice ?? 0, wholesalePrice: v.wholesalePrice ?? 0, stock: val }
          : { sku: v.sku, ply: v.ply, retailPrice: v.retailPrice ?? 0, wholesalePrice: v.wholesalePrice ?? 0, stock: v.stock ?? 0 }
      );
      const res  = await api.patch(`/admin/catalog/${product._id}`, { variants: updatedVariants });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onSaved();
    } catch (err) { setError(err.message); setSaving(false); }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Update Stock</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalProductName}>{product.name}</p>
          <p className={styles.modalVariantSku}>SKU: {variant.sku}{variant.ply ? ` · ${variant.ply} PLY` : ''}</p>
          {error && <div className={styles.formError}>{error}</div>}
          <div className={styles.field}>
            <label>New Stock Quantity</label>
            <input
              type="number" min="0"
              className={styles.stockInput}
              value={stock}
              onChange={e => setStock(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Product Modal ─────────────────────────────────────────────────

const EMPTY_VARIANT = { sku: '', ply: '', retailPrice: '', wholesalePrice: '', stock: '0' };

function AddProductModal({ onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    name:        '',
    sku:         '',
    category:    '',
    brand:       '',
    specs: { size: '', pattern: '', rim: '', origin: '' },
    isVisible:   true,
  });

  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);

  useEffect(() => {
    api.get('/categories').then(r => r.json()).then(j => setCategories(j.data || [])).catch(() => {});
    api.get('/brands').then(r => r.json()).then(j => setBrands(j.data || [])).catch(() => {});
  }, []);

  function setField(path, value) {
    setForm(prev => {
      const next = { ...prev };
      if (path.startsWith('specs.')) {
        const key = path.slice(6);
        next.specs = { ...prev.specs, [key]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  }

  function setVariantField(idx, field, value) {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }

  function addVariant() {
    setVariants(prev => [...prev, { ...EMPTY_VARIANT }]);
  }

  function removeVariant(idx) {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError('');

    // Basic validation
    if (!form.name.trim())     { setError('Product name is required.'); return; }
    if (!form.sku.trim())      { setError('Product SKU is required.'); return; }
    if (!form.category)        { setError('Category is required.'); return; }
    if (!form.brand)           { setError('Brand is required.'); return; }
    if (variants.length === 0) { setError('At least one variant is required.'); return; }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku.trim()) { setError(`Variant ${i + 1}: SKU is required.`); return; }
      if (v.retailPrice === '' || isNaN(Number(v.retailPrice)) || Number(v.retailPrice) < 0) {
        setError(`Variant ${i + 1}: Retail price must be 0 or more.`); return;
      }
      if (v.wholesalePrice === '' || isNaN(Number(v.wholesalePrice)) || Number(v.wholesalePrice) < 0) {
        setError(`Variant ${i + 1}: Wholesale price must be 0 or more.`); return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name:     form.name.trim(),
        sku:      form.sku.trim(),
        category: form.category,
        brand:    form.brand,
        specs:    form.specs,
        isVisible: form.isVisible,
        variants: variants.map(v => ({
          sku:            v.sku.trim(),
          ply:            v.ply !== '' ? Number(v.ply) : null,
          retailPrice:    Number(v.retailPrice),
          wholesalePrice: Number(v.wholesalePrice),
          stock:          Number(v.stock) || 0,
        })),
      };

      const res  = await api.post('/admin/catalog', payload);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLarge}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Add Product</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={`${styles.modalBody} ${styles.modalBodyScroll}`}>
          {error && <div className={styles.formError}>{error}</div>}

          {/* Basic info */}
          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Product Name <span className={styles.required}>*</span></label>
                <input type="text" value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Apollo Tyre 195/65R15" />
              </div>
              <div className={styles.field}>
                <label>Product SKU <span className={styles.required}>*</span></label>
                <input type="text" value={form.sku}
                  onChange={e => setField('sku', e.target.value)}
                  placeholder="e.g. APL-001" />
              </div>
              <div className={styles.field}>
                <label>Category <span className={styles.required}>*</span></label>
                <select value={form.category} onChange={e => setField('category', e.target.value)}>
                  <option value="">— Select Category —</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Brand <span className={styles.required}>*</span></label>
                <select value={form.brand} onChange={e => setField('brand', e.target.value)}>
                  <option value="">— Select Brand —</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>Specs (optional)</div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Size</label>
                <input type="text" value={form.specs.size}
                  onChange={e => setField('specs.size', e.target.value)}
                  placeholder="e.g. 195/65R15" />
              </div>
              <div className={styles.field}>
                <label>Pattern</label>
                <input type="text" value={form.specs.pattern}
                  onChange={e => setField('specs.pattern', e.target.value)}
                  placeholder="e.g. Passenger" />
              </div>
              <div className={styles.field}>
                <label>Rim</label>
                <input type="text" value={form.specs.rim}
                  onChange={e => setField('specs.rim', e.target.value)}
                  placeholder="e.g. 15" />
              </div>
              <div className={styles.field}>
                <label>Origin</label>
                <input type="text" value={form.specs.origin}
                  onChange={e => setField('specs.origin', e.target.value)}
                  placeholder="e.g. India" />
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className={styles.formSection}>
            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={form.isVisible}
                onChange={e => setField('isVisible', e.target.checked)} />
              <span>Visible on public catalog</span>
            </label>
          </div>

          {/* Variants */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <span className={styles.formSectionLabel}>Variants <span className={styles.required}>*</span></span>
              <button type="button" className={styles.ghostBtn} onClick={addVariant}>
                <Plus size={13} /> Add Variant
              </button>
            </div>
            {variants.map((v, idx) => (
              <div key={idx} className={styles.variantFormRow}>
                <div className={styles.variantFormGrid}>
                  <div className={styles.field}>
                    <label>SKU</label>
                    <input type="text" value={v.sku}
                      onChange={e => setVariantField(idx, 'sku', e.target.value)}
                      placeholder="e.g. APL-001-4P" />
                  </div>
                  <div className={styles.field}>
                    <label>PLY</label>
                    <input type="number" min="1" value={v.ply}
                      onChange={e => setVariantField(idx, 'ply', e.target.value)}
                      placeholder="e.g. 4" />
                  </div>
                  <div className={styles.field}>
                    <label>Retail Price ৳</label>
                    <input type="number" min="0" step="0.01" value={v.retailPrice}
                      onChange={e => setVariantField(idx, 'retailPrice', e.target.value)}
                      placeholder="0" />
                  </div>
                  <div className={styles.field}>
                    <label>Wholesale Price ৳</label>
                    <input type="number" min="0" step="0.01" value={v.wholesalePrice}
                      onChange={e => setVariantField(idx, 'wholesalePrice', e.target.value)}
                      placeholder="0" />
                  </div>
                  <div className={styles.field}>
                    <label>Stock</label>
                    <input type="number" min="0" value={v.stock}
                      onChange={e => setVariantField(idx, 'stock', e.target.value)}
                      placeholder="0" />
                  </div>
                </div>
                {variants.length > 1 && (
                  <button type="button" className={styles.removeVariantBtn}
                    onClick={() => removeVariant(idx)} title="Remove variant">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Create Product'}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Bulk Import ──────────────────────────────────────────────────

function BulkImportTab() {
  const fileRef     = useRef(null);
  const [rows, setRows]         = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result);
        setRows(parsed);
        setResult(null); setError('');
      } catch { setError('Failed to parse CSV file.'); }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true); setError(''); setResult(null);
    try {
      const products = rows.map(rowToProduct).filter(p => p.name && p.sku);
      const res  = await api.post('/admin/catalog/bulk', { products });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setResult(json.data);
      setRows([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) { setError(err.message); }
    finally { setImporting(false); }
  }

  function downloadTemplate() {
    const header = 'name,sku,variantSku,category,brand,size,pattern,ply,retailPrice,wholesalePrice,stock';
    const sample = 'Apollo Tyre 195/65R15,APL-001,APL-001-STD,tyres,Apollo,195/65R15,Passenger,4,6500,5800,50';
    const blob   = new Blob([header + '\n' + sample], { type: 'text/csv' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = 'btg_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Bulk Import Products</h2>
          <p className={styles.sectionDesc}>Upload a CSV file to import multiple products at once.</p>
        </div>
        <button type="button" className={styles.ghostBtn} onClick={downloadTemplate}>
          ↓ Download Template
        </button>
      </div>

      <div className={styles.uploadZone}>
        <Upload size={32} className={styles.uploadIcon} />
        <p>Choose a CSV file or drag and drop</p>
        <label className={styles.primaryBtn}>
          Choose File
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.importResult}>
          <div className={styles.resultRow}>
            <span className={styles.resultSuccess}>✅ Created: {result.created}</span>
            {result.failed > 0 && <span className={styles.resultFail}>❌ Failed: {result.failed}</span>}
          </div>
          {result.errors?.length > 0 && (
            <div className={styles.importErrors}>
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} className={styles.importErrorRow}>SKU {e.sku}: {e.message}</div>
              ))}
              {result.errors.length > 5 && <div className={styles.importErrorRow}>...and {result.errors.length - 5} more</div>}
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className={styles.previewHeader}>
            <span className={styles.previewCount}>{rows.length} rows parsed — preview:</span>
            <button type="button" className={styles.primaryBtn} onClick={handleImport} disabled={importing}>
              <Upload size={15} /> {importing ? 'Importing...' : `Import ${rows.length} Products`}
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>Name</th><th>SKU</th><th>Category</th><th>Brand</th><th>Size</th>
                <th>Retail ৳</th><th>Wholesale ৳</th><th>Stock</th>
              </tr></thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td className={styles.cell}>{row.name || row.Name}</td>
                    <td className={styles.cell}>{row.sku  || row.SKU}</td>
                    <td className={styles.cell}>{row.category || row.Category}</td>
                    <td className={styles.cell}>{row.brand    || row.Brand}</td>
                    <td className={styles.cell}>{row.size     || row.Size}</td>
                    <td className={styles.cell}>{row.retailPrice    || row.RetailPrice}</td>
                    <td className={styles.cell}>{row.wholesalePrice || row.WholesalePrice}</td>
                    <td className={styles.cell}>{row.stock    || row.Stock}</td>
                  </tr>
                ))}
                {rows.length > 10 && (
                  <tr><td colSpan={8} className={styles.cell} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    ...and {rows.length - 10} more rows
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab: Bulk Markup ──────────────────────────────────────────────────

function BulkMarkupTab() {
  const [adjustmentType,  setAdjustmentType]  = useState('percent');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId,    setBrandId]    = useState('');
  const [applying,   setApplying]   = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  // Fetch categories and brands for selectors
  const [categories, setCategories] = useState([]);
  const [brands,     setBrands]     = useState([]);

  useEffect(() => {
    api.get('/categories').then(r => r.json()).then(j => setCategories(j.data || [])).catch(() => {});
    api.get('/brands').then(r => r.json()).then(j => setBrands(j.data || [])).catch(() => {});
  }, []);

  async function handleApply() {
    const val = parseFloat(adjustmentValue);
    if (isNaN(val) || val === 0) { setError('Enter a non-zero adjustment value.'); return; }
    if (!window.confirm(`Apply ${val}${adjustmentType === 'percent' ? '%' : '৳'} markup to ALL matching products? This cannot be undone.`)) return;
    setApplying(true); setError(''); setResult(null);
    try {
      const body = { adjustmentType, adjustmentValue: val };
      if (categoryId) body.categoryId = categoryId;
      if (brandId)    body.brandId    = brandId;
      const res  = await api.patch('/admin/catalog/bulk-markup', body);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setResult(json.data);
      setAdjustmentValue('');
    } catch (err) { setError(err.message); }
    finally { setApplying(false); }
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Bulk Price Markup</h2>
          <p className={styles.sectionDesc}>Adjust retail and wholesale prices for multiple products at once.</p>
        </div>
      </div>

      <div className={styles.markupCard}>
        <div className={styles.markupGrid}>
          <div className={styles.field}>
            <label>Adjustment Type</label>
            <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)}>
              <option value="percent">Percent (%) — e.g. 10 = +10%</option>
              <option value="flat">Flat (৳) — e.g. 100 = +৳100</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Value (use negative to reduce)</label>
            <input
              type="number" step="0.01"
              value={adjustmentValue}
              onChange={e => setAdjustmentValue(e.target.value)}
              placeholder={adjustmentType === 'percent' ? '10' : '100'}
            />
          </div>
          <div className={styles.field}>
            <label>Filter by Category (optional)</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Filter by Brand (optional)</label>
            <select value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">All Brands</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        {result && (
          <div className={styles.importResult}>
            ✅ Updated {result.updated} product{result.updated !== 1 ? 's' : ''}.
          </div>
        )}

        <div className={styles.markupWarning}>
          ⚠️ This will permanently modify retail and wholesale prices. Cannot be undone.
        </div>

        <button type="button" className={styles.dangerBtn} onClick={handleApply} disabled={applying || !adjustmentValue}>
          <TrendingUp size={15} />
          {applying ? 'Applying...' : 'Apply Markup'}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Search Logs ──────────────────────────────────────────────────

function SearchLogsTab() {
  const [logs, setLogs]           = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res  = await api.get(`/admin/catalog/search-logs?page=${page}&limit=20`);
        const json = await res.json();
        if (res.ok) {
          setLogs(Array.isArray(json.data) ? json.data : []);
          setPagination(json.pagination || null);
        }
      } finally { setLoading(false); }
    }
    fetch();
  }, [page]);

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Search Analytics</h2>
          <p className={styles.sectionDesc}>Top search terms used by visitors and dealers.</p>
        </div>
      </div>

      {loading ? <div className={styles.loading}>Loading...</div> : logs.length === 0 ? (
        <div className={styles.empty}>No search data yet.</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>#</th><th>Search Term</th><th>Searches</th><th>Results Found</th><th>Last Searched</th>
              </tr></thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id}>
                    <td className={styles.cell} style={{ color: 'var(--color-text-muted)', width: 48 }}>
                      {((page - 1) * 20) + i + 1}
                    </td>
                    <td className={styles.cell}>
                      <span className={styles.searchTerm}>{log.term}</span>
                    </td>
                    <td className={styles.cell}>
                      <span className={styles.searchCount}>{log.count}</span>
                    </td>
                    <td className={styles.cell}>{log.resultCount ?? '—'}</td>
                    <td className={styles.cell} style={{ color: 'var(--color-text-muted)' }}>
                      {log.lastSearchedAt ? new Date(log.lastSearchedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
              <span className={styles.pageInfo}>Page {pagination.page} of {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
