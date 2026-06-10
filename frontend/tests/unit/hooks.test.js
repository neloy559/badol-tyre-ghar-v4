import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from '../../src/hooks/useFetch';
import api from '../../src/services/api';

vi.mock('../../src/services/api');

describe('useFetch Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start in loading state', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFetch('/test'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set data on successful fetch', async () => {
    const mockData = { products: [{ id: 1, name: 'Test Product' }] };

    api.get.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData })
    });

    const { result } = renderHook(() => useFetch('/catalog'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should set error on failed fetch', async () => {
    const errorMessage = 'Network error';

    api.get.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: errorMessage })
    });

    const { result } = renderHook(() => useFetch('/catalog'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle API exceptions', async () => {
    api.get.mockRejectedValue(new Error('API crashed'));

    const { result } = renderHook(() => useFetch('/catalog'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeDefined();
  });

  it('should call API with correct endpoint', async () => {
    const endpoint = '/catalog/products';

    api.get.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    renderHook(() => useFetch(endpoint));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(endpoint);
    });
  });

  it('should refetch when endpoint changes', async () => {
    api.get.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    const { rerender } = renderHook(
      ({ endpoint }) => useFetch(endpoint),
      { initialProps: { endpoint: '/catalog' } }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/catalog');
    });

    rerender({ endpoint: '/brands' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/brands');
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('should not fetch if endpoint is null', () => {
    api.get.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    const { result } = renderHook(() => useFetch(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});
