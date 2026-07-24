// 首页区块：指定盆景展示（showcase）
// 根据 config.bonsaiIds 拉取指定盆景并展示

'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
import type { Bonsai, HomeSection } from '@/lib/types';

interface ShowcaseSectionProps {
  section: HomeSection;
}

export function ShowcaseSection({ section }: ShowcaseSectionProps) {
  const eyebrow = (section.config.eyebrow as string) || '臻品展示';
  const title = section.title || '臻品展示';
  const subtitle = section.subtitle || '';
  const rawIds = section.config.bonsaiIds;
  const bonsaiIds = Array.isArray(rawIds)
    ? (rawIds as unknown[]).filter((x): x is number => typeof x === 'number')
    : [];

  // 逐个拉取指定盆景（数量通常较少，并发请求）
  const { data: bonsais, isLoading } = useQuery<Bonsai[]>({
    queryKey: ['bonsais-showcase', bonsaiIds],
    queryFn: async () => {
      if (bonsaiIds.length === 0) return [];
      const results = await Promise.all(
        bonsaiIds.map(async (id) => {
          try {
            const res = await api.get<{ data: Bonsai }>(`/bonsais/${id}`);
            return res.data;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((b): b is Bonsai => b !== null);
    },
    enabled: bonsaiIds.length > 0,
  });

  const list = bonsais || [];
  const ids = useMemo(() => list.map((b) => b.id), [list]);
  const { data: favoriteMap } = useFavoriteMap(ids);
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
          <BonsaiGridSkeleton count={Math.min(bonsaiIds.length, 4)} />
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
            <p className="font-serif text-2xl text-primary">暂无展示盆景</p>
            <p className="mt-2 text-sm text-text-muted">
              请在布局编辑器中配置要展示的盆景 ID
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
