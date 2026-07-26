// 首页区块：产品列表
//
// 配置：
// - source: 'category' | 'featured' | 'latest' | 'hot'
// - categoryId: 分类 ID（source === 'category' 时生效）
// - limit: 展示数量
// - eyebrow / ctaText / ctaLink
//
// 东方雅致·墨绿+金色设计系统

'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
import type { Bonsai, HomeSection, ProductListConfig } from '@/lib/types';

interface ProductListBlockProps {
  section: HomeSection;
}

export function ProductListBlock({ section }: ProductListBlockProps) {
  const cfg = section.config as unknown as ProductListConfig;
  const source = cfg.source || 'latest';
  const limit = cfg.limit || 8;
  const eyebrow = cfg.eyebrow || '盆景收藏';
  const ctaText = cfg.ctaText || '浏览全部';
  const ctaLink = cfg.ctaLink || '/bonsais';
  const title = section.title || '盆景收藏';
  const subtitle = section.subtitle || '';

  const { data, isLoading } = useQuery<{ list: Bonsai[] } | Bonsai[]>({
    queryKey: ['home-product-list', source, cfg.categoryId, limit],
    queryFn: async () => {
      if (source === 'featured') {
        const res = await api.get<{ data: Bonsai[] }>(
          `/bonsais/featured?limit=${limit}`,
        );
        return res.data;
      }

      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (source === 'category' && cfg.categoryId) {
        params.set('categoryId', String(cfg.categoryId));
        params.set('sortBy', 'createdAt');
        params.set('order', 'desc');
      } else if (source === 'hot') {
        params.set('sortBy', 'viewCount');
        params.set('order', 'desc');
      } else {
        // latest
        params.set('sortBy', 'createdAt');
        params.set('order', 'desc');
      }
      const res = await api.get<{ data: { list: Bonsai[] } }>(
        `/bonsais?${params.toString()}`,
      );
      return res.data;
    },
  });

  const list = useMemo(() => {
    if (Array.isArray(data)) return data.slice(0, limit);
    return (data?.list || []).slice(0, limit);
  }, [data, limit]);

  const bonsaiIds = useMemo(() => list.map((b) => b.id), [list]);
  const { data: favoriteMap } = useFavoriteMap(bonsaiIds);
  const toggleFav = useToggleFavorite();
  const handleFavoriteToggle = useCallback(
    (bonsaiId: number, favorited: boolean) => {
      toggleFav.mutate({ bonsaiId, favorited });
    },
    [toggleFav],
  );

  return (
    <section aria-label={title} className="section-paper py-20 md:py-28">
      <div className="container-penjing">
        <div className="mb-12 text-center md:mb-16">
          <div className="flex justify-center">
            <span className="eyebrow-with-line">{eyebrow}</span>
          </div>
          <h2 className="display-section text-ink-text">{title}</h2>
          {subtitle && (
            <p className="body-base mx-auto mt-4 max-w-xl text-ink-text-secondary">
              {subtitle}
            </p>
          )}
        </div>

        {isLoading ? (
          <BonsaiGridSkeleton count={Math.min(limit, 8)} />
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((bonsai, i) => (
              <BonsaiCard
                key={bonsai.id}
                bonsai={bonsai}
                index={i}
                favorited={favoriteMap?.[bonsai.id] ?? false}
                onFavoriteToggle={handleFavoriteToggle}
                priority={i < 4}
                loading={i < 4 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="display-card text-ink-text">暂无盆景</p>
          </div>
        )}

        {list.length > 0 && (
          <div className="mt-16 text-center">
            <Link
              href={ctaLink}
              className="inline-flex items-center gap-2 body-base text-gold-deep transition-all duration-300 ease-penjing-soft hover:gap-3 hover:text-gold"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
