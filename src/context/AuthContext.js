// context/AuthContext.jsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api, { setNavigationCallback, setToastCallback } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'; // or your preferred toast library

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Register navigation callback for API interceptor
  useEffect(() => {
    setNavigationCallback((path) => {
      router.push(path);
    });
    
    setToastCallback((message, type) => {
      if (type === 'error') {
        toast.error(message);
      } else {
        toast.success(message);
      }
    });
    
    return () => {
      setNavigationCallback(null);
      setToastCallback(null);
    };
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        
        // Redirect to login
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [router]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return user;
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);