// 盆景列表页：筛选 + 搜索 + 网格 + 分页，URL 参数同步

'use client';

import { useState, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { FilterPanel } from '@/components/FilterPanel';
import { Pagination } from '@/components/Pagination';
import { BonsaiGridSkeleton } from '@/components/Loading';
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

  // 当前查询参数
  const query = useMemo(() => {
    const params: Record<string, string | number> = {
      page: Number(searchParams.get('page') || 1),
      limit: DEFAULT_PAGE_SIZE,
    };
    const fields = [
      'search',
      'categoryId',
      'minPrice',
      'maxPrice',
      'origin',
      'year',
      'sort',
    ];
    for (const f of fields) {
      const v = searchParams.get(f);
      if (v) params[f] = v;
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
  });

  // 盆景列表
  const { data, isLoading } = useQuery<PaginatedResponse<Bonsai>>({
    queryKey: ['bonsais', query],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => qs.set(k, String(v)));
      const res = await api.get<{ data: PaginatedResponse<Bonsai> }>(
        `/bonsais?${qs.toString()}`
      );
      return res.data;
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const currentPage = Number(query.page);
  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  // 搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="border-b border-text-muted/10 bg-background">
        <div className="container-luxury py-12 text-center">
          <span className="section-eyebrow justify-center">藏品总览</span>
          <h1 className="font-serif text-4xl text-primary md:text-5xl">
            盆景收藏
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-text-light">
            共 {total} 件藏品，于方寸间品读自然
          </p>
        </div>
      </div>

      <div className="container-luxury py-12">
        {/* 搜索栏 + 移动端筛选按钮 */}
        <div className="mb-8 flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-3">
            <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索盆景名称…"
              className="input-luxury flex-1"
            />
            <button
              type="submit"
              className="hidden text-xs uppercase tracking-[0.2em] text-accent hover:text-primary sm:block"
            >
              搜索
            </button>
          </form>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 border border-text-muted/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-light lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            筛选
          </button>
        </div>

        <div className="flex gap-10">
          {/* 筛选面板 */}
          <FilterPanel
            categories={categories || []}
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
          />

          {/* 盆景网格 */}
          <div className="flex-1">
            {isLoading ? (
              <BonsaiGridSkeleton count={8} />
            ) : items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((bonsai, i) => (
                    <BonsaiCard key={bonsai.id} bonsai={bonsai} index={i} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-16">
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
