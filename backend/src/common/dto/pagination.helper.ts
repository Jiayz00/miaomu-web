import { PaginationDto } from './pagination.dto';

/**
 * 分页计算结果
 *
 * 设计原则：DRY（Don't Repeat Yourself）
 * 4 个 service（bonsais / favorites / chat / users）均存在相同的
 * page/pageSize/skip 计算 + 返回结构构造逻辑，集中到此处避免散落
 */
export interface PaginationResult {
  page: number;
  pageSize: number;
  skip: number;
}

/**
 * 从 PaginationDto 计算分页参数
 * - page 默认 1，最小 1
 * - pageSize 默认 10，最小 1
 * - skip = (page - 1) * pageSize
 */
export function resolvePagination(query: PaginationDto): PaginationResult {
  const page = Number(query.page || 1);
  const pageSize = Number(query.limit || 10);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

/**
 * 构造统一的分页响应结构
 * 与前端 PaginatedResponse<T> 类型对齐：{ list, total, page, pageSize, totalPages }
 */
export function buildPaginatedResponse<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number,
): {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
