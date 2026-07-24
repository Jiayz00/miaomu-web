// 分类详情页：展示该分类下的盆景列表

'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-accent" strokeWidth={1.5} />
        <p className="font-serif text-2xl text-primary">无法加载分类信息</p>
        <p className="mt-2 text-sm text-text-muted">
          网络异常或服务暂不可用，请稍后重试
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-8 inline-flex items-center gap-2 border border-accent px-6 py-3 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-primary active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
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
    <div className="pt-28">
      {/* 分类头部 */}
      <div className="border-b border-text-muted/10 bg-primary-dark text-background">
        <div className="container-luxury py-12 text-center md:py-16">
          <span className="mb-4 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-accent">
            <span className="h-px w-10 bg-accent" />
            分类
          </span>
          <h1 className="font-serif text-4xl text-background md:text-5xl lg:text-6xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-background/60">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="container-luxury py-12 md:py-16">
        {/* 面包屑 */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-text-muted md:mb-10" aria-label="面包屑导航">
          <Link href="/" className="transition-colors hover:text-accent">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href="/categories" className="transition-colors hover:text-accent">分类</Link>
          <span aria-hidden="true">/</span>
          <span className="text-text-light">{category.name}</span>
        </nav>

        {isBonsaisError ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-accent" strokeWidth={1.5} />
            <p className="font-serif text-lg text-primary">盆景列表加载失败</p>
            <button
              type="button"
              onClick={() => refetchBonsais()}
              className="mt-6 inline-flex items-center gap-2 border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-primary active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              重新加载
            </button>
          </div>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
            {list.map((bonsai, i) => (
              <BonsaiCard
                key={bonsai.id}
                bonsai={bonsai}
                index={i}
                favorited={favoriteMap?.[bonsai.id] ?? false}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="font-serif text-2xl text-primary">暂无盆景</p>
            <p className="mt-2 text-sm text-text-muted">该分类下还没有盆景藏品</p>
            <Link
              href="/bonsais"
              className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent transition-all hover:gap-3"
            >
              浏览全部盆景 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
