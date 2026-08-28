'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const logoutTimer = useRef(null);

  const getTokenExpMs = (token) => {
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return payload.exp ? payload.exp * 1000 : null; // exp is in seconds
    } catch {
      return null;
    }
  };

  const scheduleAutoLogout = (token) => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    const expMs = getTokenExpMs(token);
    if (!expMs) return;
    const delay = expMs - Date.now();
    if (delay <= 0) {
      logout();
    } else {
      logoutTimer.current = setTimeout(() => logout(), delay);
    }
  };

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
      scheduleAutoLogout(token);
    } catch (error) {
      // invalid/expired token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  initAuth();
      return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
}, []);

const login = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    scheduleAutoLogout(token); 

    return user;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Login failed');
    // throw error.response?.data?.error || 'Login failed';
  }
};

  const logout = () => {
     if (logoutTimer.current) clearTimeout(logoutTimer.current); 
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