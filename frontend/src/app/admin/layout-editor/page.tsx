// 主页布局编辑器（WordPress 式主题定制器 · 三栏工作台）
//
// 路由：/admin/layout-editor
// 布局：左栏区块列表 / 中栏实时预览 / 右栏属性编辑面板
// - 桌面端（lg+）：三栏并排显示
// - 移动端：单栏 + 顶部标签切换（区块 / 预览 / 属性）
//
// 视觉语言：东方雅致 · 墨绿+金色
// - 顶部工具栏：paper 背景 + hairline 分隔
// - 三栏统一使用 ink/gold/paper token
// - 选中态：金色描边 + 纸面暖底
// - 状态指示：金色（已激活）+ 墨色（未激活）
//
// 接口：
// - GET /admin/settings/layout/homepage（编辑回显）
// - PUT /admin/settings/layout/homepage（保存 sections）
// - PATCH /admin/settings/layout/homepage/activate（激活）
// - POST /admin/settings/layout/homepage/reset（重置默认）

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import type { HomeSection, HomeSectionType, SiteLayout, LayoutDraft, LayoutPreviewToken } from '@/lib/types';
import { SectionConfigEditor } from './SectionConfigEditor';
import { HomeRenderer } from '@/components/home/HomeRenderer';

// 自动保存防抖延迟（ms）
const AUTO_SAVE_DELAY = 2000;

const LAYOUT_KEY = 'homepage';

const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

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

// 移动端标签类型
type MobileTab = 'blocks' | 'preview' | 'config';

