// 盆景管理列表：表格 + 搜索 + 操作

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useDebounced } from '@/hooks/use-debounced';
import { cn, formatPrice, formatDate, getMainImage } from '@/lib/utils';
import type { Bonsai, Category, PaginatedResponse } from '@/lib/types';

export default function AdminBonsaisPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const limit = 10;
  // 搜索防抖：避免每个按键都触发请求
  const debouncedSearch = useDebounced(search, 400);

  // 分类
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
  });

  // 列表
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<PaginatedResponse<Bonsai>>({
    queryKey: ['admin-bonsais', { debouncedSearch, page, categoryFilter }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (debouncedSearch) qs.set('keyword', debouncedSearch);
      if (categoryFilter) qs.set('categoryId', categoryFilter);
      const res = await api.get<{ data: PaginatedResponse<Bonsai> }>(
        `/admin/bonsais?${qs.toString()}`
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
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '删除失败');
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
    onError: (err) => {
      // 失败时回滚 UI（invalidateQueries 会重新拉取真实状态）
      alert(err instanceof ApiError ? err.message : '操作失败，请重试');
      queryClient.invalidateQueries({ queryKey: ['admin-bonsais'] });
    },
  });

  const handleDelete = async (bonsai: Bonsai) => {
    if (!confirm(`确定删除「${bonsai.name}」吗？此操作不可撤销。`)) return;
    try {
      await deleteMutation.mutateAsync(bonsai.id);
    } catch (err) {
      // onError 已处理提示，这里吞掉避免未捕获 promise rejection
      void err;
    }
  };

  const items = data?.list || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || Math.ceil(total / limit);

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
          <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
          <input
            id="admin-bonsai-search"
            name="admin-bonsai-search"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索盆景名称…"
            aria-label="搜索盆景名称"
            className="flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          aria-label="按分类筛选"
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
          <caption className="sr-only">盆景列表，含图片、名称、价格、库存、分类、状态、创建时间与操作</caption>
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th scope="col" className="px-4 py-4">图片</th>
              <th scope="col" className="px-4 py-4">名称</th>
              <th scope="col" className="px-4 py-4">价格</th>
              <th scope="col" className="px-4 py-4">库存</th>
              <th scope="col" className="px-4 py-4">分类</th>
              <th scope="col" className="px-4 py-4">状态</th>
              <th scope="col" className="px-4 py-4">创建时间</th>
              <th scope="col" className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
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
                  <td className="px-4 py-3">
                    {/* 库存预警：≤2 显示警示色，0 显示售罄，便于运营快速识别需补货商品 */}
                    {bonsai.stock <= 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        售罄
                      </span>
                    ) : bonsai.stock <= 2 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-dark">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                        {bonsai.stock} 株
                      </span>
                    ) : (
                      <span className="text-text-light">{bonsai.stock}</span>
                    )}
                  </td>
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
                      aria-pressed={bonsai.status === 1}
                      aria-label={`${bonsai.name}：${bonsai.status === 1 ? '已上架，点击下架' : '已下架，点击上架'}`}
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
                        aria-hidden="true"
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
                        aria-label={`查看 ${bonsai.name}`}
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/admin/bonsais/${bonsai.id}`}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-accent"
                        aria-label={`编辑 ${bonsai.name}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(bonsai)}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-red-500"
                        aria-label={`删除 ${bonsai.name}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
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
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="盆景列表分页">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="上一页"
            className="border border-text-muted/20 px-4 py-2 text-sm disabled:opacity-30"
          >
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
            className="border border-text-muted/20 px-4 py-2 text-sm disabled:opacity-30"
          >
            下一页
          </button>
        </nav>
      )}
    </div>
  );
}
