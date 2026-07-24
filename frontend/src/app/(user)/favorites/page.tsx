// 我的收藏页：展示收藏的盆景，支持筛选/排序/搜索，可取消收藏
//
// 数据流：
// - useFavorites 一次性拉取全部收藏（不分页）
// - 父组件维护 FavoritesFilterState，通过 useMemo 在前端完成筛选/排序
// - 桌面端：左侧 sticky 筛选栏 + 右侧网格
// - 移动端：顶部"筛选"按钮 + 抽屉式滑出
//
// 性能：所有筛选均在客户端完成，无网络请求，体验流畅

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart, ArrowRight, SlidersHorizontal, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { BonsaiCard } from '@/components/BonsaiCard';
import {
  FavoritesFilterPanel,
  DEFAULT_FAVORITES_FILTER,
  type FavoritesFilterState,
} from '@/components/FavoritesFilterPanel';
import { useFavorites, useToggleFavorite } from '@/hooks/use-favorites';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

function FavoritesContent() {
  const { data: favorites, isLoading } = useFavorites();
  const toggleFav = useToggleFavorite();

  // 分类列表（用于筛选）
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 筛选状态
  const [filter, setFilter] = useState<FavoritesFilterState>(DEFAULT_FAVORITES_FILTER);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const list = favorites || [];

  // 前端筛选 + 排序
  const filteredList = useMemo(() => {
    if (list.length === 0) return [];

    let result = [...list];

    // 关键词搜索（名称 + 描述）
    const q = filter.search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q),
      );
    }

    // 分类
    if (filter.categoryId) {
      const cid = Number(filter.categoryId);
      if (!Number.isNaN(cid)) {
        result = result.filter((b) => b.categoryId === cid);
      }
    }

    // 价格区间
    if (filter.price) {
      const [minStr, maxStr] = filter.price.split('-');
      const min = Number(minStr);
      const max = Number(maxStr);
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        result = result.filter((b) => {
          const p = Number(b.price);
          return p >= min && p <= max;
        });
      }
    }

    // 产地
    if (filter.origin) {
      result = result.filter((b) => b.origin === filter.origin);
    }

    // 年份
    if (filter.year) {
      const y = Number(filter.year);
      if (!Number.isNaN(y)) {
        result = result.filter((b) => b.year === y);
      }
    }

    // 排序（收藏页默认按收藏时间倒序，但用户可切换为按盆景属性排序）
    switch (filter.sort) {
      case 'newest':
        // 后端默认按收藏时间倒序，list 已是该顺序
        break;
      case 'oldest':
        result.reverse();
        break;
      case 'price_asc':
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price_desc':
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'popular':
        result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
    }

    return result;
  }, [list, filter]);

  // 批量收藏状态：收藏页所有项均为 favorited=true，无需查询
  // 但为保持 BonsaiCard 的 onFavoriteToggle 回调一致，构造一个全 true 的 map
  const favoriteMap = useMemo(() => {
    const m: Record<number, boolean> = {};
    list.forEach((b) => {
      m[b.id] = true;
    });
    return m;
  }, [list]);

  const handleFavoriteToggle = useCallback(
    (bonsaiId: number, favorited: boolean) => {
      // favorited=true 表示当前已收藏，点击则取消收藏
      toggleFav.mutate({ bonsaiId, favorited });
    },
    [toggleFav],
  );

  const handleReset = useCallback(() => {
    setFilter(DEFAULT_FAVORITES_FILTER);
  }, []);

  // 是否有任意筛选条件生效
  const hasActiveFilter = useMemo(() => {
    return (
      filter.search !== '' ||
      filter.categoryId !== '' ||
      filter.price !== '' ||
      filter.origin !== '' ||
      filter.year !== '' ||
      filter.sort !== DEFAULT_FAVORITES_FILTER.sort
    );
  }, [filter]);

  return (
    <div className="pt-28">
      <div className="container-luxury py-12 text-center">
        <span className="section-eyebrow justify-center">我的珍藏</span>
        <h1 className="font-serif text-4xl text-primary md:text-5xl">我的收藏</h1>
        <p className="mt-3 text-sm text-text-light">
          {list.length > 0
            ? `已收藏 ${list.length} 件盆景${hasActiveFilter ? ` · 筛选出 ${filteredList.length} 件` : ''}`
            : '您还没有收藏任何盆景'}
        </p>
      </div>

      <div className="container-luxury pb-28">
        {isLoading ? (
          <BonsaiGridSkeleton count={4} />
        ) : list.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Heart className="mb-4 h-12 w-12 text-text-muted/30" strokeWidth={1} />
            <p className="font-serif text-2xl text-primary">收藏夹空空如也</p>
            <p className="mt-2 text-sm text-text-muted">
              浏览盆景，点击收藏您心仪的藏品
            </p>
            <Link
              href="/bonsais"
              className="mt-8 inline-flex items-center gap-2 border border-accent px-8 py-3.5 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
            >
              去逛逛 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
            {/* 左侧：筛选栏 */}
            <FavoritesFilterPanel
              categories={categories || []}
              value={filter}
              onChange={setFilter}
              onReset={handleReset}
              open={mobileFilterOpen}
              onClose={() => setMobileFilterOpen(false)}
              resultCount={filteredList.length}
            />

            {/* 右侧：网格 */}
            <div>
              {/* 移动端筛选按钮 + 已选条件概览 */}
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-2 border border-text-muted/30 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-text-light transition-colors hover:border-accent hover:text-accent active:scale-95"
                  aria-label="打开筛选"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                  筛选
                  {hasActiveFilter && (
                    <span
                      className="ml-1 inline-flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] text-primary-dark"
                      aria-label="已启用筛选"
                    >
                      •
                    </span>
                  )}
                </button>
                <span className="text-xs text-text-muted">
                  {filteredList.length} 件
                </span>
              </div>

              {/* 当前激活的筛选条件 chips（桌面 + 移动） */}
              {hasActiveFilter && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  {filter.search && (
                    <FilterChip
                      label={`搜索：${filter.search}`}
                      onClear={() => setFilter((f) => ({ ...f, search: '' }))}
                    />
                  )}
                  {filter.categoryId && (
                    <FilterChip
                      label={`分类：${categories?.find((c) => String(c.id) === filter.categoryId)?.name || filter.categoryId}`}
                      onClear={() => setFilter((f) => ({ ...f, categoryId: '' }))}
                    />
                  )}
                  {filter.price && (
                    <FilterChip
                      label={`价格：${filter.price.replace('-', ' - ')}`}
                      onClear={() => setFilter((f) => ({ ...f, price: '' }))}
                    />
                  )}
                  {filter.origin && (
                    <FilterChip
                      label={`产地：${filter.origin}`}
                      onClear={() => setFilter((f) => ({ ...f, origin: '' }))}
                    />
                  )}
                  {filter.year && (
                    <FilterChip
                      label={`年份：${filter.year}`}
                      onClear={() => setFilter((f) => ({ ...f, year: '' }))}
                    />
                  )}
                  {filter.sort !== DEFAULT_FAVORITES_FILTER.sort && (
                    <FilterChip
                      label={`排序：${filter.sort}`}
                      onClear={() =>
                        setFilter((f) => ({ ...f, sort: DEFAULT_FAVORITES_FILTER.sort }))
                      }
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-text-muted underline hover:text-accent hover:no-underline"
                  >
                    清除全部
                  </button>
                </div>
              )}

              {filteredList.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
                  {filteredList.map((bonsai, i) => (
                    <BonsaiCard
                      key={bonsai.id}
                      bonsai={bonsai}
                      index={i}
                      favorited={favoriteMap[bonsai.id] ?? true}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
                  <X className="mb-3 h-8 w-8 text-text-muted/40" strokeWidth={1.5} />
                  <p className="font-serif text-xl text-primary">没有符合条件的藏品</p>
                  <p className="mt-2 text-sm text-text-muted">
                    尝试调整筛选条件或重置筛选
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-6 border border-accent px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-primary"
                  >
                    重置筛选
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 筛选条件 chip
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-text-muted/20 bg-surface px-3 py-1 text-xs text-text-light">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`移除筛选 ${label}`}
        className="text-text-muted transition-colors hover:text-accent"
      >
        <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      </button>
    </span>
  );
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  );
}
