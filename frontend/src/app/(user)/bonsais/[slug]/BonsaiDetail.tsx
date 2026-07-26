// 盆景详情交互组件
// 东方雅致设计系统：catalog-number + display-card + spec-record 著录卡 + btn-gold/btn-outline-gold

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MapPin, Calendar, TreePine, Ruler, ArrowRight, Video } from 'lucide-react';
import { ImageGallery } from '@/components/ImageGallery';
import { BonsaiCard } from '@/components/BonsaiCard';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoriteCheck, useToggleFavorite, useFavoriteMap } from '@/hooks/use-favorites';
import { api, ApiError } from '@/lib/api';
import { cn, formatPrice, resolveImageUrl } from '@/lib/utils';
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
  const [inquiryError, setInquiryError] = useState('');

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
  // 防御 stock 为 null/undefined
  const outOfStock = (bonsai.stock ?? 0) <= 0;

  // 切换盆景时清除错误提示（组件复用场景，如 SSR 路由变化）
  useEffect(() => {
    setInquiryError('');
  }, [bonsai.id]);

  // 询价：创建聊天会话
  const encodedSlug = encodeURIComponent(bonsai.slug);
  const detailPath = `/bonsais/${encodedSlug}`;

  const handleInquiry = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(detailPath)}`);
      return;
    }
    setInquiryLoading(true);
    setInquiryError('');
    try {
      const res = await api.post<{ data: { id: number } }>('/chat/rooms', {
        bonsaiId: bonsai.id,
      });
      // 防御后端返回异常结构
      if (!res.data?.id) {
        throw new ApiError('创建询价会话失败：服务返回数据异常', 500);
      }
      router.push(`/chat?room=${res.data.id}`);
    } catch (err) {
      // 显示错误提示而非静默跳转，让用户感知失败并可选择重试
      setInquiryError(err instanceof ApiError ? err.message : '创建询价会话失败，请稍后重试');
    } finally {
      setInquiryLoading(false);
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(detailPath)}`);
      return;
    }
    toggleFav.mutate({ bonsaiId: bonsai.id, favorited: isFavorited });
  };

  // 著录卡规格：产地 / 年份 / 树龄 / 尺寸（与设计稿 spec-record 结构一致）
  const specs = [
    { icon: MapPin, label: '产地', value: bonsai.origin || '—' },
    { icon: Calendar, label: '年份', value: `${bonsai.year} 年` },
    { icon: TreePine, label: '树龄', value: bonsai.treeAge ? `${bonsai.treeAge} 余载` : '—' },
    {
      icon: Ruler,
      label: '尺寸',
      value:
        bonsai.height && bonsai.width
          ? `高 ${bonsai.height}cm · 宽 ${bonsai.width}cm`
          : '—',
    },
  ];

  // 目录编号：补零至三位，与设计稿"№.001"格式一致
  const catalogNo = `№.${String(bonsai.id).padStart(3, '0')}`;

  return (
    <div className="pt-[72px]">
      {/* 顶部：图片画廊 + 信息栏 */}
      <section className="section-paper" aria-label="藏品详情">
        <div className="container-penjing py-10 md:py-14">
          {/* 面包屑 */}
          <nav
            className="mb-8 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-muted md:mb-10"
            aria-label="面包屑导航"
          >
            <Link href="/" className="transition-colors hover:text-gold-deep">
              首页
            </Link>
            <span aria-hidden="true" className="text-ink-text-faint">
              /
            </span>
            <Link href="/bonsais" className="transition-colors hover:text-gold-deep">
              盆景收藏
            </Link>
            <span aria-hidden="true" className="text-ink-text-faint">
              /
            </span>
            <span className="text-ink-text">{bonsai.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            {/* 左：图片画廊 + 视频 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              <ImageGallery images={bonsai.images} alt={bonsai.name} />

              {/* 展示视频（可选） */}
              {bonsai.video && (
                <div className="overflow-hidden border border-[var(--penjing-border-fine)]">
                  <div className="flex items-center gap-2 border-b border-[var(--penjing-border-hairline)] bg-paper-warm px-4 py-3">
                    <Video
                      className="h-4 w-4 text-gold-deep"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="font-sans text-xs uppercase tracking-[0.2em] text-ink-text-secondary">
                      盆景展示视频
                    </span>
                  </div>
                  <video
                    src={resolveImageUrl(bonsai.video)}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full bg-ink-deep"
                  >
                    您的浏览器不支持视频播放。
                  </video>
                </div>
              )}
            </motion.div>

            {/* 右：信息栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col"
            >
              {/* 目录编号 + 分类 */}
              <div className="catalog-number">
                {catalogNo}
                {bonsai.category && ` · ${bonsai.category.name}`}
              </div>

              {/* 标题 */}
              <h1 className="display-card mt-3 text-ink">{bonsai.name}</h1>

              {/* 副标题：树种 · 树龄 · 尺寸 概要 */}
              <span className="body-caption mt-3 block">
                {[
                  bonsai.category?.name,
                  bonsai.treeAge ? `${bonsai.treeAge} 余载` : null,
                  bonsai.height ? `高 ${bonsai.height}cm` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>

              {/* 价格 / 询价区 */}
              <div className="mt-7 flex items-baseline gap-3 border-y border-[var(--penjing-border-hairline)] py-6">
                <div className="flex flex-col gap-1">
                  <span className="eyebrow-label">询价</span>
                  <span className="body-caption">含养护咨询 · 协助运输</span>
                </div>
                <span className="ml-auto font-serif text-[clamp(28px,3vw,36px)] text-ink-deepest">
                  {outOfStock ? (
                    <span className="text-gold-deep">已售罄</span>
                  ) : (
                    <>
                      <span className="text-ink-text-muted">¥</span>
                      {formatPrice(bonsai.price)}
                    </>
                  )}
                </span>
              </div>

              {/* 库存状态 + 浏览量 */}
              <div className="mt-4 flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    outOfStock ? 'text-ink-text-muted' : 'text-gold-deep'
                  )}
                >
                  <span
                    className={cn(
                      'status-dot',
                      outOfStock ? 'status-dot-danger' : 'status-dot-success'
                    )}
                    aria-hidden="true"
                  />
                  {outOfStock ? '已售罄' : `有货 · 剩余 ${bonsai.stock} 株`}
                </span>
                <span className="text-ink-text-faint" aria-hidden="true">
                  ·
                </span>
                <span className="text-ink-text-muted">{bonsai.viewCount} 次浏览</span>
              </div>

              {/* 著录卡：产地 / 年份 / 树龄 / 尺寸 */}
              <dl className="spec-record mt-8" aria-label="藏品著录">
                {specs.map((spec) => (
                  <div key={spec.label} className="spec-record-row">
                    <dt className="spec-record-label">{spec.label}</dt>
                    <dd className="spec-record-value">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              {/* 艺术描述 */}
              <div className="mt-8">
                <p className="body-base whitespace-pre-line text-ink-text-secondary">
                  {bonsai.description || '暂无描述'}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                {inquiryError && (
                  <div
                    className="flex w-full items-center gap-2 border border-[var(--penjing-state-error)] bg-[rgba(184,66,58,0.06)] px-4 py-2.5 text-sm text-[var(--penjing-state-error)]"
                    role="alert"
                  >
                    <span className="flex-1">{inquiryError}</span>
                    <button
                      type="button"
                      onClick={() => setInquiryError('')}
                      className="text-xs underline hover:no-underline"
                      aria-label="关闭错误提示"
                    >
                      关闭
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleInquiry}
                  disabled={inquiryLoading}
                  className="btn-gold flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={
                    outOfStock
                      ? '此盆景已售罄，咨询类似藏品或预订信息'
                      : `询价咨询：${bonsai.name}`
                  }
                  title={
                    outOfStock ? '此盆景已售罄，可咨询类似藏品或预订信息' : undefined
                  }
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  {inquiryLoading
                    ? '创建会话…'
                    : outOfStock
                    ? '已售罄·咨询类似'
                    : '立即询价'}
                </button>
                <button
                  type="button"
                  onClick={handleFavorite}
                  disabled={toggleFav.isPending}
                  aria-pressed={isFavorited}
                  aria-label={
                    isFavorited ? `取消收藏 ${bonsai.name}` : `收藏 ${bonsai.name}`
                  }
                  className={cn(
                    'btn-outline-gold',
                    isFavorited && 'border-gold bg-gold text-ink-deepest',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  <Heart
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    fill={isFavorited ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                  {isFavorited ? '已收藏' : '加入收藏'}
                </button>
              </div>

              {!isAuthenticated && (
                <p className="mt-4 body-caption">
                  登录后可收藏与询价 ·{' '}
                  <Link
                    href={`/login?redirect=${encodeURIComponent(detailPath)}`}
                    className="text-gold-deep hover:underline"
                  >
                    去登录
                  </Link>
                </p>
              )}

              {/* 询价服务承诺：明确回复时效，降低用户顾虑 */}
              <p className="mt-4 body-caption">
                询价后顾问将在 24 小时内回复，请留意「我的询价」消息提醒
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 相关推荐 */}
      {related.length > 0 && (
        <section className="section-aged texture-paper" aria-label="相关藏品">
          <div className="container-penjing py-16 md:py-24">
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10 flex items-end justify-between md:mb-14"
            >
              <div>
                <span className="eyebrow-with-line">
                  <span className="eyebrow-label">相关藏品</span>
                </span>
                <h2 className="display-section text-ink">同源之作</h2>
              </div>
              <Link
                href="/bonsais"
                className="hidden items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-gold-deep transition-all hover:gap-3 sm:flex"
              >
                查看全部 <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </motion.header>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
              {related.slice(0, 4).map((b, i) => (
                <BonsaiCard
                  key={b.id}
                  bonsai={b}
                  index={i}
                  favorited={relatedFavoriteMap?.[b.id] ?? false}
                  onFavoriteToggle={handleRelatedFavoriteToggle}
                  priority={i < 4}
                  loading={i < 4 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
