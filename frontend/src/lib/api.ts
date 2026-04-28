import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const campaignsApi = {
  list: () => api.get('/campaigns').then((r) => r.data),
  get: (id: string) => api.get(`/campaigns/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/campaigns', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/campaigns/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

export const metricsApi = {
  dashboard: () => api.get('/metrics/dashboard').then((r) => r.data),
  campaign: (id: string) => api.get(`/metrics/${id}`).then((r) => r.data),
};

export const syncApi = {
  status: () => api.get('/sync/status').then((r) => r.data),
  meta: () => api.post('/sync/meta').then((r) => r.data),
  google: () => api.post('/sync/google').then((r) => r.data),
};

export const analyzeApi = {
  dashboard: () => api.get('/analyze/dashboard').then((r) => r.data),
  campaign: (id: string) => api.get(`/analyze/${id}`).then((r) => r.data),
};

export const integrationsApi = {
  list: () => api.get('/integrations').then((r) => r.data),
  save: (data: { platform: string; app_id?: string; app_secret?: string; access_token: string; account_id: string }) =>
    api.post('/integrations', data).then((r) => r.data),
  remove: (platform: string) => api.delete(`/integrations/${platform}`).then((r) => r.data),
};
