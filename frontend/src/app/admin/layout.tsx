// 管理后台布局：侧边栏 + 顶部栏 + 路由守卫

'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TreePine,
  FolderTree,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { AdminRoute } from '@/components/AdminRoute';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useMounted } from '@/app/providers';
import { cn } from '@/lib/utils';
import { FullPageLoading } from '@/components/Loading';

// 导航项与图标映射
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '数据看板', icon: LayoutDashboard },
  { href: '/admin/bonsais', label: '盆景管理', icon: TreePine },
  { href: '/admin/categories', label: '分类管理', icon: FolderTree },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/chat', label: '询价管理', icon: MessageSquare },
];

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const SidebarContent = () => (
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
      <nav className="flex-1 space-y-1 px-3 py-6">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-all duration-300',
                active
                  ? 'bg-accent text-primary-dark'
                  : 'text-background/60 hover:bg-background/5 hover:text-background'
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
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
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          返回前台
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-background/60 transition-colors hover:text-background"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          退出登录
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-primary-dark lg:block">
        <SidebarContent />
      </aside>

      {/* 移动端侧边栏 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-primary-dark/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-primary-dark">
            <SidebarContent />
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
              aria-label="菜单"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm text-text-light">管理后台</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-text-light sm:block">
              {user?.username}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-background">
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
