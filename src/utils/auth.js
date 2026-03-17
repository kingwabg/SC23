const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getApiBaseUrl = () => import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5050';

const decodePayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isExpired = (token, skewMs = 5000) => {
  const payload = decodePayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - skewMs;
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setAuthSession = (tokens, user) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  localStorage.setItem('userRole', user.role);

  if (user.role === 'ADMIN') {
    localStorage.removeItem('currentUser');
    return;
  }

  localStorage.setItem(
    'currentUser',
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
      permissions: user.permissions || {},
    }),
  );
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
};

export const logoutSession = async () => {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearAuthSession();
  }
};

export const refreshSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuthSession();
      return false;
    }

    const data = await response.json();
    setAuthSession(data.tokens, data.user);
    return true;
  } catch {
    return false;
  }
};

export const ensureValidSession = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) return false;
  if (!isExpired(accessToken)) return true;
  return refreshSession();
};

export const isAuthenticated = () => !!getAccessToken();

export const hasMenuPermission = (menuKey) => {
  const role = localStorage.getItem('userRole');
  if (role === 'ADMIN') return true;

  const currentUserRaw = localStorage.getItem('currentUser');
  if (currentUserRaw) {
    const currentUser = JSON.parse(currentUserRaw);
    if (currentUser.permissions && currentUser.permissions[menuKey] === false) {
      return false;
    }
  }

  const permsRaw = localStorage.getItem('appPermissions');
  if (!permsRaw) return true;

  const perms = JSON.parse(permsRaw);
  return perms?.NON_STAFF?.[menuKey] !== false;
};
