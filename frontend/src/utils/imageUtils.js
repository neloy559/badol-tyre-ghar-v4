/**
 * Cloudinary URL transformation utility.
 *
 * Cloudinary stores the original URL like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/btg-v4/xyz.jpg
 *
 * We can insert a transformation segment AFTER /upload/ to get resized,
 * optimised versions without any extra API calls:
 *   https://res.cloudinary.com/<cloud>/image/upload/w_400,h_400,c_fill,q_auto,f_auto/v123/btg-v4/xyz.jpg
 *
 * For non-Cloudinary URLs (local assets, fallback logos) we return them unchanged.
 */

const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';

/**
 * @param {string} url  - Original image URL from DB
 * @param {object} opts
 * @param {number} [opts.width]   - Target width  (px)
 * @param {number} [opts.height]  - Target height (px)
 * @param {'fill'|'limit'|'pad'|'crop'} [opts.crop='fill'] - Cloudinary crop mode
 *   fill  — crops to exact w×h (good for cards / thumbnails)
 *   limit — shrinks to fit within w×h, never crops (good for galleries)
 * @returns {string}
 */
export function cloudinaryTransform(url, { width, height, crop = 'fill' } = {}) {
  if (!url || !url.includes(CLOUDINARY_UPLOAD_SEGMENT)) {
    return url; // not a Cloudinary URL — return as-is
  }

  const parts = [];
  if (width)  parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (width || height) parts.push(`c_${crop}`);
  parts.push('q_auto');   // let Cloudinary pick optimal quality
  parts.push('f_auto');   // serve WebP/AVIF to supporting browsers

  const transform = parts.join(',');
  return url.replace(CLOUDINARY_UPLOAD_SEGMENT, `${CLOUDINARY_UPLOAD_SEGMENT}${transform}/`);
}

/**
 * Preset helpers — use these in components so sizes stay consistent.
 */

// Card thumbnail (catalog grid, related products) — 400×300 fill
export const cardImage  = url => cloudinaryTransform(url, { width: 400, height: 300, crop: 'fill' });

// Detail hero (ProductDetail gallery main image) — 900×900 limit (no crop)
export const heroImage  = url => cloudinaryTransform(url, { width: 900, height: 900, crop: 'limit' });

// Thumbnail strip (gallery thumbnails) — 160×160 fill
export const thumbImage = url => cloudinaryTransform(url, { width: 160, height: 160, crop: 'fill' });
