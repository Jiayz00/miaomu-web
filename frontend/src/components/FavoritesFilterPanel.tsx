// 我的收藏筛选面板
// 东方雅致风格：与 FilterPanel 一致的视觉语言（金色选中下划线 + eyebrow 标题）

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  SORT_OPTIONS,
  PRICE_RANGES,
  ORIGIN_OPTIONS,
  YEAR_OPTIONS,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

export interface FavoritesFilterState {
  search: string;
  categoryId: string;
  price: string;
  origin: string;
  year: string;
  sort: string;
}

export const DEFAULT_FAVORITES_FILTER: FavoritesFilterState = {
  search: '',
  categoryId: '',
  price: '',
  origin: '',
  year: '',
  sort: 'newest',
};

interface FavoritesFilterPanelProps {
  categories: Category[];
  value: FavoritesFilterState;
  onChange: (next: FavoritesFilterState) => void;
  onReset: () => void;
  open?: boolean;
  onClose?: () => void;
  resultCount?: number;
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[var(--penjing-border-hairline)] py-7 first:border-t-0 first:pt-0">
      <h3 className="mb-1 font-sans text-[11px] font-medium uppercase tracking-[0.3em] text-gold-deep">
        {title}
      </h3>
      {children}
    </div>
  );
}

const filterBtnBase =
  'flex w-full items-baseline justify-between gap-3 py-1.5 text-left font-sans text-[13px] transition-colors duration-300 origin-left active:scale-[0.98]';

export function FavoritesFilterPanel({
  categories,
  value,
  onChange,
  onReset,
  open,
  onClose,
  resultCount,
}: FavoritesFilterPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const update = <K extends keyof FavoritesFilterState>(
    key: K,
    v: FavoritesFilterState[K],
  ) => {
    onChange({ ...value, [key]: v });
  };

  const priceValue =
    PRICE_RANGES.find((r) => `${r.min}-${r.max}` === value.price)?.value || '';

  const content = (
    <div className="space-y-0">
      <FilterSection title="关键词">
        <input
          id="favorites-search"
          name="favorites-search"
          type="search"
          value={value.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="搜索藏品名称"
          aria-label="搜索收藏的盆景"
          className="w-full border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 font-sans text-sm text-ink-text transition-colors placeholder:text-ink-text-faint focus:border-gold focus:outline-none"
        />
      </FilterSection>

      <FilterSection title="排序">
        <div className="flex flex-col gap-0.5">
          {SORT_OPTIONS.map((opt) => {
            const active = value.sort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('sort', opt.value)}
                aria-pressed={active}
                className={cn(
                  filterBtnBase,
                  active
                    ? 'border-b border-gold font-medium text-ink'
                    : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
                )}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="分类">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => update('categoryId', '')}
            aria-pressed={!value.categoryId}
            className={cn(
              filterBtnBase,
              !value.categoryId
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部分类</span>
          </button>
          {categories.map((cat) => {
            const active = value.categoryId === String(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => update('categoryId', String(cat.id))}
                aria-pressed={active}
                className={cn(
                  filterBtnBase,
                  active
                    ? 'border-b border-gold font-medium text-ink'
                    : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
                )}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="价格区间">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => update('price', '')}
            aria-pressed={!value.price}
            className={cn(
              filterBtnBase,
              !value.price
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部价格</span>
          </button>
          {PRICE_RANGES.map((range) => {
            const active = priceValue === range.value;
            return (
              <button
                key={range.value}
                type="button"
                onClick={() => update('price', `${range.min}-${range.max}`)}
                aria-pressed={active}
                className={cn(
                  filterBtnBase,
                  active
                    ? 'border-b border-gold font-medium text-ink'
                    : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
                )}
              >
                <span>{range.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="产地">
        <div className="max-h-48 flex flex-col gap-0.5 overflow-y-auto pr-2">
          <button
            type="button"
            onClick={() => update('origin', '')}
            aria-pressed={!value.origin}
            className={cn(
              filterBtnBase,
              !value.origin
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部产地</span>
          </button>
          {ORIGIN_OPTIONS.map((origin) => {
            const active = value.origin === origin;
            return (
              <button
                key={origin}
                type="button"
                onClick={() => update('origin', origin)}
                aria-pressed={active}
                className={cn(
                  filterBtnBase,
                  active
                    ? 'border-b border-gold font-medium text-ink'
                    : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
                )}
              >
                <span>{origin}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="年份">
        <div className="max-h-48 flex flex-col gap-0.5 overflow-y-auto pr-2">
          <button
            type="button"
            onClick={() => update('year', '')}
            aria-pressed={!value.year}
            className={cn(
              filterBtnBase,
              !value.year
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部年份</span>
          </button>
          {YEAR_OPTIONS.map((opt) => {
            const active = value.year === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('year', opt.value)}
                aria-pressed={active}
                className={cn(
                  filterBtnBase,
                  active
                    ? 'border-b border-gold font-medium text-ink'
                    : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
                )}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* 重置 */}
      <div className="pt-7">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 border-b border-[var(--penjing-border-strong)] pb-0.5 font-sans text-xs tracking-[0.15em] text-ink-text-muted transition-colors hover:border-gold hover:text-gold-deep active:scale-[0.98]"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          重置筛选
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block" aria-label="收藏筛选">
        <div className="sticky top-[100px]">
          <div className="mb-6 flex items-center justify-between border-b border-[var(--penjing-border-hairline)] pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gold-deep" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-serif text-base font-medium text-ink">筛选</span>
            </div>
            {typeof resultCount === 'number' && (
              <span className="font-sans text-xs text-ink-text-muted">
                共 {resultCount} 件
              </span>
            )}
          </div>
          {content}
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-ink-deepest/55 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-paper"
              role="dialog"
              aria-modal="true"
              aria-label="收藏筛选"
            >
              <div className="flex items-center justify-between border-b border-[var(--penjing-border-hairline)] px-6 py-5">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-medium text-ink">筛选</span>
                  {typeof resultCount === 'number' && (
                    <span className="font-sans text-xs text-ink-text-muted">
                      · {resultCount} 件
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-text-secondary transition-colors hover:bg-paper-warm active:scale-95"
                  aria-label="关闭筛选"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">{content}</div>
              <div className="border-t border-[var(--penjing-border-hairline)] p-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ink w-full !py-3 !text-[11px]"
                >
                  查看 {resultCount ?? 0} 件结果
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
