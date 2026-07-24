// 盆景卡片组件

'use client';

import { memo } from 'react';
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
  /**
   * 列表页场景：父组件通过 useFavoriteMap 批量查询后传入收藏状态
   * 避免每个卡片单独发请求导致 N+1
   * 未传入时回退到 useFavoriteCheck（适用于详情页等单卡片场景）
   */
  favorited?: boolean;
  /**
   * 列表页场景：父组件传入收藏切换回调
   * 未传入时使用内部 useToggleFavorite
   */
  onFavoriteToggle?: (bonsaiId: number, favorited: boolean) => void;
}

function BonsaiCardImpl({
  bonsai,
  index = 0,
  favorited: favoritedProp,
  onFavoriteToggle,
}: BonsaiCardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // 仅在未通过 props 传入收藏状态时启用单卡片查询
  const { data: favoritedCheck } = useFavoriteCheck(
    favoritedProp === undefined ? bonsai.id : undefined,
  );
  const toggleFav = useToggleFavorite();

  const mainImage = getMainImage(bonsai.images);
  // props 优先（列表页批量查询），否则回退到单卡片查询
  const isFavorited = favoritedProp !== undefined ? favoritedProp : !!favoritedCheck;
  // 防御 null/undefined stock
  const outOfStock = (bonsai.stock ?? 0) <= 0;

  // URL 编码 slug，避免中文/特殊字符在部分浏览器或反向代理中未被正确编码
  const encodedSlug = encodeURIComponent(bonsai.slug);
  const detailPath = `/bonsais/${encodedSlug}`;

  // 未登录用户点击收藏：跳转登录页并带回跳地址
  // 已登录用户：正常切换收藏状态
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      // 卡片场景下不便弹 toast，直接跳登录页带回跳
      window.location.href = `/login?redirect=${encodeURIComponent(detailPath)}`;
      return;
    }
    if (onFavoriteToggle) {
      onFavoriteToggle(bonsai.id, isFavorited);
    } else {
      toggleFav.mutate({ bonsaiId: bonsai.id, favorited: isFavorited });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link
        href={detailPath}
        className="block transition-all duration-500 hover:shadow-[0_20px_50px_-20px_rgba(26,58,46,0.25)]"
        aria-label={`查看盆景：${bonsai.name}`}
      >
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
                <span className="font-serif text-4xl text-primary/30" aria-hidden="true">盆</span>
              </div>
            )}
          </div>

          {/* 渐变遮罩，hover 时浮现，增加层次感 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-dark/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {/* 售罄标识（WCAG 1.4.1：不仅靠颜色，配文字；role="status" 通知屏读器） */}
          {outOfStock && (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center bg-primary-dark/40"
            >
              <span className="border border-background/60 px-6 py-2 text-xs uppercase tracking-[0.3em] text-background">
                已售罄
              </span>
            </div>
          )}

          {/* 精选标识 */}
          {bonsai.isFeatured && (
            <div className="absolute left-4 top-4 bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-dark shadow-[0_4px_12px_-4px_rgba(201,169,97,0.5)]">
              精选
            </div>
          )}

          {/* 收藏按钮（WCAG 2.5.5：触摸目标 ≥ 44x44，使用 h-11 w-11） */}
          <button
            type="button"
            onClick={handleFavorite}
            disabled={toggleFav.isPending}
            aria-label={isFavorited ? `取消收藏 ${bonsai.name}` : `收藏 ${bonsai.name}`}
            aria-pressed={isFavorited}
            className={cn(
              'absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 active:scale-90',
              'cursor-pointer hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed',
              isFavorited
                ? 'bg-accent text-primary-dark shadow-[0_4px_12px_-4px_rgba(201,169,97,0.6)]'
                : 'bg-background/70 text-primary hover:bg-background'
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorited ? 'currentColor' : 'none'}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* 信息区 */}
        <div className="pt-5">
          <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
            <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{bonsai.origin}</span>
            <span className="flex-shrink-0 text-text-muted/40" aria-hidden="true">·</span>
            <span className="flex-shrink-0">{bonsai.year}</span>
          </div>
          <h3 className="font-serif text-lg font-medium text-primary transition-colors duration-300 group-hover:text-accent sm:text-xl">
            {bonsai.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-text-muted" aria-hidden="true">¥</span>
            <span className="font-serif text-lg text-accent">
              {formatPrice(bonsai.price)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * 使用 React.memo 包裹，避免父组件状态变化（如搜索输入）
 * 导致所有卡片重渲染。卡片仅依赖 bonsai / favorited / index 等 props。
 */
export const BonsaiCard = memo(BonsaiCardImpl);
