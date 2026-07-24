// 底部信息
// 动态拉取站点设置：联系信息从后端 SiteSetting 表读取，按 show_xxx 开关控制展示

'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, MessageCircle, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SiteSettings {
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    wechat?: string;
    weibo?: string;
  };
  site: {
    name: string;
    description: string;
    icp: string;
  };
}

// 联系字段渲染配置（仅展示后端启用的字段）
const CONTACT_ITEMS = [
  { key: 'phone' as const, icon: Phone, label: '电话' },
  { key: 'email' as const, icon: Mail, label: '邮箱' },
  { key: 'address' as const, icon: MapPin, label: '地址' },
  { key: 'wechat' as const, icon: MessageCircle, label: '微信' },
  { key: 'weibo' as const, icon: Globe, label: '微博' },
];

export function Footer() {
  const year = new Date().getFullYear();

  // 拉取站点设置（公开接口）
  // staleTime 5 分钟，避免频繁请求；后台更新后通过 invalidateQueries 刷新
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await api.get<{ data: SiteSettings }>('/settings', { skipAuth: true });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const contact = settings?.contact || {};
  const siteName = settings?.site?.name || '盆景艺术';
  const siteDesc = settings?.site?.description || '凝练自然之美，传承千年技艺。每一株盆景，皆是时间与匠心的结晶，于方寸之间见天地。';
  const icp = settings?.site?.icp || '';

  // 启用的联系项（仅展示非空且启用的字段）
  const visibleContacts = CONTACT_ITEMS.filter((item) => contact[item.key]);

  return (
    <footer className="bg-primary text-background/80">
      <div className="container-luxury py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* 品牌信息 */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-3xl text-background">
              {siteName.split(' ')[0] || '盆景艺术'}
              {siteName.includes(' ') && (
                <span className="ml-3 text-xs font-sans uppercase tracking-[0.3em] text-accent">
                  {siteName.split(' ').slice(1).join(' ')}
                </span>
              )}
            </h3>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-background/80">
              {siteDesc}
            </p>
          </div>

          {/* 快速导航 */}
          <nav aria-label="底部导航">
            <h4 className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
              探索
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/bonsais" className="text-background/80 transition-colors hover:text-background">
                  盆景收藏
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-background/80 transition-colors hover:text-background">
                  分类浏览
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-background/80 transition-colors hover:text-background">
                  询价咨询
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="text-background/80 transition-colors hover:text-background">
                  我的收藏
                </Link>
              </li>
            </ul>
          </nav>

          {/* 联系方式 */}
          <div>
            <h4 className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
              联系
            </h4>
            {visibleContacts.length === 0 ? (
              <p className="text-sm text-background/60">暂无联系方式</p>
            ) : (
              <ul className="space-y-4 text-sm text-background/80">
                {visibleContacts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.key}
                      className={item.key === 'address' ? 'flex items-start gap-3' : 'flex items-center gap-3'}
                    >
                      <Icon
                        className={item.key === 'address' ? 'mt-0.5 h-4 w-4 text-accent' : 'h-4 w-4 text-accent'}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span>{contact[item.key]}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 分隔线 + 版权 */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 text-xs text-background/70 md:flex-row">
          <p>© {year} {siteName}. 保留所有权利。</p>
          <div className="flex items-center gap-4">
            {icp && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="tracking-wider transition-colors hover:text-background"
              >
                {icp}
              </a>
            )}
            <p className="tracking-wider">以匠心，敬自然</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
