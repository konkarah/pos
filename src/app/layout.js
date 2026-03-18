'use client';

import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingProvider } from '@/context/LoadingContext';
import GlobalLoader from '@/components/GlobalLoader';
import LoaderBinder from '@/components/LoaderBinder';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LoadingProvider>
          <AuthProvider>
            <LoaderBinder />
            <GlobalLoader />
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}