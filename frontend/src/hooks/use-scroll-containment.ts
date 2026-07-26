// 滚动容器隔离 hook（document capture 版）
// 用途：让某个元素（如 FilterPanel 侧边栏、区内列表）在鼠标 hover 时
//       完全独占滚轮事件——只要鼠标在该元素范围内，滚轮就不会冒泡到主页面。
//
// 实现要点（对比 mouseenter 版本的改进）：
// 1. 在 document 上 capture 阶段监听 wheel 事件，比 mouseenter/mouseleave 更可靠
//    （fixed 元素上 mouseenter 可能在快速移动时丢失）
// 2. 用 event.target.closest() 判断鼠标是否在元素内（位置驱动）
// 3. 鼠标在元素内：preventDefault + 手动滚动元素；鼠标不在：完全放行
// 4. 配合 CSS overscroll-behavior: contain 双保险
//
// 平板/手机端：保留原生 touchmove，触摸位置天然驱动该元素自身滚动。

'use client';

import { useEffect, type RefObject } from 'react';

/**
 * 位置驱动滚轮隔离（document capture 版）
 * - 鼠标在元素上时：所有 wheel 事件都 preventDefault，不冒泡到主页面
 *   - 元素内部可滚动时：手动滚动元素
 *   - 元素已到顶/到底时：什么都不做（主页面也不滚，用户需移开鼠标才能滚动主页面）
 * - 鼠标不在元素上时：完全放行，主页面正常滚动
 * - 仅 PC 端（pointer: fine）生效，触摸设备走原生 touchmove
 */
export function useScrollContainment(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    // 仅在支持 wheel 事件的设备上启用（PC）
    // 触摸设备走原生 touchmove，无需拦截
    const isFinePointer =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer) return;

    const handleWheel = (e: WheelEvent) => {
      // 已被外部 preventDefault 的不处理
      if (e.defaultPrevented) return;

      // 位置驱动核心：判断鼠标位置是否在元素范围内
      // 用 event.target.closest() 而非 mouseenter，避免 fixed 元素事件丢失
      const target = e.target as Node | null;
      const isInside = !!(target && el.contains(target));

      // 鼠标不在元素上：放行，主页面正常滚动
      if (!isInside) return;

      // 鼠标在元素上：阻止冒泡到主页面
      e.preventDefault();

      // 元素内部可滚动时：手动滚动元素
      const { scrollTop, scrollHeight, clientHeight } = el;
      const canScroll = scrollHeight > clientHeight;
      if (canScroll) {
        const delta = e.deltaY;
        const next = scrollTop + delta;
        const max = scrollHeight - clientHeight;
        // 限制在 [0, max] 范围内，避免越界
        el.scrollTop = Math.max(0, Math.min(max, next));
      }
      // 已到顶/到底时：什么都不做（主页面也不滚）
    };

    // capture: true 在捕获阶段拦截，确保比其他 listener 先执行
    // passive: false 才能 preventDefault
    document.addEventListener('wheel', handleWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, [ref, enabled]);
}
