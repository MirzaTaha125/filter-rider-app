import { dispatchSessionExpired } from '../utils/authEvents';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://flterhomeapitemp.duckdns.org/api/v1';

function getToken() {
  return localStorage.getItem('adminToken');
}

function getRefreshToken() {
  return localStorage.getItem('adminRefreshToken');
}

let refreshingPromise = null;
let sessionExpiredDispatched = false;

function fireSessionExpired() {
  if (sessionExpiredDispatched) return;
  sessionExpiredDispatched = true;
  dispatchSessionExpired();
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !options.noAuth && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const res = await fetch(url, config);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken && !options._isRetry) {
        try {
          if (!refreshingPromise) {
            refreshingPromise = apiRequest('/admin/auth/refresh', {
              method: 'POST',
              body: JSON.stringify({ refresh_token: refreshToken }),
              noAuth: true,
              _isRetry: true,
            });
          }

          const refreshData = await refreshingPromise;
          refreshingPromise = null;

          // Unwrap nested data if response is { message, data: { access_token, ... } }
          const tokenData = refreshData?.data ?? refreshData;
          const newToken = tokenData.access_token || tokenData.token || tokenData.accessToken;
          if (newToken) {
            setAuthToken(newToken);
            const nextRefreshToken = tokenData.refresh_token || tokenData.refreshToken;
            if (nextRefreshToken) {
              setRefreshToken(nextRefreshToken);
            }
            // Notify SocketContext to reconnect with new token
            window.dispatchEvent(new CustomEvent('admin:token-refreshed', { detail: { token: newToken } }))
            return apiRequest(endpoint, { ...options, _isRetry: true });
          }
        } catch (refreshErr) {
          refreshingPromise = null;
          setAuthToken(null);
          setRefreshToken(null);
          fireSessionExpired();
          throw refreshErr;
        }
      }
      fireSessionExpired();
    }
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  // Handle various response wrappers
  return json.data !== undefined ? json.data : json;
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('adminToken', token);
    sessionExpiredDispatched = false;
  } else {
    localStorage.removeItem('adminToken');
  }
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem('adminRefreshToken', token);
  else localStorage.removeItem('adminRefreshToken');
}

export function getAuthToken() {
  return getToken();
}
