// 站点设置管理页：编辑联系方式、控制展示项
//
// 视觉语言：东方雅致 · 墨绿+金色
// - 单栏布局 + section-paper 卡片分组
// - 表单字段使用底线式输入框 + 金色焦点
// - 联系方式卡片左侧金线指示展示状态
// - 保存/重置按钮使用 btn-ink / btn-outline-gold

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Globe,
  Save,
  Loader2,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

// 联系字段配置：key + 中文标签 + 图标 + 占位符
const CONTACT_FIELDS = [
  {
    key: 'phone',
    label: '联系电话',
    icon: Phone,
    placeholder: '+86 400-888-0000',
    showKey: 'show_phone',
  },
  {
    key: 'email',
    label: '邮箱地址',
    icon: Mail,
    placeholder: 'contact@example.com',
    showKey: 'show_email',
  },
  {
    key: 'address',
    label: '地址',
    icon: MapPin,
    placeholder: '江苏省苏州市姑苏区盆景园 88 号',
    showKey: 'show_address',
  },
  {
    key: 'wechat',
    label: '微信号',
    icon: MessageCircle,
    placeholder: 'penjing-art（可选）',
    showKey: 'show_wechat',
  },
  {
    key: 'weibo',
    label: '微博',
    icon: Globe,
    placeholder: 'penjingart（可选）',
    showKey: 'show_weibo',
  },
] as const;

const SITE_FIELDS = [
  {
    key: 'site_name',
    label: '站点名称',
    placeholder: '盆景艺术 Penjing',
  },
  {
    key: 'site_description',
    label: '站点描述',
    placeholder: '凝练自然之美，传承千年技艺。',
  },
  {
    key: 'icp',
    label: '备案号（可选）',
    placeholder: '苏ICP备XXXXXXXX号',
  },
] as const;

