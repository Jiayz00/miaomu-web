// 焦点陷阱（Focus Trap）
// 用于抽屉、弹窗等模态层：打开时将 Tab 焦点限制在容器内，
// 支持 Escape 关闭并把焦点还给触发按钮。

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
  enabled: boolean;
  onEscape?: () => void;
  restoreFocus?: boolean;
  triggerRef?: RefObject<HTMLElement | null>;
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  options: UseFocusTrapOptions,
) {
  const { enabled, onEscape, restoreFocus = true, triggerRef } = options;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = ref.current;
    if (!container) return;

    // 记录打开前焦点元素，关闭时归还
    if (restoreFocus) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    }

    // 初始焦点：优先第一个可聚焦元素，否则容器自身
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    const first = focusables[0];
    if (first) {
      first.focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }

      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === firstNode || !container.contains(active)) {
          e.preventDefault();
          lastNode.focus();
        }
      } else {
        if (active === lastNode || !container.contains(active)) {
          e.preventDefault();
          firstNode.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const triggerOnCleanup = triggerRef?.current ?? null;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus) {
        const trigger = triggerOnCleanup ?? previouslyFocusedRef.current;
        trigger?.focus();
      }
    };
  }, [enabled, onEscape, ref, restoreFocus, triggerRef]);
}
