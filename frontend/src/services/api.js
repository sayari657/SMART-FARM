import axios from 'axios';
import { normalizeDetail } from '../utils/errors';

let apiEnv = import.meta.env.VITE_API_URL;
if (apiEnv) apiEnv = apiEnv.replace(/^["']+|["']+$/g, '');
const BASE_URL = apiEnv || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,   // 12 s — overridden per-request for heavy AI calls
});

// Attach JWT + CSRF token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Send CSRF token on all mutating requests (POST/PUT/PATCH/DELETE)
  const mutatingMethods = ['post', 'put', 'patch', 'delete'];
  if (mutatingMethods.includes((config.method || '').toLowerCase())) {
    const csrfToken = localStorage.getItem('csrf_token');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

// Response interceptor — handles auth + CSRF + backend-offline errors
let _csrfRefreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;

    // Pydantic 422 returns detail as an array/object of error items. Collapse it
    // to a string in place so no component can render the raw object into JSX
    // ("Objects are not valid as a React child").
    if (err.response?.data && err.response.data.detail != null
        && typeof err.response.data.detail !== 'string') {
      err.response.data.detail = normalizeDetail(err.response.data.detail);
    }
    const detail = err.response?.data?.detail || '';

    // 403 CSRF — auto-refresh token and retry once
    if (status === 403 && detail === 'CSRF token invalide ou absent' && !err.config._csrfRetry) {
      if (!_csrfRefreshing) {
        _csrfRefreshing = true;
        try {
          const { data } = await api.get('/auth/csrf-token');
          if (data?.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);
        } catch (_) {
          /* ignore — fall through to reject */
        } finally {
          _csrfRefreshing = false;
        }
      }
      // Retry original request with new token
      const newCsrf = localStorage.getItem('csrf_token');
      if (newCsrf) {
        err.config._csrfRetry = true;
        err.config.headers['X-CSRF-Token'] = newCsrf;
        return api.request(err.config);
      }
    }

    // 401 — token expired / invalid → redirect to login
    const requestUrl = err.config?.url || '';
    const isCredentialSubmission = [
      '/auth/login',
      '/auth/worker/verify-otp',
      '/auth/reset-password',
    ].some(endpoint => requestUrl.endsWith(endpoint));

    // Credential failures stay on their form; other 401 responses expire the session.
    if (status === 401 && !isCredentialSubmission) {
      let user = {};
      try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (_) {}
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');
      window.location.href = user?.role === 'worker' ? '/worker-login' : '/login';
    }

    // Network error (no response at all) — backend is truly offline
    if (!err.response) {
      console.error('[API] Backend offline: network error');
      err.isBackendOffline = true;
      err.friendlyMessage = 'Serveur backend hors ligne — lancez le backend avec start.bat puis réessayez.';
    }

    return Promise.reject(err);
  }
);

