// 分类详情页：展示该分类下的盆景列表

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { BonsaiGridSkeleton, FullPageLoading } from '@/components/Loading';
import type { Bonsai, Category } from '@/lib/types';

export default function CategoryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // 获取分类信息（含盆景列表）
  const { data: category, isLoading } = useQuery<Category>({
    queryKey: ['category', params.slug],
    queryFn: async () => {
      const res = await api.get<{ data: Category }>(
        `/categories/${params.slug}`
      );
      return res.data;
    },
  });

  // 单独获取该分类下的盆景（带分页参数）
  const { data: bonsais } = useQuery<Bonsai[]>({
    queryKey: ['category-bonsais', params.slug],
    queryFn: async () => {
      // 分类接口已含 bonsais，但若后端不返回，则回退查询
      if (category && (category as Category & { bonsais?: Bonsai[] }).bonsais) {
        return (category as Category & { bonsais?: Bonsai[] }).bonsais || [];
      }
      const res = await api.get<{ data: { items: Bonsai[] } }>(
        `/bonsais?categoryId=${params.slug}&limit=100`
      );
      return res.data.items;
    },
    enabled: !!category,
  });

  if (isLoading) return <FullPageLoading />;
  if (!category) {
    notFound();
  }

  const list = bonsais || (category as Category & { bonsais?: Bonsai[] }).bonsais || [];

  return (
    <div className="pt-28">
      {/* 分类头部 */}
      <div className="border-b border-text-muted/10 bg-primary-dark text-background">
        <div className="container-luxury py-16 text-center">
          <span className="mb-4 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-accent">
            <span className="h-px w-10 bg-accent" />
            分类
          </span>
          <h1 className="font-serif text-5xl text-background md:text-6xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-background/60">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="container-luxury py-16">
        {/* 面包屑 */}
        <nav className="mb-10 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-accent">分类</Link>
          <span>/</span>
          <span className="text-text-light">{category.name}</span>
        </nav>

        {list.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((bonsai, i) => (
              <BonsaiCard key={bonsai.id} bonsai={bonsai} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="font-serif text-2xl text-primary">暂无盆景</p>
            <p className="mt-2 text-sm text-text-muted">该分类下还没有盆景藏品</p>
            <Link
              href="/bonsais"
              className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent hover:gap-3"
            >
              浏览全部盆景 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
