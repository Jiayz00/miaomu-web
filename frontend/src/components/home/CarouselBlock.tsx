// 首页区块：轮播图
//
// 配置：
// - eyebrow: 眉标文字
// - slides: { image, title?, subtitle?, link? }[]

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
    setCurrent((i) => (slides.length > 0 ? (i - 1 + slides.length) % slides.length : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(goNext, 6000);
    return () => clearInterval(timer);
  }, [slides.length, goNext]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const resolvedImage = resolveImageUrl(slide.image);

  return (
    <section className="relative overflow-hidden bg-primary-dark">
      <div className="relative aspect-[16/10] max-h-[70vh] w-full md:aspect-[21/9]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
              <div className="flex h-full w-full items-center justify-center bg-primary-dark">
                <span className="font-serif text-6xl text-background/20">盆</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/70 via-primary-dark/30 to-primary-dark/50" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center">
          <div className="container-luxury">
            <div className="max-w-2xl text-background">
              {eyebrow && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mb-4 text-xs uppercase tracking-[0.4em] text-accent"
                >
                  {eyebrow}
                </motion.p>
              )}
              {title && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="font-serif text-4xl font-medium leading-tight md:text-5xl lg:text-6xl"
                >
                  {title}
                </motion.h2>
              )}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  className="mt-4 text-base leading-relaxed text-background/70 md:text-lg"
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
                      transition={{ duration: 0.7, delay: 0.3 }}
                      className="font-serif text-4xl font-medium leading-tight md:text-5xl lg:text-6xl"
                    >
                      {slide.title}
                    </motion.h2>
                  )}
                  {slide.subtitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.4 }}
                      className="mt-4 text-base leading-relaxed text-background/70 md:text-lg"
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
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-8"
                >
                  <Link
                    href={slide.link}
                    className="inline-flex items-center gap-2 bg-accent px-8 py-3.5 text-xs uppercase tracking-[0.3em] text-primary-dark transition-colors hover:bg-accent-light"
                  >
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
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-background/30 bg-primary-dark/40 text-background backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="下一张"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-background/30 bg-primary-dark/40 text-background backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
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
                  className={`h-1.5 transition-all ${
                    i === current
                      ? 'w-8 bg-accent'
                      : 'w-4 bg-background/40 hover:bg-background/70'
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
