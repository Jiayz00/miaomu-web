// 全局错误边界
// 任何运行时错误会展示此页面，避免 Next.js 默认错误页破坏视觉一致性
// 提供"重试"与"返回首页"两个出口

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 错误上报（生产环境可接入 Sentry/LogRocket）
    console.error('应用错误:', error);
  }, [error]);

  return (
    // 使用 main 地标（WCAG 1.3.1 / 2.4.1）：错误页同样需要 landmark
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        {/* 印章式错误标识 */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center border-2 border-accent/40" aria-hidden="true">
          <span className="font-serif text-3xl text-accent">误</span>
        </div>

        {/* role="alert" 让屏读器立即播报错误（WCAG 3.3.1 Error Identification / 4.1.3 Status Messages） */}
        <h1 className="font-serif text-3xl text-text" role="alert">方寸有失</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-light">
          页面出现异常，可能是网络波动或服务暂时不可用。
          <br />
          请稍后重试，或返回首页继续浏览。
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 rounded border border-text-muted/15 bg-surface p-3 text-left">
            <summary className="cursor-pointer text-xs text-text-light">
              开发环境错误详情
            </summary>
            <pre className="mt-2 overflow-x-auto text-xs text-red-600">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 border border-accent px-6 py-2.5 text-sm text-accent transition-colors hover:bg-accent hover:text-primary-dark"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
            重试
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 border border-text-muted/30 px-6 py-2.5 text-sm text-text-light transition-colors hover:border-text hover:text-text"
          >
            <Home className="h-4 w-4" strokeWidth={1.5} />
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
