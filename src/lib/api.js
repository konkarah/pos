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

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// lib/api.js - Add this to request interceptor
api.interceptors.request.use((config) => {
  if (!config.skipLoader) {
    startLoading();
  }

  const token = localStorage.getItem('token');
  if (token) {
    // Optional: Check if token is expired before making the request
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
      
      if (Date.now() >= expirationTime) {
        // Token expired, clean up and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (navigationCallback) {
          navigationCallback('/login');
        }
        return Promise.reject(new Error('Token expired'));
      }
    } catch (e) {
      // Invalid token format, continue with request
    }
    
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
export default api;