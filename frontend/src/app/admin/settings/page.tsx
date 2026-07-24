// 站点设置管理页：编辑联系方式、控制展示项

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
      </div>
    );
  }

  const inputClass =
    'w-full border border-text-muted/20 bg-surface px-4 py-2.5 text-text transition-colors focus:border-accent focus:outline-none';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-primary">站点设置</h1>
        <p className="mt-1 text-sm text-text-muted">
          管理底部联系信息与站点元数据，可勾选展示项
        </p>
      </div>

      {error && (
        <div
          className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-6 border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
          role="status"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 联系方式管理 */}
        <section className="border border-text-muted/15 bg-surface p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-primary">联系方式</h2>
              <p className="mt-1 text-xs text-text-muted">
                勾选「展示」后该字段将出现在前台底部
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {CONTACT_FIELDS.map((field) => {
              const visible = form[field.showKey] === 'true';
              const Icon = field.icon;
              return (
                <div
                  key={field.key}
                  className={cn(
                    'grid grid-cols-1 gap-4 border-l-2 p-4 transition-colors sm:grid-cols-[1fr_auto]',
                    visible
                      ? 'border-accent bg-accent/5'
                      : 'border-text-muted/20 bg-text-muted/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-2.5 flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary-dark/5">
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor={`setting-${field.key}`}
                        className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-text-muted"
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
                    className={cn(
                      'flex items-center justify-center gap-2 self-end border px-4 py-2.5 text-xs uppercase tracking-[0.2em] transition-colors sm:self-center',
                      visible
                        ? 'border-accent bg-accent text-primary-dark'
                        : 'border-text-muted/30 text-text-light hover:border-text-light'
                    )}
                  >
                    {visible ? (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {visible ? '展示中' : '已隐藏'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 站点元信息 */}
        <section className="border border-text-muted/15 bg-surface p-6">
          <h2 className="mb-6 font-serif text-xl text-primary">站点元信息</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {SITE_FIELDS.map((field) => (
              <div key={field.key} className={field.key === 'icp' ? 'sm:col-span-2' : ''}>
                <label
                  htmlFor={`setting-${field.key}`}
                  className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-text-muted"
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
        </section>

        {/* 操作按钮 */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {saving ? '保存中…' : '保存设置'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 border border-text-muted/30 px-8 py-3 text-sm uppercase tracking-[0.2em] text-text-light transition-colors hover:border-text-light disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            )}
            {resetting ? '重置中…' : '重置默认'}
          </button>
        </div>
      </form>
    </div>
  );
}
