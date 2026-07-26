// 自定义 sticky 侧边栏 hook
// 用途：当 CSS sticky 失效时（sticky 元素高度 = 父级高度），用 JS 实现
//       侧边栏在商品 section 范围内固定在视口顶部。
// 行为：
//   - 'top'    : section 顶部还在视口 topOffset 下方，侧边栏跟随文档流（static）
//   - 'fixed'  : section 顶部进入 sticky 区，侧边栏 fixed 在视口 topOffset
//   - 'bottom' : section 底部接近视口底部，侧边栏 absolute 到 section 底部（避免溢出）
// 注意：使用此 hook 时，section 需要设置 `relative`，aside 内需要 placeholder 占位

'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export type StickyPosition = 'top' | 'fixed' | 'bottom';

export interface StickyInfo {
  position: StickyPosition;
  /** static 状态下测量的宽度，用于 fixed/absolute 时设置 width */
  width: number;
  /** static 状态下测量的高度，用于 placeholder 占位 */
  height: number;
}

/**
 * 计算侧边栏在商品 section 内的 sticky 状态
 * @param sidebarRef 侧边栏容器 ref（实际滚动的元素）
 * @param topOffset  距视口顶部的偏移（通常 = header 高度 + 间距）
 */
export function useStickySidebar(
  sidebarRef: RefObject<HTMLElement | null>,
  topOffset: number = 100,
): StickyInfo {
  const [info, setInfo] = useState<StickyInfo>({
    position: 'top',
    width: 0,
    height: 0,
  });
  // 缓存 static 状态下的尺寸，避免 fixed/absolute 时尺寸塌陷
  const cachedSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // 找到最近的 section 祖先作为 sticky 容器（决定 bottom 边界）
    // 注意：section 需要设置 position: relative 才能让 absolute bottom: 0 生效
    const container = sidebar.closest('section');
    if (!container) return;

    // anchor = 侧边栏的直接父级（aside）：代表侧边栏在文档流中的"自然位置"
    // 关键：top 边界必须用 anchor 判断而非 section——
    // section 顶部还包含搜索栏等内容，若用 section.top 判断会导致侧边栏
    // 在搜索栏还没滚出视口时就提前 fixed，覆盖住搜索栏（临界处重叠 bug）
    const anchor = sidebar.parentElement;
    if (!anchor) return;

    const update = () => {
      const cRect = container.getBoundingClientRect();
      const aRect = anchor.getBoundingClientRect();
      const sHeight = sidebar.offsetHeight;
      const sWidth = sidebar.offsetWidth;

      let position: StickyPosition = 'top';
      // 侧边栏自然位置（aside 顶部）到达 sticky 线，且 section 底部还有空间容纳侧边栏
      if (aRect.top <= topOffset && cRect.bottom >= topOffset + sHeight) {
        position = 'fixed';
      }
      // section 底部接近，侧边栏推到 section 底部
      else if (aRect.top <= topOffset && cRect.bottom < topOffset + sHeight) {
        position = 'bottom';
      }
      // 侧边栏自然位置还在 sticky 线下方
      else {
        position = 'top';
      }

      // 只在 static 状态缓存尺寸（避免 fixed/absolute 时 offsetWidth/Height 变化）
      if (position === 'top') {
        cachedSize.current = { width: sWidth, height: sHeight };
      }

      setInfo({
        position,
        width: cachedSize.current.width || sWidth,
        height: cachedSize.current.height || sHeight,
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sidebarRef, topOffset]);

  return info;
}
