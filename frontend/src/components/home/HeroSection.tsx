// 首页区块：Hero 首屏大图

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { HomeSection } from '@/lib/types';

interface HeroSectionProps {
  section: HomeSection;
}

export function HeroSection({ section }: HeroSectionProps) {
  const heroImage = (section.config.heroImage as string) || '';
  const eyebrow = (section.config.eyebrow as string) || 'Penjing · Bonsai Art';
  const ctaPrimaryText = (section.config.ctaPrimaryText as string) || '探索收藏';
  const ctaPrimaryLink = (section.config.ctaPrimaryLink as string) || '/bonsais';
  const ctaSecondaryText = (section.config.ctaSecondaryText as string) || '询价咨询';
  const ctaSecondaryLink = (section.config.ctaSecondaryLink as string) || '/chat';
  const title = section.title || '方寸之间见天地';
  const subtitle = section.subtitle || '';
  // 统一通过 resolveImageUrl 处理（支持后端返回相对路径）
  const resolvedHeroImage = resolveImageUrl(heroImage);

  return (
    <section className="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden">
      {/* 背景图 + 呼吸感缩放 */}
      <div className="absolute inset-0">
        {resolvedHeroImage && (
          <div
            className="h-full w-full bg-cover bg-center animate-slow-zoom"
            style={{ backgroundImage: `url(${resolvedHeroImage})` }}
          />
        )}
        {/* 渐变遮罩，确保文字可读 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/50 via-primary-dark/40 to-primary-dark/70" />
      </div>

      {/* 标题 */}
      <div className="relative z-10 container-luxury text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 text-xs uppercase tracking-[0.5em] text-accent"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-5xl font-medium leading-tight text-background md:text-7xl lg:text-8xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-background/70"
          >
            {subtitle}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href={ctaPrimaryLink}
            className="inline-flex items-center gap-2 bg-accent px-10 py-4 text-xs uppercase tracking-[0.3em] text-primary-dark transition-all duration-500 hover:bg-accent-light"
          >
            {ctaPrimaryText}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <Link
            href={ctaSecondaryLink}
            className="inline-flex items-center gap-2 border border-background/40 px-10 py-4 text-xs uppercase tracking-[0.3em] text-background transition-all duration-500 hover:border-background hover:bg-background/10"
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
      >
        <div className="flex h-12 w-7 items-start justify-center rounded-full border border-background/30 p-1.5">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="h-2 w-1 rounded-full bg-accent"
          />
        </div>
      </motion.div>
    </section>
  );
}
