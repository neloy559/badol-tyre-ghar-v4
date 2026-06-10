import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, MessageCircle } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { formatPrice, getCategorySlug } from '../../../utils/formatters';
import { WHATSAPP_NUMBER } from '../../../utils/constants';
import { cardImage } from '../../../utils/imageUtils';
import { getCategoryLogo } from '../../../utils/constants';
import api from '../../../services/api';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import styles from './Cart.module.css';

const WhatsAppIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function Cart() {
  const { items, itemCount, removeFromCart, setQty, clear } = useCart();
  const { user, isDealer } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted]     = useState(false);

  // ── Price calculations ────────────────────────
  // RULE: never compute prices on frontend — use what server sent
  // tierPrice is the server-computed dealer price
  // price is the retail/regular price
  // If neither exists, treat as 0 for subtotal but show "—"

  function getLinePrice(item) {
    const unit = item.variant?.tierPrice ?? item.variant?.price ?? null;
    return unit !== null ? unit * item.quantity : null;
  }

  function getUnitPrice(item) {
    return item.variant?.tierPrice ?? item.variant?.price ?? null;
  }

  // Only show order total if ALL items have a price
  const allHavePrices  = items.every(i => getUnitPrice(i) !== null);
  const orderTotal     = allHavePrices
    ? items.reduce((sum, i) => sum + (getUnitPrice(i) * i.quantity), 0)
    : null;
  const totalItems     = items.reduce((sum, i) => sum + i.quantity, 0);

  // ── Build WhatsApp message ────────────────────
  function buildWhatsAppLink(inquiryId) {
    const lines = [
      '*Badol Tyre Ghar — Purchase Inquiry*',
      inquiryId ? `Inquiry ID: #${String(inquiryId).slice(-6).toUpperCase()}` : '',
      '',
      ...items.map(i => {
        const name  = i.product?.name || 'Product';
        const sku   = i.variant?.sku  || '';
        const ply   = i.variant?.ply  ? ` | ${i.variant.ply} PLY` : '';
        const price = getUnitPrice(i) !== null ? ` — ${formatPrice(getUnitPrice(i))}` : '';
        return `• ${i.quantity}x ${name} (SKU: ${sku}${ply})${price}`;
      }),
      '',
      orderTotal !== null ? `*মোট: ${formatPrice(orderTotal)}*` : '',
      '',
      'দয়া করে এই অর্ডারটি confirm করুন। ধন্যবাদ।',
    ].filter(l => l !== undefined).join('\n');

    const phone = (WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
  }

  // ── Submit inquiry ────────────────────────────
  async function handleSubmitInquiry() {
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        items: items.map(i => ({
          productId:  i.product._id,
          variantSku: i.variant.sku,
          quantity:   i.quantity,
        })),
      };

      const res = await api.post('/inquiries', payload);

      if (!res) {
        // api returned null = session expired, was logged out
        setSubmitError('Session expired. Please log in again.');
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError(json.message || 'Failed to submit inquiry.');
        return;
      }

      const json     = await res.json();
      const inquiryId = json.data?._id || '';

      // Clear cart, mark submitted
      clear();
      setSubmitted(true);

      // Open WhatsApp after a short delay so user sees the success state
      setTimeout(() => {
        const link = buildWhatsAppLink(inquiryId);
        window.open(link, '_blank', 'noopener,noreferrer');
      }, 800);

    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Empty cart ────────────────────────────────
  if (submitted) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>✅</div>
            <h1 className={styles.successTitle}>Inquiry Submitted!</h1>
            <p className={styles.successText}>
              Your inquiry has been recorded. WhatsApp is opening — please send the
              pre-filled message to complete your order.
            </p>
            <div className={styles.successActions}>
              <Link to="/catalog" className={styles.continueShopping}>
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <ShoppingBag size={56} />
            </div>
            <h1 className={styles.emptyTitle}>Your cart is empty</h1>
            <p className={styles.emptyText}>
              Browse our catalog and add products to your inquiry cart.
            </p>
            <Link to="/catalog" className={styles.browseBtn}>
              Browse Catalog
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ── Cart with items ───────────────────────────
  return (
    <>
      <Navbar />
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Back
          </button>
          <div className={styles.headerRight}>
            <h1 className={styles.title}>
              Inquiry Cart
              <span className={styles.itemCountBadge}>{totalItems}</span>
            </h1>
            <button className={styles.clearAllBtn} onClick={clear}>
              Clear all
            </button>
          </div>
        </div>

        <div className={styles.layout}>

          {/* ── Cart items list ── */}
          <div className={styles.itemsList}>
            {items.map(item => {
              const catSlug  = getCategorySlug(item.product?.category);
              const rawSrc   = item.product?.images?.[0] || null;
              const imgSrc   = rawSrc ? cardImage(rawSrc) : getCategoryLogo(catSlug);
              const unitPrice = getUnitPrice(item);
              const lineTotal = getLinePrice(item);
              const outOfStock = item.variant?.stockStatus === 'out_of_stock';

              return (
                <div
                  key={`${item.product._id}-${item.variant.sku}`}
                  className={`${styles.item} ${outOfStock ? styles.itemOutOfStock : ''}`}
                >
                  {/* Thumbnail */}
                  <Link to={`/catalog/${item.product.slug}`} className={styles.itemImgWrap}>
                    <img
                      src={imgSrc}
                      alt={item.product.name}
                      className={styles.itemImg}
                      loading="lazy"
                      decoding="async"
                      onError={e => { e.target.onerror = null; e.target.src = getCategoryLogo(catSlug); }}
                    />
                  </Link>

                  {/* Info */}
                  <div className={styles.itemInfo}>
                    <Link to={`/catalog/${item.product.slug}`} className={styles.itemName}>
                      {item.product.name}
                    </Link>

                    <div className={styles.itemMeta}>
                      {item.variant?.ply && (
                        <span className={styles.metaChip}>{item.variant.ply} PLY</span>
                      )}
                      <span className={styles.metaChip}>SKU: {item.variant.sku}</span>
                      {outOfStock && (
                        <span className={`${styles.metaChip} ${styles.outChip}`}>Out of Stock</span>
                      )}
                    </div>

                    {/* Unit price */}
                    {unitPrice !== null ? (
                      <div className={styles.unitPrice}>{formatPrice(unitPrice)} / unit</div>
                    ) : (
                      <div className={styles.unitPriceMuted}>
                        {user ? 'Price on inquiry' : 'Login to see price'}
                      </div>
                    )}
                  </div>

                  {/* Qty + line total */}
                  <div className={styles.itemRight}>
                    <div className={styles.qtyControl}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => setQty(item.product._id, item.variant.sku, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        className={styles.qtyInput}
                        value={item.quantity}
                        min={1}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 1) {
                            setQty(item.product._id, item.variant.sku, v);
                          }
                        }}
                        aria-label="Quantity"
                      />
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => setQty(item.product._id, item.variant.sku, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {lineTotal !== null && (
                      <div className={styles.lineTotal}>{formatPrice(lineTotal)}</div>
                    )}

                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeFromCart(item.product._id, item.variant.sku)}
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Order summary sidebar ── */}
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>Order Summary</h2>

            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>Total items</span>
                <span>{totalItems}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Products</span>
                <span>{items.length}</span>
              </div>
            </div>

            {orderTotal !== null ? (
              <div className={styles.totalRow}>
                <span>Estimated Total</span>
                <span className={styles.totalAmount}>{formatPrice(orderTotal)}</span>
              </div>
            ) : (
              <div className={styles.noTotalNote}>
                {user
                  ? 'Final pricing will be confirmed via WhatsApp.'
                  : 'Login as an approved dealer to see pricing.'}
              </div>
            )}

            {submitError && (
              <div className={styles.errorMsg}>{submitError}</div>
            )}

            {/* Submit inquiry → then open WhatsApp */}
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmitInquiry}
              disabled={submitting || items.length === 0}
            >
              <WhatsAppIcon size={20} />
              {submitting ? 'Submitting...' : 'Submit Inquiry via WhatsApp'}
            </button>

            <p className={styles.submitNote}>
              This will record your inquiry and open WhatsApp with a pre-filled order message.
            </p>

            {/* Guest nudge */}
            {!user && (
              <div className={styles.loginNudge}>
                <Link to="/login">Login</Link> or{' '}
                <Link to="/register">register as a dealer</Link> to see wholesale pricing.
              </div>
            )}

            <Link to="/catalog" className={styles.continueLink}>
              ← Continue Shopping
            </Link>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
