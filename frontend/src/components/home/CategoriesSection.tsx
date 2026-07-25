// 首页区块：分类导航

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TreePine, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';
import { Skeleton } from '@/components/Loading';
import type { Category, HomeSection } from '@/lib/types';

// 分类无封面时的渐变兜底（不再使用随机图，避免与真实封面混淆）
const CATEGORY_FALLBACK_GRADIENTS = [
  'from-primary-dark to-primary',
  'from-primary to-primary-light',
  'from-accent/40 to-accent/10',
  'from-text-muted/60 to-text-muted/20',
];

interface CategoriesSectionProps {
  section: HomeSection;
}

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
    <section className="bg-primary-dark py-20 text-background md:py-28">
      <div className="container-luxury">
        <div className="mb-12 text-center md:mb-16">
          <span className="section-eyebrow justify-center">{eyebrow}</span>
          <h2 className="font-serif text-4xl text-background md:text-5xl">{title}</h2>
        </div>

        {categories ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {displayCategories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Link
                  href={`/categories/${cat.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden"
                >
                  {cat.coverImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${resolveImageUrl(cat.coverImage)})`,
                      }}
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_FALLBACK_GRADIENTS[i % CATEGORY_FALLBACK_GRADIENTS.length]}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/30 to-transparent transition-all duration-500 group-hover:from-primary-dark/95" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <TreePine
                      className="mb-3 h-6 w-6 text-accent"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-serif text-2xl text-background">
                      {cat.name}
                    </h3>
                    {showDescription && cat.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-background/60">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent opacity-0 transition-all duration-500 group-hover:opacity-100">
                      查看更多 <ArrowRight className="h-3 w-3" />
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
