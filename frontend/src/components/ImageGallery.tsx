// 图片画廊组件：主图 4:5 + 左侧竖排缩略图
// 设计稿参考：design-assets/pages/藏品详情.html 的 .gallery-frame + .gallery-thumbs

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, resolveImageUrl } from '@/lib/utils';

interface ImageGalleryProps {
  images: { id: number; url: string; isMain: boolean; sort: number }[];
  alt: string;
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const sorted = [...images].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.sort - b.sort;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const current = sorted[activeIndex] || sorted[0];

  if (!sorted.length) {
    return (
      <div
        className="flex aspect-[4/5] w-full items-center justify-center bg-paper-warm"
        role="img"
        aria-label="暂无盆景图片"
      >
        <span className="font-serif text-6xl text-gold/40" aria-hidden="true">盆</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-6">
      {/* 主图：4:5 比例 + ink-deepest 底色 */}
      <div className="relative aspect-[4/5] w-full flex-1 overflow-hidden bg-ink-deepest">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id || activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={resolveImageUrl(current.url)}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={activeIndex === 0}
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* 内描边（设计稿 .gallery-frame::after） */}
        <div
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_var(--penjing-ink-deepest-8)]"
          aria-hidden="true"
        />
      </div>

      {/* 缩略图：左侧竖排（桌面）/ 底部横排（移动） */}
      {sorted.length > 1 && (
        <div
          className="flex shrink-0 gap-3 md:flex-col md:overflow-y-auto md:max-h-[600px]"
          role="group"
          aria-label="图片缩略图选择"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((prev) => Math.min(prev + 1, sorted.length - 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            }
          }}
        >
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden transition-all duration-300 md:h-20 md:w-20',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                i === activeIndex
                  ? 'shadow-[inset_0_0_0_2px_var(--penjing-gold)]'
                  : 'opacity-60 hover:opacity-100',
              )}
              aria-label={`查看第 ${i + 1} 张图片`}
              aria-current={i === activeIndex ? 'true' : undefined}
            >
              <Image
                src={resolveImageUrl(img.url)}
                alt={`${alt} 缩略图 ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
