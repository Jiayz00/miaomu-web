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
import { motion } from 'framer-motion';
import { ArrowRight, SlidersHorizontal, X } from 'lucide-react';
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
    <div className="pt-[72px]" aria-label="我的收藏">
      {/* 引言带：eyebrow + display-section + body-large 副标题 */}
      <section className="section-paper texture-paper border-b border-[var(--penjing-border-hairline)]">
        <div className="container-penjing py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow-with-line">
              <span className="eyebrow-label">藏品目录</span>
            </span>
            <h1 className="display-section text-ink">心之所藏</h1>
            <p className="body-large mt-5 max-w-[560px] text-ink-text-secondary">
              您所珍爱的盆景皆陈列于此。按类、按龄、按价编目，便于随时翻阅鉴藏。
            </p>
            <span className="mt-7 block h-px w-16 bg-gold" aria-hidden="true" />
            <div className="mt-7 flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-muted">
                  在册
                </span>
                <span className="font-serif text-[15px] text-ink-text">
                  {list.length} 件
                </span>
              </div>
              {hasActiveFilter && (
                <div className="flex items-baseline gap-2">
                  <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-muted">
                    本辑
                  </span>
                  <span className="font-serif text-[15px] text-ink-text">
                    筛选出 {filteredList.length} 件
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 主布局：sticky 左侧 FilterPanel + 右侧盆景网格 */}
      <section
        className="container-penjing py-14 md:py-20"
        aria-label="藏品目录与筛选"
      >
        {isLoading ? (
          <BonsaiGridSkeleton count={4} />
        ) : list.length === 0 ? (
          // 空状态：印章装饰 + 文案 + btn-gold
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <span
              className="seal-cinnabar mb-8 h-16 w-16 text-2xl"
              aria-hidden="true"
            >
              藏
            </span>
            <p className="display-card text-ink">尚未收藏任何藏品</p>
            <p className="body-caption mt-3">
              浏览盆景，点击收藏您心仪的藏品
            </p>
            <Link href="/bonsais" className="btn-gold mt-8">
              去浏览盆景
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="flex gap-12 lg:gap-16">
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
            <div className="min-w-0 flex-1">
              {/* 移动端筛选按钮 + 已选条件概览 */}
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-2 border border-gold px-4 py-2.5 font-sans text-[11px] uppercase tracking-[0.2em] text-gold-deep transition-colors hover:bg-gold hover:text-ink-deepest active:scale-95"
                  aria-label="打开筛选"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  筛选
                  {hasActiveFilter && (
                    <span
                      className="ml-1 inline-flex h-4 min-w-4 items-center justify-center bg-gold px-1 text-[10px] text-ink-deepest"
                      aria-label="已启用筛选"
                    >
                      •
                    </span>
                  )}
                </button>
                <span className="font-sans text-xs text-ink-text-muted">
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
                    className="font-sans text-xs text-ink-text-muted underline transition-colors hover:text-gold-deep hover:no-underline"
                  >
                    清除全部
                  </button>
                </div>
              )}

              {filteredList.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:gap-10">
                  {filteredList.map((bonsai, i) => (
                    <BonsaiCard
                      key={bonsai.id}
                      bonsai={bonsai}
                      index={i}
                      favorited={favoriteMap[bonsai.id] ?? true}
                      onFavoriteToggle={handleFavoriteToggle}
                      priority={i < 6}
                      loading={i < 6 ? 'eager' : 'lazy'}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
                  <X className="mb-3 h-8 w-8 text-ink-text-faint" strokeWidth={1.5} />
                  <p className="display-card text-ink">没有符合条件的藏品</p>
                  <p className="body-caption mt-2">
                    尝试调整筛选条件或重置筛选
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-outline-gold mt-6"
                  >
                    重置筛选
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// 筛选条件 chip
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-[var(--penjing-border-fine)] bg-paper-warm px-3 py-1 font-sans text-xs text-ink-text-secondary">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`移除筛选 ${label}`}
        className="text-ink-text-muted transition-colors hover:text-gold-deep"
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
