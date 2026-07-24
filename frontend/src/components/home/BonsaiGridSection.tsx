// 首页区块：盆景网格（可配置数量与筛选）

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

  const { data, isLoading } = useQuery<{ list: Bonsai[] }>({
    queryKey: ['bonsais-grid-home', limit],
    queryFn: async () => {
      const res = await api.get<{ data: { list: Bonsai[] } }>(
        `/bonsais?limit=${limit}&sort=newest`,
      );
      return res.data;
    },
  });

  const list = (data?.list || []).slice(0, limit);

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
    <section className="bg-background py-28">
      <div className="container-luxury">
        <div className="mb-16 text-center">
          <span className="section-eyebrow justify-center">{eyebrow}</span>
          <h2 className="font-serif text-4xl text-primary md:text-5xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-light">
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
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-serif text-2xl text-primary">暂无盆景</p>
          </div>
        )}

        <div className="mt-16 text-center">
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-2 text-sm tracking-[0.2em] text-accent transition-all duration-300 hover:gap-3"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
