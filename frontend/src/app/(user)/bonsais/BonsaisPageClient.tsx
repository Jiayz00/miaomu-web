// 盆景列表页：客户端岛屿组件
// 负责交互（搜索 debounce、筛选、翻页、收藏），首屏数据由父级 Server Component 注入

'use client';

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, SlidersHorizontal, X, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import {
  buildBonsaiApiParams,
  buildBonsaiApiQueryString,
  hasBonsaiFilter,
} from '@/lib/bonsai-query';
import { BonsaiCard } from '@/components/BonsaiCard';
import { FilterPanel } from '@/components/FilterPanel';
import { Pagination } from '@/components/Pagination';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
import { DEFAULT_BONSAIS } from '@/lib/default-bonsais';
import type { Bonsai, PaginatedResponse, Category } from '@/lib/types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

interface BonsaisPageClientProps {
  initialCategories: Category[];
  initialData: PaginatedResponse<Bonsai> | null;
  initialSearchParams?: Record<string, string>;
}

function BonsaisPageContent({
  initialCategories,
  initialData,
  initialSearchParams,
}: BonsaisPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(
    initialSearchParams?.search ?? searchParams.get('search') ?? ''
  );

  // 搜索 debounce：输入停顿 400ms 后自动触发搜索
  // 同步 URL 与输入框，避免每键一次都刷新页面
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // 当前 URL 中的 search 已与输入框一致时（如初始化），跳过
    const currentUrlSearch = searchParams.get('search') || '';
    if (currentUrlSearch === searchInput) return;

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) {
        params.set('search', searchInput);
      } else {
        params.delete('search');
      }
      params.delete('page');
      const str = params.toString();
      router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: false });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // 当前查询参数（URL → API）
  const query = useMemo(() => buildBonsaiApiParams(searchParams), [searchParams]);

  // 分类列表（供筛选面板使用）
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
    initialData: initialCategories,
    // 分类数据变化频率低，5 分钟内复用缓存，避免每次挂载都重新请求
    staleTime: 5 * 60 * 1000,
  });

  // 盆景列表
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<PaginatedResponse<Bonsai>>({
    queryKey: ['bonsais', query],
    queryFn: async () => {
      const qs = buildBonsaiApiQueryString(searchParams);
      const res = await api.get<{ data: PaginatedResponse<Bonsai> }>(
        `/bonsais?${qs}`
      );
      return res.data;
    },
    initialData: initialData ?? undefined,
    // 筛选/翻页时保留旧数据，避免骨架屏闪烁（背景刷新）
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // 后端无数据或加载失败时使用设计稿默认盆景，保证页面视觉完整
  // 仅在无筛选条件时显示默认数据，避免干扰用户筛选体验
  const hasFilter = hasBonsaiFilter(searchParams);
  const backendList = data?.list && data.list.length > 0 ? data.list : null;
  // 后端无数据 / 加载失败 / 后端未启动 → 使用默认盆景（仅无筛选时）
  const items = useMemo(() => {
    if (!isLoading && !hasFilter && (!backendList || isError)) {
      return DEFAULT_BONSAIS;
    }
    return backendList || [];
  }, [isLoading, hasFilter, backendList, isError]);
  const total = data?.total || (items.length > 0 && !hasFilter ? items.length : 0);
  // 防御 NaN：URL 中 page=abc 时回退到 1
  const parsedPage = Number(query.page);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const totalPages = data?.totalPages || Math.ceil(total / DEFAULT_PAGE_SIZE);

  // 批量查询收藏状态：整个列表只发 1 个请求，避免每个卡片单独查询造成 N+1
  const bonsaiIds = useMemo(() => items.map((b) => b.id), [items]);
  const { data: favoriteMap } = useFavoriteMap(bonsaiIds);
  const toggleFav = useToggleFavorite();

  // 切换收藏回调：交由 useToggleFavorite 乐观更新 favorite-map 缓存
  const handleFavoriteToggle = useCallback(
    (bonsaiId: number, favorited: boolean) => {
      toggleFav.mutate({ bonsaiId, favorited });
    },
    [toggleFav]
  );

  // 搜索提交（回车立即触发，跳过 debounce）
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    params.delete('page');
    const str = params.toString();
    router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: false });
  };

  // 清空搜索
  const handleClearSearch = () => {
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('page');
    const str = params.toString();
    router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: false });
  };

  // 翻页
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page');
    }
    const str = params.toString();
    router.push(`${pathname}${str ? `?${str}` : ''}`, { scroll: true });
  };

  return (
    <div className="pt-[72px]" aria-label="盆景收藏">
      {/* 引言带：eyebrow + display-section + body-large 副标题 */}
      <section className="section-paper texture-paper border-b border-[var(--penjing-border-hairline)]">
        <div className="container-penjing py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow-with-line">
              <span className="eyebrow-label">入苑</span>
            </span>
            <h1 className="display-section text-ink">可呼吸的藏苑</h1>
            <p className="body-large mt-5 max-w-[560px] text-ink-text-secondary">
              收录历代匠人精心培育之藏品，每件皆附著录与养护纪要。按类、按龄、按价编目，便于鉴藏者循序翻阅。
            </p>
            <span className="mt-7 block h-px w-16 bg-gold" aria-hidden="true" />
            <div className="mt-7 flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-muted">
                  在册
                </span>
                <span className="font-serif text-[15px] text-ink-text">
                  {total} 件
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-ink-text-muted">
                  当前
                </span>
                <span className="font-serif text-[15px] text-ink-text">
                  第 {currentPage} 页 / 共 {totalPages || 1} 页
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 主布局：sticky 左侧 FilterPanel + 右侧盆景网格 */}
      <section
        className="container-penjing py-14 md:py-20 relative"
        aria-label="藏品目录与筛选"
      >
        {/* 搜索栏 + 移动端筛选按钮 */}
        <div className="mb-10 flex items-center gap-4 md:mb-12">
          <form
            onSubmit={handleSearch}
            className="flex flex-1 items-center gap-3 border-b border-[var(--penjing-border-strong)] py-2"
          >
            <Search
              className="h-4 w-4 flex-shrink-0 text-ink-text-faint"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <input
              id="bonsai-search-input"
              name="bonsai-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索盆景名称…"
              className="input-penjing border-0 bg-transparent px-0 py-1 text-[15px] text-ink-text focus:outline-none"
              aria-label="搜索盆景"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="清空搜索"
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-text-muted transition-colors hover:text-ink-text active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="hidden font-sans text-[11px] uppercase tracking-[0.25em] text-gold-deep transition-colors hover:text-gold active:scale-95 sm:block"
            >
              搜索
            </button>
          </form>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="catalog-filter-toggle flex items-center gap-2 border border-gold px-4 py-2.5 font-sans text-[11px] uppercase tracking-[0.2em] text-gold-deep transition-colors hover:bg-gold hover:text-ink-deepest active:scale-95 lg:hidden"
            aria-label="打开筛选"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            筛选
          </button>
        </div>

        <div className="flex gap-12 lg:gap-16">
          {/* 筛选面板：桌面端 sticky 侧栏 / 移动端抽屉 */}
          <FilterPanel
            categories={categories || []}
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
          />

          {/* 盆景网格 */}
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <BonsaiGridSkeleton count={8} />
            ) : items.length > 0 ? (
              <>
                {/* 背景刷新时的顶部进度提示 */}
                {isFetching && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-6 flex items-center justify-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-muted"
                  >
                    <span className="h-px w-6 bg-gold" aria-hidden="true" />
                    正在更新
                    <span className="h-px w-6 bg-gold" aria-hidden="true" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-10">
                  {items.map((bonsai, i) => (
                    <BonsaiCard
                      key={bonsai.id}
                      bonsai={bonsai}
                      index={i}
                      favorited={favoriteMap?.[bonsai.id] ?? false}
                      onFavoriteToggle={handleFavoriteToggle}
                      priority={i < 8}
                      loading={i < 8 ? 'eager' : 'lazy'}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-16 md:mt-20">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : isError ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <AlertCircle
                  className="mb-4 h-10 w-10 text-gold-deep"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <p className="display-card text-ink">加载失败</p>
                <p className="body-caption mt-2">
                  网络异常或服务暂不可用，请稍后重试
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="btn-outline-gold mt-8"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  重新加载
                </button>
              </div>
            ) : (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <p className="display-card text-ink">暂无藏品</p>
                <p className="body-caption mt-3">
                  试试调整筛选条件或搜索关键词
                </p>
                {(searchParams.get('search') ||
                  searchParams.get('categoryId') ||
                  searchParams.get('minPrice') ||
                  searchParams.get('origin') ||
                  searchParams.get('year')) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      setSearchInput('');
                      router.push(pathname, { scroll: false });
                    }}
                    className="btn-outline-gold mt-8"
                  >
                    清空筛选条件
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function BonsaisPageClient(props: BonsaisPageClientProps) {
  return (
    <Suspense fallback={<BonsaiGridSkeleton count={8} />}>
      <BonsaisPageContent {...props} />
    </Suspense>
  );
}
