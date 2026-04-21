import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

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

// On 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth
export const authAPI = {
  login: (creds) => api.post('/auth/login', creds),
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
};

// ---- Animals
export const animalsAPI = {
  list: (params) => api.get('/animals', { params }),
  get: (id) => api.get(`/animals/${id}`),
  types: () => api.get('/animals/types'),
  create: (data) => api.post('/animals', data),
  update: (id, data) => api.put(`/animals/${id}`, data),
  delete: (id) => api.delete(`/animals/${id}`),
};

// ---- Telemetry
export const telemetryAPI = {
  history: (unitId, limit = 200) => api.get(`/telemetry/${unitId}`, { params: { limit } }),
  latest: (unitId) => api.get(`/telemetry/${unitId}/latest`),
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
  chat: (query, species) => api.post('/agent/chat', null, { params: { query, species } }),
  analyze: (query, species, detections = []) =>
    api.post('/agent/analyze', { query, species, detections }),
};

// ---- Diagnostic History
export const diagnosticAPI = {
  list: () => api.get('/diagnostics/'),
  save: (data) => api.post('/diagnostics/', data),
  delete: (id) => api.delete(`/diagnostics/${id}`),
};


export default api;
