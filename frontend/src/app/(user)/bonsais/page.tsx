// 盆景列表页：筛选 + 搜索 + 网格 + 分页，URL 参数同步

'use client';

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, SlidersHorizontal, X, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { FilterPanel } from '@/components/FilterPanel';
import { Pagination } from '@/components/Pagination';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavoriteMap, useToggleFavorite } from '@/hooks/use-favorites';
import type { Bonsai, PaginatedResponse } from '@/lib/types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

function BonsaisPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || ''
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

  // 当前查询参数
  // 将 URL 参数映射为后端 API 参数（名称不同）：
  //   search → keyword, minPrice/maxPrice → priceMin/priceMax,
  //   year → yearFrom/yearTo, sort → sortBy + order
  const query = useMemo(() => {
    const params: Record<string, string | number> = {
      page: Number(searchParams.get('page') || 1),
      limit: DEFAULT_PAGE_SIZE,
    };
    const keyword = searchParams.get('search');
    if (keyword) params.keyword = keyword;
    const categoryId = searchParams.get('categoryId');
    if (categoryId) params.categoryId = categoryId;
    const minPrice = searchParams.get('minPrice');
    if (minPrice) params.priceMin = minPrice;
    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) params.priceMax = maxPrice;
    const origin = searchParams.get('origin');
    if (origin) params.origin = origin;
    const year = searchParams.get('year');
    if (year) {
      params.yearFrom = year;
      params.yearTo = year;
    }
    // 排序映射：前端组合值 → 后端 sortBy + order
    const sortMap: Record<string, { sortBy: string; order: string }> = {
      newest: { sortBy: 'createdAt', order: 'desc' },
      oldest: { sortBy: 'createdAt', order: 'asc' },
      price_asc: { sortBy: 'price', order: 'asc' },
      price_desc: { sortBy: 'price', order: 'desc' },
      popular: { sortBy: 'viewCount', order: 'desc' },
    };
    const sort = searchParams.get('sort');
    if (sort && sortMap[sort]) {
      params.sortBy = sortMap[sort].sortBy;
      params.order = sortMap[sort].order;
    }
    return params;
  }, [searchParams]);

  // 分类列表（供筛选面板使用）
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: import('@/lib/types').Category[] }>(
        '/categories'
      );
      return res.data;
    },
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
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => qs.set(k, String(v)));
      const res = await api.get<{ data: PaginatedResponse<Bonsai> }>(
        `/bonsais?${qs.toString()}`
      );
      return res.data;
    },
    // 筛选/翻页时保留旧数据，避免骨架屏闪烁（背景刷新）
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const items = data?.list || [];
  const total = data?.total || 0;
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
    <div className="pt-28">
      {/* 页头 */}
      <div className="border-b border-text-muted/10 bg-background texture-paper">
        <div className="container-luxury py-8 text-center md:py-12">
          <span className="section-eyebrow justify-center">藏品总览</span>
          <h1 className="font-serif text-4xl text-primary md:text-5xl">
            盆景收藏
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-text-light">
            共 {total} 件藏品，于方寸间品读自然
          </p>
        </div>
      </div>

      <div className="container-luxury py-10 md:py-12">
        {/* 搜索栏 + 移动端筛选按钮 */}
        <div className="mb-8 flex items-center gap-3 md:gap-4">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-3">
            <Search className="h-4 w-4 flex-shrink-0 text-text-muted" strokeWidth={1.5} />
            <input
              id="bonsai-search-input"
              name="bonsai-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索盆景名称…"
              className="input-luxury flex-1"
              aria-label="搜索盆景"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="清空搜索"
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="hidden text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:text-primary active:scale-95 sm:block"
            >
              搜索
            </button>
          </form>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 border border-text-muted/20 px-4 py-2.5 text-xs uppercase tracking-[0.2em] text-text-light transition-colors active:scale-95 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            筛选
          </button>
        </div>

        <div className="flex gap-8 lg:gap-10">
          {/* 筛选面板 */}
          <FilterPanel
            categories={categories || []}
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
          />

          {/* 盆景网格 */}
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <BonsaiGridSkeleton count={8} />
            ) : isError ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <AlertCircle className="mb-4 h-10 w-10 text-accent" strokeWidth={1.5} />
                <p className="font-serif text-2xl text-primary">加载失败</p>
                <p className="mt-2 text-sm text-text-muted">
                  网络异常或服务暂不可用，请稍后重试
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-6 inline-flex items-center gap-2 border border-accent px-6 py-3 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-primary active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  重新加载
                </button>
              </div>
            ) : items.length > 0 ? (
              <>
                {/* 背景刷新时的顶部进度条 */}
                {isFetching && (
                  <div className="mb-4 text-center text-xs text-text-muted">
                    正在更新…
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                  {items.map((bonsai, i) => (
                    <BonsaiCard
                      key={bonsai.id}
                      bonsai={bonsai}
                      index={i}
                      favorited={favoriteMap?.[bonsai.id] ?? false}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-12 md:mt-16">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <p className="font-serif text-2xl text-primary">未找到匹配的盆景</p>
                <p className="mt-2 text-sm text-text-muted">
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
                    className="mt-6 inline-flex items-center gap-2 border border-accent px-6 py-3 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary active:scale-95"
                  >
                    清空筛选条件
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BonsaisPage() {
  return (
    <Suspense fallback={<BonsaiGridSkeleton count={8} />}>
      <BonsaisPageContent />
    </Suspense>
  );
}
