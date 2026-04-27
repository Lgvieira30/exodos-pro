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
