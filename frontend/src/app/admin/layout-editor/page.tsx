// 主页布局编辑器（WordPress 式主题定制器）
//
// 路由：/admin/layout-editor
// 功能：
// - 左侧：区块列表 + 选中区块的配置表单
// - 右侧：实时预览（使用 HomeRenderer 直接渲染当前 sections）
// - 顶部：保存、激活、重置、预览新标签页
// - 添加区块：可视化卡片选择
//
// 接口：
// - GET /admin/settings/layout/homepage（编辑回显）
// - PUT /admin/settings/layout/homepage（保存 sections）
// - PATCH /admin/settings/layout/homepage/activate（激活）
// - POST /admin/settings/layout/homepage/reset（重置默认）

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  LayoutTemplate,
  Save,
  Loader2,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  GripVertical,
  CheckCircle2,
  ExternalLink,
  X,
  Monitor,
  Smartphone,
  Tablet,
  ImageIcon,
  Type,
  Grid3X3,
  Sparkles,
  ShoppingBag,
  Phone,
  BarChart3,
  Layers,
  Megaphone,
  ScrollText,
  FileText,
  LayoutGrid,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  SECTION_TYPE_META,
  getDefaultConfigByType,
} from '@/lib/default-layout';
import type { HomeSection, HomeSectionType, SiteLayout } from '@/lib/types';
import { SectionConfigEditor } from './SectionConfigEditor';
import { HomeRenderer } from '@/components/home/HomeRenderer';

const LAYOUT_KEY = 'homepage';

// 区块类型 -> 图标映射
const SECTION_ICONS: Record<HomeSectionType, React.ElementType> = {
  hero: ImageIcon,
  carousel: Layers,
  featured: Sparkles,
  categories: LayoutGrid,
  'bonsai-grid': Grid3X3,
  showcase: ShoppingBag,
  story: ScrollText,
  cta: Megaphone,
  contact: Phone,
  stats: BarChart3,
  'text-image': ImageIcon,
  'product-list': ShoppingBag,
  text: FileText,
};

