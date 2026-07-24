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

// 分类默认封面图（按位置兜底）
const CATEGORY_IMAGES: Record<string, string> = {
  default1:
    'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=800&q=80',
  default2:
    'https://images.unsplash.com/photo-1597055181300-e3633a917e3a?auto=format&fit=crop&w=800&q=80',
  default3:
    'https://images.unsplash.com/photo-1603991832113-9a4d7a8d4c3a?auto=format&fit=crop&w=800&q=80',
  default4:
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80',
};

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
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${resolveImageUrl(
                        cat.coverImage || CATEGORY_IMAGES[`default${i + 1}`]
                      )})`,
                    }}
                  />
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
