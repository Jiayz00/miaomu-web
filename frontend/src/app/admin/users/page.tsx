// 用户管理：表格 + 启用/禁用

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, User as UserIcon } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type { User } from '@/lib/types';

interface UsersResponse {
  items: User[];
  total: number;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
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
  });

  const handleToggle = async (user: User & { status: number }) => {
    try {
      await statusMutation.mutateAsync({
        id: user.id,
        status: user.status === 0 ? 1 : 0,
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '操作失败');
    }
  };

  // User 类型未含 status 字段，但后端返回，扩展处理
  const users = (data?.items || []) as (User & { status: number })[];
  const total = data?.total || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-primary">用户管理</h1>
        <p className="mt-1 text-sm text-text-muted">共 {total} 位用户</p>
      </div>

      {/* 搜索 */}
      <div className="mb-6 flex items-center gap-2 border border-text-muted/15 bg-surface p-4">
        <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索用户名或邮箱…"
          className="flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none"
        />
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto border border-text-muted/15 bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th className="px-4 py-4">用户</th>
              <th className="px-4 py-4">邮箱</th>
              <th className="px-4 py-4">角色</th>
              <th className="px-4 py-4">状态</th>
              <th className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="text-sm transition-colors hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-medium text-background">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-primary">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-light">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <Shield className="h-3 w-3" strokeWidth={1.5} />
                        管理员
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <UserIcon className="h-3 w-3" strokeWidth={1.5} />
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
                      />
                      {user.status === 1 ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleToggle(user)}
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
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  暂无用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
