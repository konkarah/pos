// lib/api.js
import axios from 'axios';
import { startLoading, stopLoading } from '@/utils/loading';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

let navigationCallback = null;
let toastCallback = null;

export const setNavigationCallback = (callback) => {
  navigationCallback = callback;
};

export const setToastCallback = (callback) => {
  toastCallback = callback;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public endpoints that don't require authentication
const publicEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password'];

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

    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      error.config?.url?.includes(endpoint)
    );

    // Don't redirect for public endpoints
    if (isPublicEndpoint) {
      return Promise.reject(error);
    }

    // Handle different status codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - Token expired or invalid
          if (toastCallback) {
            toastCallback('Your session has expired. Please login again.', 'error');
          }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (navigationCallback) {
            navigationCallback('/login');
          }
          break;
          
        case 403:
          // Forbidden - Not enough permissions
          if (toastCallback) {
            toastCallback('You don\'t have permission to perform this action.', 'error');
          }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (navigationCallback) {
            navigationCallback('/login');
          }
          break;
          
        case 404:
          // Not Found
          if (toastCallback) {
            toastCallback('Resource not found.', 'error');
          }
          // Don't redirect for 404, just show error
          break;
          
        case 500:
          // Server Error
          if (toastCallback) {
            toastCallback('Server error. Please try again later.', 'error');
          }
          // Don't redirect for server errors
          break;
          
        default:
          // Other errors - optionally redirect
          if (error.response.status >= 400 && error.response.status < 500) {
            // Client errors (4xx) might redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (navigationCallback) {
              navigationCallback('/login');
            }
          } else if (toastCallback) {
            toastCallback(error.response.data?.error || 'An error occurred', 'error');
          }
      }
    } else if (error.request) {
      // Network error
      if (toastCallback) {
        toastCallback('Network error. Please check your connection.', 'error');
      }
    }

    return Promise.reject(error);
  }
);

export default api;