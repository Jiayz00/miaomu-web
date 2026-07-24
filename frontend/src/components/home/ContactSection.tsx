// 首页区块：联系方式（从 site settings 读取）

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
    <section className="bg-primary-dark py-28 text-background">
      <div className="container-luxury">
        <div className="mb-16 text-center">
          <span className="section-eyebrow justify-center">{eyebrow}</span>
          <h2 className="font-serif text-4xl text-background md:text-5xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-background/60">
              {subtitle}
            </p>
          )}
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
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="border border-background/10 bg-background/5 p-8 text-center"
                >
                  <Icon
                    className="mx-auto mb-4 h-6 w-6 text-accent"
                    strokeWidth={1.5}
                  />
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-background/50">
                    {FIELD_LABELS[key]}
                  </p>
                  <p className="text-sm text-background/90">{value}</p>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-serif text-2xl text-background/70">暂无联系方式</p>
            <p className="mt-2 text-sm text-background/40">
              请在站点设置中配置联系信息
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
