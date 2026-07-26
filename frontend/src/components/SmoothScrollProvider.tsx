// 平滑滚动 + 滚动进度条 + 滚动渐入框架
//
// 功能：
// 1. 集成 Lenis 平滑滚动
// 2. 顶部 2px 金色滚动进度条
// 3. IntersectionObserver 触发 [data-reveal] / [data-section-reveal] 元素的 .is-visible
// 4. 给 <html> 加 .has-js 类（CSS 安全网：无 JS 时渐入元素直接可见）
//
// 用法：在 providers.tsx 中包裹 <SmoothScrollProvider>{children}</SmoothScrollProvider>
// 或在需要平滑滚动的页面单独引入。

'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 1. 标记 JS 已加载（CSS 安全网）
    document.documentElement.classList.add('has-js');

    // 2. 尊重用户动画偏好：减少动效时不启用 Lenis
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let lenis: Lenis | null = null;
    let rafId: number | null = null;

    if (!prefersReducedMotion) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.5,
      });

      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    // 3. 滚动进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress-bar';
    progressBar.style.transform = 'scaleX(0)';
    progressBar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progressBar);

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      progressBar.style.transform = `scaleX(${progress})`;
    };

    if (lenis) {
      lenis.on('scroll', updateProgress);
    } else {
      window.addEventListener('scroll', updateProgress, { passive: true });
    }
    updateProgress();

    // 4. 滚动渐入：IntersectionObserver
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.05,
      },
    );

    const revealTargets = document.querySelectorAll(
      '[data-reveal], [data-section-reveal]',
    );
    revealTargets.forEach((el) => revealObserver.observe(el));

    // 5. 监听 DOM 新增节点（路由切换时新内容也要观察）
    // 优先监听 #main-content，减少管理后台等复杂页面的主线程开销
    const scrollRoot = document.getElementById('main-content') || document.body;
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches?.('[data-reveal], [data-section-reveal]')) {
              revealObserver.observe(node);
            }
            const inner = node.querySelectorAll?.(
              '[data-reveal], [data-section-reveal]',
            );
            inner?.forEach((el) => revealObserver.observe(el));
          }
        }
      }
    });
    mutationObserver.observe(scrollRoot, {
      childList: true,
      subtree: true,
    });

    return () => {
      document.documentElement.classList.remove('has-js');
      if (rafId !== null) cancelAnimationFrame(rafId);
      lenis?.destroy();
      window.removeEventListener('scroll', updateProgress);
      progressBar.remove();
      revealObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return <>{children}</>;
}
