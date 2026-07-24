// 首页区块：CTA 行动号召

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { HomeSection } from '@/lib/types';

interface CtaSectionProps {
  section: HomeSection;
}

export function CtaSection({ section }: CtaSectionProps) {
  const eyebrow = (section.config.eyebrow as string) || '私人洽购';
  const ctaText = (section.config.ctaText as string) || '开始询价';
  const ctaLink = (section.config.ctaLink as string) || '/chat';
  const title = section.title || '寻觅您的那一株';
  const subtitle = section.subtitle || '';

  return (
    <section className="relative overflow-hidden bg-primary py-28 text-center">
      {/* 装饰性背景纹理 */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_50%,rgba(201,169,97,0.4),transparent_50%)]" />
      </div>
      <div className="container-luxury relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="section-eyebrow justify-center">{eyebrow}</span>
          <h2 className="font-serif text-4xl text-background md:text-6xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-background/60">
              {subtitle}
            </p>
          )}
          <Link
            href={ctaLink}
            className="mt-12 inline-flex items-center gap-2 border border-accent px-12 py-4 text-xs uppercase tracking-[0.3em] text-accent transition-all duration-500 hover:bg-accent hover:text-primary"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
