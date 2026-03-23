import { clearAuthSession, ensureValidSession, getAccessToken, refreshSession } from './auth';

const getApiBaseUrl = () => import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5050';

export const authApi = async (path, options = {}) => {
  const valid = await ensureValidSession();
  if (!valid) {
    clearAuthSession();
    throw new Error('unauthenticated');
  }

  const makeRequest = () => fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  let response = await makeRequest();

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      clearAuthSession();
      throw new Error('session_expired');
    }
    response = await makeRequest();
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.message || `request_failed_${response.status}`;
    throw new Error(message);
  }

  return response.json();
};
