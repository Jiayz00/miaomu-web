// 首页区块渲染器：根据 sections 数组顺序渲染对应区块组件
//
// 用法：<HomeRenderer sections={sections} />
// 每种 type 对应一个独立组件，不识别的 type 会被跳过
// visible=false 的区块不渲染

'use client';

import type { HomeSection } from '@/lib/types';
import { HeroSection } from './HeroSection';
import { FeaturedSection } from './FeaturedSection';
import { CategoriesSection } from './CategoriesSection';
import { BonsaiGridSection } from './BonsaiGridSection';
import { ShowcaseSection } from './ShowcaseSection';
import { StorySection } from './StorySection';
import { CtaSection } from './CtaSection';
import { ContactSection } from './ContactSection';
import { StatsSection } from './StatsSection';

interface HomeRendererProps {
  sections: HomeSection[];
}

// type -> 组件映射表
const SECTION_COMPONENTS: Record<
  HomeSection['type'],
  React.ComponentType<{ section: HomeSection }>
> = {
  hero: HeroSection,
  featured: FeaturedSection,
  categories: CategoriesSection,
  'bonsai-grid': BonsaiGridSection,
  showcase: ShowcaseSection,
  story: StorySection,
  cta: CtaSection,
  contact: ContactSection,
  stats: StatsSection,
};

export function HomeRenderer({ sections }: HomeRendererProps) {
  // 按 order 升序排序后渲染
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <>
      {sorted
        .filter((s) => s.visible !== false)
        .map((section) => {
          const Component = SECTION_COMPONENTS[section.type];
          if (!Component) return null;
          return <Component key={section.id} section={section} />;
        })}
    </>
  );
}
