// 分类页排版设置编辑器
//
// 路由：嵌入 /admin/categories 页面
// 功能：
// - 编辑分类页布局配置（排版方式、列数、宽高比、排序、显示开关、文案）
// - 实时预览（左侧表单 + 右侧迷你预览）
// - 保存 / 重置默认
//
// 设计系统对齐：
// - 输入框：input-penjing 风格（border-penjing-fine + focus:border-gold）
// - 章节：paper-warm 背景 + 金色短线装饰
// - 按钮：btn-gold / btn-outline-gold
// - 接口：
// - GET /admin/settings/categories-layout
// - PUT /admin/settings/categories-layout
// - POST /admin/settings/categories-layout/reset

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Columns2,
  List as ListIcon,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  DEFAULT_CATEGORIES_LAYOUT,
  LAYOUT_MODE_OPTIONS,
  CARD_ASPECT_OPTIONS,
  COLUMNS_OPTIONS,
  SORT_BY_OPTIONS,
  aspectToCss,
  columnsToClass,
} from '@/lib/default-categories-layout';
import type { CategoriesLayoutConfig } from '@/lib/types';

// 统一输入样式：与 BonsaiForm / 分类弹窗一致的 input-penjing 风格
const inputClass =
  'w-full border border-[var(--penjing-border-fine)] bg-paper px-4 py-2.5 font-sans text-sm text-ink-text transition-colors placeholder:text-ink-text-faint focus:border-gold focus:outline-none';

