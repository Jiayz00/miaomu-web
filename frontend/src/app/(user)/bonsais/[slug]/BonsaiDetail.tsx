// 盆景详情交互组件

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MapPin, Calendar, TreePine, Ruler, ShoppingBag, ArrowRight } from 'lucide-react';
import { ImageGallery } from '@/components/ImageGallery';
import { BonsaiCard } from '@/components/BonsaiCard';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoriteCheck, useToggleFavorite, useFavoriteMap } from '@/hooks/use-favorites';
import { api } from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import type { Bonsai } from '@/lib/types';

interface BonsaiDetailProps {
  bonsai: Bonsai;
  related: Bonsai[];
}

export function BonsaiDetail({ bonsai, related }: BonsaiDetailProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: favorited } = useFavoriteCheck(bonsai.id);
  const toggleFav = useToggleFavorite();
  const [inquiryLoading, setInquiryLoading] = useState(false);

  // 批量查询相关推荐盆景的收藏状态，避免每个卡片单独查询造成 N+1
  const relatedIds = useMemo(
    () => related.slice(0, 4).map((b) => b.id),
    [related]
  );
  const { data: relatedFavoriteMap } = useFavoriteMap(relatedIds);
  const handleRelatedFavoriteToggle = useCallback(
    (bonsaiId: number, favorited: boolean) => {
      toggleFav.mutate({ bonsaiId, favorited });
    },
    [toggleFav]
  );

  const isFavorited = !!favorited;
  const outOfStock = bonsai.stock <= 0;

  // 询价：创建聊天会话
  const handleInquiry = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/bonsais/${bonsai.slug}`);
      return;
    }
    setInquiryLoading(true);
    try {
      const res = await api.post<{ data: { id: number } }>('/chat/rooms', {
        bonsaiId: bonsai.id,
      });
      router.push(`/chat?room=${res.data.id}`);
    } catch {
      // 失败也跳到聊天页
      router.push('/chat');
    } finally {
      setInquiryLoading(false);
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/bonsais/${bonsai.slug}`);
      return;
    }
    toggleFav.mutate({ bonsaiId: bonsai.id, favorited: isFavorited });
  };

  // 规格信息
  const specs = [
    { icon: MapPin, label: '产地', value: bonsai.origin },
    { icon: Calendar, label: '年份', value: `${bonsai.year} 年` },
    { icon: TreePine, label: '树龄', value: bonsai.treeAge ? `${bonsai.treeAge} 年` : '—' },
    { icon: Ruler, label: '尺寸', value: bonsai.height && bonsai.width ? `高 ${bonsai.height}cm × 宽 ${bonsai.width}cm` : '—' },
  ];

  return (
    <div className="pt-24">
      <div className="container-luxury py-12">
        {/* 面包屑 */}
        <nav className="mb-10 flex items-center gap-2 text-xs text-text-muted" aria-label="面包屑导航">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href="/bonsais" className="hover:text-accent">盆景收藏</Link>
          <span aria-hidden="true">/</span>
          <span className="text-text-light">{bonsai.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* 左：图片画廊 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <ImageGallery images={bonsai.images} alt={bonsai.name} />
          </motion.div>

          {/* 右：信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            {bonsai.category && (
              <span className="section-eyebrow">{bonsai.category.name}</span>
            )}
            <h1 className="font-serif text-4xl text-primary md:text-5xl">
              {bonsai.name}
            </h1>

            {/* 价格 */}
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-sm text-text-muted">¥</span>
              <span className="font-serif text-4xl text-accent">
                {formatPrice(bonsai.price)}
              </span>
            </div>

            {/* 库存状态 */}
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  outOfStock ? 'text-text-muted' : 'text-accent'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    outOfStock ? 'bg-text-muted' : 'bg-accent'
                  )}
                  aria-hidden="true"
                />
                {outOfStock ? '已售罄' : `有货 · 剩余 ${bonsai.stock} 株`}
              </span>
              <span className="text-text-muted/40" aria-hidden="true">·</span>
              <span className="text-text-muted">{bonsai.viewCount} 次浏览</span>
            </div>

            {/* 描述 */}
            <div className="mt-8 border-y border-text-muted/10 py-6">
              <p className="text-sm leading-relaxed text-text-light whitespace-pre-line">
                {bonsai.description || '暂无描述'}
              </p>
            </div>

            {/* 规格 */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-start gap-3">
                  <spec.icon className="mt-0.5 h-4 w-4 text-accent" strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-text-muted">
                      {spec.label}
                    </p>
                    <p className="mt-0.5 text-sm text-primary">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleInquiry}
                disabled={inquiryLoading}
                className="btn-primary flex-1"
                aria-label={outOfStock ? '此盆景已售罄，咨询类似藏品或预订信息' : `询价咨询：${bonsai.name}`}
                title={outOfStock ? '此盆景已售罄，可咨询类似藏品或预订信息' : undefined}
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {inquiryLoading
                  ? '创建会话…'
                  : outOfStock
                  ? '已售罄·咨询类似'
                  : '询价咨询'}
              </button>
              <button
                type="button"
                onClick={handleFavorite}
                disabled={toggleFav.isPending}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? `取消收藏 ${bonsai.name}` : `收藏 ${bonsai.name}`}
                className={cn(
                  'flex items-center justify-center gap-2 border px-8 py-3.5 text-xs uppercase tracking-[0.2em] transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed',
                  isFavorited
                    ? 'border-accent bg-accent text-primary-dark'
                    : 'border-text-muted/30 text-text-light hover:border-accent hover:text-accent'
                )}
              >
                <Heart
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  fill={isFavorited ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                {isFavorited ? '已收藏' : '收藏'}
              </button>
            </div>

            {!isAuthenticated && (
              <p className="mt-4 text-xs text-text-muted">
                登录后可收藏与询价 ·{' '}
                <Link
                  href={`/login?redirect=/bonsais/${bonsai.slug}`}
                  className="text-accent hover:underline"
                >
                  去登录
                </Link>
              </p>
            )}

            {/* 询价服务承诺：明确回复时效，降低用户顾虑 */}
            <p className="mt-4 text-xs text-text-muted">
              询价后顾问将在 24 小时内回复，请留意「我的询价」消息提醒
            </p>
          </motion.div>
        </div>

        {/* 相关推荐 */}
        {related.length > 0 && (
          <div className="mt-28">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <span className="section-eyebrow">同类推荐</span>
                <h2 className="font-serif text-3xl text-primary md:text-4xl">
                  品味更多
                </h2>
              </div>
              <Link
                href="/bonsais"
                className="hidden items-center gap-2 text-sm tracking-[0.2em] text-accent hover:gap-3 sm:flex"
              >
                查看全部 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {related.slice(0, 4).map((b, i) => (
                <BonsaiCard
                  key={b.id}
                  bonsai={b}
                  index={i}
                  favorited={relatedFavoriteMap?.[b.id] ?? false}
                  onFavoriteToggle={handleRelatedFavoriteToggle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
