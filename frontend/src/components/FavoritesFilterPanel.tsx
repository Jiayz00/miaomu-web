// 我的收藏筛选面板
//
// 与盆景列表页 FilterPanel 的差异：
// - 数据源已在前端完整加载（useFavorites 一次拉取所有收藏）
// - 筛选/排序/搜索在前端完成，不触发后端请求
// - 通过 onChange 回调将筛选条件上抛父组件，父组件用 useMemo 计算最终列表
//
// 交互：
// - 桌面端：常驻左侧 sticky 侧栏（与盆景列表页保持视觉一致）
// - 移动端：抽屉式滑入（Esc 关闭 + 背景滚动锁定 + 焦点管理）

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
  categoryId: string; // '' 表示全部
  price: string; // '' 或 'min-max'
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
  sort: 'newest', // 收藏默认按最新收藏排序
};

interface FavoritesFilterPanelProps {
  categories: Category[];
  value: FavoritesFilterState;
  onChange: (next: FavoritesFilterState) => void;
  onReset: () => void;
  // 移动端控制
  open?: boolean;
  onClose?: () => void;
  // 当前筛选下的结果数（用于移动端展示）
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
    <div className="border-b border-text-muted/10 py-6">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-text-light">
        {title}
      </h3>
      {children}
    </div>
  );
}

const filterBtnBase =
  'block w-full py-1.5 text-left text-sm transition-colors active:scale-[0.98] origin-left';

export function FavoritesFilterPanel({
  categories,
  value,
  onChange,
  onReset,
  open,
  onClose,
  resultCount,
}: FavoritesFilterPanelProps) {
  // 移动端抽屉：Esc 关闭 + 锁定背景滚动（WCAG 2.1.2 No Keyboard Trap）
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

  // 价格区间选中匹配
  const priceValue =
    PRICE_RANGES.find((r) => `${r.min}-${r.max}` === value.price)?.value || '';

  const content = (
    <div className="space-y-0">
      {/* 搜索 */}
      <FilterSection title="关键词">
        <input
          id="favorites-search"
          name="favorites-search"
          type="search"
          value={value.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="搜索藏品名称"
          aria-label="搜索收藏的盆景"
          className="w-full border border-text-muted/20 bg-surface px-3 py-2 text-sm text-text transition-colors placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
        />
      </FilterSection>

      {/* 排序 */}
      <FilterSection title="排序方式">
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('sort', opt.value)}
              aria-pressed={value.sort === opt.value}
              className={cn(
                filterBtnBase,
                value.sort === opt.value
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary',
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
            onClick={() => update('categoryId', '')}
            aria-pressed={!value.categoryId}
            className={cn(
              filterBtnBase,
              !value.categoryId
                ? 'text-accent'
                : 'text-text-light hover:text-primary',
            )}
          >
            全部分类
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => update('categoryId', String(cat.id))}
              aria-pressed={value.categoryId === String(cat.id)}
              className={cn(
                filterBtnBase,
                value.categoryId === String(cat.id)
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary',
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
            onClick={() => update('price', '')}
            aria-pressed={!value.price}
            className={cn(
              filterBtnBase,
              !value.price
                ? 'text-accent'
                : 'text-text-light hover:text-primary',
            )}
          >
            全部价格
          </button>
          {PRICE_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => update('price', `${range.min}-${range.max}`)}
              aria-pressed={priceValue === range.value}
              className={cn(
                filterBtnBase,
                priceValue === range.value
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* 产地 */}
      <FilterSection title="产地">
        <div className="max-h-48 space-y-1 overflow-y-auto pr-2">
          <button
            type="button"
            onClick={() => update('origin', '')}
            aria-pressed={!value.origin}
            className={cn(
              filterBtnBase,
              !value.origin
                ? 'text-accent'
                : 'text-text-light hover:text-primary',
            )}
          >
            全部产地
          </button>
          {ORIGIN_OPTIONS.map((origin) => (
            <button
              key={origin}
              type="button"
              onClick={() => update('origin', origin)}
              aria-pressed={value.origin === origin}
              className={cn(
                filterBtnBase,
                value.origin === origin
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary',
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
            onClick={() => update('year', '')}
            aria-pressed={!value.year}
            className={cn(
              filterBtnBase,
              !value.year
                ? 'text-accent'
                : 'text-text-light hover:text-primary',
            )}
          >
            全部年份
          </button>
          {YEAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('year', opt.value)}
              aria-pressed={value.year === opt.value}
              className={cn(
                filterBtnBase,
                value.year === opt.value
                  ? 'text-accent'
                  : 'text-text-light hover:text-primary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* 重置 */}
      <div className="pt-6">
        <button
          type="button"
          onClick={onReset}
          className="flex w-full items-center justify-center gap-2 border border-text-muted/30 py-2.5 text-xs uppercase tracking-[0.2em] text-text-light transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          重置筛选
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端：常驻侧栏 */}
      <aside className="hidden lg:block" aria-label="收藏筛选">
        <div className="sticky top-24">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <SlidersHorizontal
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="font-serif text-xl">筛选</span>
            </div>
            {typeof resultCount === 'number' && (
              <span className="text-xs text-text-muted">
                共 {resultCount} 件
              </span>
            )}
          </div>
          {content}
        </div>
      </aside>

      {/* 移动端：抽屉 */}
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
              className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-background"
              role="dialog"
              aria-modal="true"
              aria-label="收藏筛选"
            >
              <div className="flex items-center justify-between border-b border-text-muted/10 p-6">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl text-primary">筛选</span>
                  {typeof resultCount === 'number' && (
                    <span className="text-xs text-text-muted">
                      · {resultCount} 件
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-text-light transition-colors hover:bg-background/60 active:scale-95"
                  aria-label="关闭筛选"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">{content}</div>
              <div className="border-t border-text-muted/10 p-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-primary py-3 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light active:scale-[0.98]"
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
