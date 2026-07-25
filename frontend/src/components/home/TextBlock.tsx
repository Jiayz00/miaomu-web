// 首页区块：纯文本 / HTML 区块
//
// 配置：
// - content: 自定义文字或 HTML 内容

'use client';

import { motion } from 'framer-motion';
import type { HomeSection, TextBlockConfig } from '@/lib/types';

interface TextBlockProps {
  section: HomeSection;
}

export function TextBlock({ section }: TextBlockProps) {
  const cfg = section.config as unknown as TextBlockConfig;
  const content = cfg.content || '';
  const title = section.title || '';
  const subtitle = section.subtitle || '';

  if (!content && !title) return null;

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container-luxury">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl"
        >
          {subtitle && (
            <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-accent">
              {subtitle}
            </p>
          )}
          {title && (
            <h2 className="mb-8 text-center font-serif text-3xl text-primary md:text-4xl">
              {title}
            </h2>
          )}
          {content && (
            <div
              className="html-content mx-auto max-w-none space-y-4 text-sm leading-relaxed text-text-light md:text-base [&_a]:text-accent [&_a]:underline hover:[&_a]:text-accent-dark [&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:text-primary [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-primary [&_h3]:mb-2 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-primary [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed"
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
