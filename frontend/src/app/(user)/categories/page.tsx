// 分类总览页

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TreePine } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/Loading';
import type { Category } from '@/lib/types';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1597055181300-e3633a917e3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1603991832113-9a4d7a8d4c3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
];

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
  });

  return (
    <div className="pt-28">
      <div className="container-luxury py-12 text-center">
        <span className="section-eyebrow justify-center">分类导览</span>
        <h1 className="font-serif text-4xl text-primary md:text-5xl">分类一览</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-text-light">
          按品类探索盆景，寻觅心仪之选
        </p>
      </div>

      <div className="container-luxury pb-28">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
              >
                <Link
                  href={`/categories/${cat.slug}`}
                  className="group relative block aspect-[4/5] overflow-hidden"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${
                        cat.coverImage || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]
                      })`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <TreePine
                      className="mb-3 h-6 w-6 text-accent"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-serif text-3xl text-background">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-background/60">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
                      探索 <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-sm text-text-muted">
            暂无分类
          </p>
        )}
      </div>
    </div>
  );
}
