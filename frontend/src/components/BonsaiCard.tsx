// 盆景卡片组件

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoriteCheck, useToggleFavorite } from '@/hooks/use-favorites';
import { cn, formatPrice, getMainImage } from '@/lib/utils';
import type { Bonsai } from '@/lib/types';

interface BonsaiCardProps {
  bonsai: Bonsai;
  index?: number;
}

export function BonsaiCard({ bonsai, index = 0 }: BonsaiCardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: favorited } = useFavoriteCheck(bonsai.id);
  const toggleFav = useToggleFavorite();

  const mainImage = getMainImage(bonsai.images);
  const isFavorited = !!favorited;
  const outOfStock = bonsai.stock <= 0;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    toggleFav.mutate({ bonsaiId: bonsai.id, favorited: isFavorited });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link href={`/bonsais/${bonsai.slug}`} className="block">
        <div className="relative overflow-hidden bg-primary-dark/5">
          {/* 主图 */}
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={bonsai.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-dark/10">
                <span className="font-serif text-4xl text-primary/30">盆</span>
              </div>
            )}
          </div>

          {/* 售罄标识 */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-dark/40">
              <span className="border border-background/60 px-6 py-2 text-xs uppercase tracking-[0.3em] text-background">
                已售罄
              </span>
            </div>
          )}

          {/* 精选标识 */}
          {bonsai.isFeatured && (
            <div className="absolute left-4 top-4 bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-dark">
              精选
            </div>
          )}

          {/* 收藏按钮 */}
          <button
            type="button"
            onClick={handleFavorite}
            disabled={!isAuthenticated}
            aria-label={isFavorited ? '取消收藏' : '加入收藏'}
            className={cn(
              'absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300',
              isAuthenticated ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-60',
              isFavorited
                ? 'bg-accent text-primary-dark'
                : 'bg-background/70 text-primary hover:bg-background'
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorited ? 'currentColor' : 'none'}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* 信息区 */}
        <div className="pt-5">
          <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
            <MapPin className="h-3 w-3" strokeWidth={1.5} />
            <span>{bonsai.origin}</span>
            <span className="text-text-muted/40">·</span>
            <span>{bonsai.year}</span>
          </div>
          <h3 className="font-serif text-xl font-medium text-primary transition-colors duration-300 group-hover:text-accent">
            {bonsai.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-text-muted">¥</span>
            <span className="font-serif text-lg text-accent">
              {formatPrice(bonsai.price)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
