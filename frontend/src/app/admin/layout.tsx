// 管理后台布局：侧边栏 + 顶部栏 + 路由守卫

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
} from 'lucide-react';
import { AdminRoute } from '@/components/AdminRoute';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FullPageLoading } from '@/components/Loading';
import type { ChatRoom } from '@/lib/types';

// 导航项与图标映射
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '数据看板', icon: LayoutDashboard },
  { href: '/admin/bonsais', label: '盆景管理', icon: TreePine },
  { href: '/admin/categories', label: '分类管理', icon: FolderTree },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/chat', label: '询价管理', icon: MessageSquare },
  { href: '/admin/settings', label: '站点设置', icon: Settings },
  { href: '/admin/layout-editor', label: '主页布局', icon: LayoutTemplate },
];

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
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-background/10 px-6 py-6">
        <Link href="/admin/dashboard" className="block">
          <p className="font-serif text-2xl text-background">盆景艺术</p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-accent">
            管理后台
          </p>
        </Link>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="管理后台主导航">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          // 询价管理显示待处理角标，让管理员一眼感知待办
          const badge =
            item.href === '/admin/chat' && pendingInquiries > 0
              ? pendingInquiries
              : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              aria-label={
                badge ? `${item.label}，${badge} 个待处理` : item.label
              }
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-all duration-300',
                active
                  ? 'bg-accent text-primary-dark'
                  : 'text-background/60 hover:bg-background/5 hover:text-background'
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span
                  className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-dark"
                  aria-hidden="true"
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 底部 */}
      <div className="border-t border-background/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-sm text-background/60 transition-colors hover:text-background"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          返回前台
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-background/60 transition-colors hover:text-background"
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

  return (
    <div className="min-h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-primary-dark lg:block" aria-label="管理后台侧边栏">
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          pendingInquiries={pendingInquiries}
        />
      </aside>

      {/* 移动端侧边栏（WCAG 4.1.2 / 2.1.2：role=dialog + aria-modal + Esc 关闭） */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-primary-dark/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 w-64 bg-primary-dark"
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
      <div className="lg:pl-64">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-text-muted/10 bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-text-light lg:hidden"
              aria-label={sidebarOpen ? '关闭导航菜单' : '打开导航菜单'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-mobile-sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            <span className="text-sm text-text-light">管理后台</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-text-light sm:block">
              {user?.username}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-background" aria-hidden="true">
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
