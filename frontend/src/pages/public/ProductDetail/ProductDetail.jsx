import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import useFetch from '../../../hooks/useFetch';
import { formatPrice, getCategorySlug } from '../../../utils/formatters';
import { WHATSAPP_NUMBER } from '../../../utils/constants';
import ImageGallery from './components/ImageGallery';
import VariantSelector from './components/VariantSelector';
import SpecsSection from './components/SpecsSection';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import ProductCard from '../../../components/catalog/ProductCard/ProductCard';
import { SkeletonCard } from '../../../components/ui/SkeletonCard/SkeletonCard';
import Spinner from '../../../components/ui/Spinner/Spinner';
import Badge from '../../../components/ui/Badge/Badge';
import Button from '../../../components/ui/Button/Button';
import styles from './ProductDetail.module.css';

const WhatsAppIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

// Safely pull name from a potentially-populated object or plain string
function resolveName(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.name || '';
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isDealer, loading: authLoading } = useAuth();
  const { addToCart } = useCart();

  const [selectedVariantSku, setSelectedVariantSku] = useState(null);
  const [addedToCart, setAddedToCart]               = useState(false);

  const { data: product, loading, error } = useFetch(`/catalog/${slug}`, !authLoading);

  // Auto-select first variant when product loads / changes
  useEffect(() => {
    if (product?.variants?.length > 0) {
      setSelectedVariantSku(product.variants[0].sku);
    }
  }, [product?._id]); // only re-run when we navigate to a different product

  // Fetch related products once we know the category
  const categorySlug = product ? getCategorySlug(product.category) : null;
  const { data: relatedData, loading: relatedLoading } = useFetch(
    categorySlug ? `/catalog?category=${categorySlug}&limit=5` : null,
    !authLoading
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.loader}><Spinner /></div>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Navbar />
        <div className={styles.error}>
          <h2>Product not found</h2>
          <p>The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button onClick={() => navigate('/catalog')}>Back to Catalog</Button>
        </div>
        <Footer />
      </>
    );
  }

  const selectedVariant = product.variants?.find(v => v.sku === selectedVariantSku)
    ?? product.variants?.[0];

  const brandName    = resolveName(product.brand);
  const categoryName = resolveName(product.category);

  // Price visibility logic
  let priceDisplay = null;
  let priceNote    = null;

  if (!user) {
    priceNote = 'Login to view wholesale pricing';
  } else if (user.role === 'dealer' && user.registrationStatus === 'pending') {
    priceNote = 'Pending approval — pricing visible once approved';
  } else if (user.role === 'dealer' && user.registrationStatus === 'rejected') {
    priceNote = 'Account not approved — contact support';
  } else if (isDealer && selectedVariant?.tierPrice != null) {
    priceDisplay = formatPrice(selectedVariant.tierPrice);
  } else if (selectedVariant?.price != null) {
    priceDisplay = formatPrice(selectedVariant.price);
  } else {
    priceDisplay = 'Call for Price';
  }

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addToCart(product, selectedVariant, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const buildWhatsAppMessage = () => {
    const lines = [
      '*Badol Tyre Ghar — Product Inquiry*',
      `Product: ${product.name}`,
      brandName         ? `Brand: ${brandName}` : '',
      product.specs?.size    ? `Size: ${product.specs.size}` : '',
      product.specs?.pattern ? `Pattern: ${product.specs.pattern}` : '',
      selectedVariant?.ply          ? `PLY: ${selectedVariant.ply}` : '',
      selectedVariant?.designModel  ? `Model: ${selectedVariant.designModel}` : '',
      '',
      'দয়া করে এই পণ্যের দাম ও প্রাপ্যতা জানাবেন। ধন্যবাদ।',
    ].filter(Boolean).join('\n');

    const phone = (WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
  };

  // Related products — exclude current product
  const relatedProducts = (relatedData?.products || []).filter(p => p.slug !== slug).slice(0, 4);

  return (
    <>
      <Helmet>
        <title>{product.name} — Badol Tyre Ghar</title>
        <meta name="description" content={`${product.name}${brandName ? ` by ${brandName}` : ''}${product.specs?.size ? ` — Size: ${product.specs.size}` : ''}. Available at Badol Tyre Ghar. Wholesale pricing for approved dealers.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://badol-tyre-ghar.vercel.app/catalog/${product.slug}`} />
        <meta property="og:title" content={`${product.name} — Badol Tyre Ghar`} />
        <meta property="og:description" content={`${product.name}${brandName ? ` by ${brandName}` : ''}${product.specs?.size ? `, Size: ${product.specs.size}` : ''}. Wholesale pricing available for dealers.`} />
        <meta property="og:image" content={product.images?.[0] || 'https://badol-tyre-ghar.vercel.app/assets/branding/logo.jpeg'} />
        <meta property="og:url" content={`https://badol-tyre-ghar.vercel.app/catalog/${product.slug}`} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Badol Tyre Ghar" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": `${product.name}${brandName ? ` by ${brandName}` : ''}${product.specs?.size ? `, size ${product.specs.size}` : ''}`,
          "image": product.images?.[0] || '',
          "brand": brandName ? { "@type": "Brand", "name": brandName } : undefined,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "BDT",
            "availability": selectedVariant?.stockStatus === 'out_of_stock'
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "Badol Tyre Ghar" }
          }
        })}</script>
      </Helmet>
      <Navbar />
      <div className={styles.container}>

        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/catalog">Catalog</Link>
          <span aria-hidden="true">/</span>
          {categorySlug && (
            <>
              <Link to={`/catalog?category=${categorySlug}`}>{categoryName}</Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className={styles.current} aria-current="page">{product.name}</span>
        </nav>

        {/* Back button */}
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
          Back
        </button>

        {/* Main product grid */}
        <div className={styles.grid}>

          {/* Left — image gallery */}
          <ImageGallery
            images={product.images}
            productName={product.name}
            category={categorySlug}
          />

          {/* Right — product info panel */}
          <div className={styles.panel}>

            {/* Brand + tier badge — tier only for dealers, not admin/editor */}
            <div className={styles.metaRow}>
              {brandName && (
                <Link
                  to={`/catalog?brand=${getCategorySlug(product.brand)}`}
                  className={styles.brand}
                >
                  {brandName}
                </Link>
              )}
              {user?.role === 'dealer' && user?.tier && (
                <Badge variant="primary">{user.tier.toUpperCase()} Tier</Badge>
              )}
            </div>

            {/* Product name */}
            <h1 className={styles.title}>{product.name}</h1>

            {/* Size / pattern subtitle */}
            {product.specs?.size && (
              <p className={styles.subtitle}>
                {product.specs.size}
                {product.specs.pattern && ` · ${product.specs.pattern}`}
              </p>
            )}

            {/* Stock badge */}
            {selectedVariant?.stockStatus && (
              <div>
                <Badge
                  variant={
                    selectedVariant.stockStatus === 'in_stock'  ? 'success' :
                    selectedVariant.stockStatus === 'limited'   ? 'warning' : 'danger'
                  }
                >
                  {selectedVariant.stockStatus === 'in_stock'  ? 'In Stock' :
                   selectedVariant.stockStatus === 'limited'   ? 'Limited Stock' : 'Out of Stock'}
                </Badge>
              </div>
            )}

            {/* Variant selector */}
            <VariantSelector
              variants={product.variants}
              selectedSku={selectedVariantSku}
              onSelect={setSelectedVariantSku}
              category={product.category}
            />

            {/* Pricing box */}
            <div className={styles.pricing}>
              {priceDisplay ? (
                <>
                  {selectedVariant?.originalPrice != null &&
                   selectedVariant.originalPrice > (selectedVariant.tierPrice ?? selectedVariant.price ?? 0) && (
                    <span className={styles.originalPrice}>
                      {formatPrice(selectedVariant.originalPrice)}
                    </span>
                  )}
                  <span className={styles.price}>{priceDisplay}</span>
                  {isDealer && (
                    <span className={styles.priceLabel}>Wholesale price (incl. your tier discount)</span>
                  )}
                </>
              ) : (
                <span className={styles.priceNote}>{priceNote}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              <Button
                onClick={handleAddToCart}
                disabled={selectedVariant?.stockStatus === 'out_of_stock'}
                variant="primary"
                fullWidth
              >
                <ShoppingBag size={18} />
                {addedToCart ? '✅ Added to Cart!' : 'Add to Cart'}
              </Button>

              <Button
                as="a"
                href={buildWhatsAppMessage()}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                fullWidth
              >
                <WhatsAppIcon size={18} />
                Order via WhatsApp
              </Button>
            </div>

            {/* Specifications */}
            <SpecsSection product={product} variant={selectedVariant} />

          </div>
        </div>

        {/* Related products */}
        {(relatedLoading || relatedProducts.length > 0) && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>More in {categoryName}</h2>
            <div className={styles.relatedGrid}>
              {relatedLoading
                ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
                : relatedProducts.map(p => <ProductCard key={p._id} product={p} />)
              }
            </div>
          </section>
        )}

      </div>
      <Footer />
    </>
  );
}
