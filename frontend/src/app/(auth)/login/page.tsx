// 登录页：双栏布局，左栏深墨品牌区，右栏宣纸表单区
// 东方雅致设计系统：section-ink-deep + section-paper + btn-gold + input-penjing

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
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
    <div
      className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.1fr_1fr]"
      aria-label="登录"
    >
      {/* ===== 左栏：深墨品牌区 ===== */}
      <aside
        className="section-ink-deep texture-ink relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:p-16"
        aria-label="品牌信息"
      >
        {/* 装饰光晕 */}
        <div
          className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-gold/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-gold/5 blur-3xl"
          aria-hidden="true"
        />

        {/* 顶部品牌 */}
        <div className="relative">
          <Link
            href="/"
            className="inline-flex items-baseline gap-3 font-serif text-2xl text-paper transition-colors hover:text-gold-bright"
          >
            <span
              className="inline-block border border-gold px-2 py-0.5 font-serif text-base text-gold-bright"
              aria-hidden="true"
            >
              盆
            </span>
            <span>盆景艺术</span>
          </Link>
          <p className="mt-3 font-sans text-[11px] font-medium uppercase tracking-[0.4em] text-gold/70">
            Penjing · 藏苑
          </p>
        </div>

        {/* 中部标语 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-md"
        >
          <span className="eyebrow-label text-gold-bright">
            Private Collection
          </span>
          <h2 className="display-section mt-4 m-0 text-paper">
            一木一石
            <br />
            皆是山河
          </h2>
          <p className="body-large mt-6 text-paper/65">
            登入藏苑，与历代匠人精心培育之作相遇。每件藏品皆附著录与养护纪要，等您循序翻阅。
          </p>
          <span
            className="mt-8 block h-px w-16 bg-gold"
            aria-hidden="true"
          />
        </motion.div>

        {/* 底部装饰文字 */}
        <div className="relative">
          <p className="font-serif text-sm italic text-paper/40">
            「咫尺之间，千里之势」
          </p>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.3em] text-paper/35">
            — 藏苑雅训
          </p>
        </div>
      </aside>

      {/* ===== 右栏：宣纸表单区 ===== */}
      <section
        className="section-paper texture-paper relative flex items-center justify-center px-6 py-16 sm:px-10 md:px-16"
        aria-label="登录表单"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* 移动端品牌（lg 以下显示，因左栏隐藏） */}
          <div className="mb-10 text-center lg:hidden">
            <Link
              href="/"
              className="inline-flex items-baseline gap-2 font-serif text-xl text-ink transition-colors hover:text-gold-deep"
            >
              <span
                className="inline-block border border-gold px-2 py-0.5 font-serif text-sm text-gold-deep"
                aria-hidden="true"
              >
                盆
              </span>
              <span>盆景艺术</span>
            </Link>
            <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.35em] text-gold-deep">
              Penjing · 藏苑
            </p>
          </div>

          {/* 标题 */}
          <div className="mb-10">
            <span className="eyebrow-with-line">
              <span className="eyebrow-label">Welcome Back</span>
            </span>
            <h1 className="display-section m-0 text-ink">欢迎回来</h1>
            <p className="body-base mt-3 text-ink-text-secondary">
              登录以继续您的收藏之旅
            </p>
          </div>

          {/* 表单 */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-8"
            aria-label="登录表单"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-account"
                className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-secondary"
              >
                账号
              </label>
              <input
                id="login-account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="用户名或邮箱"
                className="input-penjing"
                autoComplete="username"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-password"
                className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-secondary"
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
                  className="input-penjing pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-text-faint transition-colors hover:text-gold-deep"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="border border-[rgba(184,66,58,0.25)] bg-[rgba(184,66,58,0.08)] px-4 py-3 font-sans text-sm text-[var(--penjing-state-error)]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  登录
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-10 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[var(--penjing-border-fine)]" />
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-ink-text-faint">
              还未入苑
            </span>
            <span className="h-px flex-1 bg-[var(--penjing-border-fine)]" />
          </div>

          <p className="mt-6 text-center font-sans text-sm text-ink-text-secondary">
            还没有账号？{' '}
            <Link
              href={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-medium text-gold-deep underline-offset-4 transition-colors hover:text-gold hover:underline"
            >
              立即注册
            </Link>
          </p>
        </motion.div>
      </section>
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
