let apiEnv = import.meta.env.VITE_API_URL;
if (apiEnv) apiEnv = apiEnv.replace(/^["']+|["']+$/g, '');
const ROOT     = apiEnv || '/api/v1';
const HISTORY  = `${ROOT}/bee/history`;
const EXPENSES = `${ROOT}/bee/expenses`;
const PLANNING = `${ROOT}/bee/planning`;
const STOCK    = `${ROOT}/bee/stock`;
const PREDICT  = `${ROOT}/bee/analytics/predict`;
const SEARCH   = `${ROOT}/bee/search`;

/* ── Build headers — always include CSRF + JWT ───────────── */
const h = (extra = {}) => {
  const token = localStorage.getItem('token');
  const csrf  = localStorage.getItem('csrf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrf  ? { 'X-CSRF-Token': csrf }             : {}),
    ...extra,
  };
};

/* ── CSRF auto-refresh (one concurrent refresh max) ─────── */
let _csrfRefreshing = false;
const refreshCsrf = async () => {
  if (_csrfRefreshing) return;
  _csrfRefreshing = true;
  try {
    const res = await fetch(`${ROOT}/auth/csrf-token`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);
    }
  } catch { /* silent */ }
  finally   { _csrfRefreshing = false; }
};

/* ── Core fetch wrapper ──────────────────────────────────── */
const safeFetch = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: h(opts.headers || {}) });

  /* 403 CSRF — refresh token + retry once */
  if (res.status === 403 && !opts._csrfRetry) {
    const body = await res.clone().json().catch(() => ({}));
    if (body?.detail && String(body.detail).toLowerCase().includes('csrf')) {
      await refreshCsrf();
      return safeFetch(url, { ...opts, _csrfRetry: true });
    }
  }

  /* 401 — redirect to login */
  if (res.status === 401) {
    let user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = user?.role === 'worker' ? '/worker-login' : '/login';
  }
  return res;
};

export const beeApi = {
  /* ── Bridge ── */
  call: (url, opts = {}) => safeFetch(url, opts),

  /* ── Utilitaire ── */
  json: (res) => res.json().catch(() => ({})),

  /* ── Emplacements ── */
  getApiaries:  ()     => safeFetch(`${HISTORY}/apiaries`),
  createApiary: (data) => safeFetch(`${HISTORY}/apiaries`, {
    method: 'POST', body: JSON.stringify(data),
  }),
  deleteApiary: (id) => safeFetch(`${HISTORY}/apiaries/${id}`, { method: 'DELETE' }),

  /* ── Ruches ── */
  getHives:   ()     => safeFetch(`${HISTORY}/hives`),
  getHive:    (id)   => safeFetch(`${HISTORY}/hives/${id}`),
  createHive: (data) => safeFetch(`${HISTORY}/hives`, {
    method: 'POST', body: JSON.stringify(data),
  }),
  updateHive: (id, data) => safeFetch(`${HISTORY}/hives/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  patchHive:  (id, data) => safeFetch(`${HISTORY}/hives/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  }),
  getHiveQr:  (id) => safeFetch(`${HISTORY}/hives/${id}/qr`),

  /* ── Banque de Reines ── */
  getQueenBank:  ()       => safeFetch(`${HISTORY}/queen-bank`),
  dispatchQueen: (hiveId) => safeFetch(`${HISTORY}/queen-bank/dispatch/${hiveId}`, {
    method: 'POST',
  }),

  /* ── Visites ── */
  getVisits:       ()              => safeFetch(`${HISTORY}/visits`),
  getVisitsByHive: (hiveId, limit = 50) =>
    safeFetch(`${HISTORY}/visits?hive_id=${hiveId}&limit=${limit}`),
  previewVisit:    (payload)       => safeFetch(`${HISTORY}/visits/preview`, {
    method: 'POST', body: JSON.stringify(payload),
  }),
  createVisit:     (payload)       => safeFetch(`${HISTORY}/visits`, {
    method: 'POST', body: JSON.stringify(payload),
  }),
  applyVisit:      (visitId)       => safeFetch(`${HISTORY}/visits/${visitId}/apply`, {
    method: 'POST',
  }),
  deleteVisit:     (id)            => safeFetch(`${HISTORY}/visits/${id}`, { method: 'DELETE' }),

  /* ── Production ── */
  getProductions:       ()       => safeFetch(`${HISTORY}/productions`),
  getProductionsByHive: (hiveId) =>
    safeFetch(`${HISTORY}/productions?hive_id=${hiveId}`),
  createProduction: (data) => safeFetch(`${HISTORY}/productions`, {
    method: 'POST', body: JSON.stringify(data),
  }),
  deleteProduction: (id) => safeFetch(`${HISTORY}/productions/${id}`, { method: 'DELETE' }),

  /* ── Dépenses ── */
  getExpensesByHive:  (hiveId) => safeFetch(`${EXPENSES}?hive_id=${hiveId}`),
  getExpensesSummary: (hiveId) => safeFetch(`${EXPENSES}/summary?hive_id=${hiveId}`),
  getExpensesAll:        ()     => safeFetch(`${EXPENSES}?limit=500`),
  getExpensesSummaryAll: ()     => safeFetch(`${EXPENSES}/summary`),
  createExpense: (data) => safeFetch(EXPENSES, {
    method: 'POST', body: JSON.stringify(data),
  }),
  deleteExpense: (id) => safeFetch(`${EXPENSES}/${id}`, { method: 'DELETE' }),

  /* ── Stock ── */
  getHiveStock:       (hiveId)       => safeFetch(`${STOCK}/hive/${hiveId}`),
  replenishHiveStock: (hiveId, data) => safeFetch(`${STOCK}/hive/${hiveId}/replenish`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  /* ── Planning ── */
  getPlanning:         (hiveId) =>
    safeFetch(`${PLANNING}${hiveId ? `?hive_id=${hiveId}` : ''}`),
  getLogisticsPreview: (apiaryId, date) =>
    safeFetch(`${PLANNING}/logistics-preview?apiary_id=${apiaryId}&date=${date}`),
  createPlan: (data) => safeFetch(PLANNING, {
    method: 'POST', body: JSON.stringify(data),
  }),
  updatePlanTask: (planId, taskId, status) =>
    safeFetch(`${PLANNING}/${planId}/tasks/${taskId}?status=${status}`, { method: 'PUT' }),
  deletePlan: (id) => safeFetch(`${PLANNING}/${id}`, { method: 'DELETE' }),

  /* ── Analytics ── */
  getPrediction: (hiveId) => safeFetch(`${PREDICT}/${hiveId}`),
  /* Risque d'essaimage — balance ruche IoT + T° couvain (expert + ML) */
  getSwarmRisk: () => safeFetch(`${ROOT}/bee/analytics/swarm-risk`),

  /* ── Catalogue Haddad ── */
  searchCatalog: (q) => safeFetch(`${SEARCH}?q=${encodeURIComponent(q)}`),
};
