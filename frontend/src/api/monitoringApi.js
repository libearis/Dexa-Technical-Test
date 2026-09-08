import axios from 'axios';

export const MONITORING_BASE_URL = import.meta.env.VITE_MONITORING_API_URL || 'http://localhost:3002';

export const monitoringApi = axios.create({ baseURL: MONITORING_BASE_URL });

monitoringApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
