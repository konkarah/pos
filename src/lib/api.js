import axios from 'axios';
import { startLoading, stopLoading } from '@/utils/loading';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (!config.skipLoader) {
    startLoading();
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (!response.config.skipLoader) {
      stopLoading();
    }
    return response;
  },
  (error) => {
    if (!error.config?.skipLoader) {
      stopLoading();
    }

    const status = error.response?.status;
    const msg = error.response?.data?.error || '';
    // 401 = missing token; 403 with a token message = expired/invalid.
    // (403 "Insufficient permissions" is deliberately NOT treated as a logout.)
    const isAuthError = status === 401 || (status === 403 && /token/i.test(msg));

    if (isAuthError && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;