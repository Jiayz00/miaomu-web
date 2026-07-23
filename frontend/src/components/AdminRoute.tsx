// 管理员路由守卫：非管理员跳转

'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { FullPageLoading } from './Loading';

export function AdminRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const mounted = useMounted();

  useEffect(() => {
    if (mounted && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.replace('/login?redirect=/admin/dashboard');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || user?.role !== 'ADMIN') {
    return <FullPageLoading />;
  }

  return <>{children}</>;
}
