// 首页区块：联系方式（从 site settings 读取）
// 东方雅致·墨绿+金色设计系统

'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageCircle, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import type { HomeSection } from '@/lib/types';

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

const FIELD_ICONS: Record<string, typeof Phone> = {
  phone: Phone,
  email: Mail,
  address: MapPin,
  wechat: MessageCircle,
  weibo: Globe,
};

const FIELD_LABELS: Record<string, string> = {
  phone: '联系电话',
  email: '邮箱地址',
  address: '地址',
  wechat: '微信号',
  weibo: '微博',
};

interface ContactSectionProps {
  section: HomeSection;
}

// penjing 缓动曲线
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function ContactSection({ section }: ContactSectionProps) {
  const eyebrow = (section.config.eyebrow as string) || '联系我们';
  const title = section.title || '联系我们';
  const subtitle = section.subtitle || '';
  const showPhone = section.config.showPhone !== false;
  const showEmail = section.config.showEmail !== false;
  const showAddress = section.config.showAddress !== false;
  const showWechat = section.config.showWechat === true;
  const showWeibo = section.config.showWeibo === true;

  const showMap: Record<string, boolean> = {
    phone: showPhone,
    email: showEmail,
    address: showAddress,
    wechat: showWechat,
    weibo: showWeibo,
  };

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await api.get<{ data: SiteSettings }>('/settings', { skipAuth: true });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const contact = settings?.contact || {};
  const visibleFields = Object.keys(FIELD_LABELS).filter(
    (key) => showMap[key] && contact[key as keyof typeof contact],
  );

  return (
    <section
      aria-label={title}
      className="section-paper texture-paper py-20 md:py-28"
    >
      <div className="container-penjing">
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="eyebrow-with-line">{eyebrow}</span>
          <h2 className="display-section text-ink-text">{title}</h2>
          {subtitle && (
            <p className="body-base mt-4 max-w-xl text-ink-text-secondary">
              {subtitle}
            </p>
          )}
          {/* 装饰印章 */}
          <span
            className="seal-gold mt-6 hidden h-12 w-12 text-[10px] md:flex"
            aria-hidden="true"
          >
            联系
          </span>
        </div>

        {visibleFields.length > 0 ? (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFields.map((key, i) => {
              const Icon = FIELD_ICONS[key] || Phone;
              const value = contact[key as keyof typeof contact] || '';
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_SOFT }}
                  className="border border-penjing-fine bg-paper-warm p-8 text-center shadow-penjing-static transition-shadow duration-500 hover:shadow-penjing-hover"
                >
                  <Icon
                    className="mx-auto mb-4 h-6 w-6 text-gold-deep"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <p className="catalog-number mb-2 text-gold-muted">
                    {FIELD_LABELS[key]}
                  </p>
                  <p className="body-base text-ink-text">{value}</p>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="display-card text-ink-text-muted">暂无联系方式</p>
            <p className="body-caption mt-2">请在站点设置中配置联系信息</p>
          </div>
        )}
      </div>
    </section>
  );
}
