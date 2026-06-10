/**
 * Billing API — wraps Stripe-related backend endpoints.
 */
import { normalizeDetail } from '../utils/errors';

let apiEnv = import.meta.env.VITE_API_URL;
if (apiEnv) apiEnv = apiEnv.replace(/^["']+|["']+$/g, '');
const ROOT = apiEnv || '/api/v1';

function authHeaders(method = 'GET') {
  const token = localStorage.getItem('token');
  const csrf  = localStorage.getItem('csrf_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()))
    h['X-CSRF-Token'] = csrf;
  return h;
}

async function safeFetch(url, options = {}) {
  const method = options.method || 'GET';
  return fetch(url, {
    ...options,
    headers: { ...authHeaders(method), ...(options.headers || {}) },
  });
}

export const billingApi = {
  /** Public — returns plan catalog with Stripe Price IDs. */
  getPlans: () => safeFetch(`${ROOT}/billing/plans`),

  /** Requires auth. Returns { checkout_url, session_id }. */
  createCheckout: (plan, successUrl, cancelUrl) =>
    safeFetch(`${ROOT}/billing/checkout`, {
      method: 'POST',
      body: JSON.stringify({
        plan,
        success_url: successUrl || `${window.location.origin}/settings?payment=success`,
        cancel_url:  cancelUrl  || `${window.location.origin}/#pricing`,
      }),
    }),

  /** Requires auth. Returns { portal_url }. */
  openPortal: (returnUrl) =>
    safeFetch(`${ROOT}/billing/portal`, {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl || `${window.location.origin}/settings` }),
    }),

  /** Requires auth. Returns { plan, plan_expires_at, stripe_customer_id }. */
  getSubscription: () => safeFetch(`${ROOT}/billing/subscription`),
};

/**
 * redirectToCheckout — main entry point from the UI.
 * - Not authed → redirect to /register?plan=<plan>
 * - Authed → POST /billing/checkout → redirect to Stripe hosted page
 */
export async function redirectToCheckout(plan = 'pro') {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = `/register?plan=${plan}`;
    return { ok: false, reason: 'not_authed' };
  }

  const res = await billingApi.createCheckout(plan);

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    window.location.href = `/login?plan=${plan}`;
    return { ok: false, reason: 'token_expired' };
  }

  if (!res.ok) {
    let msg = 'Erreur Stripe';
    try { const d = await res.json(); msg = normalizeDetail(d.detail) || msg; } catch {}
    return { ok: false, reason: msg };
  }

  const data = await res.json();
  window.location.href = data.checkout_url;
  return { ok: true };
}
