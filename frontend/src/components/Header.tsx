// 顶部导航
// 透明背景，滚动后变实色（呼吸感过渡）；响应式移动端汉堡菜单

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Heart, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/bonsais', label: '盆景收藏' },
  { href: '/categories', label: '分类' },
  { href: '/chat', label: '询价' },
  { href: '/favorites', label: '我的收藏' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  // 首页用透明头部，其他页面默认实色
  const isHome = pathname === '/';
  const isTransparent = isHome && !scrolled;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
            'font-serif text-2xl font-medium tracking-wide transition-colors duration-500',
            isTransparent ? 'text-background' : 'text-primary'
          )}
        >
          盆景艺术
          <span className="ml-2 text-xs font-sans uppercase tracking-[0.3em] text-accent">
            Penjing
          </span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-2 transition-colors duration-300',
                  isTransparent ? 'text-background' : 'text-text'
                )}
                aria-label="用户菜单"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium',
                    isTransparent
                      ? 'border-background/40 text-background'
                      : 'border-accent/40 text-accent'
                  )}
                >
                  {user.username.charAt(0).toUpperCase()}
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
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                    >
                      <User className="h-4 w-4" strokeWidth={1.5} />
                      个人中心
                    </Link>
                    <Link
                      href="/favorites"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                    >
                      <Heart className="h-4 w-4" strokeWidth={1.5} />
                      我的收藏
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                      >
                        <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                        管理后台
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 border-t border-text-muted/10 px-4 py-2.5 text-sm text-text-light transition-colors hover:bg-background hover:text-primary"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.5} />
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
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={cn(
            'lg:hidden',
            isTransparent ? 'text-background' : 'text-primary'
          )}
          aria-label="菜单"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* 移动端展开菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-background lg:hidden"
          >
            <nav className="container-luxury flex flex-col gap-1 py-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-text-muted/10 py-3 text-sm text-text-light transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex gap-3">
                {mounted && isAuthenticated && user ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex-1 border border-accent py-3 text-center text-xs uppercase tracking-[0.2em] text-accent"
                    >
                      个人中心
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex-1 border border-text-muted/30 py-3 text-center text-xs uppercase tracking-[0.2em] text-text-light"
                    >
                      退出
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex-1 border border-text-muted/30 py-3 text-center text-xs uppercase tracking-[0.2em] text-text-light"
                    >
                      登录
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1 border border-accent bg-accent py-3 text-center text-xs uppercase tracking-[0.2em] text-primary"
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
