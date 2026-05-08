import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ 
  baseURL: BASE_URL,
  timeout: 120000 
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — redirect to role-appropriate login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = user?.role === 'worker' ? '/worker-login' : '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth
export const authAPI = {
  login: (creds) => api.post('/auth/login', creds),
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
  stats:     () => api.get('/dashboard/stats'),
  analytics: (days = 30) => api.get('/dashboard/analytics', { params: { days } }),
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
  recent: (limit = 50) => api.get(`/cv/events?limit=${limit}`),
  byUnit: (unitId, limit = 100) => api.get(`/cv/events/${unitId}?limit=${limit}`),
  ingest: (data) => api.post('/cv/events', data),
  getModelMetadata: (category) => api.get(`/cv/models/${category}/metadata`),
  plantStats: () => api.get('/cv/stats/plants'),
  recentPlantEvents: (limit = 20) => api.get(`/cv/events/plants/recent?limit=${limit}`),
  detect: (file, category = 'livestock') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/cv/detect?category=${category}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
};

// ---- Anomalies
export const anomalyAPI = {
  recent: (limit = 50) => api.get('/anomalies/recent', { params: { limit } }),
  byUnit: (unitId) => api.get(`/anomalies/${unitId}`),
};

// ---- Alerts
export const alertsAPI = {
  list: () => api.get('/alerts'),
  critical: () => api.get('/alerts/critical'),
  resolve: (id, by) => api.put(`/alerts/${id}/resolve`, { resolved_by: by }),
};

// ---- Recommendations
export const recsAPI = {
  list: () => api.get('/recommendations'),
  byUnit: (unitId) => api.get(`/recommendations/${unitId}`),
};

// ---- Reports
export const reportsAPI = {
  list: (farmId) => api.get('/reports', { params: farmId ? { farm_id: farmId } : {} }),
  generate: (data) => api.post('/reports/generate', data),
  generateIntelligent: (type, farmId = 1) => api.post(`/reports/generate-intelligent?report_type=${type}&farm_id=${farmId}`),
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
    api.post('/agent/analyze-image', { image_b64, query: query || '', species: species || null }, { signal, timeout: 90000 }),
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
    list:   (farmId = 1) => api.get('/poultry/batches', { params: { farm_id: farmId } }),
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
    list:   (farmId = 1)   => api.get('/poultry/inventory', { params: { farm_id: farmId } }),
    create: (data)         => api.post('/poultry/inventory', data),
    update: (id, data)     => api.patch(`/poultry/inventory/${id}`, data),
    delete: (id)           => api.delete(`/poultry/inventory/${id}`),
  },
  stats: (farmId) => api.get(`/poultry/stats/farm/${farmId}`),
};


export default api;
