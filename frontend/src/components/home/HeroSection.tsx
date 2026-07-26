// 首页区块：Hero 首屏大图
// 东方雅致·墨绿+金色设计系统

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import { DEFAULT_IMAGES } from '@/lib/default-images';
import type { HomeSection } from '@/lib/types';

interface HeroSectionProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function HeroSection({ section }: HeroSectionProps) {
  // 后端未配置 heroImage 时使用设计稿默认图（盆景园景）
  const heroImage = (section.config.heroImage as string) || DEFAULT_IMAGES.heroGarden;
  const eyebrow = (section.config.eyebrow as string) || '东方盆景艺术馆';
  const ctaPrimaryText = (section.config.ctaPrimaryText as string) || '步入藏苑';
  const ctaPrimaryLink = (section.config.ctaPrimaryLink as string) || '/bonsais';
  const ctaSecondaryText = (section.config.ctaSecondaryText as string) || '了解匠心';
  const ctaSecondaryLink = (section.config.ctaSecondaryLink as string) || '/chat';
  const title = section.title || '千年盆景·当代策展';
  const subtitle = section.subtitle || '';
  // 统一通过 resolveImageUrl 处理（支持后端返回相对路径）
  const resolvedHeroImage = resolveImageUrl(heroImage);

  return (
    <section
      aria-label="首页主视觉"
      className="relative flex h-dvh min-h-[600px] items-center justify-center overflow-hidden bg-ink-deepest"
    >
      {/* 背景图 + 呼吸感缩放 */}
      <div className="absolute inset-0" aria-hidden="true">
        {resolvedHeroImage && (
          <Image
            src={resolvedHeroImage}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center animate-slow-zoom"
          />
        )}
        {/* 渐变遮罩，确保文字可读 */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-deepest/70 via-ink-deep/50 to-ink-deepest/85" />
      </div>

      {/* 内容 */}
      <div className="relative z-10 container-penjing text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE_SOFT }}
          className="eyebrow-with-line justify-center text-gold-bright"
        >
          <span className="eyebrow-label">{eyebrow}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: EASE_SOFT }}
          className="display-hero mt-6 text-paper"
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: EASE_SOFT }}
            className="body-large mx-auto mt-8 max-w-2xl text-paper/75"
          >
            {subtitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease: EASE_SOFT }}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href={ctaPrimaryLink} className="btn-gold">
            {ctaPrimaryText}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <Link
            href={ctaSecondaryLink}
            className="btn-outline-gold border-gold text-gold-bright"
          >
            {ctaSecondaryText}
          </Link>
        </motion.div>
      </div>

      {/* 底部滚动提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50">
            SCROLL
          </span>
          <span className="block h-12 w-px bg-gradient-to-b from-gold/60 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
