export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

export const CATEGORIES = [
  { label: 'Tubes', slug: 'tubes', logo: '/assets/categories/tube.png' },
  { label: 'Tyres', slug: 'tyres', logo: '/assets/categories/tyre.png' },
  { label: 'Tyre Sealants', slug: 'tyre-sealants', logo: '/assets/categories/sealant.png' },
  { label: 'Patches', slug: 'patches', logo: '/assets/categories/patch.png' },
  { label: 'Flaps', slug: 'flaps', logo: '/assets/categories/flap.png' },
  { label: 'Gadgets', slug: 'gadgets', logo: '/assets/categories/gadgets.png' },
];

export const getCategoryLogo = (slug) => {
  const cat = CATEGORIES.find(c => c.slug === slug);
  return cat ? cat.logo : '/assets/branding/logo.jpeg';
};

export const STOCK_LABELS = {
  in_stock:     { text: 'In Stock',      cls: 'in-stock' },
  limited:      { text: 'Limited Stock', cls: 'limited' },
  out_of_stock: { text: 'Out of Stock',  cls: 'out-of-stock' },
};

export const PDF_CACHE_KEY     = 'btg_pdf_cache';
export const PDF_CACHE_TTL_MS  = 24 * 60 * 60 * 1000; // 24h
export const NOTIFICATION_POLL_MS = 30_000; // 30s
export const DEFAULT_SITE_NAME = 'Badol Tyre Ghar';
export const PAGINATION_LIMIT  = 20;
