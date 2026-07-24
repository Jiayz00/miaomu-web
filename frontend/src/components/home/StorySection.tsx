// 首页区块：品牌故事

'use client';

import { motion } from 'framer-motion';
import { Leaf, Sparkles } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { HomeSection } from '@/lib/types';

// 图标名到组件的映射
const ICON_MAP: Record<string, typeof Leaf> = {
  leaf: Leaf,
  sparkles: Sparkles,
};

interface StorySectionProps {
  section: HomeSection;
}

export function StorySection({ section }: StorySectionProps) {
  const image = (section.config.image as string) || '';
  const eyebrow = (section.config.eyebrow as string) || '品牌故事';
  const paragraphs = (section.config.paragraphs as string[]) || [];
  const badge = section.config.badge as { value: string; label: string } | undefined;
  const highlights = (section.config.highlights as Array<{
    icon: string;
    title: string;
    subtitle: string;
  }>) || [];
  const title = section.title || '以匠心敬自然';
  // 统一通过 resolveImageUrl 处理（支持后端返回相对路径）
  const resolvedImage = resolveImageUrl(image);

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container-luxury">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* 左：图 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {resolvedImage && (
              <div
                className="aspect-[4/5] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${resolvedImage})` }}
              />
            )}
            {badge && (
              <div className="absolute -bottom-6 -right-6 hidden bg-accent p-8 md:block">
                <span className="font-serif text-4xl text-primary-dark">{badge.value}</span>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary-dark">
                  {badge.label}
                </p>
              </div>
            )}
          </motion.div>

          {/* 右：文 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="section-eyebrow">{eyebrow}</span>
            <h2 className="font-serif text-4xl text-primary md:text-5xl">{title}</h2>
            <div className="mt-8 space-y-5 text-sm leading-relaxed text-text-light">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {highlights.length > 0 && (
              <div className="mt-10 flex gap-8">
                {highlights.map((h, i) => {
                  const Icon = ICON_MAP[h.icon] || Leaf;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <Icon className="mt-1 h-5 w-5 text-accent" strokeWidth={1.5} />
                      <div>
                        <p className="font-serif text-2xl text-primary">{h.title}</p>
                        <p className="text-xs text-text-muted">{h.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
