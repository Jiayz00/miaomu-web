// 筛选面板：分类、价格、产地、年份、排序

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import {
  SORT_OPTIONS,
  PRICE_RANGES,
  ORIGIN_OPTIONS,
  YEAR_OPTIONS,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface FilterPanelProps {
  categories: Category[];
  // 移动端控制显隐
  open?: boolean;
  onClose?: () => void;
}

/**
 * 筛选区段组件（必须在模块顶层定义，不能放在函数体内）
 * 否则每次渲染会创建新组件类型，导致重渲染与状态丢失
 */
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-text-muted/10 py-6">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-text-light">
        {title}
      </h3>
      {children}
    </div>
  );
}

// 通用筛选按钮样式：扩大触摸目标到 ≥36px（移动端筛选场景略放宽）
const filterBtnBase =
  'block w-full py-1.5 text-left text-sm transition-colors active:scale-[0.98] origin-left';

export function FilterPanel({ categories, open, onClose }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 更新单个筛选参数
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // 切换筛选时回到第一页
      params.delete('page');
      const str = params.toString();
      router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // 批量更新多个参数（避免多次 router.push 产生多条历史记录）
  const updateParams = useCallback(
    (updates: Array<{ key: string; value: string | null }>) => {
      const params = new URLSearchParams(searchParams.toString());
      updates.forEach(({ key, value }) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.delete('page');
      const str = params.toString();
      router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const currentCategory = searchParams.get('categoryId') || '';
  const currentPrice = searchParams.get('price') || '';
  const currentOrigin = searchParams.get('origin') || '';
  const currentYear = searchParams.get('year') || '';
  const currentSort = searchParams.get('sort') || 'newest';

  // 价格区间选中：根据 min-max 字符串匹配
  const priceValue =
    PRICE_RANGES.find(
      (r) => `${r.min}-${r.max}` === currentPrice
    )?.value || '';

  // 移动端抽屉打开时：Esc 关闭 + 锁定背景滚动（WCAG 2.1.2 No Keyboard Trap）
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const content = (
    <div className="space-y-0">
      {/* 排序 */}
      <FilterSection title="排序方式">
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParam('sort', opt.value)}
              aria-pressed={currentSort === opt.value}
              className={cn(
                filterBtnBase,
                currentSort === opt.value
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* 分类 */}
      <FilterSection title="分类">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateParam('categoryId', null)}
            aria-pressed={!currentCategory}
            className={cn(
              filterBtnBase,
              !currentCategory
                ? 'text-accent'
                : 'text-text-light hover:text-primary'
            )}
          >
            全部分类
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam('categoryId', String(cat.id))}
              aria-pressed={currentCategory === String(cat.id)}
              className={cn(
                filterBtnBase,
                currentCategory === String(cat.id)
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* 价格区间 */}
      <FilterSection title="价格区间">
        <div className="space-y-1">
          <button
            type="button"
            // 批量更新：一次 router.push
            onClick={() =>
              updateParams([
                { key: 'price', value: null },
                { key: 'minPrice', value: null },
                { key: 'maxPrice', value: null },
              ])
            }
            aria-pressed={!currentPrice}
            className={cn(
              filterBtnBase,
              !currentPrice
                ? 'text-accent'
                : 'text-text-light hover:text-primary'
            )}
          >
            全部价格
          </button>
          {PRICE_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() =>
                updateParams([
                  { key: 'price', value: `${range.min}-${range.max}` },
                  { key: 'minPrice', value: String(range.min) },
                  { key: 'maxPrice', value: String(range.max) },
                ])
              }
              aria-pressed={priceValue === range.value}
              className={cn(
                filterBtnBase,
                priceValue === range.value
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* 产地 */}
      <FilterSection title="产地">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateParam('origin', null)}
            aria-pressed={!currentOrigin}
            className={cn(
              filterBtnBase,
              !currentOrigin
                ? 'text-accent'
                : 'text-text-light hover:text-primary'
            )}
          >
            全部产地
          </button>
          {ORIGIN_OPTIONS.map((origin) => (
            <button
              key={origin}
              type="button"
              onClick={() => updateParam('origin', origin)}
              aria-pressed={currentOrigin === origin}
              className={cn(
                filterBtnBase,
                currentOrigin === origin
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary'
              )}
            >
              {origin}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* 年份 */}
      <FilterSection title="年份">
        <div className="max-h-48 space-y-1 overflow-y-auto pr-2">
          <button
            type="button"
            onClick={() => updateParam('year', null)}
            aria-pressed={!currentYear}
            className={cn(
              filterBtnBase,
              !currentYear
                ? 'text-accent'
                : 'text-text-light hover:text-primary'
            )}
          >
            全部年份
          </button>
          {YEAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParam('year', opt.value)}
              aria-pressed={currentYear === opt.value}
              className={cn(
                filterBtnBase,
                currentYear === opt.value
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* 桌面端：常驻侧栏 */}
      <aside className="hidden lg:block" aria-label="盆景筛选">
        {/* sticky 偏移与 Header 滚动后高度（py-3 + 内容）匹配，避免遮挡 */}
        <div className="sticky top-24">
          <div className="mb-6 flex items-center gap-2 text-primary">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-serif text-xl">筛选</span>
          </div>
          {content}
        </div>
      </aside>

      {/* 移动端：抽屉（WCAG 4.1.2 / 2.1.2：role=dialog + aria-modal + Esc 关闭） */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-primary-dark/50 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-background p-6"
              role="dialog"
              aria-modal="true"
              aria-label="盆景筛选"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-serif text-xl text-primary">筛选</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-text-light transition-colors hover:bg-background/60 active:scale-95"
                  aria-label="关闭筛选"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