export function CategoriesLayoutEditor() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoriesLayoutConfig>(DEFAULT_CATEGORIES_LAYOUT);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 拉取当前配置
  const { data: serverConfig, isLoading } = useQuery<CategoriesLayoutConfig>({
    queryKey: ['admin-categories-layout'],
    queryFn: async () => {
      const res = await api.get<{ data: CategoriesLayoutConfig }>(
        '/admin/settings/categories-layout',
      );
      return res.data;
    },
  });

  // 同步后端数据到表单
  useEffect(() => {
    if (serverConfig) {
      setForm(serverConfig);
    }
  }, [serverConfig]);

  // 是否有未保存改动
  const hasChanges = (() => {
    if (!serverConfig) return JSON.stringify(form) !== JSON.stringify(DEFAULT_CATEGORIES_LAYOUT);
    return JSON.stringify(form) !== JSON.stringify(serverConfig);
  })();

  // 保存
  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await api.put<{ data: CategoriesLayoutConfig }>(
        '/admin/settings/categories-layout',
        { config: form },
      );
      setForm(res.data);
      // 失效前台缓存
      queryClient.invalidateQueries({ queryKey: ['categories-layout'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories-layout'] });
      setSuccess('已保存，前台分类页将立即应用新配置');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置默认
  const handleReset = async () => {
    if (!window.confirm('确定要将分类页布局重置为默认配置吗？')) return;
    setError('');
    setSuccess('');
    setResetting(true);
    try {
      const res = await api.post<{ data: CategoriesLayoutConfig }>(
        '/admin/settings/categories-layout/reset',
      );
      setForm(res.data);
      queryClient.invalidateQueries({ queryKey: ['categories-layout'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories-layout'] });
      setSuccess('已重置为默认配置');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重置失败');
    } finally {
      setResetting(false);
    }
  };

  const update = <K extends keyof CategoriesLayoutConfig>(
    key: K,
    v: CategoriesLayoutConfig[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: v }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
      </div>
    );
  }

  // 迷你预览参数
  const aspectCss = aspectToCss(form.aspect);
  const previewGridClass = columnsToClass(form.columns);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow-label">排版设置</span>
          <h2 className="display-card mt-2 text-ink">分类页排版</h2>
          <p className="body-base mt-2 text-ink-text-secondary">
            配置用户端 /categories 页面的展示方式，保存后立即生效
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="btn-outline-gold disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {resetting ? '重置中…' : '重置默认'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="mb-6 inline-flex items-center gap-2 border border-gold/40 bg-gold/5 px-3 py-1.5 font-sans text-xs text-gold-deep">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          有未保存的改动
        </div>
      )}
      {error && (
        <div
          className="mb-6 border border-state-error/40 bg-state-error/5 px-4 py-3 font-sans text-sm text-state-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-6 inline-flex items-center gap-2 border border-state-success/40 bg-state-success/5 px-4 py-3 font-sans text-sm text-state-success"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* 左侧：表单 */}
        <div className="space-y-6">
          {/* 文案 */}
          <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gold" aria-hidden="true" />
              <h3 className="display-card text-ink">页面文案</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-luxury" htmlFor="cat-layout-eyebrow">
                  顶部小标签
                </label>
                <input
                  id="cat-layout-eyebrow"
                  type="text"
                  value={form.eyebrow || ''}
                  onChange={(e) => update('eyebrow', e.target.value)}
                  className={inputClass}
                  placeholder="分类导览"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="label-luxury" htmlFor="cat-layout-title">
                  页面标题
                </label>
                <input
                  id="cat-layout-title"
                  type="text"
                  value={form.title || ''}
                  onChange={(e) => update('title', e.target.value)}
                  className={inputClass}
                  placeholder="分类一览"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="label-luxury" htmlFor="cat-layout-subtitle">
                  副标题
                </label>
                <input
                  id="cat-layout-subtitle"
                  type="text"
                  value={form.subtitle || ''}
                  onChange={(e) => update('subtitle', e.target.value)}
                  className={inputClass}
                  placeholder="按品类探索盆景，寻觅心仪之选"
                  maxLength={200}
                />
              </div>
            </div>
          </section>

          {/* 排版 */}
          <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gold" aria-hidden="true" />
              <h3 className="display-card text-ink">排版方式</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {LAYOUT_MODE_OPTIONS.map((opt) => {
                const Icon =
                  opt.value === 'grid'
                    ? LayoutGrid
                    : opt.value === 'masonry'
                    ? Columns2
                    : ListIcon;
                const active = form.layout === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('layout', opt.value)}
                    aria-pressed={active}
                    className={cn(
                      'border p-4 text-left transition-all',
                      active
                        ? 'border-gold bg-gold/5'
                        : 'border-[var(--penjing-border-fine)] hover:border-[var(--penjing-border-strong)]',
                    )}
                  >
                    <Icon
                      className={cn(
                        'mb-2 h-5 w-5',
                        active ? 'text-gold-deep' : 'text-ink-text-secondary',
                      )}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <p className={cn('font-sans text-sm font-medium', active ? 'text-gold-deep' : 'text-ink')}>
                      {opt.label}
                    </p>
                    <p className="mt-1 font-sans text-xs text-ink-text-muted">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 列数 + 宽高比 */}
          <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gold" aria-hidden="true" />
              <h3 className="display-card text-ink">网格参数</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-luxury" htmlFor="cat-layout-columns">
                  每行列数（桌面端）
                </label>
                <select
                  id="cat-layout-columns"
                  value={form.columns}
                  onChange={(e) => update('columns', Number(e.target.value) as 2 | 3 | 4)}
                  className={inputClass}
                  disabled={form.layout === 'list'}
                >
                  {COLUMNS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {form.layout === 'list' && (
                  <p className="mt-1 font-sans text-xs text-ink-text-muted">列表模式下不适用</p>
                )}
              </div>
              <div>
                <label className="label-luxury" htmlFor="cat-layout-aspect">
                  卡片宽高比
                </label>
                <select
                  id="cat-layout-aspect"
                  value={form.aspect}
                  onChange={(e) => update('aspect', e.target.value as CategoriesLayoutConfig['aspect'])}
                  className={inputClass}
                  disabled={form.layout === 'masonry'}
                >
                  {CARD_ASPECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {form.layout === 'masonry' && (
                  <p className="mt-1 font-sans text-xs text-ink-text-muted">瀑布流由图片自然高度决定</p>
                )}
              </div>
            </div>
          </section>

          {/* 排序 */}
          <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gold" aria-hidden="true" />
              <h3 className="display-card text-ink">排序方式</h3>
            </div>
            <div className="space-y-2">
              {SORT_BY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 border p-3 transition-colors',
                    form.sortBy === opt.value
                      ? 'border-gold bg-gold/5'
                      : 'border-[var(--penjing-border-fine)] hover:border-[var(--penjing-border-strong)]',
                  )}
                >
                  <input
                    type="radio"
                    name="cat-sort-by"
                    value={opt.value}
                    checked={form.sortBy === opt.value}
                    onChange={() => update('sortBy', opt.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      form.sortBy === opt.value
                        ? 'border-gold'
                        : 'border-[var(--penjing-border-strong)]',
                    )}
                    aria-hidden="true"
                  >
                    {form.sortBy === opt.value && (
                      <span className="h-2 w-2 rounded-full bg-gold" />
                    )}
                  </span>
                  <span className="font-sans text-sm text-ink">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 显示开关 */}
          <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gold" aria-hidden="true" />
              <h3 className="display-card text-ink">显示开关</h3>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="显示分类描述"
                description="在卡片底部显示分类描述文本"
                checked={form.showDescription}
                onChange={(v) => update('showDescription', v)}
              />
              <ToggleRow
                label="显示探索箭头"
                description="卡片底部显示「探索 →」引导"
                checked={form.showArrow}
                onChange={(v) => update('showArrow', v)}
              />
              <ToggleRow
                label="显示渐变遮罩"
                description="卡片图片底部叠加渐变，提升文字可读性"
                checked={form.showOverlay}
                onChange={(v) => update('showOverlay', v)}
              />
            </div>
          </section>
        </div>

        {/* 右侧：迷你预览 */}
        <div>
          <div className="sticky top-24">
            <div className="mb-3 flex items-center gap-2 text-ink">
              <Eye className="h-4 w-4 text-gold-deep" strokeWidth={1.5} aria-hidden="true" />
              <span className="display-card text-ink">实时预览</span>
            </div>
            <div className="border border-[var(--penjing-border-fine)] bg-paper p-4">
              <div className="mb-3 text-center">
                {form.eyebrow && (
                  <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ink-text-muted">
                    {form.eyebrow}
                  </span>
                )}
                <p className="display-card text-ink">
                  {form.title || '分类一览'}
                </p>
                {form.subtitle && (
                  <p className="mt-1 font-sans text-[10px] text-ink-text-secondary">{form.subtitle}</p>
                )}
              </div>
              {/* 预览网格 */}
              {form.layout === 'list' ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <PreviewCard
                      key={i}
                      aspectCss={aspectCss}
                      showOverlay={form.showOverlay}
                      showDescription={form.showDescription}
                      showArrow={form.showArrow}
                      name={`分类 ${i + 1}`}
                      description="示例描述文本"
                      width="100%"
                    />
                  ))}
                </div>
              ) : form.layout === 'masonry' ? (
                <div
                  className="gap-2 [column-fill:_balance]"
                  style={{ columnCount: Math.min(form.columns, 3) }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="mb-2 break-inside-avoid">
                      <PreviewCard
                        aspectCss={i % 2 === 0 ? '4 / 5' : '3 / 4'}
                        showOverlay={form.showOverlay}
                        showDescription={form.showDescription}
                        showArrow={form.showArrow}
                        name={`分类 ${i + 1}`}
                        description="示例描述"
                        width="100%"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn('grid grid-cols-2 gap-2', previewGridClass)}>
                  {Array.from({ length: form.columns * 2 }).map((_, i) => (
                    <PreviewCard
                      key={i}
                      aspectCss={aspectCss}
                      showOverlay={form.showOverlay}
                      showDescription={form.showDescription}
                      showArrow={form.showArrow}
                      name={`分类 ${i + 1}`}
                      description="示例描述"
                      width="100%"
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 font-sans text-xs text-ink-text-muted">
              注：预览为示意图，实际显示以用户端 /categories 页面为准
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 切换行
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 border border-[var(--penjing-border-fine)] p-3 transition-colors hover:border-[var(--penjing-border-strong)]">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm text-ink">{label}</p>
        <p className="mt-0.5 font-sans text-xs text-ink-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-gold' : 'bg-[var(--penjing-border-strong)]',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-paper shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

// 预览卡片
function PreviewCard({
  aspectCss,
  showOverlay,
  showDescription,
  showArrow,
  name,
  description,
  width,
}: {
  aspectCss: string;
  showOverlay: boolean;
  showDescription: boolean;
  showArrow: boolean;
  name: string;
  description: string;
  width: string;
}) {
  return (
    <div
      className="relative overflow-hidden bg-ink-deep/40"
      style={{ aspectRatio: aspectCss, width }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-ink-deep/60 to-ink-mid/40" />
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-ink-deep/80 to-transparent" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="font-serif text-xs text-paper">{name}</p>
        {showDescription && (
          <p className="mt-0.5 line-clamp-1 text-[9px] text-paper/60">{description}</p>
        )}
        {showArrow && (
          <p className="mt-1 font-sans text-[9px] uppercase tracking-wider text-gold">探索 →</p>
        )}
      </div>
    </div>
  );
}
