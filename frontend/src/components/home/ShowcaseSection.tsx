// 首页区块：指定盆景展示（showcase）
// 根据 config.bonsaiIds 拉取指定盆景并展示
// 东方雅致·墨绿+金色设计系统
// 后端无数据时降级为"匠人手记"图文区块（image_4 + 文案），对齐设计稿

'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
import { DEFAULT_IMAGES } from '@/lib/default-images';
import type { Bonsai, HomeSection } from '@/lib/types';

interface ShowcaseSectionProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

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

  // 后端无数据时降级为匠人手记图文区块（对齐设计稿首页第 4 个 section）
  const showArtisanBlock = !isLoading && list.length === 0;

  return (
    <section
      aria-label={title}
      className="section-ink texture-ink py-20 md:py-32"
    >
      <div className="container-penjing">
        {showArtisanBlock ? (
          // 匠人手记图文区块（设计稿 image_4 + 文案）
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, ease: EASE_SOFT }}
              className="relative aspect-[4/5] overflow-hidden bg-ink-deepest md:aspect-[3/4]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DEFAULT_IMAGES.artisanPruning}
                alt="匠人执剪修整盆景苔面的近景特写"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-4 left-4 bg-ink-deepest/85 px-3 py-1.5 font-sans text-[11px] tracking-[0.15em] text-gold-bright backdrop-blur-sm">
                匠人手记 · 丙午夏
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE_SOFT }}
              className="flex flex-col"
            >
              <span className="eyebrow-with-line text-gold-bright">匠人手记</span>
              <h2 className="display-section mt-4 text-paper">
                一剪一修<br />皆是修行
              </h2>
              <p className="body-large mt-6 text-paper/80">
                一柄旧剪，三十年。匠人每日清晨入苑，先观其势，再下其手——何处当疏，何处当留，皆依树性而论，不违其本。
              </p>
              <p className="body-base mt-4 text-paper/65">
                修剪于我们并非技艺的炫耀，而是与草木的长期对话。每一次落剪都是一次舍弃，每一次留白都是一次成全。数十年如一日的克制，方有枝片层叠之态、苍干虬枝之骨。
              </p>
              <div className="mt-10 flex items-center gap-5">
                <span
                  className="seal-cinnabar flex h-14 w-14 items-center justify-center text-center text-[10px] leading-[1.3]"
                  aria-hidden="true"
                >
                  匠人<br />朱印
                </span>
                <div className="font-sans text-xs tracking-[0.15em] text-paper/60">
                  馆藏主理
                  <span className="mt-1 block font-serif text-base text-gold-bright">
                    陆衡山
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="mb-16 flex flex-col items-center text-center">
              <span className="eyebrow-with-line text-gold-bright">{eyebrow}</span>
              <h2 className="display-section text-paper">{title}</h2>
              {subtitle && (
                <p className="body-large mt-4 max-w-2xl text-paper/70">{subtitle}</p>
              )}
              {/* 装饰印章 */}
              <span
                className="seal-gold mt-8 hidden h-12 w-12 text-[10px] md:flex"
                aria-hidden="true"
              >
                臻品
              </span>
            </div>

            {isLoading ? (
              <BonsaiGridSkeleton count={Math.min(bonsaiIds.length, 4)} />
            ) : (
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
            )}
          </>
        )}
      </div>
    </section>
  );
}
