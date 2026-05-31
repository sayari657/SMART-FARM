let apiEnv = import.meta.env.VITE_API_URL;
if (apiEnv) apiEnv = apiEnv.replace(/^["']+|["']+$/g, '');
const ROOT    = apiEnv || '/api/v1';
const HISTORY  = `${ROOT}/bee/history`;
const EXPENSES = `${ROOT}/bee/expenses`;
const PLANNING = `${ROOT}/bee/planning`;
const STOCK    = `${ROOT}/bee/stock`;
const PREDICT  = `${ROOT}/bee/analytics/predict`;
const SEARCH   = `${ROOT}/bee/search`;

const h = (extra = {}) => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

// Mirror the Axios 401 interceptor for fetch-based calls
const safeFetch = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: h(opts.headers || {}) });
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
  /* ── Bridge — migration path pour les composants complexes ── */
  call: (url, opts = {}) =>
    safeFetch(url, opts),

  /* ── Utilitaire ── */
  json: (res) => res.json().catch(() => ({})),

  /* ── Emplacements ── */
  getApiaries:  () => safeFetch(`${HISTORY}/apiaries`,   { headers: h() }),
  createApiary: (data) => safeFetch(`${HISTORY}/apiaries`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  deleteApiary: (id) => safeFetch(`${HISTORY}/apiaries/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Ruches ── */
  getHives:   () => safeFetch(`${HISTORY}/hives`,     { headers: h() }),
  getHive:    (id) => safeFetch(`${HISTORY}/hives/${id}`, { headers: h() }),
  createHive: (data) => safeFetch(`${HISTORY}/hives`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  updateHive: (id, data) => safeFetch(`${HISTORY}/hives/${id}`, {
    method: 'PUT', headers: h(), body: JSON.stringify(data),
  }),
  getHiveQr:  (id) => safeFetch(`${HISTORY}/hives/${id}/qr`, { headers: h() }),

  /* ── Banque de Reines ── */
  getQueenBank:  () => safeFetch(`${HISTORY}/queen-bank`, { headers: h() }),
  dispatchQueen: (hiveId) => safeFetch(`${HISTORY}/queen-bank/dispatch/${hiveId}`, {
    method: 'POST', headers: h(),
  }),

  /* ── Visites ── */
  getVisits:       () => safeFetch(`${HISTORY}/visits`, { headers: h() }),
  getVisitsByHive: (hiveId, limit = 50) =>
    safeFetch(`${HISTORY}/visits?hive_id=${hiveId}&limit=${limit}`, { headers: h() }),
  previewVisit:    (payload) => safeFetch(`${HISTORY}/visits/preview`, {
    method: 'POST', headers: h(), body: JSON.stringify(payload),
  }),
  createVisit:     (payload) => safeFetch(`${HISTORY}/visits`, {
    method: 'POST', headers: h(), body: JSON.stringify(payload),
  }),
  applyVisit:      (visitId) => safeFetch(`${HISTORY}/visits/${visitId}/apply`, {
    method: 'POST', headers: h(),
  }),
  deleteVisit:     (id) => safeFetch(`${HISTORY}/visits/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Production ── */
  getProductions:       () => safeFetch(`${HISTORY}/productions`, { headers: h() }),
  getProductionsByHive: (hiveId) =>
    safeFetch(`${HISTORY}/productions?hive_id=${hiveId}`, { headers: h() }),
  createProduction: (data) => safeFetch(`${HISTORY}/productions`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  deleteProduction: (id) => safeFetch(`${HISTORY}/productions/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Dépenses ── */
  getExpensesByHive:  (hiveId) => safeFetch(`${EXPENSES}?hive_id=${hiveId}`, { headers: h() }),
  getExpensesSummary: (hiveId) => safeFetch(`${EXPENSES}/summary?hive_id=${hiveId}`, { headers: h() }),
  createExpense:      (data) => safeFetch(EXPENSES, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  deleteExpense:      (id) => safeFetch(`${EXPENSES}/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Stock ── */
  getHiveStock:       (hiveId) => safeFetch(`${STOCK}/hive/${hiveId}`, { headers: h() }),
  replenishHiveStock: (hiveId, data) => safeFetch(`${STOCK}/hive/${hiveId}/replenish`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),

  /* ── Planning ── */
  getPlanning:         (hiveId) =>
    safeFetch(`${PLANNING}${hiveId ? `?hive_id=${hiveId}` : ''}`, { headers: h() }),
  getLogisticsPreview: (apiaryId, date) =>
    safeFetch(`${PLANNING}/logistics-preview?apiary_id=${apiaryId}&date=${date}`, { headers: h() }),
  createPlan:          (data) => safeFetch(PLANNING, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  updatePlanTask:      (planId, taskId, status) =>
    safeFetch(`${PLANNING}/${planId}/tasks/${taskId}?status=${status}`, {
      method: 'PUT', headers: h(),
    }),
  deletePlan:          (id) => safeFetch(`${PLANNING}/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Analytics ── */
  getPrediction: (hiveId) => safeFetch(`${PREDICT}/${hiveId}`, { headers: h() }),

  /* ── Catalogue Haddad ── */
  searchCatalog: (q) => safeFetch(`${SEARCH}?q=${encodeURIComponent(q)}`),
};
