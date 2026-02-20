/**
 * Base URL for REST API. In dev, Vite proxies /api -> backend :8000.
 * So we use /api prefix and vite rewrites to backend.
 */
const getBaseUrl = () => {
  if (import.meta.env.DEV) return '/api';
  return import.meta.env.VITE_API_URL || '';
};

export async function apiGet(path, options = {}) {
  const base = getBaseUrl();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Request failed');
    err.status = res.status;
    err.body = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

export function getMatches(limit = 50) {
  const q = limit ? `?limit=${Math.min(limit, 100)}` : '';
  return apiGet(`/matches${q}`);
}

export function getCommentary(matchId, limit = 50) {
  const q = limit ? `?limit=${Math.min(limit, 100)}` : '';
  return apiGet(`/matches/${matchId}/commentary${q}`);
}
