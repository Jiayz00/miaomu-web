// 注册页

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/';
  // 安全：仅允许站内相对路径，防止开放重定向
  const isSafeRedirect =
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/\\');
  const redirect = isSafeRedirect ? rawRedirect : '/';
  const { register } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password) {
      setError('请填写完整信息');
      return;
    }
    if (username.length < 3 || username.length > 50) {
      setError('用户名长度需在 3-50 之间');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('用户名仅允许字母、数字、下划线');
      return;
    }
    if (password.length < 8 || password.length > 32) {
      setError('密码长度需在 8-32 之间');
      return;
    }
    // 与后端密码策略保持一致：必须含大小写字母、数字、特殊字符
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(password)) {
      setError('密码必须包含大小写字母、数字和特殊字符');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await register({ username, email, password });
      router.push(redirect);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '注册失败，请稍后重试'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary-dark px-6 py-20">
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
            <h1 className="mt-8 font-serif text-3xl text-background">创建账号</h1>
            <p className="mt-2 text-sm text-background/50">开启您的盆景收藏之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" aria-label="注册表单">
            <div>
              <label
                htmlFor="register-username"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-background/60"
              >
                用户名
              </label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-50 位，字母、数字、下划线"
                className="w-full border-0 border-b border-background/20 bg-transparent py-3 text-background placeholder:text-background/30 focus:border-accent focus:outline-none focus:ring-0"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-background/60"
              >
                邮箱
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                className="w-full border-0 border-b border-background/20 bg-transparent py-3 text-background placeholder:text-background/30 focus:border-accent focus:outline-none focus:ring-0"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-background/60"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8-32 位，需含大小写字母、数字、特殊字符"
                  className="w-full border-0 border-b border-background/20 bg-transparent py-3 pr-10 text-background placeholder:text-background/30 focus:border-accent focus:outline-none focus:ring-0"
                  autoComplete="new-password"
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

            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-background/60"
              >
                确认密码
              </label>
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full border-0 border-b border-background/20 bg-transparent py-3 text-background placeholder:text-background/30 focus:border-accent focus:outline-none focus:ring-0"
                autoComplete="new-password"
                required
              />
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
              {loading ? '注册中…' : '注册'}
              {!loading && <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-background/50">
            已有账号？{' '}
            <Link
              href={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="text-accent hover:underline"
            >
              去登录
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
