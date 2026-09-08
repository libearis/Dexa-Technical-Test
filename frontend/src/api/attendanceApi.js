import axios from 'axios';

export const ATTENDANCE_BASE_URL = import.meta.env.VITE_ATTENDANCE_API_URL || 'http://localhost:3001';

export const attendanceApi = axios.create({ baseURL: ATTENDANCE_BASE_URL });

attendanceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
