// 主页默认布局区块配置（前端回退用）
//
// 用途：
// 1. SSR 获取 /settings/layout/homepage 失败时，回退到此默认布局
// 2. 管理员布局编辑器"重置默认"时使用此配置
//
// 与后端 backend/src/modules/settings/settings.service.ts 的 DEFAULT_HOMEPAGE_SECTIONS 保持一致
// 修改时需同步两端

import type { HomeSection } from './types';

export const DEFAULT_HOMEPAGE_SECTIONS: HomeSection[] = [
  {
    id: 'hero-default',
    type: 'hero',
    title: '方寸之间见天地',
    subtitle: '凝练自然之美，传承千年技艺。每一株盆景，皆是时间与匠心的结晶。',
    visible: true,
    order: 1,
    config: {
      heroImage: 'https://picsum.photos/seed/penjing-hero/1920/800',
      eyebrow: 'Penjing · Bonsai Art',
      ctaPrimaryText: '探索收藏',
      ctaPrimaryLink: '/bonsais',
      ctaSecondaryText: '询价咨询',
      ctaSecondaryLink: '/chat',
    },
  },
  {
    id: 'featured-default',
    type: 'featured',
    title: '匠心之选',
    subtitle: '每一株皆经精心甄选，承载着岁月的沉淀与自然的韵律。',
    visible: true,
    order: 2,
    config: {
      limit: 6,
      eyebrow: '精选典藏',
      ctaText: '浏览全部盆景',
      ctaLink: '/bonsais',
    },
  },
  {
    id: 'categories-default',
    type: 'categories',
    title: '探索品类',
    subtitle: '',
    visible: true,
    order: 3,
    config: {
      limit: 4,
      eyebrow: '分类导览',
      showDescription: true,
    },
  },
  {
    id: 'story-default',
    type: 'story',
    title: '以匠心敬自然',
    subtitle: '品牌故事',
    visible: true,
    order: 4,
    config: {
      image: 'https://picsum.photos/seed/penjing-story/1000/800',
      eyebrow: '品牌故事',
      paragraphs: [
        '盆景艺术源远流长，始于唐代，盛于明清。它以"以小见大"的艺术手法，将山川草木的壮丽浓缩于方寸之间，是中华园林艺术的瑰宝。',
        '我们遍访江南名园与岭南古苑，甄选每一株承载岁月痕迹的盆景。从选材、蟠扎到养护，每一步皆遵循古法，又融入现代审美，让千年技艺在当代焕发新生。',
        '在这里，您寻得的不仅是一株盆景，更是一段与自然对话的时光。',
      ],
      badge: { value: '30+', label: '载匠心传承' },
      highlights: [
        { icon: 'leaf', title: '古法', subtitle: '传承技艺' },
        { icon: 'sparkles', title: '甄选', subtitle: '匠心之品' },
      ],
    },
  },
  {
    id: 'cta-default',
    type: 'cta',
    title: '寻觅您的那一株',
    subtitle:
      '每一株盆景皆独一无二。若您心仪某件藏品，或希望寻觅特定品类，欢迎与我们的顾问一对一交流，开启您的盆景收藏之旅。',
    visible: true,
    order: 5,
    config: {
      eyebrow: '私人洽购',
      ctaText: '开始询价',
      ctaLink: '/chat',
    },
  },
];

// 区块类型元信息（用于布局编辑器的"添加区块"选择列表）
export interface SectionTypeMeta {
  type: HomeSection['type'];
  label: string;
  description: string;
}

export const SECTION_TYPE_META: SectionTypeMeta[] = [
  { type: 'hero', label: '首屏大图', description: 'Hero 区域：大图 + 标题 + CTA 按钮' },
  { type: 'featured', label: '精选盆景', description: '展示精选盆景，可配置数量' },
  { type: 'categories', label: '分类导航', description: '展示盆景分类卡片' },
  { type: 'bonsai-grid', label: '盆景网格', description: '盆景列表网格，可配置数量与筛选' },
  { type: 'showcase', label: '指定展示', description: '展示指定 ID 的盆景' },
  { type: 'story', label: '品牌故事', description: '图文并茂的品牌故事区块' },
  { type: 'cta', label: '行动号召', description: 'CTA 询价引导区块' },
  { type: 'contact', label: '联系方式', description: '展示站点联系信息' },
  { type: 'stats', label: '数据统计', description: '展示平台数据统计' },
];

// 根据区块类型生成默认 config
export function getDefaultConfigByType(
  type: HomeSection['type'],
): HomeSection['config'] {
  switch (type) {
    case 'hero':
      return {
        heroImage:
          'https://picsum.photos/seed/penjing-hero/1920/800',
        eyebrow: 'Penjing · Bonsai Art',
        ctaPrimaryText: '探索收藏',
        ctaPrimaryLink: '/bonsais',
        ctaSecondaryText: '询价咨询',
        ctaSecondaryLink: '/chat',
      };
    case 'featured':
      return {
        limit: 6,
        eyebrow: '精选典藏',
        ctaText: '浏览全部盆景',
        ctaLink: '/bonsais',
      };
    case 'categories':
      return {
        limit: 4,
        eyebrow: '分类导览',
        showDescription: true,
      };
    case 'bonsai-grid':
      return {
        limit: 8,
        showFilter: false,
        eyebrow: '盆景收藏',
        ctaText: '浏览全部',
        ctaLink: '/bonsais',
      };
    case 'showcase':
      return {
        bonsaiIds: [] as number[],
        eyebrow: '臻品展示',
      };
    case 'story':
      return {
        image:
          'https://picsum.photos/seed/penjing-story/1000/800',
        eyebrow: '品牌故事',
        paragraphs: [
          '在这里编辑您的品牌故事...',
        ],
        badge: { value: '30+', label: '载匠心传承' },
        highlights: [
          { icon: 'leaf', title: '古法', subtitle: '传承技艺' },
          { icon: 'sparkles', title: '甄选', subtitle: '匠心之品' },
        ],
      };
    case 'cta':
      return {
        eyebrow: '私人洽购',
        ctaText: '开始询价',
        ctaLink: '/chat',
      };
    case 'contact':
      return {
        eyebrow: '联系我们',
        showPhone: true,
        showEmail: true,
        showAddress: true,
      };
    case 'stats':
      return {
        eyebrow: '平台数据',
        items: ['bonsais', 'categories', 'views'] as string[],
      };
    default:
      return {};
  }
}
