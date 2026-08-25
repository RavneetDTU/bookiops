const API_BASE = import.meta.env.VITE_BOOKIOPS_API_URL || 'http://localhost:5050';

function authHeaders(token) {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/auth/me', { token }),
  logout: (token) => request('/auth/logout', { method: 'POST', token }),
  dashboard: (token) => request('/admin/dashboard/summary', { token }),
  listOnboarding: (token, status) =>
    request(`/admin/onboarding-requests${status ? `?status=${status}` : ''}`, { token }),
  rejectOnboarding: (token, id, reason) =>
    request(`/admin/onboarding-requests/${id}/reject`, {
      method: 'POST',
      token,
      body: { reason },
    }),
  approveOnboarding: (token, id, createPayload) =>
    request(`/admin/onboarding-requests/${id}/approve`, {
      method: 'POST',
      token,
      body: { createPayload },
    }),
  onboardRestaurant: (token, payload) =>
    request('/admin/restaurants/onboard', { method: 'POST', token, body: payload }),
  listRestaurants: (token) => request('/admin/restaurants', { token }),
  syncRestaurants: (token) => request('/admin/restaurants/sync', { method: 'POST', token }),
  listNumberChanges: (token, status) =>
    request(`/admin/number-change-requests${status ? `?status=${status}` : ''}`, { token }),
  approveNumberChange: (token, id) =>
    request(`/admin/number-change-requests/${id}/approve`, { method: 'POST', token }),
  rejectNumberChange: (token, id, reason) =>
    request(`/admin/number-change-requests/${id}/reject`, {
      method: 'POST',
      token,
      body: { reason },
    }),
};

export { API_BASE };