// ---- Auth
export const authAPI = {
  login: (creds) => api.post('/auth/login', creds),
  getCsrfToken: () => api.get('/auth/csrf-token'),
  workerRequestOtp: (phone_number) => api.post('/auth/worker/request-otp', { phone_number }),
  workerVerifyOtp: (phone_number, otp) => api.post('/auth/worker/verify-otp', { phone_number, otp }),
  register: (data) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
  forgotByEmail: (data) => api.post('/auth/forgot-password/email', data),
  forgotByWhatsApp: (data) => api.post('/auth/forgot-password/whatsapp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ---- Dashboard
export const dashboardAPI = {
  stats:     (farmId) => api.get('/dashboard/stats',     { params: farmId ? { farm_id: farmId } : {} }),
  analytics: (days = 30, farmId) => api.get('/dashboard/analytics', { params: { days, ...(farmId ? { farm_id: farmId } : {}) } }),
  aiInsight: (farmId) => api.get('/dashboard/ai-insight', { params: farmId ? { farm_id: farmId } : {} }),
};

// ---- Farms
export const farmsAPI = {
  list: () => api.get('/farms'),
  get: (id) => api.get(`/farms/${id}`),
  create: (data) => api.post('/farms', data),
  update: (id, data) => api.put(`/farms/${id}`, data),
  delete: (id) => api.delete(`/farms/${id}`),
  // Finance
  getFinance: (farmId) => api.get(`/farms/${farmId}/finance`),
  addFinance: (farmId, data) => api.post(`/farms/${farmId}/finance`, data),
};

// ---- Farm Workers
export const farmWorkersAPI = {
  list:   (farmId)                  => api.get(`/farms/${farmId}/workers`),
  add:    (farmId, data)            => api.post(`/farms/${farmId}/workers`, data),
  update: (farmId, workerId, data)  => api.put(`/farms/${farmId}/workers/${workerId}`, data),
  remove: (farmId, workerId)        => api.delete(`/farms/${farmId}/workers/${workerId}`),
};

// ---- Farm Owners (many-to-many)
export const farmOwnersAPI = {
  list:   (farmId)          => api.get(`/farms/${farmId}/owners`),
  add:    (farmId, data)    => api.post(`/farms/${farmId}/owners`, data),
  remove: (farmId, ownerId) => api.delete(`/farms/${farmId}/owners/${ownerId}`),
};

// ---- Animals
export const animalsAPI = {
  list: (params) => api.get('/animals', { params }),
  get: (id) => api.get(`/animals/${id}`),
  types: () => api.get('/animals/types'),
  createType: (data) => api.post('/animals/types', data),
  create: (data) => api.post('/animals', data),
  update: (id, data) => api.put(`/animals/${id}`, data),
  delete: (id) => api.delete(`/animals/${id}`),
  // Logs
  getLogs: (animalId, type = null) => api.get(`/animals/${animalId}/logs`, { params: { type } }),
  addLog: (animalId, data) => api.post(`/animals/${animalId}/logs`, data),
};

// ---- Worker Tasks
export const workerTasksAPI = {
  list:          (params) => api.get('/worker-tasks', { params }),
  get:           (id) => api.get(`/worker-tasks/${id}`),
  create:        (data) => api.post('/worker-tasks', data),
  update:        (id, data) => api.put(`/worker-tasks/${id}`, data),
  delete:        (id) => api.delete(`/worker-tasks/${id}`),
  updateStatus:  (id, status) => api.put(`/worker-tasks/${id}`, { status }),
  listWorkers:   (farmId) => api.get('/worker-tasks/workers', { params: { farm_id: farmId } }),
};

// ---- Plants
export const plantsAPI = {
  // Ne pas appeler /plants/search sans query — utilise /animals en fallback
  list: (params) => animalsAPI.list(params),
  get: (id) => api.get(`/plants/details/${id}`),
};

// ---- Telemetry
export const telemetryAPI = {
  history: (unitId, limit = 200) => {
    const id = parseInt(unitId, 10);
    if (isNaN(id)) return Promise.resolve({ data: [] });
    return api.get(`/telemetry/${id}`, { params: { limit } });
  },
  latest: (unitId) => {
    const id = parseInt(unitId, 10);
    if (isNaN(id)) return Promise.resolve({ data: {} });
    return api.get(`/telemetry/${id}/latest`);
  },
};

// ---- CV Events
export const cvAPI = {
  recent: (limit = 50, farmId) => api.get('/cv/events', { params: { limit, ...(farmId ? { farm_id: farmId } : {}) } }),
  byUnit: (unitId, limit = 100) => api.get(`/cv/events/${unitId}?limit=${limit}`),
  ingest: (data) => api.post('/cv/events', data),
  deleteEvent: (id) => api.delete(`/cv/events/${id}`),
  purgeEvents: (ids) => ids?.length
    ? api.delete(`/cv/events?ids=${ids.join(',')}`)
    : api.delete('/cv/events'),
  getModelMetadata: (category) => api.get(`/cv/models/${category}/metadata`),
  plantStats: () => api.get('/cv/stats/plants'),
  recentPlantEvents: (limit = 20) => api.get(`/cv/events/plants/recent?limit=${limit}`),
  detect: (file, category = 'livestock') => {
    const formData = new FormData();
    formData.append('file', file);
    // Ne PAS forcer Content-Type — axios+FormData génère automatiquement
    // le bon header avec la boundary : multipart/form-data; boundary=...
    return api.post(`/cv/detect?category=${category}`, formData, {
      timeout: 60000,
    });
  },
};

// ---- Anomalies
export const anomalyAPI = {
  recent: (limit = 50, farmId) => api.get('/anomalies/recent', { params: { limit, ...(farmId ? { farm_id: farmId } : {}) } }),
  byUnit: (unitId)             => api.get(`/anomalies/${unitId}`),
};

// ---- Alerts
export const alertsAPI = {
  list:      (farmId) => api.get('/alerts',          { params: farmId ? { farm_id: farmId } : {} }),
  critical:  (farmId) => api.get('/alerts/critical', { params: farmId ? { farm_id: farmId } : {} }),
  resolve:   (id, by) => api.put(`/alerts/${id}/resolve`, { resolved_by: by }),
  delete:    (id)     => api.delete(`/alerts/${id}`),
  emergency: (farmId) => api.get('/alerts/emergency', { params: farmId ? { farm_id: farmId } : {} }),
  /** Dispatch an alert to the farm owner + assigned workers (WhatsApp + push). */
  notify:    (farmId, title, message, target = 'all') =>
    api.post('/alerts/notify', { farm_id: farmId, title, message, target }),
};

// ---- Recommendations
export const recsAPI = {
  list:     (includeActioned = false, farmId) => api.get('/recommendations', {
    params: { include_actioned: includeActioned, ...(farmId ? { farm_id: farmId } : {}) },
  }),
  byUnit:   (unitId)           => api.get(`/recommendations/${unitId}`),
  action:   (recId)            => api.put(`/recommendations/${recId}/action`),
  generate: (farmId, plant = 'grass') => api.get(`/recommendations-advanced/${farmId}`, { params: { plant } }),
};

// ---- Reports
export const reportsAPI = {
  list:                (farmId) => api.get('/reports', { params: farmId ? { farm_id: farmId } : {} }),
  generate:            (data)   => api.post('/reports/generate', data),
  generateIntelligent: (type, farmId) => api.post(
    `/reports/generate-intelligent`, {}, { params: { report_type: type, ...(farmId ? { farm_id: farmId } : {}) } }
  ),
};

// ---- Settings
export const settingsAPI = {
  list: (farmId) => api.get('/settings', { params: farmId ? { farm_id: farmId } : {} }),
  upsert: (data) => api.put('/settings', data),
};

// ---- External Integrations
export const externalAPI = {
  weather: {
    current: (farmId) => api.get(`/weather/current/${farmId}`),
    byCoords: (lat, lon) => api.get('/weather/coords', { params: { lat, lon } }),
    forecast: (farmId) => api.get(`/weather/forecast/${farmId}`),
  },
  geocode: {
    search: (query) => api.get('/geocode/search', { params: { q: query } }),
    reverse: (lat, lon) => api.get('/geocode/reverse', { params: { lat, lon } }),
  },
  plants: {
    search: (query) => api.get('/plants/search', { params: { q: query } }),
    details: (plantId) => api.get(`/plants/details/${plantId}`),
  },
  recommendations: {
    getFarmAdvice: (farmId, plant) => api.get(`/recommendations-advanced/${farmId}`, { params: { plant } })
  }
};

// ---- GIS & Geo
export const geoAPI = {
  vets: () => api.get('/geo/vets'),
  farms: () => api.get('/geo/farms'),
  hives: () => api.get('/geo/hives'),
  markets: () => api.get('/geo/markets'),
  nearbyVets: (lat, lon, radius = 50) => api.get(`/geo/nearby-vets?lat=${lat}&lon=${lon}&radius_km=${radius}`),
};

// ---- Agent
export const agentAPI = {
  chat: (query, species, signal) =>
    api.post('/agent/chat', null, { params: { query, species }, signal }),
  analyze: (query, species, detections = [], signal) =>
    api.post('/agent/analyze', { query, species, detections }, { signal }),
  analyzeImage: (image_b64, query, species, signal) =>
    api.post('/agent/analyze-image', { image_b64, query: query || '', species: species || null }, { signal, timeout: 300000 }),
  report: (detections, species, image_count = 1, signal) =>
    api.post('/agent/report', { detections, species, image_count }, { signal, timeout: 15000 }),
};

// ---- Diagnostic History
export const diagnosticAPI = {
  list: () => api.get('/diagnostics/'),
  save: (data) => api.post('/diagnostics/', data),
  delete: (id) => api.delete(`/diagnostics/${id}`),
};


// ---- Poultry ERP
export const poultryAPI = {
  batches: {
    list:   (farmId) => api.get('/poultry/batches', { params: farmId ? { farm_id: farmId } : {} }),
    create: (data)       => api.post('/poultry/batches', data),
    update: (id, data)   => api.patch(`/poultry/batches/${id}`, data),
    delete: (id)         => api.delete(`/poultry/batches/${id}`),
    pnl:    (id)         => api.get(`/poultry/batches/${id}/pnl`),
  },
  feed: {
    list:   (batchId)      => api.get(`/poultry/batches/${batchId}/feed-logs`),
    create: (data)         => api.post('/poultry/feed-logs', data),
    update: (id, data)     => api.patch(`/poultry/feed-logs/${id}`, data),
    delete: (id)           => api.delete(`/poultry/feed-logs/${id}`),
  },
  eggs: {
    list:   (batchId)      => api.get(`/poultry/batches/${batchId}/egg-logs`),
    create: (data)         => api.post('/poultry/egg-logs', data),
    update: (id, data)     => api.patch(`/poultry/egg-logs/${id}`, data),
    delete: (id)           => api.delete(`/poultry/egg-logs/${id}`),
  },
  health: {
    list:   (batchId)      => api.get(`/poultry/batches/${batchId}/health-logs`),
    create: (data)         => api.post('/poultry/health-logs', data),
    update: (id, data)     => api.patch(`/poultry/health-logs/${id}`, data),
    delete: (id)           => api.delete(`/poultry/health-logs/${id}`),
  },
  sales: {
    list:   (batchId)      => api.get(`/poultry/batches/${batchId}/sales`),
    create: (data)         => api.post('/poultry/sales', data),
    update: (id, data)     => api.patch(`/poultry/sales/${id}`, data),
    delete: (id)           => api.delete(`/poultry/sales/${id}`),
  },
  inventory: {
    list:   (farmId)       => api.get('/poultry/inventory', { params: farmId ? { farm_id: farmId } : {} }),
    create: (data)         => api.post('/poultry/inventory', data),
    update: (id, data)     => api.patch(`/poultry/inventory/${id}`, data),
    delete: (id)           => api.delete(`/poultry/inventory/${id}`),
  },
  stats: (farmId) => api.get(`/poultry/stats/farm/${farmId}`),
  mlInsights: {
    batch: (batchId) => api.get(`/poultry/ml-insights/${batchId}`),
    farm:  (farmId)  => api.get(`/poultry/ml-insights/farm/${farmId}`),
  },
};


// ---- Warehouse / Entrepôt
export const warehouseAPI = {
  categories:     (farmId)     => api.get('/warehouse/categories', { params: farmId ? { farm_id: farmId } : {} }),
  createCategory: (data)       => api.post('/warehouse/categories', data),
  updateCategory: (id, data)   => api.put(`/warehouse/categories/${id}`, data),
  deleteCategory: (id)         => api.delete(`/warehouse/categories/${id}`),
  items:      (catId)      => catId
                               ? api.get('/warehouse/items', { params: { category_id: catId } })
                               : api.get('/warehouse/items'),
  create:     (data)       => api.post('/warehouse/items', data),
  update:     (id, data)   => api.put(`/warehouse/items/${id}`, data),
  delete:     (id)         => api.delete(`/warehouse/items/${id}`),
  seed:       (farmId)     => api.post('/warehouse/seed',       {}, { params: farmId ? { farm_id: farmId } : {} }),
  seedItems:  (farmId)     => api.post('/warehouse/seed-items', {}, { params: farmId ? { farm_id: farmId } : {} }),
  reseed:     (farmId)     => api.post('/warehouse/reseed',     {}, { params: farmId ? { farm_id: farmId } : {} }),
  alerts: {
    list:    (resolved = false) => api.get('/warehouse/alerts', { params: { resolved } }),
    create:  (data)             => api.post('/warehouse/alerts', data),
    resolve: (id)               => api.put(`/warehouse/alerts/${id}/resolve`),
    delete:  (id)               => api.delete(`/warehouse/alerts/${id}`),
  },
  assistant: (query, lang = 'fr') => api.post('/warehouse/assistant', { query, lang }),
};

export default api;
