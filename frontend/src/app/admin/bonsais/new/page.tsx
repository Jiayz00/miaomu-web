// 新增盆景页

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BonsaiForm } from '@/components/admin/BonsaiForm';

export default function NewBonsaiPage() {
  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/bonsais"
          className="mb-4 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:text-gold-deep"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          返回列表
        </Link>
        <span className="eyebrow-label">藏品管理</span>
        <h1 className="display-section mt-2 text-ink">新增盆景</h1>
        <p className="body-base mt-2 text-ink-text-secondary">
          填写盆景信息与上传图片
        </p>
      </div>

      <BonsaiForm />
    </div>
  );
}