export default function LayoutEditorPage() {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  // 移动端标签切换
  const [mobileTab, setMobileTab] = useState<MobileTab>('blocks');
  // 拖拽状态
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 自动保存防抖定时器
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 拉取当前草稿（无草稿时后端返回已发布版本）
  const { data: draft, isLoading } = useQuery<LayoutDraft | null>({
    queryKey: ['admin-layout-draft', LAYOUT_KEY],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: LayoutDraft | null }>(
          `/admin/settings/layout/${LAYOUT_KEY}/draft`,
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

  // 同步后端草稿数据到本地状态
  useEffect(() => {
    if (draft) {
      setSections(draft.sections);
      setIsActive(draft.isActive);
      setLastSavedAt(draft.draftUpdatedAt);
    } else if (!isLoading) {
      setSections(DEFAULT_HOMEPAGE_SECTIONS);
      setIsActive(false);
      setLastSavedAt(null);
    }
  }, [draft, isLoading]);

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

  // 是否有未保存的改动（与后端草稿/已发布版本比较）
  const hasChanges = useMemo(() => {
    if (!draft) return sections.length > 0;
    if (draft.sections.length !== sections.length) return true;
    return JSON.stringify(draft.sections) !== JSON.stringify(sections);
  }, [draft, sections]);

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
    setMobileTab('config');
  };

  const handleSelectSection = (id: string) => {
    setSelectedId(id);
    setMobileTab('config');
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

  // ====== 草稿工作流：自动保存 / 手动保存 / 发布 / 预览 / 丢弃 / 重置 ======

  /**
   * 保存草稿核心逻辑（手动 + 自动保存共用）
   */
  const doSaveDraft = async (sectionsToSave: HomeSection[]): Promise<boolean> => {
    setError('');
    try {
      const res = await api.put<{ data: { key: string; draftUpdatedAt: string } }>(
        `/admin/settings/layout/${LAYOUT_KEY}/draft`,
        { sections: sectionsToSave },
      );
      setLastSavedAt(res.data.draftUpdatedAt);
      queryClient.invalidateQueries({ queryKey: ['admin-layout-draft', LAYOUT_KEY] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '自动保存失败');
      return false;
    }
  };

  // 自动保存：sections 变化且存在未保存改动时，debounce 后保存草稿
  useEffect(() => {
    if (!hasChanges || saving || publishing || discarding || resetting) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaving(true);
    autoSaveTimerRef.current = setTimeout(async () => {
      const ok = await doSaveDraft(sections);
      if (ok) {
        setSuccess('已自动保存草稿');
        setTimeout(() => setSuccess(''), 2000);
      }
      setAutoSaving(false);
      autoSaveTimerRef.current = null;
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, hasChanges, saving, publishing, discarding, resetting]);

  const handleSaveDraft = async () => {
    setSuccess('');
    setSaving(true);
    // 取消正在进行的自动保存，避免冲突
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const ok = await doSaveDraft(sections);
    if (ok) {
      setSuccess('草稿已保存');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
    setAutoSaving(false);
  };

  const handlePublish = async () => {
    if (hasChanges) {
      if (!window.confirm('当前有未保存的改动，发布前会先保存草稿。是否继续？')) {
        return;
      }
      setSaving(true);
      const ok = await doSaveDraft(sections);
      setSaving(false);
      if (!ok) return;
    }

    if (!window.confirm('发布后将把草稿覆盖到前台生效版本，是否继续？')) {
      return;
    }

    setError('');
    setSuccess('');
    setPublishing(true);
    try {
      const res = await api.post<{ data: SiteLayout }>(
        `/admin/settings/layout/${LAYOUT_KEY}/publish`,
        { clearDraft: true },
      );
      setSections(res.data.sections);
      setIsActive(res.data.isActive);
      queryClient.invalidateQueries({ queryKey: ['admin-layout-draft', LAYOUT_KEY] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setSuccess('布局已发布，前台将立即生效');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm('确定要丢弃当前草稿并回退到已发布版本吗？未发布的改动将丢失。')) {
      return;
    }
    setError('');
    setSuccess('');
    setDiscarding(true);
    try {
      const res = await api.post<{ data: SiteLayout }>(
        `/admin/settings/layout/${LAYOUT_KEY}/draft/discard`,
      );
      setSections(res.data.sections);
      setIsActive(res.data.isActive);
      queryClient.invalidateQueries({ queryKey: ['admin-layout-draft', LAYOUT_KEY] });
      setSuccess('已丢弃草稿，回退到已发布版本');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '丢弃草稿失败');
    } finally {
      setDiscarding(false);
    }
  };

  const handlePreview = async () => {
    // 预览前先保存当前草稿，保证预览内容是最新的
    if (hasChanges) {
      setSaving(true);
      const ok = await doSaveDraft(sections);
      setSaving(false);
      if (!ok) return;
    }

    setError('');
    setPreviewing(true);
    try {
      const res = await api.post<{ data: LayoutPreviewToken }>(
        `/admin/settings/layout/${LAYOUT_KEY}/preview-token`,
        { ttlMinutes: 10 },
      );
      window.open(res.data.previewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '生成预览链接失败');
    } finally {
      setPreviewing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('确定要将主页布局重置为默认配置吗？此操作会同时清空草稿且不可撤销。')) {
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
      queryClient.invalidateQueries({ queryKey: ['admin-layout-draft', LAYOUT_KEY] });
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
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
      </div>
    );
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // 移动端标签配置
  const mobileTabs: Array<{ key: MobileTab; label: string }> = [
    { key: 'blocks', label: '区块' },
    { key: 'preview', label: '预览' },
    { key: 'config', label: '属性' },
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-paper">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--penjing-border-hairline)] bg-paper px-5 py-4 md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="eyebrow-label text-gold-deep">控制台 · 站点编辑器</span>
            {isActive ? (
              <span className="inline-flex items-center gap-1 border border-gold bg-gold/10 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-gold-deep">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                已发布
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 border border-[var(--penjing-border-strong)] px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-ink-text-muted">
                未发布
              </span>
            )}
            {draft?.hasUnpublishedChanges && (
              <span className="inline-flex items-center gap-1 border border-state-warning/40 bg-state-warning/5 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-state-warning">
                有未发布草稿
              </span>
            )}
            {autoSaving && (
              <span className="inline-flex items-center gap-1 font-sans text-[10px] uppercase tracking-wider text-ink-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                自动保存中
              </span>
            )}
            {!autoSaving && !hasChanges && lastSavedAt && (
              <span className="font-sans text-[10px] uppercase tracking-wider text-ink-text-muted">
                草稿已保存
              </span>
            )}
            {hasChanges && !autoSaving && (
              <span className="font-sans text-[10px] uppercase tracking-wider text-state-warning">
                有未保存改动
              </span>
            )}
          </div>
          <h1 className="mt-2 font-serif text-2xl text-ink">主页布局</h1>
          <p className="body-caption mt-1">
            像 WordPress 主题定制器一样，拖拽调整区块、编辑内容并实时预览。改动将在 2 秒后自动保存为草稿，发布后才对前台生效。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 border border-[var(--penjing-border-strong)] px-4 py-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            前台预览
          </Link>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-1.5 border border-[var(--penjing-border-strong)] px-4 py-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
            aria-label="草稿预览"
          >
            {previewing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            草稿预览
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 border border-[var(--penjing-border-strong)] px-4 py-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
            aria-label="重置默认"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            重置
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={discarding || !draft?.hasUnpublishedChanges}
            className="flex items-center gap-1.5 border border-[var(--penjing-border-strong)] px-4 py-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-state-error hover:text-state-error disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="丢弃草稿"
          >
            {discarding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            丢弃草稿
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 border border-gold px-4 py-2 font-sans text-[11px] uppercase tracking-[0.2em] text-gold-deep transition-colors hover:bg-gold hover:text-ink-deepest disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="保存草稿"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            保存草稿
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="btn-ink !px-4 !py-2 !text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发布布局"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {publishing ? '发布中' : '发布'}
          </button>
        </div>
      </div>

      {/* 消息条 */}
      {error && (
        <div
          className="border-b border-[rgba(184,66,58,0.3)] bg-[rgba(184,66,58,0.06)] px-6 py-2 font-sans text-xs text-state-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="border-b border-[rgba(45,90,61,0.3)] bg-[rgba(45,90,61,0.06)] px-6 py-2 font-sans text-xs text-ink-soft"
          role="status"
        >
          {success}
        </div>
      )}

      {/* 移动端标签切换（< lg） */}
      <div className="flex border-b border-[var(--penjing-border-hairline)] bg-paper-warm lg:hidden">
        {mobileTabs.map((tab) => {
          const active = mobileTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMobileTab(tab.key)}
              aria-pressed={active}
              className={cn(
                'flex-1 px-4 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.25em] transition-colors',
                active
                  ? 'border-b-2 border-gold bg-paper text-gold-deep'
                  : 'text-ink-text-secondary hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 主体：三栏工作台 */}
      <div className="flex flex-1 overflow-hidden">
        {/* ====== 左栏：区块列表 ====== */}
        <aside
          className={cn(
            'flex w-72 flex-shrink-0 flex-col border-r border-[var(--penjing-border-hairline)] bg-paper',
            mobileTab !== 'blocks' && 'hidden lg:flex',
          )}
          aria-label="区块列表面板"
        >
          {/* 标题区 */}
          <div className="flex items-center justify-between border-b border-[var(--penjing-border-hairline)] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-gold" aria-hidden="true" />
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                区块列表
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-1 border border-gold bg-gold px-2.5 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-ink-deepest transition-colors hover:bg-gold-bright"
              aria-label="添加区块"
            >
              <Plus className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              添加
            </button>
          </div>

          {/* 区块列表（可滚动） */}
          <div className="admin-scroll flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {sortedSections.map((section, index) => {
                const meta = SECTION_TYPE_META.find((m) => m.type === section.type);
                const Icon = SECTION_ICONS[section.type] || LayoutTemplate;
                const isSelected = selectedId === section.id;
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE_SOFT }}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleSelectSection(section.id)}
                    className={cn(
                      'group cursor-pointer border p-3 transition-all duration-300',
                      isSelected
                        ? 'border-gold bg-gold/6 shadow-[inset_2px_0_0_0_var(--penjing-gold)]'
                        : 'border-[var(--penjing-border-hairline)] bg-paper-warm hover:border-[var(--penjing-border-gold)] hover:bg-paper',
                      dragOverIndex === index && dragIndex !== index
                        ? 'border-t-2 border-t-gold'
                        : '',
                      !section.visible && 'opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <GripVertical
                        className="h-4 w-4 flex-shrink-0 cursor-grab text-ink-text-faint transition-colors group-hover:text-ink-text-muted"
                        aria-label="拖拽排序"
                      />
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--penjing-border-fine)] bg-paper text-ink">
                        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-sans text-sm font-medium text-ink">
                            {section.title || meta?.label || section.type}
                          </span>
                          {!section.visible && (
                            <span className="flex-shrink-0 border border-[var(--penjing-border-strong)] bg-paper px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wider text-ink-text-muted">
                              隐藏
                            </span>
                          )}
                        </div>
                        <p className="truncate font-sans text-xs text-ink-text-muted">
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
                          className="flex h-7 w-7 items-center justify-center text-ink-text-muted transition-colors hover:bg-paper-warm hover:text-ink"
                        >
                          {section.visible ? (
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
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
                          className="flex h-7 w-7 items-center justify-center text-ink-text-muted transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'down');
                          }}
                          disabled={index === sortedSections.length - 1}
                          aria-label="下移"
                          className="flex h-7 w-7 items-center justify-center text-ink-text-muted transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSection(section.id);
                          }}
                          aria-label="删除区块"
                          className="flex h-7 w-7 items-center justify-center text-ink-text-muted transition-colors hover:bg-[rgba(184,66,58,0.08)] hover:text-state-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {sortedSections.length === 0 && (
                <div className="border border-dashed border-[var(--penjing-border-strong)] py-12 text-center font-sans text-sm text-ink-text-muted">
                  暂无区块，点击「添加」创建
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ====== 中栏：实时预览 ====== */}
        <main
          className={cn(
            'flex flex-1 flex-col overflow-hidden bg-paper-warm/50',
            mobileTab !== 'preview' && 'hidden lg:flex',
          )}
          aria-label="实时预览面板"
        >
          {/* 预览工具栏 */}
          <div className="flex items-center justify-between border-b border-[var(--penjing-border-hairline)] bg-paper px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-gold" aria-hidden="true" />
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                实时预览
              </span>
            </div>
            <div className="flex items-center gap-0.5 border border-[var(--penjing-border-fine)] bg-paper p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                aria-label="桌面端预览"
                aria-pressed={previewMode === 'desktop'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center transition-colors',
                  previewMode === 'desktop'
                    ? 'bg-ink text-paper'
                    : 'text-ink-text-muted hover:bg-paper-warm hover:text-ink',
                )}
              >
                <Monitor className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('tablet')}
                aria-label="平板预览"
                aria-pressed={previewMode === 'tablet'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center transition-colors',
                  previewMode === 'tablet'
                    ? 'bg-ink text-paper'
                    : 'text-ink-text-muted hover:bg-paper-warm hover:text-ink',
                )}
              >
                <Tablet className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                aria-label="移动端预览"
                aria-pressed={previewMode === 'mobile'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center transition-colors',
                  previewMode === 'mobile'
                    ? 'bg-ink text-paper'
                    : 'text-ink-text-muted hover:bg-paper-warm hover:text-ink',
                )}
              >
                <Smartphone className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* 预览内容 */}
          <div className="admin-scroll flex-1 overflow-y-auto p-6">
            <div
              className={cn(
                'mx-auto bg-paper shadow-[var(--penjing-shadow-static)] transition-all duration-500',
                previewWidthClass,
              )}
            >
              {/* 预览区域渲染实际首页组件 */}
              <HomeRenderer sections={sortedSections} />
              {/* 底部占位，避免预览贴边 */}
              <div className="h-20 bg-ink-deep" />
            </div>
          </div>
        </main>

        {/* ====== 右栏：属性编辑面板 ====== */}
        <aside
          className={cn(
            'flex w-96 flex-shrink-0 flex-col border-l border-[var(--penjing-border-hairline)] bg-paper',
            mobileTab !== 'config' && 'hidden lg:flex',
          )}
          aria-label="属性编辑面板"
        >
          {/* 面板标题区 */}
          <div className="border-b border-[var(--penjing-border-hairline)] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-gold" aria-hidden="true" />
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                属性配置
              </span>
            </div>
            {selectedSection && (
              <p className="mt-1.5 font-serif text-base text-ink">
                {selectedSection.title || selectedSection.type}
              </p>
            )}
          </div>

          {/* 配置编辑器（可滚动） */}
          <div className="admin-scroll flex-1 overflow-y-auto p-4">
            {selectedSection ? (
              <SectionConfigEditor
                section={selectedSection}
                onUpdate={(patch) => updateSection(selectedSection.id, patch)}
                onUpdateConfig={(configPatch) =>
                  updateSectionConfig(selectedSection.id, configPatch)
                }
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 border border-dashed border-[var(--penjing-border-strong)] py-12 text-center">
                <LayoutTemplate
                  className="h-8 w-8 text-ink-text-faint"
                  strokeWidth={1}
                  aria-hidden="true"
                />
                <p className="font-sans text-sm text-ink-text-muted">
                  请从左侧选择一个区块进行编辑
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 添加区块面板（模态） */}
      {showAddPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deepest/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: EASE_SOFT }}
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto border border-[var(--penjing-border-fine)] bg-paper p-6 shadow-[var(--penjing-shadow-overlay)]"
            role="dialog"
            aria-modal="true"
            aria-label="添加区块"
          >
            <div className="mb-5 flex items-center justify-between border-b border-[var(--penjing-border-hairline)] pb-4">
              <div>
                <span className="eyebrow-label text-gold-deep">添加区块</span>
                <h3 className="mt-2 font-serif text-xl text-ink">选择区块类型</h3>
                <p className="body-caption mt-1 text-ink-text-muted">
                  选择要添加到首页的区块类型
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPanel(false)}
                aria-label="关闭"
                className="flex h-9 w-9 items-center justify-center text-ink-text-muted transition-colors hover:bg-paper-warm hover:text-ink"
              >
                <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
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
                    className="group flex items-start gap-3 border border-[var(--penjing-border-fine)] bg-paper-warm p-4 text-left transition-all duration-300 hover:border-gold hover:bg-gold/6 hover:shadow-[var(--penjing-shadow-static)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--penjing-border-fine)] bg-paper text-ink transition-colors group-hover:border-gold group-hover:text-gold-deep">
                      <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-medium text-ink">{meta.label}</p>
                      <p className="mt-1 font-sans text-xs text-ink-text-muted">
                        {meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