// 简单 uuid 生成
function genId(): string {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LayoutEditorPage() {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  // 拖拽状态
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 拉取当前布局
  const { data: layout, isLoading } = useQuery<SiteLayout | null>({
    queryKey: ['admin-layout', LAYOUT_KEY],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: SiteLayout | null }>(
          `/admin/settings/layout/${LAYOUT_KEY}`,
        );
        return res.data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
  });

  // 同步后端数据到本地状态
  useEffect(() => {
    if (layout) {
      setSections(layout.sections);
      setIsActive(layout.isActive);
    } else if (!isLoading) {
      setSections(DEFAULT_HOMEPAGE_SECTIONS);
      setIsActive(false);
    }
  }, [layout, isLoading]);

  // 选中第一个区块（仅初次加载时）
  useEffect(() => {
    if (!selectedId && sections.length > 0) {
      setSelectedId(sections[0].id);
    }
  }, [sections, selectedId]);

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId],
  );

  // 是否有未保存的改动
  const hasChanges = useMemo(() => {
    if (!layout) return sections.length > 0;
    if (layout.sections.length !== sections.length) return true;
    return JSON.stringify(layout.sections) !== JSON.stringify(sections);
  }, [layout, sections]);

  // ====== 区块操作 ======

  const updateSection = (id: string, patch: Partial<HomeSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const updateSectionConfig = (id: string, configPatch: Record<string, unknown>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, ...configPatch } } : s,
      ),
    );
  };

  const toggleVisible = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    );
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setSections((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return prev;
      const tmp = sorted[idx].order;
      sorted[idx].order = sorted[targetIdx].order;
      sorted[targetIdx].order = tmp;
      return [...sorted];
    });
  };

  const deleteSection = (id: string) => {
    if (!window.confirm('确定要删除该区块吗？')) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addSection = (type: HomeSectionType) => {
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), 0);
    const meta = SECTION_TYPE_META.find((m) => m.type === type);
    const newSection: HomeSection = {
      id: genId(),
      type,
      title: meta?.label || type,
      subtitle: '',
      visible: true,
      order: maxOrder + 1,
      config: getDefaultConfigByType(type),
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedId(newSection.id);
    setShowAddPanel(false);
  };

  // ====== 拖拽排序 ======

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setSections((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(dragIndex, 1);
      sorted.splice(index, 0, moved);
      return sorted.map((s, i) => ({ ...s, order: i + 1 }));
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ====== 保存 / 激活 / 重置 ======

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await api.put<{ data: SiteLayout }>(
        `/admin/settings/layout/${LAYOUT_KEY}`,
        { sections },
      );
      setSections(res.data.sections);
      setIsActive(res.data.isActive);
      queryClient.invalidateQueries({ queryKey: ['admin-layout', LAYOUT_KEY] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setSuccess('布局已保存');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (hasChanges) {
      if (!window.confirm('当前有未保存的改动，激活前会自动保存。是否继续？')) {
        return;
      }
      setSaving(true);
      try {
        const res = await api.put<{ data: SiteLayout }>(
          `/admin/settings/layout/${LAYOUT_KEY}`,
          { sections },
        );
        setSections(res.data.sections);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '保存失败');
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }
    setError('');
    setSuccess('');
    setActivating(true);
    try {
      await api.patch(`/admin/settings/layout/${LAYOUT_KEY}/activate`);
      setIsActive(true);
      queryClient.invalidateQueries({ queryKey: ['admin-layout', LAYOUT_KEY] });
      setSuccess('布局已激活，前台将立即生效');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '激活失败');
    } finally {
      setActivating(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('确定要将主页布局重置为默认配置吗？此操作不可撤销。')) {
      return;
    }
    setError('');
    setSuccess('');
    setResetting(true);
    try {
      const res = await api.post<{ data: SiteLayout }>(
        `/admin/settings/layout/${LAYOUT_KEY}/reset`,
      );
      setSections(res.data.sections);
      setIsActive(res.data.isActive);
      queryClient.invalidateQueries({ queryKey: ['admin-layout', LAYOUT_KEY] });
      setSuccess('已重置为默认配置');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重置失败');
    } finally {
      setResetting(false);
    }
  };

  // ====== 预览宽度 ======

  const previewWidthClass = {
    desktop: 'w-full',
    tablet: 'max-w-[820px]',
    mobile: 'max-w-[375px]',
  }[previewMode];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
      </div>
    );
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-text-muted/15 bg-background px-6 py-4">
        <div>
          <h1 className="font-serif text-2xl text-primary">主页布局</h1>
          <p className="mt-0.5 text-xs text-text-muted">
            像 WordPress 主题定制器一样，拖拽调整区块、编辑内容并实时预览
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 状态提示 */}
          {isActive ? (
            <span className="mr-2 inline-flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              已激活
            </span>
          ) : (
            <span className="mr-2 inline-flex items-center gap-1.5 text-xs text-amber-600">
              未激活
            </span>
          )}
          {hasChanges && (
            <span className="mr-2 text-xs text-amber-600">有未保存改动</span>
          )}

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-wider text-text-light transition-colors hover:border-text-light"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            新窗口预览
          </Link>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-wider text-text-light transition-colors hover:border-text-light disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            重置默认
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 border border-accent px-4 py-2 text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            保存
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating || (isActive && !hasChanges)}
            className="flex items-center gap-1.5 bg-primary px-4 py-2 text-xs uppercase tracking-wider text-background transition-colors hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {activating ? '激活中' : isActive ? '已激活' : '激活'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="border-b border-red-300 bg-red-50 px-6 py-2 text-xs text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="border-b border-green-300 bg-green-50 px-6 py-2 text-xs text-green-700"
          role="status"
        >
          {success}
        </div>
      )}

      {/* 主体：左侧定制面板 + 右侧实时预览 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧定制面板 */}
        <div className="flex w-[420px] flex-col border-r border-text-muted/15 bg-background">
          {/* 区块列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-base text-primary">区块列表</h2>
              <button
                type="button"
                onClick={() => setShowAddPanel(true)}
                className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-primary-dark transition-colors hover:bg-accent-light"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                添加区块
              </button>
            </div>

            <div className="space-y-2">
              {sortedSections.map((section, index) => {
                const meta = SECTION_TYPE_META.find((m) => m.type === section.type);
                const Icon = SECTION_ICONS[section.type] || LayoutTemplate;
                const isSelected = selectedId === section.id;
                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedId(section.id)}
                    className={cn(
                      'group cursor-pointer rounded border p-3 transition-all',
                      isSelected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                        : 'border-text-muted/20 bg-surface hover:border-text-muted/40',
                      dragOverIndex === index && dragIndex !== index
                        ? 'border-t-2 border-t-accent'
                        : '',
                      !section.visible && 'opacity-50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical
                        className="h-4 w-4 flex-shrink-0 cursor-grab text-text-muted/40 group-hover:text-text-muted"
                        aria-label="拖拽排序"
                      />
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary-dark/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-primary">
                            {section.title || meta?.label || section.type}
                          </span>
                          {!section.visible && (
                            <span className="flex-shrink-0 rounded bg-text-muted/10 px-1.5 py-0.5 text-[10px] text-text-muted">
                              隐藏
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-text-muted">
                          {meta?.description || section.type}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVisible(section.id);
                          }}
                          aria-label={section.visible ? '隐藏区块' : '显示区块'}
                          aria-pressed={section.visible}
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-text-muted/10 hover:text-primary"
                        >
                          {section.visible ? (
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'up');
                          }}
                          disabled={index === 0}
                          aria-label="上移"
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-text-muted/10 hover:text-primary disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'down');
                          }}
                          disabled={index === sortedSections.length - 1}
                          aria-label="下移"
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-text-muted/10 hover:text-primary disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSection(section.id);
                          }}
                          aria-label="删除区块"
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {sortedSections.length === 0 && (
                <div className="rounded border border-dashed border-text-muted/30 py-12 text-center text-sm text-text-muted">
                  暂无区块，点击「添加区块」创建
                </div>
              )}
            </div>
          </div>

          {/* 配置面板 */}
          <div className="max-h-[55%] overflow-y-auto border-t border-text-muted/15 p-4">
            {selectedSection ? (
              <SectionConfigEditor
                section={selectedSection}
                onUpdate={(patch) => updateSection(selectedSection.id, patch)}
                onUpdateConfig={(configPatch) =>
                  updateSectionConfig(selectedSection.id, configPatch)
                }
              />
            ) : (
              <div className="rounded border border-dashed border-text-muted/30 py-12 text-center text-sm text-text-muted">
                <LayoutTemplate
                  className="mx-auto mb-3 h-8 w-8 text-text-muted/40"
                  strokeWidth={1}
                />
                请从上方选择一个区块进行编辑
              </div>
            )}
          </div>
        </div>

        {/* 右侧实时预览 */}
        <div className="flex flex-1 flex-col overflow-hidden bg-text-muted/5">
          <div className="flex items-center justify-between border-b border-text-muted/15 bg-background px-4 py-2">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              实时预览
            </span>
            <div className="flex items-center gap-1 rounded border border-text-muted/20 p-1">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                aria-label="桌面端预览"
                aria-pressed={previewMode === 'desktop'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  previewMode === 'desktop'
                    ? 'bg-primary-dark text-background'
                    : 'text-text-muted hover:bg-text-muted/10',
                )}
              >
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('tablet')}
                aria-label="平板预览"
                aria-pressed={previewMode === 'tablet'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  previewMode === 'tablet'
                    ? 'bg-primary-dark text-background'
                    : 'text-text-muted hover:bg-text-muted/10',
                )}
              >
                <Tablet className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                aria-label="移动端预览"
                aria-pressed={previewMode === 'mobile'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  previewMode === 'mobile'
                    ? 'bg-primary-dark text-background'
                    : 'text-text-muted hover:bg-text-muted/10',
                )}
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className={cn('mx-auto bg-background shadow-xl', previewWidthClass)}>
              {/* 预览区域渲染实际首页组件 */}
              <HomeRenderer sections={sortedSections} />
              {/* 底部占位，避免预览贴边 */}
              <div className="h-20 bg-primary-dark" />
            </div>
          </div>
        </div>
      </div>

      {/* 添加区块面板（模态） */}
      {showAddPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/60 p-4">
          <div
            className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded bg-surface p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="添加区块"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-primary">添加区块</h3>
                <p className="mt-1 text-xs text-text-muted">选择要添加到首页的区块类型</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPanel(false)}
                aria-label="关闭"
                className="text-text-muted hover:text-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_TYPE_META.map((meta) => {
                const Icon = SECTION_ICONS[meta.type] || LayoutTemplate;
                return (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => addSection(meta.type)}
                    className="flex items-start gap-3 rounded border border-text-muted/20 p-4 text-left transition-all hover:border-accent hover:bg-accent/5"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-primary-dark/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">{meta.label}</p>
                      <p className="mt-1 text-xs text-text-muted">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
