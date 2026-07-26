// 全局 Provider：TanStack Query + 平滑滚动 + 客户端挂载 hook

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

/**
 * 客户端挂载 hook：用于避免 Zustand persist 引起的 hydration 不一致
 * 仅在读取持久化 store 的组件中使用
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
