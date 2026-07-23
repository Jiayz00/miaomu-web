// 筛选面板：分类、价格、产地、年份、排序

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
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

  const FilterSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="border-b border-text-muted/10 py-6">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-text-light">
        {title}
      </h3>
      {children}
    </div>
  );

  const content = (
    <div className="space-y-0">
      {/* 排序 */}
      <FilterSection title="排序方式">
        <div className="space-y-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParam('sort', opt.value)}
              className={cn(
                'block text-sm transition-colors',
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => updateParam('categoryId', null)}
            className={cn(
              'block text-sm transition-colors',
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
              className={cn(
                'block text-sm transition-colors',
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              updateParam('price', null);
              updateParam('minPrice', null);
              updateParam('maxPrice', null);
            }}
            className={cn(
              'block text-sm transition-colors',
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
              onClick={() => {
                updateParam('price', `${range.min}-${range.max}`);
                updateParam('minPrice', String(range.min));
                updateParam('maxPrice', String(range.max));
              }}
              className={cn(
                'block text-sm transition-colors',
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => updateParam('origin', null)}
            className={cn(
              'block text-sm transition-colors',
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
              className={cn(
                'block text-sm transition-colors',
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
        <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
          <button
            type="button"
            onClick={() => updateParam('year', null)}
            className={cn(
              'block text-sm transition-colors',
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
              className={cn(
                'block text-sm transition-colors',
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
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <div className="mb-6 flex items-center gap-2 text-primary">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            <span className="font-serif text-xl">筛选</span>
          </div>
          {content}
        </div>
      </aside>

      {/* 移动端：抽屉 */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-primary-dark/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-xl text-primary">筛选</span>
              <button
                type="button"
                onClick={onClose}
                className="text-text-light"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
