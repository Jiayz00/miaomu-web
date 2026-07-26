// 首页区块：品牌故事
// 东方雅致·墨绿+金色设计系统

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

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

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
    <section
      aria-label={title}
      className="section-ink texture-ink py-20 md:py-32"
    >
      <div className="container-penjing">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* 左：图 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE_SOFT }}
            className="relative"
          >
            {resolvedImage && (
              <div
                className="aspect-[4/5] w-full bg-cover bg-center shadow-penjing-float"
                style={{ backgroundImage: `url(${resolvedImage})` }}
                role="img"
                aria-label={`${title}配图`}
              />
            )}
            {badge && (
              <div className="absolute -bottom-6 -right-6 hidden bg-gold p-8 shadow-penjing-hover md:block">
                <span className="display-card text-ink-deepest">{badge.value}</span>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-ink-deepest">
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
            transition={{ duration: 0.8, delay: 0.1, ease: EASE_SOFT }}
          >
            <span className="eyebrow-with-line text-gold-bright">{eyebrow}</span>
            <h2 className="display-section text-paper">{title}</h2>
            <div className="mt-8 space-y-5 body-base text-paper/75">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {highlights.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-8">
                {highlights.map((h, i) => {
                  const Icon = ICON_MAP[h.icon] || Leaf;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <Icon
                        className="mt-1 h-5 w-5 text-gold-bright"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="display-card text-paper">{h.title}</p>
                        <p className="body-caption text-paper/60">{h.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 装饰金色短线 */}
            <span className="gold-line mt-10 block" aria-hidden="true" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
