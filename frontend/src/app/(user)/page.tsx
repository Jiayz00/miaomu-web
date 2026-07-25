// 首页：SSR 获取布局配置 + 按 sections 顺序渲染区块
//
// 设计：
// - 服务端组件：从 GET /settings/layout/homepage 获取激活的布局
// - 获取失败或无激活布局时，回退到 DEFAULT_HOMEPAGE_SECTIONS（保留原首页结构）
// - 将 sections 传给客户端 <HomeRenderer />，由其按 type 渲染对应区块组件
// - 每个区块根据 visible 字段决定是否渲染（在 HomeRenderer 内处理）

import { api } from '@/lib/api';
import { DEFAULT_HOMEPAGE_SECTIONS } from '@/lib/default-layout';
import { HomeRenderer } from '@/components/home/HomeRenderer';
import type { HomeSection, SiteLayout } from '@/lib/types';

// 服务端获取激活的主页布局
async function getActiveLayout(): Promise<HomeSection[]> {
  try {
    const res = await api.get<{ data: SiteLayout } | null>(
      '/settings/layout/homepage',
      { skipAuth: true },
    );
    // 后端可能返回 null（无激活布局）或 { data: SiteLayout }
    const layout = (res as { data?: SiteLayout })?.data;
    if (layout && Array.isArray(layout.sections) && layout.sections.length > 0) {
      return layout.sections;
    }
    return DEFAULT_HOMEPAGE_SECTIONS;
  } catch {
    // 接口失败时回退到默认布局，保证首页始终可访问
    return DEFAULT_HOMEPAGE_SECTIONS;
  }
}

// 首页 SSR：每次请求重新获取布局，确保布局编辑器保存后立即生效
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const sections = await getActiveLayout();
  return <HomeRenderer sections={sections} />;
}
