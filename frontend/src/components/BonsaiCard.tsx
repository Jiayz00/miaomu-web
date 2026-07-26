// 盆景卡片组件
// 东方雅致风格：4:5 比例 + translateY(-3px) hover + 金色边描边 + 双层阴影
// 设计稿参考：design-assets/pages/盆景收藏.html 的 .collection-card

'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoriteCheck, useToggleFavorite } from '@/hooks/use-favorites';
import { cn, formatPrice, getMainImage } from '@/lib/utils';
import { getBonsaiFallback } from '@/lib/default-images';
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
  /**
   * 首屏/首视口卡片设为 true，取消懒加载并优先请求，提升 LCP
   */
  priority?: boolean;
  /**
   * 图片 loading 策略：首屏用 'eager'，非首屏保持默认 'lazy'
   */
  loading?: 'eager' | 'lazy';
}

// 格式化目录编号：id → "№.001"
function formatCatalogNumber(id: number): string {
  return `№.${String(id).padStart(3, '0')}`;
}

// 格式化树龄（数字 → 中文描述，简化为 "约 X 年"）
function formatTreeAge(age: number | null): string | null {
  if (age == null || age <= 0) return null;
  return `约 ${age} 年`;
}

// 格式化尺寸（高+宽 → "高X / 宽Y 公分"）
function formatDimensions(height: number | null, width: number | null): string | null {
  if (height == null && width == null) return null;
  const parts: string[] = [];
  if (height != null) parts.push(`高 ${height}`);
  if (width != null) parts.push(`寬 ${width}`);
  return parts.join(' / ') + ' 公分';
}

function BonsaiCardImpl({
  bonsai,
  index = 0,
  favorited: favoritedProp,
  onFavoriteToggle,
  priority = false,
  loading = 'lazy',
}: BonsaiCardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: favoritedCheck } = useFavoriteCheck(
    favoritedProp === undefined ? bonsai.id : undefined,
  );
  const toggleFav = useToggleFavorite();

  // 后端无图片时使用设计稿盆景图作为兜底（按 id 轮转，同一盆景始终使用同一张）
  const mainImage = getMainImage(bonsai.images) || getBonsaiFallback(bonsai.id);
  const isFavorited = favoritedProp !== undefined ? favoritedProp : !!favoritedCheck;
  const outOfStock = (bonsai.stock ?? 0) <= 0;

  const encodedSlug = encodeURIComponent(bonsai.slug);
  const detailPath = `/bonsais/${encodedSlug}`;

  // 询价商品：price === '0' 或后端标记为询价
  const isInquire = !bonsai.price || bonsai.price === '0';

  // 规格行（仅展示存在的字段）
  const specItems = [
    bonsai.origin && { key: '产地', value: bonsai.origin },
    formatTreeAge(bonsai.treeAge) && { key: '树龄', value: formatTreeAge(bonsai.treeAge)! },
    formatDimensions(bonsai.height, bonsai.width) && {
      key: '尺寸',
      value: formatDimensions(bonsai.height, bonsai.width)!,
    },
  ].filter(Boolean) as { key: string; value: string }[];

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
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
        className="collection-card flex min-w-0 flex-col bg-paper transition-transform duration-500 hover:-translate-y-[3px]"
        aria-label={`查看盆景：${bonsai.name}`}
      >
        {/* 图片区：4:5 + ink-deepest 底色 + hover scale + 渐变遮罩 */}
        <div className="card-media relative mb-[18px] aspect-[4/5] overflow-hidden bg-ink-deepest">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={bonsai.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={priority}
              loading={loading}
              className="object-cover transition-all duration-[800ms] ease-penjing-soft [filter:saturate(0.92)] group-hover:scale-[1.04] group-hover:[filter:saturate(1)]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-serif text-5xl text-gold/40" aria-hidden="true">盆</span>
            </div>
          )}

          {/* 渐变遮罩（设计稿 .card-media-overlay） */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-60% to-ink-deepest/35"
            aria-hidden="true"
          />

          {/* 目录编号徽章（左上） */}
          <span className="catalog-number absolute left-3.5 top-3.5 bg-paper/92 px-2.5 py-1 backdrop-blur-[4px]">
            {formatCatalogNumber(bonsai.id)}
          </span>

          {/* 售罄遮罩（WCAG 1.4.1：不仅靠颜色，配文字） */}
          {outOfStock && (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center bg-ink-deepest/55"
            >
              <span className="border border-paper/60 px-6 py-2 font-sans text-[11px] uppercase tracking-[0.3em] text-paper">
                已售罄
              </span>
            </div>
          )}

          {/* 精选标识（右上） */}
          {bonsai.isFeatured && (
            <div className="absolute right-3.5 top-3.5 bg-gold px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-ink-deepest shadow-penjing-gold">
              精选
            </div>
          )}

          {/* 收藏按钮（WCAG 2.5.5：触摸目标 ≥ 44x44） */}
          <button
            type="button"
            onClick={handleFavorite}
            disabled={toggleFav.isPending}
            aria-label={isFavorited ? `取消收藏 ${bonsai.name}` : `收藏 ${bonsai.name}`}
            aria-pressed={isFavorited}
            className={cn(
              'absolute right-3.5 top-3.5 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 active:scale-90',
              'cursor-pointer hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
              // 让售罄遮罩 / 精选标识不与收藏按钮重叠：仅在没有精选时显示在右上
              bonsai.isFeatured && 'top-16',
              isFavorited
                ? 'bg-gold text-ink-deepest shadow-penjing-gold-strong'
                : 'bg-paper/70 text-ink hover:bg-paper',
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
        <div className="card-body flex flex-col gap-2">
          {/* 名称（serif display-card） */}
          <h3 className="display-card font-serif text-[clamp(20px,1.6vw,24px)] font-semibold leading-[1.3] text-ink transition-colors duration-300 group-hover:text-ink-deep">
            {bonsai.name}
          </h3>

          {/* 规格行 */}
          {specItems.length > 0 && (
            <div className="card-spec mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5">
              {specItems.map((spec) => (
                <span
                  key={spec.key}
                  className="font-sans text-xs leading-[1.6] tracking-[0.02em] text-ink-text-muted"
                >
                  <span className="mr-1 text-ink-text-faint">{spec.key}</span>
                  {spec.value}
                </span>
              ))}
            </div>
          )}

          {/* 价格 + 鉴赏链接 */}
          <div className="card-footer mt-3.5 flex items-baseline justify-between gap-3 border-t border-[var(--penjing-border-hairline)] pt-3.5">
            {isInquire ? (
              <span className="card-price is-inquire font-sans text-xs uppercase tracking-[0.2em] text-gold-deep">
                询价
              </span>
            ) : (
              <span className="card-price font-serif text-[15px] tracking-[0.02em] text-ink">
                ¥ {formatPrice(bonsai.price)}
              </span>
            )}
            <span className="card-view font-sans text-xs uppercase tracking-[0.2em] text-ink-text-secondary transition-colors group-hover:text-gold-deep">
              鉴赏
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
