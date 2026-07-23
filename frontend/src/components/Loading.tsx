// 加载骨架屏组件

import { cn } from '@/lib/utils';

// 骨架行
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-text-muted/15 rounded-sm',
        className
      )}
    />
  );
}

// 盆景卡片骨架
export function BonsaiCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

// 盆景网格骨架
export function BonsaiGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <BonsaiCardSkeleton key={i} />
      ))}
    </div>
  );
}

// 全屏加载
export function FullPageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border border-primary/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">
          加载中
        </p>
      </div>
    </div>
  );
}

// 内联加载
export function InlineLoading({ text = '加载中' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span className="text-sm">{text}…</span>
    </div>
  );
}
