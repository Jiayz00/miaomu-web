// 编辑盆景页：复用表单，预填数据

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiForm } from '@/components/admin/BonsaiForm';
import { FullPageLoading } from '@/components/Loading';
import type { Bonsai } from '@/lib/types';

export default function EditBonsaiPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // 使用管理员接口加载详情（按数字 ID 查询，包含下架商品）
  // 公开路由 /bonsais/:slug 按 slug 查询且仅返回上架商品，不适用于编辑场景
  const { data: bonsai, isLoading } = useQuery<Bonsai>({
    queryKey: ['admin-bonsai', id],
    queryFn: async () => {
      const res = await api.get<{ data: Bonsai }>(`/admin/bonsais/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading || !bonsai) {
    return <FullPageLoading />;
  }

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
        <h1 className="display-section mt-2 text-ink">编辑盆景</h1>
        <p className="body-base mt-2 text-ink-text-secondary">修改盆景信息</p>
      </div>

      <BonsaiForm initialData={bonsai} />
    </div>
  );
}
