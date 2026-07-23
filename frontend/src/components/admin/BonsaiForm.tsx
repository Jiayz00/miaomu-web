// 盆景表单组件：新增 / 编辑共用

'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ORIGIN_OPTIONS, YEAR_OPTIONS } from '@/lib/constants';
import type { Bonsai, Category } from '@/lib/types';

interface BonsaiImageItem {
  url: string;
  isMain: boolean;
}

interface BonsaiFormProps {
  // 编辑模式时传入初始数据
  initialData?: Bonsai;
}

export function BonsaiForm({ initialData }: BonsaiFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分类列表
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
  });

  // 表单状态
  const [form, setForm] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    stock: initialData?.stock?.toString() || '0',
    origin: initialData?.origin || ORIGIN_OPTIONS[0],
    year: initialData?.year?.toString() || new Date().getFullYear().toString(),
    treeAge: initialData?.treeAge?.toString() || '',
    height: initialData?.height?.toString() || '',
    width: initialData?.width?.toString() || '',
    categoryId: initialData?.categoryId?.toString() || '',
    isFeatured: initialData?.isFeatured || false,
  });

  // 图片列表
  const [images, setImages] = useState<BonsaiImageItem[]>(
    initialData?.images
      ? [...initialData.images]
          .sort((a, b) => a.sort - b.sort)
          .map((img) => ({ url: img.url, isMain: img.isMain }))
      : []
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 图片上传
  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const res = await api.post<{ data: { url: string }[] }>(
        '/admin/upload/multiple',
        formData
      );
      const newImages: BonsaiImageItem[] = res.data.map((item, idx) => ({
        url: item.url,
        isMain: images.length === 0 && idx === 0,
      }));
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
    }
  }, [images.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  };

  // 拖拽上传
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // 设为主图
  const setMain = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isMain: i === index }))
    );
  };

  // 删除图片
  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // 若删的是主图，则将第一张设为主图
      if (next.length > 0 && !next.some((img) => img.isMain)) {
        next[0].isMain = true;
      }
      return next;
    });
  };

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('请输入盆景名称');
      return;
    }
    if (!form.categoryId) {
      setError('请选择分类');
      return;
    }
    if (images.length === 0) {
      setError('请至少上传一张图片');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      price: form.price,
      stock: Number(form.stock),
      origin: form.origin,
      year: Number(form.year),
      treeAge: form.treeAge ? Number(form.treeAge) : null,
      height: form.height ? Number(form.height) : null,
      width: form.width ? Number(form.width) : null,
      categoryId: Number(form.categoryId),
      isFeatured: form.isFeatured,
      images: images.map((img) => ({ url: img.url, isMain: img.isMain })),
    };

    setSaving(true);
    try {
      if (isEdit && initialData) {
        await api.put(`/admin/bonsais/${initialData.id}`, payload);
      } else {
        await api.post('/admin/bonsais', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-bonsais'] });
      queryClient.invalidateQueries({ queryKey: ['bonsais'] });
      router.push('/admin/bonsais');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 表单字段组件
  const Field = ({
    label,
    children,
    className,
  }: {
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className}>
      <label className="label-luxury">{label}</label>
      {children}
    </div>
  );

  const inputClass =
    'w-full border border-text-muted/20 bg-surface px-4 py-2.5 text-text transition-colors focus:border-accent focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 基本信息 */}
      <div className="border border-text-muted/15 bg-surface p-6">
        <h3 className="mb-6 font-serif text-xl text-primary">基本信息</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="盆景名称" className="sm:col-span-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={inputClass}
              placeholder="请输入盆景名称"
            />
          </Field>

          <Field label="描述" className="sm:col-span-2">
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className={cn(inputClass, 'min-h-[120px] resize-y')}
              placeholder="请输入盆景描述"
            />
          </Field>

          <Field label="分类">
            <select
              value={form.categoryId}
              onChange={(e) => updateField('categoryId', e.target.value)}
              className={inputClass}
            >
              <option value="">请选择分类</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="产地">
            <select
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
              className={inputClass}
            >
              {ORIGIN_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* 规格信息 */}
      <div className="border border-text-muted/15 bg-surface p-6">
        <h3 className="mb-6 font-serif text-xl text-primary">规格信息</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="价格 (¥)">
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </Field>
          <Field label="库存">
            <input
              type="number"
              value={form.stock}
              onChange={(e) => updateField('stock', e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </Field>
          <Field label="年份">
            <select
              value={form.year}
              onChange={(e) => updateField('year', e.target.value)}
              className={inputClass}
            >
              {YEAR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="树龄 (年)">
            <input
              type="number"
              value={form.treeAge}
              onChange={(e) => updateField('treeAge', e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </Field>
          <Field label="高度 (cm)">
            <input
              type="number"
              value={form.height}
              onChange={(e) => updateField('height', e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </Field>
          <Field label="宽度 (cm)">
            <input
              type="number"
              value={form.width}
              onChange={(e) => updateField('width', e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </Field>
        </div>

        {/* 精选开关 */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateField('isFeatured', !form.isFeatured)}
            className={cn(
              'flex items-center gap-2 border px-4 py-2 text-sm transition-colors',
              form.isFeatured
                ? 'border-accent bg-accent text-primary-dark'
                : 'border-text-muted/30 text-text-light'
            )}
          >
            <Star
              className="h-4 w-4"
              strokeWidth={1.5}
              fill={form.isFeatured ? 'currentColor' : 'none'}
            />
            {form.isFeatured ? '已设为精选' : '设为精选'}
          </button>
        </div>
      </div>

      {/* 图片上传 */}
      <div className="border border-text-muted/15 bg-surface p-6">
        <h3 className="mb-6 font-serif text-xl text-primary">盆景图片</h3>

        {/* 拖拽上传区 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-12 transition-colors',
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-text-muted/30 hover:border-accent/50'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          ) : (
            <Upload className="h-8 w-8 text-text-muted" strokeWidth={1} />
          )}
          <p className="text-sm text-text-light">
            {uploading ? '上传中…' : '点击或拖拽图片到此处上传'}
          </p>
          <p className="text-xs text-text-muted">支持多张图片，第一张默认为主图</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* 已上传图片列表 */}
        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden border border-text-muted/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`图片 ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {/* 主图标识 */}
                {img.isMain && (
                  <div className="absolute left-2 top-2 bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary-dark">
                    主图
                  </div>
                )}
                {/* 操作按钮 */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary-dark/60 opacity-0 transition-opacity group-hover:opacity-100">
                  {!img.isMain && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMain(i);
                      }}
                      className="flex h-8 w-8 items-center justify-center bg-accent text-primary-dark"
                      aria-label="设为主图"
                    >
                      <Star className="h-4 w-4" fill="currentColor" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className="flex h-8 w-8 items-center justify-center bg-background text-primary"
                    aria-label="删除图片"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 提交按钮 */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-background transition-colors hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? '保存中…' : isEdit ? '保存修改' : '创建盆景'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/bonsais')}
          className="border border-text-muted/30 px-8 py-3 text-sm uppercase tracking-[0.2em] text-text-light transition-colors hover:border-text-light"
        >
          取消
        </button>
      </div>
    </form>
  );
}
