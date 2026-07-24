// 盆景详情页（SSR + 动态 SEO）

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolvePublicImageUrl } from '@/lib/utils';
import { BonsaiDetail } from './BonsaiDetail';
import type { Bonsai } from '@/lib/types';

// 强制动态渲染：盆景数据会随时增删改，且 SSR 阶段需要访问后端 API，
// 避免 Next.js 在构建期或首次请求时缓存 404/旧数据
export const dynamic = 'force-dynamic';

// SSR 阶段专用后端地址：
// - 优先使用 Docker 内部网络 BACKEND_URL（frontend → backend 容器）
// - 本地开发 fallback 到 localhost
// 不使用 api.ts 模块，避免 webpack 在构建期对模块顶层常量的内联优化导致
// 运行时环境变量读取异常
function getBackendBaseUrl(): string {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl && /^https?:\/\//.test(publicApiUrl)) {
    return publicApiUrl.replace(/\/$/, '');
  }
  return 'http://localhost:4000/api/v1';
}

// 服务端数据获取：盆景详情
async function getBonsai(slug: string): Promise<Bonsai | null> {
  try {
    const baseUrl = getBackendBaseUrl();
    // Next.js params.slug 可能是已编码的 URL 片段（如 %E7%B4%AB%E8%96%87-mrynfnj7），
    // 直接 encodeURIComponent 会造成双重编码 → 后端 404。
    // 先 decode 再 encode，兼容已编码/已解码两种传入形式。
    const decodedSlug = decodeURIComponent(slug);
    const url = `${baseUrl}/bonsais/${encodeURIComponent(decodedSlug)}`;
    console.log(`[SSR getBonsai] rawSlug=${slug} decodedSlug=${decodedSlug} url=${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // SSR 阶段无用户 token，公开接口无需认证
    });
    console.log(`[SSR getBonsai] status=${res.status}`);
    if (!res.ok) {
      console.error(`[SSR getBonsai] backend error: ${res.status} ${res.statusText}`);
      return null;
    }
    const json = (await res.json()) as { data: Bonsai };
    return json.data;
  } catch (err) {
    console.error('[SSR getBonsai] fetch error:', err);
    return null;
  }
}

// 服务端获取相关盆景
async function getRelated(id: number): Promise<Bonsai[]> {
  try {
    const baseUrl = getBackendBaseUrl();
    const res = await fetch(`${baseUrl}/bonsais/related/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: Bonsai[] };
    return json.data;
  } catch (err) {
    console.error('[SSR getRelated] fetch error:', err);
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
