// 首页区块：精选盆景

'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
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

  const { data: featured, isLoading } = useQuery<Bonsai[]>({
    queryKey: ['bonsais-featured', limit],
    queryFn: async () => {
      const res = await api.get<{ data: Bonsai[] }>(`/bonsais/featured?limit=${limit}`);
      return res.data;
    },
  });

  const displayFeatured = (featured || []).slice(0, limit);

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
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-serif text-2xl text-primary">暂无精选盆景</p>
            <p className="mt-2 text-sm text-text-muted">
              浏览全部盆景，发现您心仪的藏品
            </p>
            <Link
              href={ctaLink}
              className="mt-8 inline-flex items-center gap-2 border border-accent px-8 py-3.5 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
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
