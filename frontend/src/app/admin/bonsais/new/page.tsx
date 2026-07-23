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
          className="mb-4 inline-flex items-center gap-2 text-sm text-text-light transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          返回列表
        </Link>
        <h1 className="font-serif text-3xl text-primary">新增盆景</h1>
        <p className="mt-1 text-sm text-text-muted">填写盆景信息与上传图片</p>
      </div>

      <BonsaiForm />
    </div>
  );
}
