// 用户管理：表格 + 搜索 + 分页 + 启用/禁用
//
// 修复要点：
// 1. 后端 /admin/users 接收 keyword（非 search）、返回 { list, total, page, pageSize, totalPages }（非 items）
//    原前端使用 search 与 items 导致搜索与分页失效
// 2. 补齐分页 UI，避免用户量大时单页渲染过载

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, User as UserIcon, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useDebounced } from '@/hooks/use-debounced';
import { cn, formatDate, resolveImageUrl } from '@/lib/utils';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // 搜索防抖
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

  // 启用/禁用
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      await api.patch(`/admin/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '操作失败，请重试');
      // 失败时回滚 UI
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleToggle = async (user: AdminUser) => {
    try {
      await statusMutation.mutateAsync({
        id: user.id,
        status: user.status === 0 ? 1 : 0,
      });
    } catch (err) {
      // onError 已处理提示，吞掉避免未捕获 promise rejection
      void err;
    }
  };

  const users = data?.list || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

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
          <caption className="sr-only">用户列表，含用户、邮箱、手机号、角色、状态、注册时间与操作</caption>
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th scope="col" className="px-4 py-4">用户</th>
              <th scope="col" className="px-4 py-4">邮箱</th>
              <th scope="col" className="px-4 py-4">手机号</th>
              <th scope="col" className="px-4 py-4">角色</th>
              <th scope="col" className="px-4 py-4">状态</th>
              <th scope="col" className="px-4 py-4">注册时间</th>
              <th scope="col" className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
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
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleToggle(user)}
                        aria-pressed={user.status === 1}
                        aria-label={`${user.username}：${user.status === 1 ? '正常，点击禁用' : '已禁用，点击启用'}`}
                        className={cn(
                          'border px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors',
                          user.status === 1
                            ? 'border-text-muted/30 text-text-light hover:border-red-400 hover:text-red-500'
                            : 'border-accent text-accent hover:bg-accent hover:text-primary'
                        )}
                      >
                        {user.status === 1 ? '禁用' : '启用'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
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
    </div>
  );
}
