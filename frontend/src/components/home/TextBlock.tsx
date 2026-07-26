// 首页区块：纯文本 / HTML 区块
//
// 配置：
// - content: 自定义文字或 HTML 内容
//
// 东方雅致·墨绿+金色设计系统

'use client';

import { motion } from 'framer-motion';
import type { HomeSection, TextBlockConfig } from '@/lib/types';

interface TextBlockProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function TextBlock({ section }: TextBlockProps) {
  const cfg = section.config as unknown as TextBlockConfig;
  const content = cfg.content || '';
  const title = section.title || '';
  const subtitle = section.subtitle || '';

  if (!content && !title) return null;

  return (
    <section
      aria-label={title || '文本区块'}
      className="section-paper texture-paper py-16 md:py-24"
    >
      <div className="container-penjing">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_SOFT }}
          className="mx-auto max-w-4xl"
        >
          {subtitle && (
            <div className="mb-3 flex justify-center">
              <span className="eyebrow-with-line">{subtitle}</span>
            </div>
          )}
          {title && (
            <h2 className="display-section mb-8 text-center text-ink-text">
              {title}
            </h2>
          )}
          {content && (
            <div
              className="html-content mx-auto max-w-none space-y-4 body-base text-ink-text-secondary [&_a]:text-gold-deep [&_a]:underline hover:[&_a]:text-gold [&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:text-ink-text [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink-text [&_h3]:mb-2 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink-text [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed"
              // content 来自管理员，允许富文本
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
