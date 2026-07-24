// 分类总览页
//
// 渲染逻辑：
// - 从后端读取 CategoriesLayoutConfig，按其配置渲染
// - 排序方式：sort（默认）按 cat.sort；name 按 name 字典序；createdAt 按 createdAt 倒序
// - 排版方式：grid 等高网格 / masonry 瀑布流 / list 单列大图
// - 失败回退到 DEFAULT_CATEGORIES_LAYOUT

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TreePine, AlertCircle, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { resolveImageUrl, cn } from '@/lib/utils';
import { Skeleton } from '@/components/Loading';
import {
  DEFAULT_CATEGORIES_LAYOUT,
  aspectToCss,
  columnsToClass,
} from '@/lib/default-categories-layout';
import type { Category, CategoriesLayoutConfig } from '@/lib/types';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1597055181300-e3633a917e3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1603991832113-9a4d7a8d4c3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
];

export default function CategoriesPage() {
  // 并行拉取分类列表与布局配置
  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: layoutConfig } = useQuery<CategoriesLayoutConfig>({
    queryKey: ['categories-layout'],
    queryFn: async () => {
      try {
        // 后端 TransformInterceptor 包装为 { success, data, message }
        const res = await api.get<{ data: CategoriesLayoutConfig }>(
          '/settings/categories-layout',
          { skipAuth: true },
        );
        return res.data ?? DEFAULT_CATEGORIES_LAYOUT;
      } catch {
        return DEFAULT_CATEGORIES_LAYOUT;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const config = layoutConfig ?? DEFAULT_CATEGORIES_LAYOUT;

  // 按配置排序
  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    const arr = [...categories];
    switch (config.sortBy) {
      case 'sort':
        arr.sort((a, b) => a.sort - b.sort);
        break;
      case 'name':
        arr.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        break;
      case 'createdAt':
        // createdAt 在公开接口可能不返回，按 id 倒序近似
        arr.sort((a, b) => b.id - a.id);
        break;
    }
    return arr;
  }, [categories, config.sortBy]);

  // aspect ratio CSS
  const aspectCss = aspectToCss(config.aspect);
  // 列类
  const gridClass = columnsToClass(config.columns);

  // 渲染单个分类卡片（grid / masonry 共用）
  const renderCard = (cat: Category, i: number, fallbackIdx: number) => {
    const cover = cat.coverImage || FALLBACK_IMAGES[fallbackIdx % FALLBACK_IMAGES.length];
    return (
      <motion.div
        key={cat.id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, delay: (i % config.columns) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          href={`/categories/${cat.slug}`}
          className="group relative block overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_-20px_rgba(26,58,46,0.25)]"
          aria-label={`查看分类：${cat.name}`}
        >
          <div
            className="relative w-full overflow-hidden bg-primary-dark/5"
            style={{ aspectRatio: aspectCss }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              style={{ backgroundImage: `url(${resolveImageUrl(cover)})` }}
            />
            {config.showOverlay && (
              <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/20 to-transparent" />
            )}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <TreePine
                className="mb-3 h-6 w-6 text-accent"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h3 className="font-serif text-2xl text-background md:text-3xl">
                {cat.name}
              </h3>
              {config.showDescription && cat.description && (
                <p className="mt-2 line-clamp-2 text-sm text-background/60">
                  {cat.description}
                </p>
              )}
              {config.showArrow && (
                <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
                  探索 <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="pt-28">
      <div className="container-luxury py-8 text-center md:py-12">
        {config.eyebrow && (
          <span className="section-eyebrow justify-center">{config.eyebrow}</span>
        )}
        <h1 className="font-serif text-4xl text-primary md:text-5xl">
          {config.title || '分类一览'}
        </h1>
        {config.subtitle && (
          <p className="mx-auto mt-3 max-w-lg text-sm text-text-light">
            {config.subtitle}
          </p>
        )}
      </div>

      <div className="container-luxury pb-20 md:pb-28">
        {isLoading ? (
          <div
            className={cn(
              'grid grid-cols-1 gap-5 lg:gap-6',
              gridClass,
            )}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full"
                style={{ aspectRatio: aspectCss }}
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <AlertCircle className="mb-4 h-10 w-10 text-accent" strokeWidth={1.5} />
            <p className="font-serif text-2xl text-primary">无法加载分类</p>
            <p className="mt-2 text-sm text-text-muted">
              {error instanceof ApiError ? error.message : '网络异常或服务暂不可用，请稍后重试'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-8 inline-flex items-center gap-2 border border-accent px-6 py-3 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-primary active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              重新加载
            </button>
          </div>
        ) : sortedCategories.length > 0 ? (
          config.layout === 'list' ? (
            // 列表模式：单列大图
            <div className="mx-auto max-w-4xl space-y-8">
              {sortedCategories.map((cat, i) =>
                renderCard(cat, i, i),
              )}
            </div>
          ) : config.layout === 'masonry' ? (
            // 瀑布流：CSS columns 实现（响应不同图片高度）
            // 使用 <img> 元素保持图片原始宽高比，让卡片高度自然变化
            <div
              className="gap-5 lg:gap-6 [column-fill:_balance]"
              style={{
                columnCount: config.columns,
              }}
            >
              {sortedCategories.map((cat, i) => {
                const cover = cat.coverImage || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
                return (
                  <div key={cat.id} className="mb-5 break-inside-avoid lg:mb-6">
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="group relative block overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_-20px_rgba(26,58,46,0.25)]"
                      aria-label={`查看分类：${cat.name}`}
                    >
                      <div className="relative w-full overflow-hidden bg-primary-dark/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveImageUrl(cover)}
                          alt={cat.name}
                          className="w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                          loading="lazy"
                        />
                        {config.showOverlay && (
                          <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/20 to-transparent" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                          <TreePine
                            className="mb-3 h-6 w-6 text-accent"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                          <h3 className="font-serif text-2xl text-background md:text-3xl">
                            {cat.name}
                          </h3>
                          {config.showDescription && cat.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-background/60">
                              {cat.description}
                            </p>
                          )}
                          {config.showArrow && (
                            <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
                              探索 <ArrowRight className="h-3 w-3" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            // 网格模式（默认）
            <div className={cn('grid grid-cols-1 gap-5 lg:gap-6', gridClass)}>
              {sortedCategories.map((cat, i) =>
                renderCard(cat, i, i),
              )}
            </div>
          )
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <TreePine className="mb-3 h-10 w-10 text-text-muted/40" strokeWidth={1} />
            <p className="font-serif text-2xl text-primary">暂无分类</p>
            <p className="mt-2 text-sm text-text-muted">分类尚未创建，敬请期待</p>
          </div>
        )}
      </div>
    </div>
  );
}
