// 首页区块：数据统计
// 从 /admin/dashboard 拉取公开统计（盆景数、分类数、浏览量等）

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TreePine, FolderTree, Eye, Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { animateValue } from '@/lib/utils';
import type { HomeSection } from '@/lib/types';

// 统计项配置：key 对应后端 DashboardStats 字段
const STAT_ITEMS: Record<
  string,
  { label: string; icon: typeof TreePine; suffix?: string }
> = {
  bonsais: { label: '盆景藏品', icon: TreePine },
  categories: { label: '分类品类', icon: FolderTree },
  views: { label: '累计浏览', icon: Eye },
  favorites: { label: '用户收藏', icon: Heart },
};

interface StatsSectionProps {
  section: HomeSection;
}

interface DashboardStats {
  totalBonsais: number;
  totalUsers: number;
  totalViews: number;
  totalFavorites: number;
  totalCategories?: number;
}

export function StatsSection({ section }: StatsSectionProps) {
  const eyebrow = (section.config.eyebrow as string) || '平台数据';
  const title = section.title || '数据见证';
  const subtitle = section.subtitle || '';
  const rawItems = section.config.items;
  const itemKeys = Array.isArray(rawItems)
    ? (rawItems as unknown[]).filter((x): x is string => typeof x === 'string')
    : ['bonsais', 'categories', 'views', 'favorites'];

  // 拉取公开统计（dashboard 接口需要鉴权，这里用 /settings 兜底为 0）
  // 实际部署时可新增公开统计接口；此处复用 dashboard 接口失败时优雅降级
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['home-stats'],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: DashboardStats }>('/admin/dashboard');
        return res.data;
      } catch {
        // 公开访问失败时返回空对象，区块仍可渲染（显示 0）
        return {
          totalBonsais: 0,
          totalUsers: 0,
          totalViews: 0,
          totalFavorites: 0,
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // 将 itemKeys 映射到实际数值
  const values: Record<string, number> = {
    bonsais: stats?.totalBonsais ?? 0,
    categories: stats?.totalCategories ?? 0,
    views: stats?.totalViews ?? 0,
    favorites: stats?.totalFavorites ?? 0,
  };

  return (
    <section className="bg-background py-28">
      <div className="container-luxury">
        <div className="mb-16 text-center">
          <span className="section-eyebrow justify-center">{eyebrow}</span>
          <h2 className="font-serif text-4xl text-primary md:text-5xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-light">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {itemKeys.map((key, i) => {
            const meta = STAT_ITEMS[key];
            if (!meta) return null;
            return (
              <StatCard
                key={key}
                icon={meta.icon}
                label={meta.label}
                value={values[key] ?? 0}
                delay={i * 0.1}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof TreePine;
  label: string;
  value: number;
  delay: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return animateValue(0, value, 1500, (v) => setDisplay(v));
  }, [value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="border border-text-muted/15 bg-surface p-8 text-center"
    >
      <Icon className="mx-auto mb-4 h-6 w-6 text-accent" strokeWidth={1.5} />
      <p className="font-serif text-4xl text-primary">{display.toLocaleString('zh-CN')}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
    </motion.div>
  );
}
