// 分类管理：列表 + 新增/编辑弹窗 + 排版设置

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

  // 封面上传
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
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

  const inputClass =
    'w-full border border-text-muted/20 bg-surface px-4 py-2.5 text-text transition-colors focus:border-accent focus:outline-none';

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-primary">分类管理</h1>
          <p className="mt-1 text-sm text-text-muted">
            {tab === 'list'
              ? `共 ${categories?.length || 0} 个分类`
              : '配置用户端分类页的展示方式'}
          </p>
        </div>
        {tab === 'list' && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            新增分类
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="mb-8 border-b border-text-muted/15" role="tablist" aria-label="分类管理视图">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'list'}
          onClick={() => setTab('list')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.2em] transition-colors -mb-px border-b-2',
            tab === 'list'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-light hover:text-primary',
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
            'flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.2em] transition-colors -mb-px border-b-2',
            tab === 'layout'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-light hover:text-primary',
          )}
        >
          <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          排版设置
        </button>
      </div>

      {/* 列表 Tab */}
      {tab === 'list' && (
        <>
      {/* 列表 */}
      <div className="overflow-x-auto border border-text-muted/15 bg-surface">
        <table className="w-full">
          <caption className="sr-only">分类列表，含封面、名称、标识、描述与操作</caption>
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th scope="col" className="px-4 py-4">封面</th>
              <th scope="col" className="px-4 py-4">名称</th>
              <th scope="col" className="px-4 py-4">标识</th>
              <th scope="col" className="px-4 py-4">描述</th>
              <th scope="col" className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.5} aria-hidden="true" />
                    <p className="text-sm text-red-600" role="alert">
                      {listError instanceof ApiError ? listError.message : '加载失败，请稍后重试'}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 border border-text-muted/30 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} aria-hidden="true" />
                      重试
                    </button>
                  </div>
                </td>
              </tr>
            ) : categories && categories.length > 0 ? (
              categories.map((cat) => (
                <tr key={cat.id} className="text-sm transition-colors hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="h-12 w-16 overflow-hidden bg-primary-dark/10">
                      {cat.coverImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(cat.coverImage)}
                          alt={cat.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">{cat.name}</td>
                  <td className="px-4 py-3 text-text-light">{cat.slug}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {cat.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-accent"
                        aria-label={`编辑分类 ${cat.name}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-red-500"
                        aria-label={`删除分类 ${cat.name}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  暂无分类
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑弹窗（WCAG 4.1.2 / 2.1.2：role=dialog + aria-modal + Esc 关闭） */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary-dark/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-lg border border-text-muted/15 bg-background p-8"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? '编辑分类' : '新增分类'}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-primary">
                {editing ? '编辑分类' : '新增分类'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-text-light hover:text-primary"
                aria-label="关闭弹窗"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" aria-label={editing ? '编辑分类表单' : '新增分类表单'}>
              {error && (
                <div className="border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
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
                  className={cn(inputClass, editing && 'cursor-not-allowed bg-text-muted/5')}
                  placeholder="如：conifers"
                  required
                  readOnly={!!editing}
                  aria-describedby={editing ? 'slug-hint' : undefined}
                />
                {editing && (
                  <p id="slug-hint" className="mt-1 text-xs text-text-muted">
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
                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 overflow-hidden border border-text-muted/20 bg-primary-dark/10">
                    {form.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(form.coverImage)}
                        alt="封面预览"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    )}
                    上传
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="hidden"
                      aria-label="上传分类封面图片"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-text-muted/30 px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-text-light transition-colors hover:border-text-light"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light disabled:opacity-50"
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
