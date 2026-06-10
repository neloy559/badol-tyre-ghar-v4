import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { pdf } from '@react-pdf/renderer';
import CatalogDocument from '../components/pdf/CatalogDocument';
import { downloadBlob } from '../utils/formatters';
import { PDF_CACHE_KEY, PDF_CACHE_TTL_MS } from '../utils/constants';

export function usePdfDownload() {
  const { isDealer } = useAuth();
  const [generating, setGenerating] = useState(false);

  async function download(category = null, label = 'All Products') {
    if (!isDealer || generating) {
      return;
    }

    setGenerating(true);

    try {
      // 1. Check localStorage cache
      const cacheKey = `${PDF_CACHE_KEY}_${category || 'all'}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cached = cachedData ? JSON.parse(cachedData) : null;
      const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;

      if (cached && cacheAge < PDF_CACHE_TTL_MS) {
        // Serve from cache (stored as base64 data URL)
        const res = await fetch(cached.dataUrl);
        const blob = await res.blob();
        const filename = `BTG_${label.replace(/\s+/g, '')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        downloadBlob(blob, filename);
        return;
      }

      // 2. Fetch catalog data
      const params = new URLSearchParams({ limit: '500' });
      if (category) {
        params.set('category', category);
      }

      const res = await api.get(`/catalog?${params}`);
      if (!res || !res.ok) {
        throw new Error('Failed to fetch catalog');
      }

      const json = await res.json();
      const products = json.data?.products || [];

      if (products.length === 0) {
        alert('No products found.');
        return;
      }

      // 3. Generate PDF
      const blob = await pdf(<CatalogDocument products={products} categoryName={label} />).toBlob();

      // 4. Cache as base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const cacheEntry = {
          dataUrl: reader.result,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      };

      // 5. Trigger download
      const filename = `BTG_${label.replace(/\s+/g, '')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      alert(`PDF generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return {
    download,
    generating,
    canDownload: isDealer
  };
}
