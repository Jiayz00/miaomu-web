// 路由守卫：未登录跳转登录页

'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { FullPageLoading } from './Loading';

interface ProtectedRouteProps {
  children: ReactNode;
  // 登录后跳转地址，默认当前页
  redirectAfterLogin?: string;
}

export function ProtectedRoute({
  children,
  redirectAfterLogin,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mounted = useMounted();

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      const redirect = redirectAfterLogin || pathname;
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [mounted, isAuthenticated, router, pathname, redirectAfterLogin]);

  // 未挂载或未登录时展示加载态
  if (!mounted || !isAuthenticated) {
    return <FullPageLoading />;
  }

  return <>{children}</>;
}
