// 全局 404 页面
// 匹配盆景东方韵味，避免 Next.js 默认 404 破坏视觉一致性

import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    // 使用 main 地标（WCAG 1.3.1 / 2.4.1）：404 页面同样需要 landmark
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 texture-paper">
      <div className="max-w-md text-center">
        {/* 印章式 404 标识 */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center border-2 border-accent/40">
          <span className="font-serif text-2xl text-accent">寻</span>
        </div>

        <h1 className="font-serif text-5xl text-text">404</h1>
        <h2 className="mt-4 font-serif text-2xl text-text">寻无此景</h2>
        <p className="mt-4 text-sm leading-relaxed text-text-light">
          您所寻找的页面如盆景深处的幽径，
          <br />
          或已移步，或从未存在。
          <br />
          请返回首页继续赏玩。
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 border border-accent px-6 py-2.5 text-sm text-accent transition-colors hover:bg-accent hover:text-primary-dark"
          >
            <Home className="h-4 w-4" strokeWidth={1.5} />
            返回首页
          </Link>
          <Link
            href="/bonsais"
            className="flex items-center gap-2 border border-text-muted/30 px-6 py-2.5 text-sm text-text-light transition-colors hover:border-text hover:text-text"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
            浏览盆景
          </Link>
        </div>
      </div>
    </main>
  );
}
