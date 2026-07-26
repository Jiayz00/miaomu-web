// 首页区块：精选盆景
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
import { getDefaultFeaturedBonsais } from '@/lib/default-bonsais';
import type { Bonsai, HomeSection } from '@/lib/types';

interface FeaturedSectionProps {
  section: HomeSection;
}

export function FeaturedSection({ section }: FeaturedSectionProps) {
  const limit = (section.config.limit as number) || 6;
  const eyebrow = (section.config.eyebrow as string) || '精选典藏';
  const ctaText = (section.config.ctaText as string) || '浏览全部盆景';
  const ctaLink = (section.config.ctaLink as string) || '/bonsais';
  const title = section.title || '匠心之选';
  const subtitle = section.subtitle || '';

  const { data: featured, isLoading, isError } = useQuery<Bonsai[]>({
    queryKey: ['bonsais-featured', limit],
    queryFn: async () => {
      const res = await api.get<{ data: Bonsai[] }>(`/bonsais/featured?limit=${limit}`);
      return res.data;
    },
    // 后端不可达时仅重试 1 次，避免长时间卡在骨架屏
    retry: 1,
  });

  // 后端无数据 / 加载失败 / 后端未启动 → 使用设计稿默认盆景（3 件镇馆之品），保证首页视觉完整
  // 关键：骨架屏仅在"首次加载且无任何缓存数据"时短暂展示，
  //       一旦请求失败（isError）或仍在加载但有默认数据可展示，立即显示默认盆景
  const displayFeatured = (featured && featured.length > 0 && !isError
    ? featured
    : getDefaultFeaturedBonsais(limit)
  ).slice(0, limit);

  const featuredIds = useMemo(
    () => displayFeatured.map((b) => b.id),
    [displayFeatured],
  );
  const { data: favoriteMap } = useFavoriteMap(featuredIds);
  const toggleFav = useToggleFavorite();
  const handleFavoriteToggle = useCallback(
    (bonsaiId: number, favorited: boolean) => {
      toggleFav.mutate({ bonsaiId, favorited });
    },
    [toggleFav],
  );

  return (
    <section
      aria-label={title}
      className="section-paper texture-paper py-20 md:py-32"
    >
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
        {isLoading && displayFeatured.length === 0 ? (
          <BonsaiGridSkeleton count={Math.min(limit, 6)} />
        ) : displayFeatured.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {displayFeatured.map((bonsai, i) => (
              <BonsaiCard
                key={bonsai.id}
                bonsai={bonsai}
                index={i}
                favorited={favoriteMap?.[bonsai.id] ?? false}
                onFavoriteToggle={handleFavoriteToggle}
                priority={i < 3}
                loading={i < 3 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="display-card text-ink-text">暂无精选盆景</p>
            <p className="body-caption mt-2">浏览全部盆景，发现您心仪的藏品</p>
            <Link href={ctaLink} className="btn-outline-gold mt-8">
              {ctaText}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        )}

        {displayFeatured.length > 0 && (
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
