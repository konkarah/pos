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

  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

    return Promise.reject(error);
  }
);

export default api;