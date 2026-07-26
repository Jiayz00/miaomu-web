// 首页区块：分类导航
// 东方雅致·墨绿+金色设计系统

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TreePine, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';
import { Skeleton } from '@/components/Loading';
import type { Category, HomeSection } from '@/lib/types';

// 分类无封面时的渐变兜底（使用 penjing 色阶）
const CATEGORY_FALLBACK_GRADIENTS = [
  'from-ink-deep to-ink',
  'from-ink to-ink-mid',
  'from-gold/30 to-gold/5',
  'from-ink-soft/60 to-ink-soft/20',
];

interface CategoriesSectionProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function CategoriesSection({ section }: CategoriesSectionProps) {
  const limit = (section.config.limit as number) || 4;
  const eyebrow = (section.config.eyebrow as string) || '分类导览';
  const showDescription = section.config.showDescription !== false;
  const title = section.title || '探索品类';

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const displayCategories = (categories || []).slice(0, limit);

  return (
    <section
      aria-label={title}
      className="section-aged texture-paper py-20 md:py-28"
    >
      <div className="container-penjing">
        <div className="mb-12 text-center md:mb-16">
          <div className="flex justify-center">
            <span className="eyebrow-with-line">{eyebrow}</span>
          </div>
          <h2 className="display-section text-ink-text">{title}</h2>
        </div>

        {categories ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {displayCategories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE_SOFT }}
              >
                <Link
                  href={`/categories/${cat.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden bg-ink-deep shadow-penjing-static transition-shadow duration-500 hover:shadow-penjing-hover"
                  aria-label={`查看分类：${cat.name}`}
                >
                  {cat.coverImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-penjing-soft group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${resolveImageUrl(cat.coverImage)})`,
                      }}
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_FALLBACK_GRADIENTS[i % CATEGORY_FALLBACK_GRADIENTS.length]}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-deepest/90 via-ink-deep/30 to-transparent transition-all duration-500 group-hover:from-ink-deepest/95" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <TreePine
                      className="mb-3 h-6 w-6 text-gold-bright"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="catalog-number mb-2 block text-gold-muted">
                      №.{String(i + 1).padStart(3, '0')}
                    </span>
                    <h3 className="display-card text-paper">{cat.name}</h3>
                    {showDescription && cat.description && (
                      <p className="body-caption mt-2 line-clamp-2 text-paper/60">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gold-bright opacity-0 transition-all duration-500 group-hover:opacity-100">
                      查看更多 <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
