// 底部信息
// 东方雅致风格：4 列网格 (1.5fr 1fr 1fr 1fr) + ink-deepest 底 + 金色印章装饰
// 动态拉取站点设置：联系信息从后端 SiteSetting 表读取，按 show_xxx 开关控制展示

'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle, Globe } from 'lucide-react';
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

// 联系字段渲染配置
const CONTACT_ITEMS = [
  { key: 'phone' as const, icon: Phone, label: '电话' },
  { key: 'email' as const, icon: Mail, label: '邮箱' },
  { key: 'address' as const, icon: MapPin, label: '地址' },
  { key: 'wechat' as const, icon: MessageCircle, label: '微信' },
  { key: 'weibo' as const, icon: Globe, label: '微博' },
];

// 藏品分类快捷链接（与导航/分类页保持一致的语义）
const COLLECTION_LINKS = [
  { href: '/bonsais', label: '盆景收藏' },
  { href: '/categories', label: '分类浏览' },
  { href: '/bonsais?sort=popular', label: '热门精选' },
  { href: '/bonsais?sort=newest', label: '最新上架' },
];

// 关于快捷链接
const ABOUT_LINKS = [
  { href: '/bonsais', label: '品牌故事' },
  { href: '/chat', label: '匠人手记' },
  { href: '/chat', label: '养护指南' },
];

export function Footer() {
  const year = new Date().getFullYear();

  // 拉取站点设置（公开接口）
  // staleTime 5 分钟，避免频繁请求
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
  const siteDesc = settings?.site?.description ||
    '以东方美学为根基，将千年盆景技艺凝练为当代艺术策展。每一株藏品皆有来历，每一次修剪皆是修行。';
  const icp = settings?.site?.icp || '';

  // 启用的联系项
  const visibleContacts = CONTACT_ITEMS.filter((item) => contact[item.key]);

  return (
    <footer
      className="penjing-footer bg-ink-deepest text-paper"
      role="contentinfo"
    >
      <div className="container-penjing py-20">
        {/* 4 列网格：1.5fr 1fr 1fr 1fr */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-12">
          {/* 品牌信息 */}
          <div>
            <div className="font-serif text-2xl font-semibold text-paper">
              {siteName}
            </div>
            <p className="mt-4 max-w-[320px] font-sans text-[13px] leading-[1.7] text-paper/60">
              {siteDesc}
            </p>
          </div>

          {/* 藏品列 */}
          <div>
            <div className="mb-5 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold">
              藏品
            </div>
            <div className="flex flex-col gap-3">
              {COLLECTION_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="footer-link font-sans text-[13px] text-paper/55 transition-colors duration-300 hover:text-gold-bright"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 关于列 */}
          <div>
            <div className="mb-5 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold">
              关于
            </div>
            <div className="flex flex-col gap-3">
              {ABOUT_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="footer-link font-sans text-[13px] text-paper/55 transition-colors duration-300 hover:text-gold-bright"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 联系列 */}
          <div>
            <div className="mb-5 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold">
              联系
            </div>
            {visibleContacts.length === 0 ? (
              <p className="font-sans text-[13px] text-paper/40">暂无联系方式</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {visibleContacts.map((item) => {
                  const Icon = item.icon;
                  const isAddress = item.key === 'address';
                  return (
                    <li
                      key={item.key}
                      className={isAddress ? 'flex items-start gap-2.5' : 'flex items-center gap-2.5'}
                    >
                      <Icon
                        className={isAddress ? 'mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gold' : 'h-3.5 w-3.5 flex-shrink-0 text-gold'}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="font-sans text-[13px] text-paper/55">
                        {contact[item.key]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 分隔线 + 版权 + 印章 */}
        <div className="mt-16 flex flex-col items-center justify-between gap-3 border-t border-gold/15 pt-8 md:flex-row">
          <span className="font-sans text-xs text-paper/40 tracking-[0.05em]">
            © {year} {siteName} · 保留所有权利
            {icp && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 transition-colors hover:text-gold-bright"
              >
                {icp}
              </a>
            )}
          </span>
          <span className="footer-seal inline-flex items-center gap-2 font-serif text-xs tracking-[0.15em] text-gold-muted">
            — 以匠心 · 致东方 —
          </span>
        </div>
      </div>
    </footer>
  );
}
