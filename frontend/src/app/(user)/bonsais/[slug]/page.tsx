// 盆景详情页（SSR + 动态 SEO）

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { resolvePublicImageUrl } from '@/lib/utils';
import { BonsaiDetail } from './BonsaiDetail';
import type { Bonsai } from '@/lib/types';

// 服务端数据获取：盆景详情
async function getBonsai(slug: string): Promise<Bonsai | null> {
  try {
    // 对 slug 进行 URL 编码，处理中文 slug 场景
    // 后端 Prisma where 条件使用原始字符串匹配，编码后的 URL 解析回原始 slug
    const res = await api.get<{ data: Bonsai }>(
      `/bonsais/${encodeURIComponent(slug)}`,
      { skipAuth: true },
    );
    return res.data;
  } catch {
    return null;
  }
}

// 服务端获取相关盆景
async function getRelated(id: number): Promise<Bonsai[]> {
  try {
    const res = await api.get<{ data: Bonsai[] }>(`/bonsais/related/${id}`, {
      skipAuth: true,
    });
    return res.data;
  } catch {
    return [];
  }
}

// 动态元数据
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const bonsai = await getBonsai(params.slug);
  if (!bonsai) {
    return { title: '盆景未找到' };
  }
  return {
    title: bonsai.name,
    description: bonsai.description?.slice(0, 120) || `盆景 ${bonsai.name}`,
    openGraph: {
      title: bonsai.name,
      description: bonsai.description?.slice(0, 120),
      // OG 图片必须使用公网可达的绝对 URL（社交爬虫无法访问 Docker 内网）
      images: bonsai.images?.[0]?.url
        ? [{ url: resolvePublicImageUrl(bonsai.images[0].url) }]
        : [],
    },
  };
}

export default async function BonsaiDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const bonsai = await getBonsai(params.slug);
  if (!bonsai) {
    notFound();
  }

  const related = await getRelated(bonsai.id);

  return <BonsaiDetail bonsai={bonsai} related={related} />;
}
