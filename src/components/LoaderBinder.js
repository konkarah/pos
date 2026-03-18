'use client';

import { useEffect } from 'react';
import { useLoading } from '@/context/LoadingContext';
import { registerLoadingHandlers } from '@/utils/loading';

export default function LoaderBinder() {
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    registerLoadingHandlers(startLoading, stopLoading);
  }, [startLoading, stopLoading]);

  return null;
}