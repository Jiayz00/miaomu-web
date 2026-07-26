// 用户管理：表格 + 搜索 + 分页 + 启用/禁用 + 修改密码 + 角色升降级 + 删除
//
// 设计系统对齐：
// - 顶部标题：eyebrow-label + display-section + 统计计数
// - 工具栏：paper-warm 背景 + 金色聚焦
// - 表格：paper-warm 卡片 + 表头 ink-text-muted + 行 hover paper
// - 角色徽章：ADMIN 金色描边 / USER paper-aged 中性
// - 分页：复用 Pagination 组件（已对齐设计系统）

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  User as UserIcon,
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
import { Pagination } from '@/components/Pagination';
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
        <span className="eyebrow-label">用户管理</span>
        <h1 className="display-section mt-2 text-ink">用户管理</h1>
        <p className="body-base mt-2 text-ink-text-secondary">共 {total} 位用户</p>
      </div>

      {/* 搜索工具栏：paper-warm 背景 + 金色聚焦 */}
      <div className="mb-6 flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper-warm p-4">
        <Search className="h-4 w-4 flex-shrink-0 text-ink-text-muted" strokeWidth={1.5} aria-hidden="true" />
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
          className="flex-1 border-0 bg-transparent py-1 font-sans text-sm text-ink-text placeholder:text-ink-text-faint focus:outline-none"
        />
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto border border-[var(--penjing-border-fine)] bg-paper-warm">
        <table className="w-full">
          <caption className="sr-only">
            用户列表，含用户、邮箱、手机号、角色、状态、最近活动、注册时间与操作
          </caption>
          <thead>
            <tr className="border-b border-[var(--penjing-border-fine)] bg-paper text-left font-sans text-[11px] uppercase tracking-[0.25em] text-ink-text-muted">
              <th scope="col" className="px-4 py-4 font-medium">用户</th>
              <th scope="col" className="px-4 py-4 font-medium">邮箱</th>
              <th scope="col" className="px-4 py-4 font-medium">手机号</th>
              <th scope="col" className="px-4 py-4 font-medium">角色</th>
              <th scope="col" className="px-4 py-4 font-medium">状态</th>
              <th scope="col" className="px-4 py-4 font-medium">最近活动</th>
              <th scope="col" className="px-4 py-4 font-medium">登录 IP</th>
              <th scope="col" className="px-4 py-4 font-medium">注册时间</th>
              <th scope="col" className="px-4 py-4 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--penjing-border-hairline)]">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center font-sans text-sm text-ink-text-muted">
                  加载中…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-state-error" strokeWidth={1.5} aria-hidden="true" />
                    <p className="font-sans text-sm text-state-error" role="alert">
                      {error instanceof ApiError ? error.message : '加载失败，请稍后重试'}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 border border-[var(--penjing-border-fine)] px-4 py-1.5 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} aria-hidden="true" />
                      重试
                    </button>
                  </div>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="font-sans text-sm transition-colors hover:bg-paper">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-medium text-paper">
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
                      <span className="font-medium text-ink">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-text-secondary">{user.email}</td>
                  <td className="px-4 py-3 text-ink-text-secondary">{user.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {/* 角色徽章：ADMIN 金色描边 / USER paper-aged 中性 */}
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 border border-gold/50 bg-gold/10 px-2 py-0.5 font-sans text-xs text-gold-deep">
                        <Shield className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        管理员
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 border border-[var(--penjing-border-fine)] bg-paper-aged px-2 py-0.5 font-sans text-xs text-ink-text-secondary">
                        <UserIcon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        用户
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 border px-2.5 py-1 font-sans text-xs',
                        user.status === 1
                          ? 'border-gold/40 bg-gold/10 text-gold-deep'
                          : 'border-[var(--penjing-border-fine)] bg-paper-aged text-ink-text-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          user.status === 1 ? 'bg-gold' : 'bg-ink-text-faint',
                        )}
                        aria-hidden="true"
                      />
                      {user.status === 1 ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-ink-text-muted">
                    {user.lastActiveAt ? formatDateTime(user.lastActiveAt) : '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-ink-text-muted">
                    {user.lastLoginIp || '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-ink-text-muted">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordModal(user)}
                        className="inline-flex items-center gap-1 border border-[var(--penjing-border-fine)] px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep"
                      >
                        <Key className="h-3 w-3" aria-hidden="true" />
                        改密
                      </button>
                      {user.role !== 'ADMIN' ? (
                        <button
                          type="button"
                          onClick={() => setRoleModal(user)}
                          className="inline-flex items-center gap-1 border border-gold px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] text-gold-deep transition-colors hover:bg-gold hover:text-ink-deepest"
                        >
                          <UserCog className="h-3 w-3" aria-hidden="true" />
                          设管
                        </button>
                      ) : (
                        !isCurrentUser(user) && (
                          <button
                            type="button"
                            onClick={() => setRoleModal(user)}
                            className="inline-flex items-center gap-1 border border-[var(--penjing-border-fine)] px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep"
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
                            'border px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] transition-colors',
                            user.status === 1
                              ? 'border-[var(--penjing-border-fine)] text-ink-text-secondary hover:border-state-error hover:text-state-error'
                              : 'border-gold text-gold-deep hover:bg-gold hover:text-ink-deepest',
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
                          className="inline-flex items-center gap-1 border border-state-error/40 px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] text-state-error transition-colors hover:bg-state-error hover:text-paper"
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
                <td colSpan={9} className="px-4 py-12 text-center font-sans text-sm text-ink-text-muted">
                  {search ? '未找到匹配的用户' : '暂无用户'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页：复用已对齐设计系统的 Pagination 组件 */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* 修改密码弹窗 */}
      {passwordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deepest/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
        >
          <div className="w-full max-w-md border border-[var(--penjing-border-fine)] bg-paper p-6 shadow-[var(--penjing-shadow-overlay)]">
            <span className="eyebrow-label">安全操作</span>
            <h2 id="password-modal-title" className="display-card mt-1 text-ink">
              修改 {passwordModal.username} 的密码
            </h2>
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="label-luxury">
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
                  className="w-full border border-[var(--penjing-border-fine)] bg-paper-warm px-3 py-2 font-sans text-sm text-ink-text outline-none transition-colors focus:border-gold"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="label-luxury">
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
                  className="w-full border border-[var(--penjing-border-fine)] bg-paper-warm px-3 py-2 font-sans text-sm text-ink-text outline-none transition-colors focus:border-gold"
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
                  className="btn-outline-gold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="btn-gold disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deepest/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
        >
          <div className="w-full max-w-md border border-[var(--penjing-border-fine)] bg-paper p-6 shadow-[var(--penjing-shadow-overlay)]">
            <span className="eyebrow-label">权限变更</span>
            <h2 id="role-modal-title" className="display-card mt-1 text-ink">
              {roleModal.role === 'ADMIN' ? '取消管理员权限' : '设为管理员'}
            </h2>
            <p className="body-base mt-3 text-ink-text-secondary">
              确定要将 <span className="font-medium text-ink">{roleModal.username}</span>{' '}
              {roleModal.role === 'ADMIN' ? '降级为普通用户' : '升级为管理员'}吗？
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                className="btn-outline-gold"
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
                className="btn-gold disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deepest/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md border border-[var(--penjing-border-fine)] bg-paper p-6 shadow-[var(--penjing-shadow-overlay)]">
            <span className="eyebrow-label">危险操作</span>
            <h2 id="delete-modal-title" className="display-card mt-1 text-ink">
              删除用户
            </h2>
            <p className="body-base mt-3 text-ink-text-secondary">
              确定要删除用户 <span className="font-medium text-ink">{deleteModal.username}</span> 吗？
              该操作将永久删除账号及其关联数据，不可恢复。
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="btn-outline-gold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModal.id)}
                disabled={deleteMutation.isPending}
                className="btn-danger disabled:opacity-50"
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
