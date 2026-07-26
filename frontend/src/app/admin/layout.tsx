// 管理后台布局：240px 墨色侧边栏 + 顶部面包屑 + 路由守卫
//
// 设计系统对齐：
// - 侧边栏：bg-ink-deep + 金色左边框激活指示
// - 导航分组：eyebrow-label 小标签分组
// - 顶部栏：面包屑导航 + 用户身份
// - 保持原有路由守卫、询价角标、Esc 关闭等业务逻辑

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TreePine,
  FolderTree,
  Users,
  MessageSquare,
  Settings,
  LayoutTemplate,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { AdminRoute } from '@/components/AdminRoute';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FullPageLoading } from '@/components/Loading';
import type { ChatRoom } from '@/lib/types';

// 导航分组：内容运营 / 站点配置
// 每组以 eyebrow-label 文案分隔，让管理员快速定位功能模块
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    group: '内容运营',
    items: [
      { href: '/admin/dashboard', label: '数据看板', icon: LayoutDashboard },
      { href: '/admin/bonsais', label: '盆景管理', icon: TreePine },
      { href: '/admin/categories', label: '分类管理', icon: FolderTree },
      { href: '/admin/chat', label: '询价管理', icon: MessageSquare },
      { href: '/admin/users', label: '用户管理', icon: Users },
    ],
  },
  {
    group: '站点配置',
    items: [
      { href: '/admin/settings', label: '站点设置', icon: Settings },
      { href: '/admin/layout-editor', label: '主页布局', icon: LayoutTemplate },
    ],
  },
];

// 面包屑映射：根据 pathname 生成"模块 / 子页"层级
function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [
    { label: '管理后台', href: '/admin/dashboard' },
  ];

  // 二级路径：/admin/<module>
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && segments[0] === 'admin') {
    const moduleName = segments[1];
    const moduleLabel =
      NAV_GROUPS.flatMap((g) => g.items).find(
        (item) => item.href === `/admin/${moduleName}`,
      )?.label || moduleName;

    if (pathname === `/admin/${moduleName}`) {
      crumbs.push({ label: moduleLabel });
    } else {
      crumbs.push({ label: moduleLabel, href: `/admin/${moduleName}` });

      // 三级路径：详情/新增等
      if (segments.length >= 3) {
        const sub = segments[2];
        if (sub === 'new') {
          crumbs.push({ label: '新增' });
        } else if (sub === '[id]' || /^\d+$/.test(sub)) {
          crumbs.push({ label: '编辑' });
        } else {
          crumbs.push({ label: sub });
        }
      }
    }
  }

  return crumbs;
}

/**
 * 侧边栏内容组件（必须在模块顶层定义，不能放在函数体内）
 * 否则每次渲染会创建新组件类型，导致重渲染与闪烁
 */
