// 盆景管理列表：表格 + 搜索 + 操作

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn, formatPrice, formatDate, getMainImage } from '@/lib/utils';
import type { Bonsai, Category, PaginatedResponse } from '@/lib/types';

export default function AdminBonsaisPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const limit = 10;

  // 分类
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
  });

  // 列表
  const { data, isLoading } = useQuery<PaginatedResponse<Bonsai>>({
    queryKey: ['admin-bonsais', { search, page, categoryFilter }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (search) qs.set('search', search);
      if (categoryFilter) qs.set('categoryId', categoryFilter);
      const res = await api.get<{ data: PaginatedResponse<Bonsai> }>(
        `/bonsais?${qs.toString()}`
      );
      return res.data;
    },
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/bonsais/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bonsais'] });
    },
  });

  // 上下架
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      await api.patch(`/admin/bonsais/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bonsais'] });
    },
  });

  const handleDelete = async (bonsai: Bonsai) => {
    if (!confirm(`确定删除「${bonsai.name}」吗？此操作不可撤销。`)) return;
    try {
      await deleteMutation.mutateAsync(bonsai.id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-primary">盆景管理</h1>
          <p className="mt-1 text-sm text-text-muted">共 {total} 件盆景</p>
        </div>
        <Link
          href="/admin/bonsais/new"
          className="flex items-center gap-2 bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          新增盆景
        </Link>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex flex-wrap items-center gap-4 border border-text-muted/15 bg-surface p-4">
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索盆景名称…"
            className="flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="border border-text-muted/20 bg-surface px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">全部分类</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto border border-text-muted/15 bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th className="px-4 py-4">图片</th>
              <th className="px-4 py-4">名称</th>
              <th className="px-4 py-4">价格</th>
              <th className="px-4 py-4">库存</th>
              <th className="px-4 py-4">分类</th>
              <th className="px-4 py-4">状态</th>
              <th className="px-4 py-4">创建时间</th>
              <th className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((bonsai) => (
                <tr key={bonsai.id} className="text-sm transition-colors hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="h-14 w-14 overflow-hidden bg-primary-dark/10">
                      {getMainImage(bonsai.images) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMainImage(bonsai.images)}
                          alt={bonsai.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-primary">{bonsai.name}</p>
                    {bonsai.isFeatured && (
                      <span className="text-xs text-accent">精选</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-accent">¥{formatPrice(bonsai.price)}</td>
                  <td className="px-4 py-3 text-text-light">{bonsai.stock}</td>
                  <td className="px-4 py-3 text-text-light">
                    {bonsai.category?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        statusMutation.mutate({
                          id: bonsai.id,
                          status: bonsai.status === 1 ? 0 : 1,
                        })
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors',
                        bonsai.status === 1
                          ? 'bg-accent/20 text-accent'
                          : 'bg-text-muted/20 text-text-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          bonsai.status === 1 ? 'bg-accent' : 'bg-text-muted'
                        )}
                      />
                      {bonsai.status === 1 ? '已上架' : '已下架'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDate(bonsai.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/bonsais/${bonsai.slug}`}
                        target="_blank"
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-accent"
                        aria-label="查看"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                      <Link
                        href={`/admin/bonsais/${bonsai.id}`}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-accent"
                        aria-label="编辑"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(bonsai)}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-red-500"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                  暂无盆景数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-text-muted/20 px-4 py-2 text-sm disabled:opacity-30"
          >
            上一页
          </button>
          <span className="px-4 text-sm text-text-light">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-text-muted/20 px-4 py-2 text-sm disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
