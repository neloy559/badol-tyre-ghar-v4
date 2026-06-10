import { API_BASE_URL } from '../utils/constants';

let _accessToken = null;
let _onLogout    = () => {};

export function setAccessToken(token) { _accessToken = token; }
export function setLogoutHandler(fn)  { _onLogout = fn; }

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  let res = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Don't retry on auth endpoints to prevent infinite loops
  const isAuthEndpoint = path.includes('/auth/logout') || path.includes('/auth/refresh') || path.includes('/auth/login');
  
  // Single retry on 401 (only for non-auth endpoints)
  if (res.status === 401 && !isAuthEndpoint) {
    const refreshRes = await fetch(API_BASE_URL + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const json = await refreshRes.json();
      _accessToken = json.data?.accessToken;
      headers['Authorization'] = `Bearer ${_accessToken}`;
      res = await fetch(API_BASE_URL + path, { ...options, headers, credentials: 'include' });
    } else {
      _accessToken = null;
      _onLogout();
      return null;
    }
  }

  return res;
}

const api = {
  get:    (path, opts)        => apiFetch(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts)  => apiFetch(path, { ...opts, method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path, body, opts)  => apiFetch(path, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, opts)        => apiFetch(path, { ...opts, method: 'DELETE' }),
  // For multipart/form-data (file upload), don't set Content-Type, let browser set boundary
  upload: (path, formData)    => apiFetch(path, { method: 'POST', body: formData, headers: {} }),
};

export default api;
