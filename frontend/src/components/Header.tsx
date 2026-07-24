// 顶部导航
// 透明背景，滚动后变实色（呼吸感过渡）；响应式移动端汉堡菜单

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Heart, LayoutDashboard, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { useAuth } from '@/hooks/use-auth';
import { NAV_LINKS } from '@/lib/constants';
import { cn, resolveImageUrl } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // 监听滚动
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 路由切换时关闭菜单
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // 点击外部关闭用户菜单 + ESC 关闭（WCAG 2.1.2）
  useEffect(() => {
    if (!userMenuOpen) return;
    const clickHandler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        // 焦点回到触发按钮，便于键盘用户继续操作
        userMenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', clickHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [userMenuOpen]);

  // ESC 关闭移动端菜单并把焦点还回触发按钮（WCAG 2.1.2）
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  // 移动端菜单打开后，将焦点放入菜单（基础焦点管理）
  useEffect(() => {
    if (mobileOpen && mobileMenuRef.current) {
      const firstLink = mobileMenuRef.current.querySelector<HTMLAnchorElement>('a, button');
      firstLink?.focus();
    }
  }, [mobileOpen]);

  // 首页用透明头部，其他页面默认实色
  const isHome = pathname === '/';
  const isTransparent = isHome && !scrolled;

  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      router.push('/');
    }
  };

  // 头像加载失败时回退到首字母
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
        isTransparent
          ? 'bg-transparent py-5'
          : 'bg-background/95 py-3 shadow-[0_1px_30px_-15px_rgba(26,58,46,0.3)] backdrop-blur-md'
      )}
    >
      <div className="container-luxury flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            'font-serif text-xl font-medium tracking-wide transition-colors duration-500 md:text-2xl',
            isTransparent ? 'text-background' : 'text-primary'
          )}
        >
          盆景艺术
          <span className="ml-2 text-xs font-sans uppercase tracking-[0.3em] text-accent">
            Penjing
          </span>
        </Link>

        {/* 桌面端导航 */}
        <nav
          className="hidden items-center gap-10 lg:flex"
          aria-label="主导航"
        >
          {NAV_LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative text-sm tracking-wider transition-colors duration-300',
                  isTransparent
                    ? 'text-background/80 hover:text-background'
                    : 'text-text-light hover:text-primary',
                  active && (isTransparent ? 'text-background' : 'text-primary')
                )}
              >
                {link.label}
                <span
                  className={cn(
                    'absolute -bottom-1.5 left-0 h-px bg-accent transition-all duration-300',
                    active ? 'w-full' : 'w-0'
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* 右侧用户区 */}
        <div className="hidden items-center gap-4 lg:flex">
          {mounted && isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-2 transition-colors duration-300',
                  isTransparent ? 'text-background' : 'text-text'
                )}
                aria-label="用户菜单"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border text-xs font-medium',
                    isTransparent
                      ? 'border-background/40 text-background'
                      : 'border-accent/40 text-accent'
                  )}
                >
                  {user.avatar && !avatarError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(user.avatar)}
                      alt={user.username}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-12 w-52 border border-text-muted/15 bg-surface py-2 shadow-xl"
                    role="menu"
                    aria-label="用户操作"
                  >
                    <div className="border-b border-text-muted/10 px-4 py-3">
                      <p className="text-sm font-medium text-primary">
                        {user.username}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                    >
                      <User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      个人中心
                    </Link>
                    <Link
                      href="/favorites"
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                    >
                      <Heart className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      我的收藏
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        role="menuitem"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                      >
                        <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        管理后台
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      role="menuitem"
                      className="flex w-full items-center gap-3 border-t border-text-muted/10 px-4 py-3 text-sm text-text-light transition-colors hover:bg-background hover:text-primary disabled:opacity-50"
                    >
                      {loggingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      )}
                      退出登录
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={cn(
                  'text-sm tracking-wider transition-colors duration-300',
                  isTransparent
                    ? 'text-background/80 hover:text-background'
                    : 'text-text-light hover:text-primary'
                )}
              >
                登录
              </Link>
              <Link
                href="/register"
                className="border border-accent px-5 py-2 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
              >
                注册
              </Link>
            </div>
          )}
        </div>

        {/* 移动端汉堡按钮 */}
        <button
          ref={mobileToggleRef}
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={cn(
            '-mr-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors active:scale-95 lg:hidden',
            isTransparent ? 'text-background' : 'text-primary'
          )}
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* 移动端展开菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-background lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="移动端导航菜单"
            id="mobile-menu"
          >
            <nav
              className="container-luxury flex flex-col gap-1 py-6"
              aria-label="移动端主导航"
            >
              {NAV_LINKS.map((link) => {
                const active =
                  link.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between border-b border-text-muted/10 py-3.5 text-sm transition-colors',
                      active
                        ? 'text-accent'
                        : 'text-text-light hover:text-primary'
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="h-px w-8 bg-accent" aria-hidden="true" />
                    )}
                  </Link>
                );
              })}
              <div className="mt-4 flex flex-col gap-3">
                {mounted && isAuthenticated && user ? (
                  <>
                    <Link
                      href="/profile"
                      className="border border-accent py-3.5 text-center text-xs uppercase tracking-[0.2em] text-accent transition-colors active:scale-[0.98]"
                    >
                      个人中心
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        className="border border-primary bg-primary py-3.5 text-center text-xs uppercase tracking-[0.2em] text-background transition-colors active:scale-[0.98]"
                      >
                        管理后台
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center justify-center gap-2 border border-text-muted/30 py-3.5 text-center text-xs uppercase tracking-[0.2em] text-text-light transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {loggingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
                      退出
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="border border-text-muted/30 py-3.5 text-center text-xs uppercase tracking-[0.2em] text-text-light transition-colors active:scale-[0.98]"
                    >
                      登录
                    </Link>
                    <Link
                      href="/register"
                      className="border border-accent bg-accent py-3.5 text-center text-xs uppercase tracking-[0.2em] text-primary transition-colors active:scale-[0.98]"
                    >
                      注册
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