const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 拉取全部设置
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get<{ data: Record<string, string> }>('/admin/settings');
      return res.data;
    },
  });

  // 同步后端数据到表单状态
  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 切换可见性
  const toggleVisibility = (showKey: string) => {
    setForm((prev) => ({
      ...prev,
      [showKey]: prev[showKey] === 'true' ? 'false' : 'true',
    }));
  };

  // 保存
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await api.post<{ data: Record<string, string> }>(
        '/admin/settings',
        { settings: form }
      );
      setForm(res.data);
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setSuccess('保存成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置
  const handleReset = async () => {
    if (!window.confirm('确定要将所有设置重置为默认值吗？此操作不可撤销。')) {
      return;
    }
    setError('');
    setSuccess('');
    setResetting(true);
    try {
      const res = await api.post<{ data: Record<string, string> }>(
        '/admin/settings/reset'
      );
      setForm(res.data);
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setSuccess('已重置为默认值');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重置失败');
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
      </div>
    );
  }

  // 表单字段统一样式：底线式输入框，金色焦点
  const inputClass =
    'w-full border-0 border-b border-[var(--penjing-border-strong)] bg-transparent px-0 py-2.5 font-sans text-sm text-[var(--penjing-ink-text)] transition-colors placeholder:text-[var(--penjing-ink-text-faint)] focus:border-gold focus:outline-none';
  const labelClass =
    'mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep';

  return (
    <div className="section-paper">
      <div className="container-penjing py-10 md:py-14">
        {/* 页面标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_SOFT }}
          className="mb-10 md:mb-12"
        >
          <span className="eyebrow-with-line">
            <span className="eyebrow-label">控制台 · 站点配置</span>
          </span>
          <h1 className="display-section m-0 text-ink">站点设置</h1>
          <p className="body-large mt-5 max-w-[640px] text-[var(--penjing-ink-text-secondary)]">
            管理底部联系信息与站点元数据，勾选「展示」后该字段将出现在前台底部。所有改动保存后立即生效。
          </p>
          <span className="mt-7 block h-px w-16 bg-gold" aria-hidden="true" />
        </motion.div>

        {/* 消息条 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3, ease: EASE_SOFT }}
            className="mb-6 border border-[rgba(184,66,58,0.3)] bg-[rgba(184,66,58,0.06)] px-5 py-3 text-sm text-state-error"
            role="alert"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3, ease: EASE_SOFT }}
            className="mb-6 border border-[rgba(45,90,61,0.3)] bg-[rgba(45,90,61,0.06)] px-5 py-3 text-sm text-state-success"
            role="status"
          >
            {success}
          </motion.div>
        )}

        <form onSubmit={handleSave} className="space-y-10">
          {/* 联系方式管理 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_SOFT, delay: 0.1 }}
            className="border border-[var(--penjing-border-fine)] bg-paper p-6 md:p-8"
            aria-labelledby="contact-section-title"
          >
            <div className="mb-7 flex items-end justify-between gap-4 border-b border-[var(--penjing-border-hairline)] pb-5">
              <div>
                <span className="eyebrow-label">CONTACT · 联系方式</span>
                <h2
                  id="contact-section-title"
                  className="mt-2 font-serif text-2xl text-ink"
                >
                  联系方式
                </h2>
                <p className="body-caption mt-2">
                  勾选「展示」后该字段将出现在前台底部
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {CONTACT_FIELDS.map((field) => {
                const visible = form[field.showKey] === 'true';
                const Icon = field.icon;
                return (
                  <div
                    key={field.key}
                    className={cn(
                      'grid grid-cols-1 gap-4 border-l-2 p-4 transition-colors sm:grid-cols-[1fr_auto]',
                      visible
                        ? 'border-gold bg-gold/5'
                        : 'border-[var(--penjing-border-hairline)] bg-paper-warm/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-2 flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[var(--penjing-border-fine)] bg-paper-warm">
                        <Icon
                          className="h-4 w-4 text-ink-soft"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          htmlFor={`setting-${field.key}`}
                          className={labelClass}
                        >
                          {field.label}
                        </label>
                        <input
                          id={`setting-${field.key}`}
                          type="text"
                          value={form[field.key] || ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleVisibility(field.showKey)}
                      aria-pressed={visible}
                      aria-label={`${visible ? '隐藏' : '展示'}${field.label}`}
                      className={cn(
                        'flex items-center justify-center gap-2 self-end border px-4 py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] transition-colors sm:self-center',
                        visible
                          ? 'border-gold bg-gold text-ink-deepest'
                          : 'border-[var(--penjing-border-strong)] text-[var(--penjing-ink-text-secondary)] hover:border-gold hover:text-gold-deep'
                      )}
                    >
                      {visible ? (
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      )}
                      {visible ? '展示中' : '已隐藏'}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* 站点元信息 */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_SOFT, delay: 0.2 }}
            className="border border-[var(--penjing-border-fine)] bg-paper p-6 md:p-8"
            aria-labelledby="meta-section-title"
          >
            <div className="mb-7 border-b border-[var(--penjing-border-hairline)] pb-5">
              <span className="eyebrow-label">METADATA · 站点元信息</span>
              <h2
                id="meta-section-title"
                className="mt-2 font-serif text-2xl text-ink"
              >
                站点元信息
              </h2>
              <p className="body-caption mt-2">
                用于浏览器标题、搜索引擎与备案展示
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {SITE_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className={field.key === 'icp' ? 'sm:col-span-2' : ''}
                >
                  <label
                    htmlFor={`setting-${field.key}`}
                    className={labelClass}
                  >
                    {field.label}
                  </label>
                  <input
                    id={`setting-${field.key}`}
                    type="text"
                    value={form[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </motion.section>

          {/* 操作按钮 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_SOFT, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 border-t border-[var(--penjing-border-hairline)] pt-8"
          >
            <button
              type="submit"
              disabled={saving}
              className="btn-ink !px-8 !py-3 !text-[12px] disabled:opacity-50"
              aria-label="保存设置"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
              {saving ? '保存中…' : '保存设置'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="btn-outline-gold !px-8 !py-3 !text-[12px] disabled:opacity-50"
              aria-label="重置为默认值"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
              {resetting ? '重置中…' : '重置默认'}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
