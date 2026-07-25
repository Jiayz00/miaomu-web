// 用户管理：表格 + 搜索 + 分页 + 启用/禁用 + 修改密码 + 角色升降级 + 删除

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Key,
  UserCog,
  UserMinus,
  Trash2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDebounced } from '@/hooks/use-debounced';
import { cn, formatDateTime, resolveImageUrl } from '@/lib/utils';
import type { User } from '@/lib/types';

interface AdminUser extends User {
  status: number;
  createdAt: string;
}

interface UsersResponse {
  list: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [passwordModal, setPasswordModal] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleModal, setRoleModal] = useState<AdminUser | null>(null);
  const [deleteModal, setDeleteModal] = useState<AdminUser | null>(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<UsersResponse>({
    queryKey: ['admin-users', { debouncedSearch, page }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) qs.set('keyword', debouncedSearch);
      const res = await api.get<{ data: UsersResponse }>(
        `/admin/users?${qs.toString()}`
      );
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      await api.patch(`/admin/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '操作失败，请重试');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await api.put(`/admin/users/${id}/password`, { newPassword: password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setPasswordModal(null);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '密码修改失败，请重试');
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: 'ADMIN' | 'USER' }) => {
      await api.patch(`/admin/users/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setRoleModal(null);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '角色变更失败，请重试');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteModal(null);
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '删除用户失败，请重试');
    },
  });

  const handleToggle = async (user: AdminUser) => {
    try {
      await statusMutation.mutateAsync({
        id: user.id,
        status: user.status === 0 ? 1 : 0,
      });
    } catch (err) {
      void err;
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal) return;
    if (newPassword.length < 6 || newPassword.length > 32) {
      alert('密码长度需在 6-32 位之间');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    passwordMutation.mutate({ id: passwordModal.id, password: newPassword });
  };

  const users = data?.list || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const isCurrentUser = (user: AdminUser) => currentAdmin?.id === user.id;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-primary">用户管理</h1>
        <p className="mt-1 text-sm text-text-muted">共 {total} 位用户</p>
      </div>

      {/* 搜索 */}
      <div className="mb-6 flex items-center gap-2 border border-text-muted/15 bg-surface p-4">
        <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
        <input
          id="admin-user-search"
          name="admin-user-search"
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="搜索用户名、邮箱或手机号…"
          aria-label="搜索用户名、邮箱或手机号"
          className="flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none"
        />
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto border border-text-muted/15 bg-surface">
        <table className="w-full">
          <caption className="sr-only">
            用户列表，含用户、邮箱、手机号、角色、状态、最近活动、注册时间与操作
          </caption>
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th scope="col" className="px-4 py-4">用户</th>
              <th scope="col" className="px-4 py-4">邮箱</th>
              <th scope="col" className="px-4 py-4">手机号</th>
              <th scope="col" className="px-4 py-4">角色</th>
              <th scope="col" className="px-4 py-4">状态</th>
              <th scope="col" className="px-4 py-4">最近活动</th>
              <th scope="col" className="px-4 py-4">登录 IP</th>
              <th scope="col" className="px-4 py-4">注册时间</th>
              <th scope="col" className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.5} aria-hidden="true" />
                    <p className="text-sm text-red-600" role="alert">
                      {error instanceof ApiError ? error.message : '加载失败，请稍后重试'}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 border border-text-muted/30 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} aria-hidden="true" />
                      重试
                    </button>
                  </div>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="text-sm transition-colors hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-background">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveImageUrl(user.avatar)}
                            alt={user.username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="font-medium text-primary">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-light">{user.email}</td>
                  <td className="px-4 py-3 text-text-light">{user.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <Shield className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        管理员
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <UserIcon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        用户
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs',
                        user.status === 1
                          ? 'bg-accent/20 text-accent'
                          : 'bg-text-muted/20 text-text-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          user.status === 1 ? 'bg-accent' : 'bg-text-muted'
                        )}
                        aria-hidden="true"
                      />
                      {user.status === 1 ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {user.lastActiveAt ? formatDateTime(user.lastActiveAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {user.lastLoginIp || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordModal(user)}
                        className="inline-flex items-center gap-1 border border-text-muted/30 px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent"
                      >
                        <Key className="h-3 w-3" aria-hidden="true" />
                        改密
                      </button>
                      {user.role !== 'ADMIN' ? (
                        <button
                          type="button"
                          onClick={() => setRoleModal(user)}
                          className="inline-flex items-center gap-1 border border-accent px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-primary"
                        >
                          <UserCog className="h-3 w-3" aria-hidden="true" />
                          设管
                        </button>
                      ) : (
                        !isCurrentUser(user) && (
                          <button
                            type="button"
                            onClick={() => setRoleModal(user)}
                            className="inline-flex items-center gap-1 border border-text-muted/30 px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent"
                          >
                            <UserMinus className="h-3 w-3" aria-hidden="true" />
                            取消管理
                          </button>
                        )
                      )}
                      {!isCurrentUser(user) && (
                        <button
                          type="button"
                          onClick={() => handleToggle(user)}
                          aria-pressed={user.status === 1}
                          aria-label={`${user.username}：${user.status === 1 ? '正常，点击禁用' : '已禁用，点击启用'}`}
                          className={cn(
                            'border px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors',
                            user.status === 1
                              ? 'border-text-muted/30 text-text-light hover:border-red-400 hover:text-red-500'
                              : 'border-accent text-accent hover:bg-accent hover:text-primary'
                          )}
                        >
                          {user.status === 1 ? '禁用' : '启用'}
                        </button>
                      )}
                      {!isCurrentUser(user) && (
                        <button
                          type="button"
                          onClick={() => setDeleteModal(user)}
                          aria-label={`删除用户 ${user.username}`}
                          className="inline-flex items-center gap-1 border border-red-300 px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-text-muted">
                  {search ? '未找到匹配的用户' : '暂无用户'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="用户列表分页">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="上一页"
            className="flex items-center gap-1 border border-text-muted/20 px-4 py-2 text-sm transition-colors hover:border-accent disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            上一页
          </button>
          <span className="px-4 text-sm text-text-light" aria-current="page">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="下一页"
            className="flex items-center gap-1 border border-text-muted/20 px-4 py-2 text-sm transition-colors hover:border-accent disabled:opacity-30"
          >
            下一页
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* 修改密码弹窗 */}
      {passwordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
        >
          <div className="w-full max-w-md border border-text-muted/15 bg-surface p-6">
            <h2 id="password-modal-title" className="font-serif text-xl text-primary">
              修改 {passwordModal.username} 的密码
            </h2>
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-xs uppercase tracking-[0.15em] text-text-muted">
                  新密码
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={32}
                  className="mt-2 w-full border border-text-muted/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-xs uppercase tracking-[0.15em] text-text-muted">
                  确认新密码
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={32}
                  className="mt-2 w-full border border-text-muted/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModal(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="border border-accent bg-accent px-4 py-2 text-xs uppercase tracking-[0.15em] text-primary transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {passwordMutation.isPending ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 角色变更确认弹窗 */}
      {roleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
        >
          <div className="w-full max-w-md border border-text-muted/15 bg-surface p-6">
            <h2 id="role-modal-title" className="font-serif text-xl text-primary">
              {roleModal.role === 'ADMIN' ? '取消管理员权限' : '设为管理员'}
            </h2>
            <p className="mt-3 text-sm text-text-light">
              确定要将 <span className="font-medium text-primary">{roleModal.username}</span>{' '}
              {roleModal.role === 'ADMIN' ? '降级为普通用户' : '升级为管理员'}吗？
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                className="border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() =>
                  roleMutation.mutate({
                    id: roleModal.id,
                    role: roleModal.role === 'ADMIN' ? 'USER' : 'ADMIN',
                  })
                }
                disabled={roleMutation.isPending}
                className="border border-accent bg-accent px-4 py-2 text-xs uppercase tracking-[0.15em] text-primary transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {roleMutation.isPending ? '处理中…' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md border border-text-muted/15 bg-surface p-6">
            <h2 id="delete-modal-title" className="font-serif text-xl text-primary">
              删除用户
            </h2>
            <p className="mt-3 text-sm text-text-light">
              确定要删除用户 <span className="font-medium text-primary">{deleteModal.username}</span> 吗？
              该操作将永久删除账号及其关联数据，不可恢复。
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModal.id)}
                disabled={deleteMutation.isPending}
                className="border border-red-500 bg-red-500 px-4 py-2 text-xs uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
