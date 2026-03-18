// components/AuthGate.js
'use client';

import { useAuth } from '@/context/AuthContext';

export default function AuthGate({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return children;
}