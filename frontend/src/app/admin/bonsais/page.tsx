// 盆景管理列表：表格 + 搜索 + 操作
//
// 设计系统对齐：
// - 顶部标题：eyebrow-label + display-card + 统计计数
// - 工具栏：paper-warm 背景 + 金色边框激活
// - 表格：paper-warm 卡片 + 表头 ink-text-muted + 行 hover paper
// - 状态/库存徽章：使用设计系统 token
// - 分页：复用 Pagination 组件（已对齐设计系统）

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useDebounced } from '@/hooks/use-debounced';
import { cn, formatPrice, formatDate, getMainImage } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow-label">藏品管理</span>
          <h1 className="display-section mt-2 text-ink">盆景管理</h1>
          <p className="body-base mt-2 text-ink-text-secondary">
            共 {total} 件盆景
          </p>
        </div>
        <Link href="/admin/bonsais/new" className="btn-gold">
          <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          新增盆景
        </Link>
      </div>

      {/* 工具栏：搜索 + 分类筛选 */}
      <div className="mb-6 flex flex-wrap items-center gap-4 border border-[var(--penjing-border-fine)] bg-paper-warm p-4">
        <div className="flex flex-1 items-center gap-2">
          <Search
            className="h-4 w-4 flex-shrink-0 text-ink-text-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
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
            className="flex-1 border-0 bg-transparent py-1 font-sans text-sm text-ink-text placeholder:text-ink-text-faint focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          aria-label="按分类筛选"
          className="border border-[var(--penjing-border-fine)] bg-paper px-3 py-1.5 font-sans text-sm text-ink-text transition-colors focus:border-gold focus:outline-none"
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
      <div className="overflow-x-auto border border-[var(--penjing-border-fine)] bg-paper-warm">
        <table className="w-full">
          <caption className="sr-only">
            盆景列表，含图片、名称、价格、库存、分类、状态、创建时间与操作
          </caption>
          <thead>
            <tr className="border-b border-[var(--penjing-border-fine)] bg-paper text-left font-sans text-[11px] uppercase tracking-[0.25em] text-ink-text-muted">
              <th scope="col" className="px-4 py-4 font-medium">图片</th>
              <th scope="col" className="px-4 py-4 font-medium">名称</th>
              <th scope="col" className="px-4 py-4 font-medium">价格</th>
              <th scope="col" className="px-4 py-4 font-medium">库存</th>
              <th scope="col" className="px-4 py-4 font-medium">分类</th>
              <th scope="col" className="px-4 py-4 font-medium">状态</th>
              <th scope="col" className="px-4 py-4 font-medium">创建时间</th>
              <th scope="col" className="px-4 py-4 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--penjing-border-hairline)]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-sans text-sm text-ink-text-muted">
                  加载中…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
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
            ) : items.length > 0 ? (
              items.map((bonsai) => (
                <tr
                  key={bonsai.id}
                  className="font-sans text-sm transition-colors hover:bg-paper"
                >
                  <td className="px-4 py-3">
                    <div className="h-14 w-14 overflow-hidden bg-paper-aged">
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
                    <p className="font-medium text-ink">{bonsai.name}</p>
                    {bonsai.isFeatured && (
                      <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-gold-deep">
                        精选
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-serif text-base text-gold-deep">
                    ¥{formatPrice(bonsai.price)}
                  </td>
                  <td className="px-4 py-3">
                    {/* 库存预警：≤2 显示警示色，0 显示售罄，便于运营快速识别需补货商品 */}
                    {bonsai.stock <= 0 ? (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-state-error">
                        <span className="h-1.5 w-1.5 rounded-full bg-state-error" aria-hidden="true" />
                        售罄
                      </span>
                    ) : bonsai.stock <= 2 ? (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-gold-deep">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
                        {bonsai.stock} 株
                      </span>
                    ) : (
                      <span className="font-sans text-sm text-ink-text-secondary">
                        {bonsai.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-ink-text-secondary">
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
                        'inline-flex items-center gap-1.5 border px-2.5 py-1 font-sans text-xs transition-colors',
                        bonsai.status === 1
                          ? 'border-gold bg-gold/10 text-gold-deep'
                          : 'border-[var(--penjing-border-fine)] bg-paper text-ink-text-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          bonsai.status === 1 ? 'bg-gold' : 'bg-ink-text-faint',
                        )}
                        aria-hidden="true"
                      />
                      {bonsai.status === 1 ? '已上架' : '已下架'}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-ink-text-muted">
                    {formatDate(bonsai.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/bonsais/${bonsai.slug}`}
                        target="_blank"
                        className="flex h-8 w-8 items-center justify-center text-ink-text-secondary transition-colors hover:text-gold-deep"
                        aria-label={`查看 ${bonsai.name}`}
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/admin/bonsais/${bonsai.id}`}
                        className="flex h-8 w-8 items-center justify-center text-ink-text-secondary transition-colors hover:text-gold-deep"
                        aria-label={`编辑 ${bonsai.name}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(bonsai)}
                        className="flex h-8 w-8 items-center justify-center text-ink-text-secondary transition-colors hover:text-state-error"
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
                <td colSpan={8} className="px-4 py-12 text-center font-sans text-sm text-ink-text-muted">
                  暂无盆景数据
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
    </div>
  );
}
