import { config } from '../config/env.js';

function internalHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Api-Key': config.internalApiKey,
  };
}

async function phoneFetch(path, options = {}) {
  const url = `${config.phoneApiBaseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...internalHeaders(),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

/** Public create — same certified endpoint mybooki admin uses. */
export async function createRestaurant(payload) {
  const url = `${config.phoneApiBaseUrl}/api/restaurant/create`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getRestaurantDetails(restaurantId) {
  const url = `${config.phoneApiBaseUrl}/api/restaurant/${encodeURIComponent(restaurantId)}/details`;
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function listRestaurantsInternal() {
  return phoneFetch('/api/internal/restaurants', { method: 'GET' });
}

/** Narrow phone update — only phone number + phoneIndex. */
export async function updateRestaurantPhoneNumber(restaurantId, phoneNumber) {
  return phoneFetch(`/api/internal/restaurants/${encodeURIComponent(restaurantId)}/phone-number`, {
    method: 'PATCH',
    body: JSON.stringify({ phoneNumber }),
  });
}
