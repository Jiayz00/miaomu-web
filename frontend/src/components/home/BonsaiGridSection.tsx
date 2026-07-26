// 首页区块：盆景网格（可配置数量与筛选）
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
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { getDefaultFeaturedBonsais } from '@/lib/default-bonsais';
import type { Bonsai, HomeSection } from '@/lib/types';

interface BonsaiGridSectionProps {
  section: HomeSection;
}

export function BonsaiGridSection({ section }: BonsaiGridSectionProps) {
  const limit = (section.config.limit as number) || DEFAULT_PAGE_SIZE;
  const eyebrow = (section.config.eyebrow as string) || '盆景收藏';
  const ctaText = (section.config.ctaText as string) || '浏览全部';
  const ctaLink = (section.config.ctaLink as string) || '/bonsais';
  const title = section.title || '盆景收藏';
  const subtitle = section.subtitle || '';

  const { data, isLoading, isError } = useQuery<{ list: Bonsai[] }>({
    queryKey: ['bonsais-grid-home', limit],
    queryFn: async () => {
      const res = await api.get<{ data: { list: Bonsai[] } }>(
        `/bonsais?limit=${limit}&sort=newest`,
      );
      return res.data;
    },
    // 后端不可达时仅重试 1 次，避免长时间卡在骨架屏
    retry: 1,
  });

  // 后端无数据 / 加载失败 / 后端未启动 → 使用设计稿默认盆景，保证首页视觉完整
  const rawList = (!isError && data?.list && data.list.length > 0
    ? data.list
    : getDefaultFeaturedBonsais(limit)
  );
  const list = rawList.slice(0, limit);

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
        <div className="mb-16 text-center">
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

        {/* 骨架屏仅在"加载中且无任何数据可展示"时显示；
            后端不可达时立即 fallback 到默认盆景，不阻塞首屏视觉 */}
        {isLoading && list.length === 0 ? (
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
