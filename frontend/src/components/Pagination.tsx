// 分页组件

'use client';

import { cn, range } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // 生成页码：始终显示首末页，中间显示当前页附近
  const pages: (number | string)[] = [];
  const delta = 1;

  pages.push(1);
  const left = Math.max(2, currentPage - delta);
  const right = Math.min(totalPages - 1, currentPage + delta);

  if (left > 2) pages.push('…');
  for (const p of range(left, right)) pages.push(p);
  if (right < totalPages - 1) pages.push('…');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <nav className="flex items-center justify-center gap-2">
      {/* 上一页 */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex h-10 w-10 items-center justify-center border border-text-muted/20 text-text-light transition-all duration-300 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="上一页"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-10 w-10 items-center justify-center text-text-muted"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              'flex h-10 w-10 items-center justify-center text-sm transition-all duration-300',
              p === currentPage
                ? 'bg-primary text-background'
                : 'border border-text-muted/20 text-text-light hover:border-accent hover:text-accent'
            )}
            aria-label={`第 ${p} 页`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* 下一页 */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex h-10 w-10 items-center justify-center border border-text-muted/20 text-text-light transition-all duration-300 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="下一页"
      >
        ›
      </button>
    </nav>
  );
}
