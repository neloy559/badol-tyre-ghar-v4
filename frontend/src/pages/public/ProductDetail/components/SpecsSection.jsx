import React from 'react';
import styles from './SpecsSection.module.css';

// Safely extract brand name — backend returns populated object { name, slug }
function getBrandName(brand) {
  if (!brand) return null;
  if (typeof brand === 'string') return brand;
  return brand.name || null;
}

// Safely extract category slug — backend returns populated object { name, slug }
function getCatSlug(category) {
  if (!category) return '';
  if (typeof category === 'string') return category.toLowerCase();
  return (category.slug || category.name || '').toLowerCase();
}

export default function SpecsSection({ product, variant }) {
  if (!product) return null;

  const categorySlug = getCatSlug(product.category);
  const brandName    = getBrandName(product.brand);
  const specs = [];

  // KEY RULE: Tyres have PLY Rating, Tubes and Flaps do NOT
  if (categorySlug.includes('tyre') && !categorySlug.includes('tube')) {
    if (product.specs?.size)    specs.push({ label: 'Size',       value: product.specs.size });
    if (product.specs?.pattern) specs.push({ label: 'Pattern',    value: product.specs.pattern });
    if (variant?.ply)           specs.push({ label: 'PLY Rating', value: `${variant.ply} PLY` });
    if (product.specs?.rim)     specs.push({ label: 'Rim Size',   value: product.specs.rim });
    if (product.specs?.origin)  specs.push({ label: 'Origin',     value: product.specs.origin });
    if (brandName)              specs.push({ label: 'Brand',      value: brandName });
  } else if (categorySlug.includes('tube')) {
    if (product.specs?.size)      specs.push({ label: 'Size',           value: product.specs.size });
    if (product.specs?.valveType) specs.push({ label: 'Valve Type',     value: product.specs.valveType });
    if (product.specs?.material)  specs.push({ label: 'Material',       value: product.specs.material });
    if (product.specs?.rim)       specs.push({ label: 'Rim Size',       value: product.specs.rim });
    if (product.specs?.origin)    specs.push({ label: 'Origin',         value: product.specs.origin });
    if (brandName)                specs.push({ label: 'Brand',          value: brandName });
  } else if (categorySlug.includes('flap')) {
    if (product.specs?.size)     specs.push({ label: 'Size',     value: product.specs.size });
    if (product.specs?.material) specs.push({ label: 'Material', value: product.specs.material });
    if (product.specs?.rim)      specs.push({ label: 'Rim Size', value: product.specs.rim });
    if (product.specs?.origin)   specs.push({ label: 'Origin',   value: product.specs.origin });
    if (brandName)               specs.push({ label: 'Brand',    value: brandName });
  } else if (categorySlug.includes('sealant')) {
    if (product.specs?.volume)        specs.push({ label: 'Volume',          value: product.specs.volume });
    if (product.specs?.formulaType)   specs.push({ label: 'Formula Type',    value: product.specs.formulaType });
    if (product.specs?.compatibleWith)specs.push({ label: 'Compatible With', value: product.specs.compatibleWith });
    if (brandName)                    specs.push({ label: 'Brand',           value: brandName });
  } else if (categorySlug.includes('patch')) {
    if (product.specs?.size)          specs.push({ label: 'Size',            value: product.specs.size });
    if (product.specs?.patchType)     specs.push({ label: 'Type',            value: product.specs.patchType });
    if (product.specs?.compatibleWith)specs.push({ label: 'Compatible With', value: product.specs.compatibleWith });
    if (brandName)                    specs.push({ label: 'Brand',           value: brandName });
  } else if (categorySlug.includes('gadget')) {
    if (product.specs?.gadgetType)    specs.push({ label: 'Type',            value: product.specs.gadgetType });
    if (product.specs?.material)      specs.push({ label: 'Material',        value: product.specs.material });
    if (product.specs?.compatibleWith)specs.push({ label: 'Compatible With', value: product.specs.compatibleWith });
    if (brandName)                    specs.push({ label: 'Brand',           value: brandName });
  } else {
    if (product.specs?.size)    specs.push({ label: 'Size',    value: product.specs.size });
    if (product.specs?.pattern) specs.push({ label: 'Pattern', value: product.specs.pattern });
    if (product.specs?.rim)     specs.push({ label: 'Rim',     value: product.specs.rim });
    if (product.specs?.origin)  specs.push({ label: 'Origin',  value: product.specs.origin });
    if (brandName)              specs.push({ label: 'Brand',   value: brandName });
  }

  if (product.customSpecs && Array.isArray(product.customSpecs)) {
    product.customSpecs.forEach(spec => {
      if (spec.key && spec.value) specs.push({ label: spec.key, value: spec.value });
    });
  }

  if (specs.length === 0) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>Specifications</h2>
      <div className={styles.grid}>
        {specs.map((spec, index) => (
          <div key={index} className={styles.row}>
            <span className={styles.label}>{spec.label}</span>
            <span className={styles.value}>{spec.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
