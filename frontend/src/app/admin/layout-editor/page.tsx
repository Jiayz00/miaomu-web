// 主页布局编辑器：管理员可拖拽排序、显示/隐藏、增删区块并编辑配置
//
// 路由：/admin/layout-editor
// 功能：
// - 左侧：区块列表（HTML5 拖拽排序，上移/下移，显示/隐藏 toggle，删除）
// - 右侧：选中区块的配置编辑面板（按 type 渲染不同字段）
// - 顶部：保存（PUT）、激活（PATCH）、重置默认（POST reset）、预览
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

const LAYOUT_KEY = 'homepage';

// 简单 uuid 生成（避免引入 uuid 依赖）
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
        // 404 表示布局不存在，返回 null 让前端用默认值初始化
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
      // 后端无布局时，用默认布局初始化本地状态（未保存）
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
      // 交换 order
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
    const newSection: HomeSection = {
      id: genId(),
      type,
      title: SECTION_TYPE_META.find((m) => m.type === type)?.label || type,
      subtitle: '',
      visible: true,
      order: maxOrder + 1,
      config: getDefaultConfigByType(type),
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedId(newSection.id);
    setShowAddPanel(false);
  };

  // ====== 拖拽排序（HTML5 drag-and-drop）======

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
      // 重新分配 order
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
      // 同时刷新前台首页缓存（SSR ISR）
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
      // 先保存
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

  // ====== 渲染 ======

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
      </div>
    );
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* 顶部标题 + 操作按钮 */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-primary">主页布局</h1>
            <p className="mt-1 text-sm text-text-muted">
              拖拽排序区块，编辑配置后保存并激活，前台将按此布局渲染
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 border border-text-muted/30 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-text-light transition-colors hover:border-text-light"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              预览
            </Link>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-2 border border-text-muted/30 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-text-light transition-colors hover:border-text-light disabled:opacity-50"
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
              className="flex items-center gap-2 border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              onClick={handleActivate}
              disabled={activating || (isActive && !hasChanges)}
              className="flex items-center gap-2 bg-primary px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {activating ? '激活中…' : isActive ? '已激活' : '激活'}
            </button>
          </div>
        </div>

        {/* 状态提示 */}
        {isActive ? (
          <div className="mt-4 inline-flex items-center gap-2 border border-green-300 bg-green-50 px-3 py-1.5 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            当前布局已激活，前台正在使用
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            未激活，保存后请点击「激活」使前台生效
          </div>
        )}
        {hasChanges && (
          <div className="mt-2 ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
            有未保存的改动
          </div>
        )}
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

      {/* 主体：左侧区块列表 + 右侧配置面板 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* 左侧：区块列表 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-primary">区块列表</h2>
            <button
              type="button"
              onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-accent transition-colors hover:text-accent-light"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              添加
            </button>
          </div>

          <div className="space-y-2">
            {sortedSections.map((section, index) => {
              const meta = SECTION_TYPE_META.find((m) => m.type === section.type);
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
                    'group cursor-pointer border p-3 transition-all',
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-text-muted/20 bg-surface hover:border-text-muted/40',
                    dragOverIndex === index && dragIndex !== index
                      ? 'border-t-2 border-t-accent'
                      : '',
                    !section.visible && 'opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical
                      className="h-4 w-4 flex-shrink-0 cursor-grab text-text-muted/40 group-hover:text-text-muted"
                      aria-label="拖拽排序"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-primary">
                          {section.title || meta?.label || section.type}
                        </span>
                        <span className="flex-shrink-0 rounded bg-text-muted/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
                          {meta?.label || section.type}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        #{section.order} · {section.id.slice(0, 12)}
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
                        className="flex h-7 w-7 items-center justify-center text-text-muted hover:text-primary"
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
                        className="flex h-7 w-7 items-center justify-center text-text-muted hover:text-primary disabled:opacity-30 disabled:hover:text-text-muted"
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
                        className="flex h-7 w-7 items-center justify-center text-text-muted hover:text-primary disabled:opacity-30 disabled:hover:text-text-muted"
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
                        className="flex h-7 w-7 items-center justify-center text-text-muted hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedSections.length === 0 && (
              <div className="border border-dashed border-text-muted/30 py-12 text-center text-sm text-text-muted">
                暂无区块，点击「添加」创建
              </div>
            )}
          </div>
        </div>

        {/* 右侧：配置编辑面板 */}
        <div>
          <div className="mb-3">
            <h2 className="font-serif text-lg text-primary">区块配置</h2>
          </div>
          {selectedSection ? (
            <SectionConfigEditor
              section={selectedSection}
              onUpdate={(patch) => updateSection(selectedSection.id, patch)}
              onUpdateConfig={(configPatch) =>
                updateSectionConfig(selectedSection.id, configPatch)
              }
            />
          ) : (
            <div className="border border-dashed border-text-muted/30 py-16 text-center text-sm text-text-muted">
              <LayoutTemplate
                className="mx-auto mb-3 h-8 w-8 text-text-muted/40"
                strokeWidth={1}
              />
              请从左侧选择一个区块进行编辑
            </div>
          )}
        </div>
      </div>

      {/* 添加区块面板（模态） */}
      {showAddPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/60 p-4">
          <div
            className="w-full max-w-2xl bg-surface p-6"
            role="dialog"
            aria-modal="true"
            aria-label="添加区块"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl text-primary">添加区块</h3>
              <button
                type="button"
                onClick={() => setShowAddPanel(false)}
                aria-label="关闭"
                className="text-text-muted hover:text-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SECTION_TYPE_META.map((meta) => (
                <button
                  key={meta.type}
                  type="button"
                  onClick={() => addSection(meta.type)}
                  className="border border-text-muted/20 p-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
                >
                  <p className="font-medium text-primary">{meta.label}</p>
                  <p className="mt-1 text-xs text-text-muted">{meta.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
