// 首页区块：CTA 行动号召
// 东方雅致·墨绿+金色设计系统

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { HomeSection } from '@/lib/types';

interface CtaSectionProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function CtaSection({ section }: CtaSectionProps) {
  const eyebrow = (section.config.eyebrow as string) || '入苑';
  const ctaText = (section.config.ctaText as string) || '登录藏苑';
  const ctaLink = (section.config.ctaLink as string) || '/login';
  // 次按钮（可选）
  const ctaSecondaryText = (section.config.ctaSecondaryText as string) || '';
  const ctaSecondaryLink = (section.config.ctaSecondaryLink as string) || '';
  const title = section.title || '静候有缘之人';
  const subtitle = section.subtitle || '';

  return (
    <section
      aria-label={title}
      className="section-paper texture-paper relative overflow-hidden py-24 md:py-32"
    >
      <div className="container-penjing relative">
        {/* 顶部装饰金线 */}
        <span
          className="mx-auto mb-12 block h-px w-24 bg-gold/60"
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_SOFT }}
          className="flex flex-col items-center text-center"
        >
          <div className="flex justify-center">
            <span className="eyebrow-with-line">{eyebrow}</span>
          </div>
          <h2 className="display-section text-ink-text">{title}</h2>
          {subtitle && (
            <p className="body-large mt-6 max-w-2xl text-ink-text-secondary">
              {subtitle}
            </p>
          )}

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={ctaLink} className="btn-gold">
              {ctaText}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
            {ctaSecondaryText && ctaSecondaryLink && (
              <Link href={ctaSecondaryLink} className="btn-outline-gold">
                {ctaSecondaryText}
              </Link>
            )}
          </div>
        </motion.div>

        {/* 底部装饰金线 */}
        <span
          className="mx-auto mt-12 block h-px w-24 bg-gold/60"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