function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
  pendingInquiries,
}: {
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  pendingInquiries: number;
}) {
  return (
    <div className="flex h-full flex-col bg-ink-deep text-paper">
      {/* Logo 区 */}
      <div className="border-b border-paper/10 px-6 py-6">
        <Link href="/admin/dashboard" className="block" onClick={onNavigate}>
          <p className="font-serif text-2xl text-paper">盆景艺术</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
            管理后台
          </p>
        </Link>
      </div>

      {/* 导航：按分组渲染 */}
      <nav
        className="admin-scroll flex-1 overflow-y-auto px-4 py-6"
        aria-label="管理后台主导航"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.group} className={gi > 0 ? 'mt-8' : ''}>
            <p
              className="eyebrow-label mb-3 px-3 text-[10px] text-paper/40"
              aria-hidden="true"
            >
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                // 询价管理显示待处理角标，让管理员一眼感知待办
                const badge =
                  item.href === '/admin/chat' && pendingInquiries > 0
                    ? pendingInquiries
                    : null;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      aria-label={
                        badge ? `${item.label}，${badge} 个待处理` : item.label
                      }
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-300',
                        active
                          ? 'bg-paper/5 text-paper'
                          : 'text-paper/55 hover:bg-paper/5 hover:text-paper',
                      )}
                    >
                      {/* 激活态：左侧金色短杠 */}
                      {active && (
                        <span
                          className="absolute inset-y-2 left-0 w-[2px] bg-gold"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon
                        className={cn(
                          'h-4 w-4 flex-shrink-0 transition-colors',
                          active ? 'text-gold' : 'text-paper/50 group-hover:text-paper/80',
                        )}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      {badge !== null && (
                        <span
                          className="inline-flex min-w-[20px] items-center justify-center bg-gold px-1.5 py-0.5 text-[10px] font-medium leading-none text-ink-deepest"
                          aria-hidden="true"
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 底部：返回前台 + 退出 */}
      <div className="border-t border-paper/10 p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-paper/55 transition-colors hover:bg-paper/5 hover:text-paper"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          返回前台
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-paper/55 transition-colors hover:bg-paper/5 hover:text-paper"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          退出登录
        </button>
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 拉取询价会话，统计待处理数（status === 0），用于侧边栏角标提醒
  // 让管理员从任意后台页面都能快速感知待办，无需进入询价管理页
  const { data: rooms } = useQuery<ChatRoom[]>({
    queryKey: ['admin-chat-rooms'],
    queryFn: async () => {
      const res = await api.get<{ data: ChatRoom[] }>('/admin/chat/rooms');
      return res.data;
    },
    refetchInterval: 60_000, // 每分钟刷新，及时感知新询价
  });
  const pendingInquiries = (rooms || []).filter((r) => r.status === 0).length;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 移动端侧栏打开时：Esc 关闭 + 锁定背景滚动（WCAG 2.1.2 No Keyboard Trap）
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <div className="min-h-dvh bg-paper">
      {/* 桌面端侧边栏：240px ink-deep */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block"
        aria-label="管理后台侧边栏"
      >
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          pendingInquiries={pendingInquiries}
        />
      </aside>

      {/* 移动端侧边栏（WCAG 4.1.2 / 2.1.2：role=dialog + aria-modal + Esc 关闭） */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" id="admin-mobile-sidebar">
          <div
            className="absolute inset-0 bg-ink-deepest/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 w-60"
            role="dialog"
            aria-modal="true"
            aria-label="管理后台导航"
          >
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
              onLogout={handleLogout}
              pendingInquiries={pendingInquiries}
            />
          </aside>
        </div>
      )}

      {/* 主内容区 */}
      <div className="lg:pl-60">
        {/* 顶部栏：面包屑 + 用户身份 */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--penjing-border-hairline)] bg-paper/95 px-6 py-4 backdrop-blur-sm lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-ink-text-secondary lg:hidden"
              aria-label={sidebarOpen ? '关闭导航菜单' : '打开导航菜单'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-mobile-sidebar"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {/* 面包屑导航 */}
            <nav aria-label="面包屑导航" className="flex items-center gap-1.5">
              <ol className="flex flex-wrap items-center gap-1.5">
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <li key={i} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <ChevronRight
                          className="h-3 w-3 text-ink-text-faint"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      )}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="font-sans text-xs text-ink-text-muted transition-colors hover:text-gold-deep"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            'font-sans text-xs',
                            isLast
                              ? 'font-medium text-ink-text'
                              : 'text-ink-text-muted',
                          )}
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden font-sans text-xs text-ink-text-muted sm:block">
              {user?.username}
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center bg-ink text-xs font-medium text-paper"
              aria-hidden="true"
            >
              {user?.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="admin-scroll p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // 未挂载时展示加载态，避免 hydration 不一致
  if (!mounted) {
    return <FullPageLoading />;
  }

  // 守卫
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <AdminRoute>{children}</AdminRoute>;
  }

  return <AdminShell>{children}</AdminShell>;
}
