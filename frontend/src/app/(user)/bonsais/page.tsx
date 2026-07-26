// 盆景列表页：async Server Component
// 服务端读取 searchParams 并拉取首屏数据，再注入客户端岛屿组件完成交互

import { serverApi } from '@/lib/server-api';
import {
  buildBonsaiApiQueryString,
  hasBonsaiFilter,
} from '@/lib/bonsai-query';
import { DEFAULT_BONSAIS } from '@/lib/default-bonsais';
import BonsaisPageClient from './BonsaisPageClient';
import type { Bonsai, Category, PaginatedResponse } from '@/lib/types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

type SearchParams = Record<string, string | string[] | undefined>;

interface BonsaisPageProps {
  searchParams: SearchParams | Promise<SearchParams>;
}

function normalizeSearchParams(
  raw: SearchParams
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    result[key] = Array.isArray(value) ? value[0] : value;
  }
  return result;
}

export default async function BonsaisPage({
  searchParams,
}: BonsaisPageProps) {
  const rawSearchParams = await searchParams;
  const initialSearchParams = normalizeSearchParams(rawSearchParams);
  const apiQueryString = buildBonsaiApiQueryString(rawSearchParams);

  let initialCategories: Category[] = [];
  let initialData: PaginatedResponse<Bonsai> | null = null;

  try {
    const [categoriesRes, bonsaisRes] = await Promise.all([
      serverApi.get<{ data: Category[] }>('/categories', {
        cache: 'no-store',
      }),
      serverApi.get<{ data: PaginatedResponse<Bonsai> }>(
        `/bonsais?${apiQueryString}`,
        { cache: 'no-store' }
      ),
    ]);

    initialCategories = categoriesRes.data;
    initialData = bonsaisRes.data;
  } catch (error) {
    // 服务端获取失败时不阻断页面，客户端会回退到默认数据或展示错误 UI
    // eslint-disable-next-line no-console
    console.error(
      '[BonsaisPage] SSR fetch failed, fallback to client/default:',
      error instanceof Error ? error.message : error
    );
  }

  // 后端无数据 / 宕机 / 无筛选时，使用默认兜底数据保证首屏视觉完整
  const filterActive = hasBonsaiFilter(rawSearchParams);
  if ((!initialData || initialData.list.length === 0) && !filterActive) {
    initialData = {
      list: DEFAULT_BONSAIS,
      total: DEFAULT_BONSAIS.length,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 1,
    };
  }

  return (
    <BonsaisPageClient
      initialCategories={initialCategories}
      initialData={initialData}
      initialSearchParams={initialSearchParams}
    />
  );
}
