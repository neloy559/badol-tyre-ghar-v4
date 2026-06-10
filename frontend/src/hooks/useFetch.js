import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

/**
 * useFetch — generic GET hook.
 *
 * @param {string|null} path   - API path. Pass null to skip fetching.
 * @param {boolean}     ready  - Delay fetch until this is true (default true).
 *                               Pass `!authLoading` so auth bootstrap finishes first.
 */
export default function useFetch(path, ready = true) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!!(path && ready));
  const [error,   setError]   = useState(null);
  const lastPathRef = useRef(null);

  const fetchData = useCallback(async (currentPath) => {
    if (!currentPath) return;
    setLoading(true);
    setError(null);
    if (lastPathRef.current !== currentPath) {
      setData(null);
    }
    try {
      const res = await api.get(currentPath);
      if (!res) return;
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      lastPathRef.current = currentPath;
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path || !ready) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    fetchData(path);
  }, [path, ready, fetchData]);

  const refetch = useCallback(() => fetchData(path), [path, fetchData]);

  return { data, loading, error, refetch };
}
