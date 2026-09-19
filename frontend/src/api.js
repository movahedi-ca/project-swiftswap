/**
 * Small fetch wrapper around the SwiftSwap backend.
 * - Sends cookies (session) with every request.
 * - Sends/receives JSON.
 * - Throws a plain Error with the server's message on non-2xx responses.
 */

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw new Error(`Could not reach the SwiftSwap server at ${BASE}. Is the backend running?`);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed (${res.status} ${res.statusText})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // ---- auth ----
  loginUrl: () => `${BASE}/auth/login`,
  authStatus: () => request('/auth/status'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // ---- profile ----
  me: () => request('/api/me'),

  // ---- scan ----
  startScan: () => request('/api/scan'),
  getJob: (jobId) => request(`/api/jobs/${encodeURIComponent(jobId)}`),
  pauseJob: (jobId) => request(`/api/jobs/${encodeURIComponent(jobId)}/pause`, { method: 'POST' }),
  resumeJob: (jobId) => request(`/api/jobs/${encodeURIComponent(jobId)}/resume`, { method: 'POST' }),

  // ---- substitution ----
  substitute: (items) => request('/api/substitute', { method: 'POST', body: { items } }),

  // ---- track mapping DB ----
  mapping: () => request('/api/mapping'),
};
