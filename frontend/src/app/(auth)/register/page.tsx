// 注册页：双栏布局，左栏深墨品牌区，右栏宣纸表单区
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
    <div
      className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.1fr_1fr]"
      aria-label="注册"
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
            Begin Your Journey
          </span>
          <h2 className="display-section mt-4 m-0 text-paper">
            入苑为客
            <br />
            启程鉴藏
          </h2>
          <p className="body-large mt-6 text-paper/65">
            创建藏苑账号，记录您与每一件藏品相遇的时刻。收藏、询价、对话，皆由此始。
          </p>
          <span
            className="mt-8 block h-px w-16 bg-gold"
            aria-hidden="true"
          />
        </motion.div>

        {/* 底部装饰文字 */}
        <div className="relative">
          <p className="font-serif text-sm italic text-paper/40">
            「藏苑一开，山河入怀」
          </p>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.3em] text-paper/35">
            — 藏苑雅训
          </p>
        </div>
      </aside>

      {/* ===== 右栏：宣纸表单区 ===== */}
      <section
        className="section-paper texture-paper relative flex items-center justify-center px-6 py-16 sm:px-10 md:px-16"
        aria-label="注册表单"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[460px]"
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
              <span className="eyebrow-label">Create Account</span>
            </span>
            <h1 className="display-section m-0 text-ink">创建账号</h1>
            <p className="body-base mt-3 text-ink-text-secondary">
              开启您的盆景收藏之旅
            </p>
          </div>

          {/* 表单 */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
            aria-label="注册表单"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="register-username"
                className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-secondary"
              >
                用户名
              </label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-50 位，字母、数字、下划线"
                className="input-penjing"
                autoComplete="username"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="register-email"
                className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-secondary"
              >
                邮箱
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                className="input-penjing"
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="register-password"
                className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-secondary"
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
                  className="input-penjing pr-10"
                  autoComplete="new-password"
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

            <div className="flex flex-col gap-2">
              <label
                htmlFor="register-confirm-password"
                className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-secondary"
              >
                确认密码
              </label>
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="input-penjing"
                autoComplete="new-password"
                required
              />
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
                  注册
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-10 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[var(--penjing-border-fine)]" />
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-ink-text-faint">
              已是藏客
            </span>
            <span className="h-px flex-1 bg-[var(--penjing-border-fine)]" />
          </div>

          <p className="mt-6 text-center font-sans text-sm text-ink-text-secondary">
            已有账号？{' '}
            <Link
              href={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-medium text-gold-deep underline-offset-4 transition-colors hover:text-gold hover:underline"
            >
              去登录
            </Link>
          </p>
        </motion.div>
      </section>
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
