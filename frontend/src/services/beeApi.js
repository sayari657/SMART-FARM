const ROOT    = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
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

export const beeApi = {
  /* ── Bridge — migration path pour les composants complexes ── */
  call: (url, opts = {}) =>
    fetch(url, { ...opts, headers: h(opts.headers || {}) }),

  /* ── Utilitaire ── */
  json: (res) => res.json().catch(() => ({})),

  /* ── Emplacements ── */
  getApiaries:  () => fetch(`${HISTORY}/apiaries`,   { headers: h() }),
  createApiary: (data) => fetch(`${HISTORY}/apiaries`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  deleteApiary: (id) => fetch(`${HISTORY}/apiaries/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Ruches ── */
  getHives:   () => fetch(`${HISTORY}/hives`,     { headers: h() }),
  getHive:    (id) => fetch(`${HISTORY}/hives/${id}`, { headers: h() }),
  createHive: (data) => fetch(`${HISTORY}/hives`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  updateHive: (id, data) => fetch(`${HISTORY}/hives/${id}`, {
    method: 'PUT', headers: h(), body: JSON.stringify(data),
  }),
  getHiveQr:  (id) => fetch(`${HISTORY}/hives/${id}/qr`, { headers: h() }),

  /* ── Banque de Reines ── */
  getQueenBank:  () => fetch(`${HISTORY}/queen-bank`, { headers: h() }),
  dispatchQueen: (hiveId) => fetch(`${HISTORY}/queen-bank/dispatch/${hiveId}`, {
    method: 'POST', headers: h(),
  }),

  /* ── Visites ── */
  getVisits:       () => fetch(`${HISTORY}/visits`, { headers: h() }),
  getVisitsByHive: (hiveId, limit = 50) =>
    fetch(`${HISTORY}/visits?hive_id=${hiveId}&limit=${limit}`, { headers: h() }),
  previewVisit:    (payload) => fetch(`${HISTORY}/visits/preview`, {
    method: 'POST', headers: h(), body: JSON.stringify(payload),
  }),
  createVisit:     (payload) => fetch(`${HISTORY}/visits`, {
    method: 'POST', headers: h(), body: JSON.stringify(payload),
  }),
  applyVisit:      (visitId) => fetch(`${HISTORY}/visits/${visitId}/apply`, {
    method: 'POST', headers: h(),
  }),
  deleteVisit:     (id) => fetch(`${HISTORY}/visits/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Production ── */
  getProductions:       () => fetch(`${HISTORY}/productions`, { headers: h() }),
  getProductionsByHive: (hiveId) =>
    fetch(`${HISTORY}/productions?hive_id=${hiveId}`, { headers: h() }),
  createProduction: (data) => fetch(`${HISTORY}/productions`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  deleteProduction: (id) => fetch(`${HISTORY}/productions/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Dépenses ── */
  getExpensesByHive:  (hiveId) => fetch(`${EXPENSES}?hive_id=${hiveId}`, { headers: h() }),
  getExpensesSummary: (hiveId) => fetch(`${EXPENSES}/summary?hive_id=${hiveId}`, { headers: h() }),
  createExpense:      (data) => fetch(EXPENSES, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  deleteExpense:      (id) => fetch(`${EXPENSES}/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Stock ── */
  getHiveStock:       (hiveId) => fetch(`${STOCK}/hive/${hiveId}`, { headers: h() }),
  replenishHiveStock: (hiveId, data) => fetch(`${STOCK}/hive/${hiveId}/replenish`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),

  /* ── Planning ── */
  getPlanning:         (hiveId) =>
    fetch(`${PLANNING}${hiveId ? `?hive_id=${hiveId}` : ''}`, { headers: h() }),
  getLogisticsPreview: (apiaryId, date) =>
    fetch(`${PLANNING}/logistics-preview?apiary_id=${apiaryId}&date=${date}`, { headers: h() }),
  createPlan:          (data) => fetch(PLANNING, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  }),
  updatePlanTask:      (planId, taskId, status) =>
    fetch(`${PLANNING}/${planId}/tasks/${taskId}?status=${status}`, {
      method: 'PUT', headers: h(),
    }),
  deletePlan:          (id) => fetch(`${PLANNING}/${id}`, {
    method: 'DELETE', headers: h(),
  }),

  /* ── Analytics ── */
  getPrediction: (hiveId) => fetch(`${PREDICT}/${hiveId}`, { headers: h() }),

  /* ── Catalogue Haddad ── */
  searchCatalog: (q) => fetch(`${SEARCH}?q=${encodeURIComponent(q)}`),
};
