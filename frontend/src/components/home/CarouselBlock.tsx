// 首页区块：轮播图
//
// 配置：
// - eyebrow: 眉标文字
// - slides: { image, title?, subtitle?, link? }[]
//
// 东方雅致·墨绿+金色设计系统

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { HomeSection, CarouselSlide } from '@/lib/types';

interface CarouselBlockProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function CarouselBlock({ section }: CarouselBlockProps) {
  const eyebrow = (section.config.eyebrow as string) || '';
  const slides = (section.config.slides as CarouselSlide[]) || [];
  const title = section.title || '';
  const subtitle = section.subtitle || '';

  const [current, setCurrent] = useState(0);

  const goNext = useCallback(() => {
    setCurrent((i) => (slides.length > 0 ? (i + 1) % slides.length : 0));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrent((i) =>
      slides.length > 0 ? (i - 1 + slides.length) % slides.length : 0,
    );
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(goNext, 6000);
    return () => clearInterval(timer);
  }, [slides.length, goNext]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const resolvedImage = resolveImageUrl(slide.image);
  const sectionLabel = title || eyebrow || '轮播图';

  return (
    <section
      aria-label={sectionLabel}
      className="relative overflow-hidden bg-ink-deep"
    >
      <div className="relative aspect-[16/10] max-h-[70vh] w-full md:aspect-[21/9]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE_SOFT }}
            className="absolute inset-0"
          >
            {resolvedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedImage}
                alt={slide.title || title || '轮播图片'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-ink-deep">
                <span className="font-serif text-6xl text-paper/20">盆</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-ink-deepest/75 via-ink-deep/35 to-ink-deepest/55" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center">
          <div className="container-penjing">
            <div className="max-w-2xl text-paper">
              {eyebrow && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: EASE_SOFT }}
                  className="mb-4"
                >
                  <span className="eyebrow-with-line text-gold-bright">
                    {eyebrow}
                  </span>
                </motion.div>
              )}
              {title && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: EASE_SOFT }}
                  className="display-section text-paper"
                >
                  {title}
                </motion.h2>
              )}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.4, ease: EASE_SOFT }}
                  className="body-large mt-4 text-paper/75"
                >
                  {subtitle}
                </motion.p>
              )}
              {(slide.title || slide.subtitle) && !title && (
                <>
                  {slide.title && (
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.3, ease: EASE_SOFT }}
                      className="display-section text-paper"
                    >
                      {slide.title}
                    </motion.h2>
                  )}
                  {slide.subtitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.4, ease: EASE_SOFT }}
                      className="body-large mt-4 text-paper/75"
                    >
                      {slide.subtitle}
                    </motion.p>
                  )}
                </>
              )}
              {slide.link && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: EASE_SOFT }}
                  className="mt-8"
                >
                  <Link href={slide.link} className="btn-gold">
                    查看详情
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="上一张"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-penjing-gold/40 bg-ink-deepest/40 text-gold-bright backdrop-blur-sm transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink-deepest"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="下一张"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-penjing-gold/40 bg-ink-deepest/40 text-gold-bright backdrop-blur-sm transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink-deepest"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`切换到第 ${i + 1} 张`}
                  aria-current={i === current ? 'true' : undefined}
                  className={`h-1.5 transition-all duration-300 ${
                    i === current
                      ? 'w-8 bg-gold-bright'
                      : 'w-4 bg-paper/40 hover:bg-paper/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
