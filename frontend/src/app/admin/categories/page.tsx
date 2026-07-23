// 分类管理：列表 + 新增/编辑弹窗

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

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

  // 列表
  const { data: categories, isLoading } = useQuery<Category[]>({
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
    mutationFn: async ({ id, payload }: { id: number; payload: CategoryForm }) => {
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
        await updateMutation.mutateAsync({ id: editing.id, payload: form });
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-primary">分类管理</h1>
          <p className="mt-1 text-sm text-text-muted">
            共 {categories?.length || 0} 个分类
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          新增分类
        </button>
      </div>

      {/* 列表 */}
      <div className="overflow-x-auto border border-text-muted/15 bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-text-muted/15 bg-background/50 text-left text-xs uppercase tracking-[0.15em] text-text-muted">
              <th className="px-4 py-4">封面</th>
              <th className="px-4 py-4">名称</th>
              <th className="px-4 py-4">标识</th>
              <th className="px-4 py-4">描述</th>
              <th className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-muted/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  加载中…
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
                          src={cat.coverImage}
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
                        aria-label="编辑"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-red-500"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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

      {/* 新增/编辑弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary-dark/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-lg border border-text-muted/15 bg-background p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-primary">
                {editing ? '编辑分类' : '新增分类'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-text-light hover:text-primary"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="label-luxury">分类名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  placeholder="如：松柏类"
                />
              </div>

              <div>
                <label className="label-luxury">标识 (slug)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className={inputClass}
                  placeholder="如：conifers"
                />
              </div>

              <div>
                <label className="label-luxury">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={cn(inputClass, 'min-h-[80px] resize-y')}
                  placeholder="分类描述（可选）"
                />
              </div>

              <div>
                <label className="label-luxury">封面图片</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 overflow-hidden border border-text-muted/20 bg-primary-dark/10">
                    {form.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.coverImage}
                        alt="封面预览"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 border border-text-muted/30 px-4 py-2 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    上传
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="hidden"
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
    </div>
  );
}
