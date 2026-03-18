'use client';

import { useLoading } from '@/context/LoadingContext';

export default function GlobalLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 bg-white/90 px-8 py-6 rounded-2xl shadow-xl">
        
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>

        {/* Text */}
        <p className="text-gray-700 font-medium tracking-wide">
          Processing...
        </p>

      </div>
    </div>
  );
}