// 筛选面板：分类、价格、产地、年份、排序
// 东方雅致风格：左侧 sticky 侧栏 + 金色选中下划线 + eyebrow 标题
// 增强：每个区段可折叠（localStorage 记忆） + 顶部全局搜索 + 区内本地搜索
// 滑动隔离：侧边栏独立高度独立滚动，鼠标 hover 时滚轮不冒泡到主页面

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, ChevronDown, Search } from 'lucide-react';
import {
  SORT_OPTIONS,
  PRICE_RANGES,
  ORIGIN_OPTIONS,
  YEAR_OPTIONS,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useScrollContainment } from '@/hooks/use-scroll-containment';
import { useStickySidebar } from '@/hooks/use-sticky-sidebar';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import type { Category } from '@/lib/types';

interface FilterPanelProps {
  categories: Category[];
  open?: boolean;
  onClose?: () => void;
}

/**
 * 可折叠区段组件
 * - 默认展开
 * - 用户点击折叠/展开后，状态写入 localStorage（key: filter-panel:section:{storageKey}）
 * - 折叠动画使用 spring 阻尼曲线，呈现"有阻尼感"的过渡
 */
function FilterSection({
  title,
  storageKey,
  children,
}: {
  title: string;
  storageKey: string;
  children: React.ReactNode;
}) {
  const storageId = `filter-panel:section:${storageKey}`;
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // 客户端挂载后读取 localStorage，避免 SSR 不一致
  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(storageId);
      if (saved === '1') setCollapsed(true);
      else if (saved === '0') setCollapsed(false);
    } catch {
      // localStorage 不可用时忽略，使用默认展开
    }
  }, [storageId]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageId, next ? '1' : '0');
      } catch {
        // 忽略写入失败
      }
      return next;
    });
  }, [storageId]);

  // SSR 阶段与客户端首次渲染保持一致（默认展开），避免 hydration mismatch
  const isCollapsed = mounted ? collapsed : false;

  return (
    <div className="filter-group border-t border-[var(--penjing-border-hairline)] py-7 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!isCollapsed}
        aria-controls={`filter-section-${storageKey}`}
        className="mb-1 flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-gold-deep"
      >
        <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.3em] text-gold-deep">
          {title}
        </h3>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0 text-gold-deep transition-transform duration-500 ease-penjing-soft',
            isCollapsed && '-rotate-90',
          )}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            id={`filter-section-${storageKey}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                // spring 阻尼曲线：阻尼比 0.7，刚度 220，呈现"有阻尼感"的过渡
                height: {
                  type: 'spring',
                  stiffness: 220,
                  damping: 32,
                  mass: 0.8,
                },
                opacity: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: {
                  type: 'spring',
                  stiffness: 260,
                  damping: 36,
                  mass: 0.8,
                },
                opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 区内本地搜索框：仅过滤当前区段的可选项，不修改 URL
 */
function LocalSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative mb-2 mt-1">
      <Search
        className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-text-faint"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full border-b border-[var(--penjing-border-hairline)] bg-transparent py-1.5 pl-7 pr-2 font-sans text-[12px] text-ink-text transition-colors placeholder:text-ink-text-faint focus:border-gold focus:outline-none"
      />
    </div>
  );
}

/**
 * 可滚动列表容器
 * - 应用 useScrollContainment：鼠标 hover 时滚轮隔离，不冒泡到外层
 * - 隐藏原生滚动条
 * - 触摸设备走原生 touchmove
 */
function ScrollableList({
  children,
  maxHeightClass = 'max-h-72',
  ariaLabel,
}: {
  children: React.ReactNode;
  maxHeightClass?: string;
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useScrollContainment(listRef, true);
  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={ariaLabel}
      className={cn(
        'scroll-containment flex flex-col gap-0.5 overflow-y-auto pr-2',
        maxHeightClass,
      )}
    >
      {children}
    </div>
  );
}

// 通用筛选按钮：选中态 ink 文字 + gold 下划线
const filterBtnBase =
  'flex w-full items-baseline justify-between gap-3 py-1.5 text-left font-sans text-[13px] transition-colors duration-300 origin-left active:scale-[0.98]';

export function FilterPanel({ categories, open, onClose }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 区内本地搜索状态（仅过滤本地列表，不影响 URL）
  const [categoryQuery, setCategoryQuery] = useState('');
  const [originQuery, setOriginQuery] = useState('');
  const [yearQuery, setYearQuery] = useState('');

  // 桌面端侧边栏容器 ref：用于 scroll containment（滚轮隔离）+ 自定义 sticky
  const asideInnerRef = useRef<HTMLDivElement>(null);
  useScrollContainment(asideInnerRef, true);
  // 自定义 sticky：CSS sticky 在父级与元素同高时失效，改用 JS 实现
  // 让侧边栏在整个商品 section 范围内固定在视口顶部
  const stickyInfo = useStickySidebar(asideInnerRef, 100);

  // 移动端抽屉焦点陷阱 + ESC 关闭
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, { enabled: !!open, onEscape: onClose });

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete('page');
      const str = params.toString();
      router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

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

  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('categoryId') || '';
  const currentPrice = searchParams.get('price') || '';
  const currentOrigin = searchParams.get('origin') || '';
  const currentYear = searchParams.get('year') || '';
  const currentSort = searchParams.get('sort') || 'newest';

  const priceValue =
    PRICE_RANGES.find(
      (r) => `${r.min}-${r.max}` === currentPrice
    )?.value || '';

  // 区内搜索过滤后的列表（本地过滤，不触发请求）
  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categoryQuery]);

  const filteredOrigins = useMemo(() => {
    const q = originQuery.trim().toLowerCase();
    if (!q) return ORIGIN_OPTIONS;
    return ORIGIN_OPTIONS.filter((o) => o.toLowerCase().includes(q));
  }, [originQuery]);

  const filteredYears = useMemo(() => {
    const q = yearQuery.trim().toLowerCase();
    if (!q) return YEAR_OPTIONS;
    return YEAR_OPTIONS.filter((y) =>
      `${y.label} ${y.value}`.toLowerCase().includes(q)
    );
  }, [yearQuery]);

  // 移动端抽屉：Esc 关闭 + 锁定背景滚动
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

  // 抽屉关闭时清空区内搜索，避免下次打开时残留
  useEffect(() => {
    if (!open) {
      setCategoryQuery('');
      setOriginQuery('');
      setYearQuery('');
    }
  }, [open]);

  const content = (
    <div className="space-y-0">
      {/* 顶部全局搜索：与页顶搜索框同步，都走 search 参数 */}
      <div className="filter-group border-t border-[var(--penjing-border-hairline)] py-7 first:border-t-0 first:pt-0">
        <h3 className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.3em] text-gold-deep">
          搜索
        </h3>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-text-faint"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            type="text"
            defaultValue={currentSearch}
            key={currentSearch}
            placeholder="按名称搜索盆景…"
            aria-label="搜索盆景"
            onChange={(e) => {
              const v = e.target.value;
              // debounce 400ms，与页顶搜索一致
              if ((window as any).__filterSearchTimer) {
                clearTimeout((window as any).__filterSearchTimer);
              }
              (window as any).__filterSearchTimer = setTimeout(() => {
                updateParam('search', v || null);
              }, 400);
            }}
            className="w-full border-b border-[var(--penjing-border-strong)] bg-transparent py-2 pl-8 pr-2 font-sans text-[13px] text-ink-text transition-colors placeholder:text-ink-text-faint focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <FilterSection title="排序" storageKey="sort">
        <div className="flex flex-col gap-0.5">
          {SORT_OPTIONS.map((opt) => {
            const active = currentSort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateParam('sort', opt.value)}
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

      <FilterSection title="分类" storageKey="category">
        <LocalSearchInput
          value={categoryQuery}
          onChange={setCategoryQuery}
          placeholder="搜索分类…"
          ariaLabel="搜索分类"
        />
        <ScrollableList ariaLabel="分类列表">
          <button
            type="button"
            onClick={() => updateParam('categoryId', null)}
            aria-pressed={!currentCategory}
            className={cn(
              filterBtnBase,
              !currentCategory
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部分类</span>
          </button>
          {filteredCategories.length === 0 ? (
            <p className="py-2 text-center font-sans text-[12px] text-ink-text-faint">
              无匹配分类
            </p>
          ) : (
            filteredCategories.map((cat) => {
              const active = currentCategory === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateParam('categoryId', String(cat.id))}
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
            })
          )}
        </ScrollableList>
      </FilterSection>

      <FilterSection title="价格区间" storageKey="price">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
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
                onClick={() =>
                  updateParams([
                    { key: 'price', value: `${range.min}-${range.max}` },
                    { key: 'minPrice', value: String(range.min) },
                    { key: 'maxPrice', value: String(range.max) },
                  ])
                }
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

      <FilterSection title="产地" storageKey="origin">
        <LocalSearchInput
          value={originQuery}
          onChange={setOriginQuery}
          placeholder="搜索产地…"
          ariaLabel="搜索产地"
        />
        <ScrollableList ariaLabel="产地列表">
          <button
            type="button"
            onClick={() => updateParam('origin', null)}
            aria-pressed={!currentOrigin}
            className={cn(
              filterBtnBase,
              !currentOrigin
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部产地</span>
          </button>
          {filteredOrigins.length === 0 ? (
            <p className="py-2 text-center font-sans text-[12px] text-ink-text-faint">
              无匹配产地
            </p>
          ) : (
            filteredOrigins.map((origin) => {
              const active = currentOrigin === origin;
              return (
                <button
                  key={origin}
                  type="button"
                  onClick={() => updateParam('origin', origin)}
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
            })
          )}
        </ScrollableList>
      </FilterSection>

      <FilterSection title="年份" storageKey="year">
        <LocalSearchInput
          value={yearQuery}
          onChange={setYearQuery}
          placeholder="搜索年份…"
          ariaLabel="搜索年份"
        />
        <ScrollableList ariaLabel="年份列表" maxHeightClass="max-h-48">
          <button
            type="button"
            onClick={() => updateParam('year', null)}
            aria-pressed={!currentYear}
            className={cn(
              filterBtnBase,
              !currentYear
                ? 'border-b border-gold font-medium text-ink'
                : 'border-b border-transparent text-ink-text-secondary hover:text-ink-text',
            )}
          >
            <span>全部年份</span>
          </button>
          {filteredYears.length === 0 ? (
            <p className="py-2 text-center font-sans text-[12px] text-ink-text-faint">
              无匹配年份
            </p>
          ) : (
            filteredYears.map((opt) => {
              const active = currentYear === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateParam('year', opt.value)}
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
            })
          )}
        </ScrollableList>
      </FilterSection>
    </div>
  );

  // 桌面端侧边栏容器 ref 已在组件顶部声明并应用 useScrollContainment + useStickySidebar

  // 根据 sticky 状态计算 inner 的 style
  // - 'top'    : static，跟随文档流
  // - 'fixed'  : position: fixed, top: 100px（粘在视口顶部）
  // - 'bottom' : position: absolute, bottom: 0（推到 section 底部，避免溢出）
  const stickyStyle: React.CSSProperties =
    stickyInfo.position === 'fixed'
      ? {
          position: 'fixed',
          top: '100px',
          width: stickyInfo.width,
          maxHeight: 'calc(100vh - 124px)',
        }
      : stickyInfo.position === 'bottom'
        ? {
            position: 'absolute',
            bottom: 0,
            width: stickyInfo.width,
            maxHeight: 'calc(100vh - 124px)',
          }
        : { position: 'static', maxHeight: 'calc(100vh - 124px)' };

  return (
    <>
      {/* 桌面端：常驻侧栏，自定义 sticky + 独立滚动
          - aside 设固定宽度 lg:w-48（192px），避免 inner fixed/absolute 脱离文档流时 aside 宽度塌陷
            导致右侧网格左移覆盖侧边栏
          - inner 用 JS 控制 position（static/fixed/absolute），实现整个 section 范围内的 sticky
          - placeholder：当 inner fixed/absolute 时撑开 aside 高度，避免网格塌陷 */}
      <aside className="hidden lg:block lg:w-48 lg:flex-shrink-0" aria-label="盆景筛选">
        {/* placeholder：fixed/absolute 时 inner 脱离文档流，用占位 div 撑开 aside 高度 */}
        {stickyInfo.position !== 'top' && stickyInfo.height > 0 && (
          <div
            style={{ height: stickyInfo.height }}
            aria-hidden="true"
            className="pointer-events-none"
          />
        )}
        <div
          ref={asideInnerRef}
          data-lenis-prevent
          className="scroll-containment overscroll-contain overflow-y-auto pr-2"
          style={stickyStyle}
        >
          <div className="mb-6 flex items-center gap-2 border-b border-[var(--penjing-border-hairline)] pb-4">
            <SlidersHorizontal className="h-4 w-4 text-gold-deep" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-serif text-base font-medium text-ink">筛选</span>
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
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-ink-deepest/55 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-paper"
              role="dialog"
              aria-modal="true"
              aria-label="盆景筛选"
            >
              <div className="flex items-center justify-between border-b border-[var(--penjing-border-hairline)] px-6 py-5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gold-deep" strokeWidth={1.5} aria-hidden="true" />
                  <span className="font-serif text-base font-medium text-ink">筛选</span>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
