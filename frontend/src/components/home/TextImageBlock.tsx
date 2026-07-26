// 首页区块：图文区块
//
// 配置：
// - image: 图片 URL
// - body: 正文（支持纯文本或简单 HTML）
// - buttonText / buttonLink: 按钮文案与链接
// - imagePosition: 'left' | 'right'
//
// 东方雅致·墨绿+金色设计系统

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { HomeSection, TextImageConfig } from '@/lib/types';

interface TextImageBlockProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function TextImageBlock({ section }: TextImageBlockProps) {
  const cfg = section.config as unknown as TextImageConfig;
  const image = resolveImageUrl(cfg.image);
  const body = cfg.body || '';
  const buttonText = cfg.buttonText || '';
  const buttonLink = cfg.buttonLink || '';
  const imagePosition = cfg.imagePosition === 'right' ? 'right' : 'left';
  const title = section.title || '';
  const subtitle = section.subtitle || '';

  return (
    <section
      aria-label={title || '图文区块'}
      className="section-paper texture-paper py-20 md:py-28"
    >
      <div className="container-penjing">
        <div
          className={`grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16 lg:gap-20 ${
            imagePosition === 'right' ? 'md:[direction:rtl]' : ''
          }`}
        >
          {image && (
            <motion.div
              initial={{ opacity: 0, x: imagePosition === 'left' ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE_SOFT }}
              className="relative overflow-hidden bg-ink-deep/5 shadow-penjing-static md:[direction:ltr]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title || '图文配图'}
                className="aspect-[4/3] w-full object-cover"
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_SOFT }}
            className="md:[direction:ltr]"
          >
            {subtitle && (
              <span className="eyebrow-with-line text-gold-deep">{subtitle}</span>
            )}
            {title && (
              <h2 className="display-section text-ink-text">{title}</h2>
            )}
            {body && (
              <div
                className={`mt-6 space-y-4 body-base text-ink-text-secondary [&_a]:text-gold-deep [&_a]:underline hover:[&_a]:text-gold ${
                  image ? '' : 'max-w-3xl'
                }`}
                // body 来自管理员，允许富文本
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: body }}
              />
            )}
            {buttonText && buttonLink && (
              <div className="mt-8">
                <Link href={buttonLink} className="btn-gold">
                  {buttonText}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
