// 登录页：优雅表单，衬线体标题

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/';
  // 安全：仅允许站内相对路径，防止开放重定向钓鱼
  // 规则：以 / 开头且不以 // 或 /\ 开头（避免协议相对 URL //evil.com 和反斜杠绕过）
  const isSafeRedirect =
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/\\');
  const redirect = isSafeRedirect ? rawRedirect : '/';
  const { login } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!account || !password) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    try {
      const user = await login({ account, password });
      // 统一登录入口：根据角色智能跳转
      // - 管理员默认进管理后台（除非 redirect 明确指向其他页）
      // - 普通用户进首页或 redirect 指定的页面
      // 安全：跳转仅是前端体验，后端权限由 AdminGuard 强制校验，不存在越权
      if (user.role === 'ADMIN' && redirect === '/') {
        router.push('/admin/dashboard');
      } else {
        router.push(redirect);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '登录失败，请稍后重试'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary-dark px-6 py-20">
      {/* 装饰背景 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="border border-background/10 bg-background/5 p-10 backdrop-blur-sm">
          {/* 标题 */}
          <div className="mb-10 text-center">
            <Link
              href="/"
              className="font-serif text-3xl text-background hover:text-accent"
            >
              盆景艺术
            </Link>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-accent">
              Penjing
            </p>
            <h1 className="mt-8 font-serif text-3xl text-background">欢迎回来</h1>
            <p className="mt-2 text-sm text-background/50">登录以继续您的收藏之旅</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="登录表单">
            <div>
              <label
                htmlFor="login-account"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-background/60"
              >
                账号
              </label>
              <input
                id="login-account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="用户名或邮箱"
                className="w-full border-0 border-b border-background/20 bg-transparent py-3 text-background placeholder:text-background/30 focus:border-accent focus:outline-none focus:ring-0"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-background/60"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full border-0 border-b border-background/20 bg-transparent py-3 pr-10 text-background placeholder:text-background/30 focus:border-accent focus:outline-none focus:ring-0"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-background/40 hover:text-accent"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-accent py-4 text-xs uppercase tracking-[0.3em] text-primary-dark transition-all duration-500 hover:bg-accent-light disabled:opacity-50"
            >
              {loading ? '登录中…' : '登录'}
              {!loading && <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-background/50">
            还没有账号？{' '}
            <Link
              href={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="text-accent hover:underline"
            >
              立即注册
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
