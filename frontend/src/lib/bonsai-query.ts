// 盆景列表页 URL 参数 → API 查询参数映射
// 供 Server Component 与 Client Component 共用，保证两端参数解析一致

import { DEFAULT_PAGE_SIZE } from './constants';

/**
 * 支持 Server Component 的 searchParams（对象，值可能为数组）
 * 与 Client Component 的 URLSearchParams / ReadonlyURLSearchParams
 */
export type SearchParamsInput =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function isSearchParamsLike(
  input: SearchParamsInput
): input is { get(name: string): string | null } {
  return (
    'get' in input &&
    typeof (input as { get?: unknown }).get === 'function'
  );
}

const sortMap: Record<string, { sortBy: string; order: string }> = {
  newest: { sortBy: 'createdAt', order: 'desc' },
  oldest: { sortBy: 'createdAt', order: 'asc' },
  price_asc: { sortBy: 'price', order: 'asc' },
  price_desc: { sortBy: 'price', order: 'desc' },
  popular: { sortBy: 'viewCount', order: 'desc' },
};

function getParam(
  input: SearchParamsInput,
  name: string
): string | undefined {
  if (isSearchParamsLike(input)) {
    return input.get(name) ?? undefined;
  }
  const value = input[name];
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 将 URL 查询参数映射为后端 /bonsais 接口所需的参数对象
 */
export function buildBonsaiApiParams(
  input: SearchParamsInput
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: Number(getParam(input, 'page') || 1),
    limit: DEFAULT_PAGE_SIZE,
  };

  const keyword = getParam(input, 'search');
  if (keyword) params.keyword = keyword;

  const categoryId = getParam(input, 'categoryId');
  if (categoryId) params.categoryId = categoryId;

  const minPrice = getParam(input, 'minPrice');
  if (minPrice) params.priceMin = minPrice;

  const maxPrice = getParam(input, 'maxPrice');
  if (maxPrice) params.priceMax = maxPrice;

  const origin = getParam(input, 'origin');
  if (origin) params.origin = origin;

  const year = getParam(input, 'year');
  if (year) {
    params.yearFrom = year;
    params.yearTo = year;
  }

  const sort = getParam(input, 'sort') || 'newest';
  if (sortMap[sort]) {
    params.sortBy = sortMap[sort].sortBy;
    params.order = sortMap[sort].order;
  }

  return params;
}

/**
 * 生成后端 /bonsais 接口的查询字符串
 */
export function buildBonsaiApiQueryString(input: SearchParamsInput): string {
  const params = buildBonsaiApiParams(input);
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    qs.set(key, String(value));
  });
  return qs.toString();
}

/**
 * 判断当前是否存在盆景筛选条件（用于默认兜底数据判断）
 */
export function hasBonsaiFilter(input: SearchParamsInput): boolean {
  return Boolean(
    getParam(input, 'search') ||
      getParam(input, 'categoryId') ||
      getParam(input, 'minPrice') ||
      getParam(input, 'origin') ||
      getParam(input, 'year')
  );
}
