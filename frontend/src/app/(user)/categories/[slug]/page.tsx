// 分类详情页：展示该分类下的盆景列表
// 东方雅致设计系统：section-ink hero + eyebrow-with-line + display-section + BonsaiCard 网格

'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { FullPageLoading } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
import type { Bonsai, Category, PaginatedResponse } from '@/lib/types';

export default function CategoryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // 获取分类信息
  // isError 用于区分"请求失败"与"分类不存在"，避免 404 误判
  const {
    data: category,
    isLoading,
    isError,
    refetch,
  } = useQuery<Category>({
    queryKey: ['category', params.slug],
    queryFn: async () => {
      const res = await api.get<{ data: Category }>(
        `/categories/${encodeURIComponent(params.slug)}`
      );
      return res.data;
    },
    retry: 1,
  });

  // 单独获取该分类下的盆景（使用 categoryId 数值参数，避免 slug 字符串不匹配）
  const {
    data: bonsais,
    isError: isBonsaisError,
    refetch: refetchBonsais,
  } = useQuery<Bonsai[]>({
    queryKey: ['category-bonsais', params.slug],
    queryFn: async () => {
      if (!category) return [];
      // 使用 categoryId（数字）查询，后端 expect categoryId 为数字
      const res = await api.get<{ data: PaginatedResponse<Bonsai> }>(
        `/bonsais?categoryId=${category.id}&limit=100`
      );
      // PaginatedResponse 结构：{ list, total, page, pageSize, totalPages }
      return res.data.list;
    },
    enabled: !!category,
    retry: 1,
  });

  // 数据源明确：仅使用 bonsais 查询结果，避免类型 hack
  const list = bonsais ?? [];
  const total = list.length;

  // 批量查询该分类下盆景的收藏状态，避免每个卡片单独查询造成 N+1
  // 注意：hooks 必须在条件 return 之前调用，category 未加载时传入空数组
  const bonsaiIds = useMemo(() => list.map((b) => b.id), [list]);
  const { data: favoriteMap } = useFavoriteMap(bonsaiIds);
  const toggleFav = useToggleFavorite();
  const handleFavoriteToggle = useCallback(
    (bonsaiId: number, favorited: boolean) => {
      toggleFav.mutate({ bonsaiId, favorited });
    },
    [toggleFav]
  );

  if (isLoading) return <FullPageLoading />;

  // 错误状态：网络/服务端故障，与"分类不存在"区分
  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-[72px] text-center">
        <AlertCircle
          className="mb-4 h-10 w-10 text-gold-deep"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="display-card text-ink">无法加载分类信息</p>
        <p className="body-caption mt-2">
          网络异常或服务暂不可用，请稍后重试
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-outline-gold mt-8"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          重新加载
        </button>
      </div>
    );
  }

  // 分类确实不存在
  if (!category) {
    notFound();
  }

  return (
    <div className="pt-[72px]" aria-label={category.name}>
      {/* 顶部 hero：深色 section-ink + eyebrow + display-section + body-large */}
      <section className="section-ink texture-ink">
        <div className="container-penjing py-16 text-center md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow-with-line justify-center">
              <span className="eyebrow-label">分类</span>
            </span>
            <h1 className="display-section text-paper">{category.name}</h1>
            {category.description && (
              <p className="body-large mx-auto mt-5 max-w-[560px] text-paper/70">
                {category.description}
              </p>
            )}
            <span className="mt-7 mx-auto block h-px w-16 bg-gold" aria-hidden="true" />
            <div className="mt-7 flex items-baseline justify-center gap-2">
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-paper/50">
                在册
              </span>
              <span className="font-serif text-[15px] text-paper">
                {total} 件
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 主体：面包屑 + 盆景网格 */}
      <section className="container-penjing py-14 md:py-20" aria-label="分类藏品">
        {/* 面包屑 */}
        <nav
          className="mb-10 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-muted md:mb-12"
          aria-label="面包屑导航"
        >
          <Link href="/" className="transition-colors hover:text-gold-deep">
            首页
          </Link>
          <span aria-hidden="true" className="text-ink-text-faint">
            /
          </span>
          <Link href="/categories" className="transition-colors hover:text-gold-deep">
            分类
          </Link>
          <span aria-hidden="true" className="text-ink-text-faint">
            /
          </span>
          <span className="text-ink-text">{category.name}</span>
        </nav>

        {isBonsaisError ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <AlertCircle
              className="mb-3 h-8 w-8 text-gold-deep"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="display-card text-ink">盆景列表加载失败</p>
            <button
              type="button"
              onClick={() => refetchBonsais()}
              className="btn-outline-gold mt-6"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              重新加载
            </button>
          </div>
        ) : list.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-10"
          >
            {list.map((bonsai, i) => (
              <BonsaiCard
                key={bonsai.id}
                bonsai={bonsai}
                index={i}
                favorited={favoriteMap?.[bonsai.id] ?? false}
                onFavoriteToggle={handleFavoriteToggle}
                priority={i < 8}
                loading={i < 8 ? 'eager' : 'lazy'}
              />
            ))}
          </motion.div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="display-card text-ink">暂无盆景</p>
            <p className="body-caption mt-3">该分类下还没有盆景藏品</p>
            <Link
              href="/bonsais"
              className="btn-outline-gold mt-8"
            >
              浏览全部盆景
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
