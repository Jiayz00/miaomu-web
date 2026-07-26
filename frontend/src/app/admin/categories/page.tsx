// 分类管理：卡片网格 + 新增/编辑弹窗 + 排版设置
//
// 设计系统对齐：
// - 顶部标题：eyebrow-label + display-section + 统计计数
// - Tab：金色下划线激活态
// - 分类卡片：paper-warm + 金色左边框 + 元数据网格
// - 弹窗：paper 背景 + 金色描边按钮

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Loader2,
  AlertCircle,
  RefreshCw,
  List as ListIcon,
  LayoutTemplate,
  Image as ImageIcon,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn, resolveImageUrl } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { CategoriesLayoutEditor } from './CategoriesLayoutEditor';

type AdminTab = 'list' | 'layout';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  coverImage: string;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  coverImage: '',
};

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<AdminTab>('list');

  // 模态框打开时：Esc 关闭 + 锁定背景滚动（WCAG 2.1.2 No Keyboard Trap）
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  // 列表
  // 注意：listError 与 form 的 error state 命名隔离，避免覆盖
  const { data: categories, isLoading, isError, error: listError, refetch, isFetching } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
  });

  // 新增
  const createMutation = useMutation({
    mutationFn: async (payload: CategoryForm) => {
      await api.post('/admin/categories', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // 编辑
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Omit<CategoryForm, 'slug'> }) => {
      await api.put(`/admin/categories/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      coverImage: cat.coverImage || '',
    });
    setError('');
    setModalOpen(true);
  };

  // 封面上传（带前端校验）
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_SIZE = 30 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('仅支持 JPG、PNG、WebP 格式的图片');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('图片大小不能超过 30MB');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ data: { url: string } }>(
        '/admin/upload',
        formData
      );
      setForm((prev) => ({ ...prev, coverImage: res.data.url }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '上传失败');
    } finally {
      setUploading(false);
      // 允许重复选择同一文件
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.slug.trim()) {
      setError('请填写分类名称和标识');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // 编辑时后端 UpdateCategoryDto 不允许修改 slug（OmitType 排除），
        // 提交前移除 slug，避免 forbidNonWhitelisted 拦截返回 400
        const { slug: _omit, ...editPayload } = form;
        await updateMutation.mutateAsync({ id: editing.id, payload: editPayload });
      } else {
        await createMutation.mutateAsync(form);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`确定删除分类「${cat.name}」吗？`)) return;
    try {
      await deleteMutation.mutateAsync(cat.id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  // 统一输入样式：与 BonsaiForm 一致的 input-penjing 风格
  const inputClass =
    'w-full border border-[var(--penjing-border-fine)] bg-paper px-4 py-2.5 font-sans text-sm text-ink-text transition-colors placeholder:text-ink-text-faint focus:border-gold focus:outline-none';

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow-label">分类管理</span>
          <h1 className="display-section mt-2 text-ink">分类管理</h1>
          <p className="body-base mt-2 text-ink-text-secondary">
            {tab === 'list'
              ? `共 ${categories?.length || 0} 个分类`
              : '配置用户端分类页的展示方式'}
          </p>
        </div>
        {tab === 'list' && (
          <button
            type="button"
            onClick={openCreate}
            className="btn-gold"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            新增分类
          </button>
        )}
      </div>

      {/* Tab 切换：金色下划线激活态 */}
      <div
        className="mb-8 flex gap-1 border-b border-[var(--penjing-border-fine)]"
        role="tablist"
        aria-label="分类管理视图"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'list'}
          onClick={() => setTab('list')}
          className={cn(
            'flex items-center gap-2 -mb-px border-b-2 px-5 py-3 font-sans text-xs uppercase tracking-[0.2em] transition-colors',
            tab === 'list'
              ? 'border-gold text-gold-deep'
              : 'border-transparent text-ink-text-secondary hover:text-ink-text',
          )}
        >
          <ListIcon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          分类列表
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'layout'}
          onClick={() => setTab('layout')}
          className={cn(
            'flex items-center gap-2 -mb-px border-b-2 px-5 py-3 font-sans text-xs uppercase tracking-[0.2em] transition-colors',
            tab === 'layout'
              ? 'border-gold text-gold-deep'
              : 'border-transparent text-ink-text-secondary hover:text-ink-text',
          )}
        >
          <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          排版设置
        </button>
      </div>

      {/* 列表 Tab */}
      {tab === 'list' && (
        <>
      {/* 分类卡片网格：paper-warm + 金色左边框 + 元数据网格 */}
      {isLoading ? (
        <div className="border border-[var(--penjing-border-fine)] bg-paper-warm px-4 py-16 text-center font-sans text-sm text-ink-text-muted">
          加载中…
        </div>
      ) : isError ? (
        <div className="border border-[var(--penjing-border-fine)] bg-paper-warm px-4 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-state-error" strokeWidth={1.5} aria-hidden="true" />
            <p className="font-sans text-sm text-state-error" role="alert">
              {listError instanceof ApiError ? listError.message : '加载失败，请稍后重试'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 border border-[var(--penjing-border-fine)] px-4 py-1.5 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} aria-hidden="true" />
              重试
            </button>
          </div>
        </div>
      ) : categories && categories.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl-1440:grid-cols-4"
          role="list"
          aria-label="分类列表"
        >
          {categories.map((cat) => (
            <article
              key={cat.id}
              className="flex flex-col gap-4 border border-[var(--penjing-border-fine)] border-l-[3px] border-l-gold bg-paper-warm p-6 transition-colors hover:border-[var(--penjing-border-strong)]"
              role="listitem"
            >
              {/* 卡片头部：封面 + 名称 + slug */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(cat)}
                  className="group relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden bg-paper-aged transition-colors hover:ring-2 hover:ring-gold/50"
                  aria-label={`编辑分类 ${cat.name} 的封面`}
                >
                  {cat.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(cat.coverImage)}
                      alt={cat.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon
                      className="h-5 w-5 text-ink-text-faint"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="display-card text-ink">{cat.name}</h3>
                  <p className="mt-0.5 font-sans text-[11px] tracking-[0.1em] text-ink-text-faint">
                    {cat.slug}
                  </p>
                </div>
              </div>

              {/* 元数据网格 */}
              <dl className="flex flex-col gap-2.5">
                <div className="grid grid-cols-[80px_1fr] gap-3">
                  <dt className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-muted">
                    排序
                  </dt>
                  <dd className="font-sans text-sm text-ink-text">{cat.sort}</dd>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-3">
                  <dt className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-muted">
                    描述
                  </dt>
                  <dd className="font-sans text-sm text-ink-text">
                    {cat.description || '—'}
                  </dd>
                </div>
              </dl>

              {/* 操作区 */}
              <div className="mt-auto flex gap-2 border-t border-[var(--penjing-border-hairline)] pt-3.5">
                <button
                  type="button"
                  onClick={() => openEdit(cat)}
                  className="inline-flex items-center gap-1.5 border border-[var(--penjing-border-fine)] px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep"
                  aria-label={`编辑分类 ${cat.name}`}
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="inline-flex items-center gap-1.5 border border-state-error/30 px-3 py-1.5 font-sans text-xs uppercase tracking-[0.15em] text-state-error transition-colors hover:border-state-error hover:bg-state-error/5"
                  aria-label={`删除分类 ${cat.name}`}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-[var(--penjing-border-fine)] bg-paper-warm px-4 py-16 text-center font-sans text-sm text-ink-text-muted">
          暂无分类
        </div>
      )}

      {/* 新增/编辑弹窗（WCAG 4.1.2 / 2.1.2：role=dialog + aria-modal + Esc 关闭） */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-deepest/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-lg border border-[var(--penjing-border-fine)] bg-paper p-8 shadow-[var(--penjing-shadow-overlay)]"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? '编辑分类' : '新增分类'}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="eyebrow-label">{editing ? '编辑' : '新增'}</span>
                <h2 className="display-card mt-1 text-ink">
                  {editing ? '编辑分类' : '新增分类'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-ink-text-secondary transition-colors hover:text-ink"
                aria-label="关闭弹窗"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" aria-label={editing ? '编辑分类表单' : '新增分类表单'}>
              {error && (
                <div
                  className="border border-state-error/40 bg-state-error/5 px-4 py-2 font-sans text-sm text-state-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div>
                <label className="label-luxury" htmlFor="category-name">分类名称</label>
                <input
                  id="category-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  placeholder="如：松柏类"
                  required
                />
              </div>

              <div>
                <label className="label-luxury" htmlFor="category-slug">标识 (slug)</label>
                <input
                  id="category-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className={cn(inputClass, editing && 'cursor-not-allowed bg-paper-aged/50')}
                  placeholder="如：conifers"
                  required
                  readOnly={!!editing}
                  aria-describedby={editing ? 'slug-hint' : undefined}
                />
                {editing && (
                  <p id="slug-hint" className="mt-1 font-sans text-xs text-ink-text-muted">
                    标识创建后不可修改
                  </p>
                )}
              </div>

              <div>
                <label className="label-luxury" htmlFor="category-description">描述</label>
                <textarea
                  id="category-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={cn(inputClass, 'min-h-[80px] resize-y')}
                  placeholder="分类描述（可选）"
                />
              </div>

              <div>
                <span className="label-luxury">封面图片</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="relative flex h-28 w-40 items-center justify-center overflow-hidden border border-[var(--penjing-border-fine)] bg-paper-aged">
                    {form.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(form.coverImage)}
                        alt="封面预览"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-ink-text-faint">
                        <ImageIcon
                          className="h-8 w-8"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <span className="font-sans text-xs">暂无封面</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <label className="flex cursor-pointer items-center gap-2 border border-[var(--penjing-border-fine)] px-4 py-2 font-sans text-xs uppercase tracking-[0.15em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      )}
                      {form.coverImage ? '重新上传' : '上传封面'}
                      <input
                        id="category-cover-upload"
                        name="category-cover"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUpload}
                        className="hidden"
                        aria-label="上传分类封面图片"
                      />
                    </label>
                    {form.coverImage && (
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, coverImage: '' }))}
                        className="font-sans text-xs text-ink-text-muted underline transition-colors hover:text-state-error"
                      >
                        移除封面
                      </button>
                    )}
                    <p className="max-w-[220px] font-sans text-xs text-ink-text-muted">
                      建议尺寸 800×1000 像素以上，JPG/PNG/WebP 格式。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline-gold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gold disabled:opacity-50"
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* 排版设置 Tab */}
      {tab === 'layout' && <CategoriesLayoutEditor />}
    </div>
  );
}
