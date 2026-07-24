// 图片画廊组件：主图 + 缩略图切换

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
  // 按排序整理，主图优先
  const sorted = [...images].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.sort - b.sort;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const current = sorted[activeIndex] || sorted[0];

  if (!sorted.length) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-primary-dark/10" role="img" aria-label="暂无盆景图片">
        <span className="font-serif text-6xl text-primary/20" aria-hidden="true">盆</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 主图 */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-primary-dark/5">
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
      </div>

      {/* 缩略图列表 */}
      {sorted.length > 1 && (
        <div
          className="grid grid-cols-5 gap-3"
          role="group"
          aria-label="图片缩略图选择"
          tabIndex={0}
          onKeyDown={(e) => {
            // 键盘左右方向键导航（WCAG 2.1.1）
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              setActiveIndex((prev) => Math.min(prev + 1, sorted.length - 1));
            } else if (e.key === 'ArrowLeft') {
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
                'relative aspect-square overflow-hidden transition-all duration-300',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                i === activeIndex
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                  : 'opacity-60 hover:opacity-100'
              )}
              aria-label={`查看第 ${i + 1} 张图片`}
              aria-current={i === activeIndex ? 'true' : undefined}
            >
              <Image
                src={resolveImageUrl(img.url)}
                alt={`${alt} 缩略图 ${i + 1}`}
                fill
                sizes="100px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
