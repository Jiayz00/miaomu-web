// 顶部导航
// 东方雅致风格：sticky + 半透明宣纸底 + backdrop-blur；金色下划线从中心展开；左侧 ink-deep 移动端抽屉

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Heart, LayoutDashboard, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMounted } from '@/app/providers';
import { useFocusTrap } from '@/hooks/use-focus-trap';
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
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // 监听滚动（与设计稿一致：scrolled 状态切换边框/阴影）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 路由切换时关闭菜单
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // 移动端抽屉打开时锁定 body 滚动
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

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

  // 移动端抽屉焦点陷阱 + ESC 关闭 + 焦点归还
  useFocusTrap(mobileDrawerRef, {
    enabled: mobileOpen,
    onEscape: () => setMobileOpen(false),
    triggerRef: mobileToggleRef,
  });

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

  const isHome = pathname === '/';

  return (
    <>
      <header
        className={cn(
          'penjing-header sticky top-0 z-50 border-b transition-all duration-500',
          scrolled
            ? 'border-[var(--penjing-border-fine)] shadow-[var(--penjing-shadow-static)]'
            : 'border-[var(--penjing-border-hairline)]',
        )}
        role="banner"
      >
        <div className="container-penjing">
          <div className="flex h-[72px] items-center justify-between">
            {/* 品牌：盆 + 景艺术 */}
            <Link
              href="/"
              className="brand-mark inline-flex items-baseline gap-1.5 transition-opacity duration-300 hover:opacity-75"
              aria-label="盆景艺术 首页"
            >
              <span className="font-serif text-[28px] font-semibold leading-none text-ink">
                盆
              </span>
              <span className="font-serif text-base font-normal tracking-[0.15em] text-ink-text-secondary">
                景艺术
              </span>
            </Link>

            {/* 桌面端导航 */}
            <nav
              className="hidden items-center gap-10 md:flex"
              aria-label="主导航"
            >
              {NAV_LINKS.map((link) => {
                // "入苑"项：未登录→/login，已登录→/chat
                const isEnterLink = link.href === '/chat';
                const resolvedHref =
                  isEnterLink && !(mounted && isAuthenticated)
                    ? '/login'
                    : link.href;
                const active =
                  resolvedHref === '/'
                    ? pathname === '/'
                    : pathname.startsWith(resolvedHref);
                return (
                  <Link
                    key={link.href}
                    href={resolvedHref}
                    aria-current={active ? 'page' : undefined}
                    data-active={active ? 'true' : undefined}
                    className={cn(
                      'nav-item relative inline-block py-1.5 font-sans text-[13px] tracking-[0.2em] transition-colors duration-300',
                      'after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-400 after:content-[""]',
                      'hover:after:left-0 hover:after:w-full',
                      active
                        ? 'font-medium text-ink after:left-0 after:w-full'
                        : 'text-ink-text-secondary hover:text-ink-text',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* 右侧用户区 */}
            <div className="hidden items-center gap-4 md:flex">
              {mounted && isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 transition-colors duration-300"
                    aria-label="用户菜单"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border text-xs font-medium transition-colors',
                        userMenuOpen
                          ? 'border-gold text-gold-deep'
                          : 'border-[var(--penjing-border-gold)] text-ink-text-secondary hover:border-gold hover:text-gold-deep',
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
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 top-12 w-56 border border-[var(--penjing-border-fine)] bg-paper py-2 shadow-[var(--penjing-shadow-float)]"
                        role="menu"
                        aria-label="用户操作"
                      >
                        <div className="border-b border-[var(--penjing-border-hairline)] px-5 py-3">
                          <p className="font-serif text-sm font-medium text-ink">
                            {user.username}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-text-muted">
                            {user.email}
                          </p>
                        </div>
                        <Link
                          href="/profile"
                          role="menuitem"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-ink-text-secondary transition-colors hover:bg-paper-warm hover:text-ink"
                        >
                          <User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                          个人中心
                        </Link>
                        <Link
                          href="/favorites"
                          role="menuitem"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-ink-text-secondary transition-colors hover:bg-paper-warm hover:text-ink"
                        >
                          <Heart className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                          我的收藏
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link
                            href="/admin/dashboard"
                            role="menuitem"
                            className="flex items-center gap-3 px-5 py-2.5 text-sm text-ink-text-secondary transition-colors hover:bg-paper-warm hover:text-ink"
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
                          className="flex w-full items-center gap-3 border-t border-[var(--penjing-border-hairline)] px-5 py-2.5 text-sm text-ink-text-secondary transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-50"
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
                    className="text-[13px] tracking-[0.15em] text-ink-text-secondary transition-colors duration-300 hover:text-ink"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="btn-outline-gold !px-5 !py-2 !text-[11px]"
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
                'flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-[var(--penjing-radius-md)] border border-[var(--penjing-border-gold)] bg-transparent transition-colors active:scale-95 md:hidden',
                'hover:bg-gold/8',
              )}
              aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span
                className={cn(
                  'block h-[1.5px] w-[18px] bg-gold transition-all duration-300',
                  mobileOpen && 'translate-y-[6.5px] rotate-45',
                )}
              />
              <span
                className={cn(
                  'block h-[1.5px] w-[18px] bg-gold transition-all duration-300',
                  mobileOpen && 'opacity-0',
                )}
              />
              <span
                className={cn(
                  'block h-[1.5px] w-[18px] bg-gold transition-all duration-300',
                  mobileOpen && '-translate-y-[6.5px] -rotate-45',
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* 移动端遮罩 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[99] bg-ink-deepest/55 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 移动端左侧抽屉 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            ref={mobileDrawerRef}
            id="mobile-nav-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed left-0 top-0 bottom-0 z-[100] flex w-[280px] max-w-[85vw] flex-col overflow-y-auto',
              'border-r border-[var(--penjing-border-gold)] bg-ink-deep pt-[64px]',
              'shadow-penjing-drawer',
              '[-webkit-overflow-scrolling:touch] md:hidden',
            )}
            role="dialog"
            aria-modal="true"
            aria-label="移动端导航"
          >
            {/* 抽屉顶部品牌 */}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="absolute left-0 right-0 top-0 flex h-[64px] items-center border-b border-gold/15 px-6"
            >
              <span className="font-serif text-[28px] font-semibold leading-none text-gold-bright">
                盆
              </span>
              <span className="ml-2 font-sans text-[13px] tracking-[0.2em] text-paper">
                景艺术
              </span>
            </Link>

            {/* 主导航 */}
            <nav className="flex-1" aria-label="移动端主导航">
              {NAV_LINKS.map((link) => {
                // "入苑"项：未登录→/login，已登录→/chat
                const isEnterLink = link.href === '/chat';
                const resolvedHref =
                  isEnterLink && !(mounted && isAuthenticated)
                    ? '/login'
                    : link.href;
                const active =
                  resolvedHref === '/'
                    ? pathname === '/'
                    : pathname.startsWith(resolvedHref);
                return (
                  <Link
                    key={link.href}
                    href={resolvedHref}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block border-b border-gold/8 px-6 py-[18px] font-sans text-[15px] tracking-[0.08em] transition-all duration-300',
                      active
                        ? 'border-l-[3px] border-l-gold bg-gold/8 pl-[21px] text-gold-bright'
                        : 'text-paper/75 hover:bg-gold/6 hover:pl-8 hover:text-gold-bright',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* 用户区 */}
            <div className="border-t border-gold/15 p-6">
              {mounted && isAuthenticated && user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 pb-3">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--penjing-border-gold)] text-xs text-gold-bright">
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
                    <div className="min-w-0">
                      <p className="truncate font-serif text-sm text-paper">{user.username}</p>
                      <p className="truncate text-[11px] text-paper/55">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="border border-[var(--penjing-border-gold)] py-3 text-center text-[11px] uppercase tracking-[0.2em] text-gold-bright transition-colors active:scale-[0.98]"
                  >
                    个人中心
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="border border-gold bg-gold py-3 text-center text-[11px] uppercase tracking-[0.2em] text-ink-deepest transition-colors active:scale-[0.98]"
                    >
                      管理后台
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center justify-center gap-2 border border-paper/20 py-3 text-[11px] uppercase tracking-[0.2em] text-paper/70 transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    {loggingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
                    退出登录
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="border border-[var(--penjing-border-gold)] py-3 text-center text-[11px] uppercase tracking-[0.2em] text-gold-bright transition-colors active:scale-[0.98]"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="border border-gold bg-gold py-3 text-center text-[11px] uppercase tracking-[0.2em] text-ink-deepest transition-colors active:scale-[0.98]"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>

            {/* 抽屉底部装饰 */}
            <div className="border-t border-gold/15 px-6 py-5 font-sans text-[11px] tracking-[0.15em] text-paper/40">
              — 以匠心 · 致东方 —
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 首页占位：保留 isHome 标识供未来 hero 协同 */}
      {isHome && <span className="sr-only">首页</span>}
    </>
  );
}
