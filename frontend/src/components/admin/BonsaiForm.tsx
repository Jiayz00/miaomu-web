// 盆景表单组件：新增 / 编辑共用

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Star, Loader2, Video } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ORIGIN_OPTIONS, YEAR_OPTIONS } from '@/lib/constants';
import type { Bonsai, Category } from '@/lib/types';

/**
 * 表单字段组件（必须在模块顶层定义，不能放在函数体内）
 * 否则每次渲染会创建新组件类型，导致 input 失焦与重渲染问题
 * 可访问性：通过 htmlFor/id 关联 label 与 input（WCAG 1.3.1 / 4.1.2）
 */
function Field({
  label,
  htmlFor,
  children,
  className,
  required,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label-luxury">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
    </div>
  );
}

interface BonsaiImageItem {
  url: string;
  isMain: boolean;
  sort: number;
}

// 中文 -> 拼音 slug 转换（简易实现，足够盆景名称场景）
// 若名称含英文，则小写化并用连字符分隔
function generateSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  // 中文名直接用时间戳后缀保证唯一性，避免拼音库依赖
  const hasChinese = /[\u4e00-\u9fa5]/.test(base);
  const suffix = hasChinese ? `-${Date.now().toString(36)}` : '';
  return `${base || 'bonsai'}${suffix}`.slice(0, 120);
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
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  // 视频字段（独立于主表单，便于上传/清除）
  const [videoUrl, setVideoUrl] = useState<string>(initialData?.video || '');
  const [videoUploading, setVideoUploading] = useState(false);

  // 图片列表
  const [images, setImages] = useState<BonsaiImageItem[]>(
    initialData?.images
      ? [...initialData.images]
          .sort((a, b) => a.sort - b.sort)
          .map((img, idx) => ({ url: img.url, isMain: img.isMain, sort: img.sort ?? idx }))
      : []
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  // 标记表单是否被修改过（用于离开提示）
  const [dirty, setDirty] = useState(false);

  const updateField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // 离开页面前提示（防止误关丢失编辑内容）
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // 图片上传
  // 后端 uploadMultiple 返回 { urls: Array<{url, filename}> }，
  // 经 TransformInterceptor 包装为 { success, data: { urls: [...] }, message }
  const handleUpload = useCallback(async (files: FileList) => {
    // 客户端预校验：类型、大小，避免无效请求浪费带宽
    const MAX_IMG_SIZE = 30 * 1024 * 1024; // 30MB（与后端一致）
    const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const fileArr = Array.from(files);
    for (const f of fileArr) {
      if (!ALLOWED_IMG_TYPES.includes(f.type)) {
        setError(`图片 ${f.name} 类型不支持，仅允许 JPG/PNG/WebP`);
        return;
      }
      if (f.size > MAX_IMG_SIZE) {
        setError(`图片 ${f.name} 超过 30MB 大小限制`);
        return;
      }
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      fileArr.forEach((file) => formData.append('files', file));
      const res = await api.post<{ data: { urls: Array<{ url: string; filename: string }> } }>(
        '/admin/upload/multiple',
        formData
      );
      // res.data 是 { urls: [...] }，需取 res.data.urls
      const uploadedUrls = res.data?.urls ?? [];
      if (uploadedUrls.length === 0) {
        throw new Error('上传成功但未返回 URL');
      }
      setImages((prev) => {
        const startIdx = prev.length;
        const newImages: BonsaiImageItem[] = uploadedUrls.map((item, idx) => ({
          url: item.url,
          isMain: prev.length === 0 && idx === 0,
          sort: startIdx + idx,
        }));
        return [...prev, ...newImages];
      });
      // 图片新增属于表单变更，需标记 dirty
      setDirty(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  };

  // 视频上传
  // 后端 uploadVideo 返回 { url, filename }，
  // 经 TransformInterceptor 包装为 { success, data: { url, filename }, message }
  const handleVideoUpload = useCallback(async (file: File) => {
    // 客户端预校验：类型、大小
    const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB（与后端一致）
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError(`视频类型不支持，仅允许 MP4/WebM/MOV`);
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError(`视频 ${file.name} 超过 1GB 大小限制`);
      return;
    }
    setVideoUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ data: { url: string; filename: string } }>(
        '/admin/upload/video',
        formData
      );
      const url = res.data?.url;
      if (!url) {
        throw new Error('上传成功但未返回 URL');
      }
      setVideoUrl(url);
      setDirty(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '视频上传失败');
    } finally {
      setVideoUploading(false);
    }
  }, []);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleVideoUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const removeVideo = () => {
    setVideoUrl('');
    setDirty(true);
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
    setDirty(true);
  };

  // 删除图片
  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index)
        // 重新计算 sort，保证连续
        .map((img, i) => ({ ...img, sort: i }));
      // 若删的是主图，则将第一张设为主图
      if (next.length > 0 && !next.some((img) => img.isMain)) {
        next[0].isMain = true;
      }
      return next;
    });
    setDirty(true);
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
    // 价格校验：必填且不能为负
    const priceNum = Number(form.price);
    if (form.price === '' || isNaN(priceNum)) {
      setError('请输入有效的价格');
      return;
    }
    if (priceNum < 0) {
      setError('价格不能为负数');
      return;
    }
    // 库存校验：非负整数
    const stockNum = Number(form.stock);
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      setError('库存必须为非负整数');
      return;
    }
    // 树龄/高度/宽度：可空，填写时必须为非负数
    if (form.treeAge !== '' && form.treeAge != null) {
      const t = Number(form.treeAge);
      if (isNaN(t) || t < 0) {
        setError('树龄必须为非负数');
        return;
      }
    }
    if (form.height !== '' && form.height != null) {
      const h = Number(form.height);
      if (isNaN(h) || h < 0) {
        setError('高度必须为非负数');
        return;
      }
    }
    if (form.width !== '' && form.width != null) {
      const w = Number(form.width);
      if (isNaN(w) || w < 0) {
        setError('宽度必须为非负数');
        return;
      }
    }

    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      price: priceNum,
      stock: stockNum,
      origin: form.origin,
      year: Number(form.year),
      treeAge: form.treeAge ? Number(form.treeAge) : null,
      height: form.height ? Number(form.height) : null,
      width: form.width ? Number(form.width) : null,
      video: videoUrl || null,
      categoryId: Number(form.categoryId),
      isFeatured: form.isFeatured,
      images: images.map((img, idx) => ({
        url: img.url,
        isMain: img.isMain,
        sort: idx,
      })),
    };

    // 仅新增时传 slug（UpdateBonsaiDto 已 OmitType 排除 slug，
    // 后端 forbidNonWhitelisted 会拒绝编辑 payload 中的 slug 字段）
    if (!isEdit) {
      payload.slug = generateSlug(form.name);
    }

    setSaving(true);
    try {
      if (isEdit && initialData) {
        await api.put(`/admin/bonsais/${initialData.id}`, payload);
        // 编辑后失效详情缓存，避免下次进入看到旧数据
        queryClient.invalidateQueries({ queryKey: ['admin-bonsai', initialData.id] });
      } else {
        await api.post('/admin/bonsais', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-bonsais'] });
      queryClient.invalidateQueries({ queryKey: ['bonsais'] });
      // 保存成功，清除未保存标记，避免跳转时触发 beforeunload 提示
      setDirty(false);
      router.push('/admin/bonsais');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 表单字段组件已移至模块顶层（避免每次渲染创建新组件类型导致 input 失焦）
  // 统一输入样式：底线式 + 金色聚焦，与设计系统的 input-penjing 风格一致
  const inputClass =
    'w-full border border-[var(--penjing-border-fine)] bg-paper px-4 py-2.5 font-sans text-sm text-ink-text transition-colors placeholder:text-ink-text-faint focus:border-gold focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div
          className="border border-state-error/40 bg-state-error/5 px-4 py-3 font-sans text-sm text-state-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* 基本信息 */}
      <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          <h3 className="display-card text-ink">基本信息</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="盆景名称" htmlFor="bonsai-name" className="sm:col-span-2">
            <input
              id="bonsai-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={inputClass}
              placeholder="请输入盆景名称"
            />
          </Field>

          <Field label="描述" htmlFor="bonsai-description" className="sm:col-span-2">
            <textarea
              id="bonsai-description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className={cn(inputClass, 'min-h-[120px] resize-y')}
              placeholder="请输入盆景描述"
            />
          </Field>

          <Field label="分类" htmlFor="bonsai-category">
            <select
              id="bonsai-category"
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

          <Field label="产地" htmlFor="bonsai-origin">
            {/* 使用 input + datalist 实现"可选择也可手动输入" */}
            <input
              id="bonsai-origin"
              type="text"
              list="origin-options"
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
              className={inputClass}
              placeholder="选择或输入产地"
              autoComplete="off"
            />
            <datalist id="origin-options">
              {ORIGIN_OPTIONS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </Field>
        </div>
      </section>

      {/* 规格信息 */}
      <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          <h3 className="display-card text-ink">规格信息</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="价格 (¥)" htmlFor="bonsai-price" required>
            <input
              id="bonsai-price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              className={inputClass}
              placeholder="0.00"
              required
            />
          </Field>
          <Field label="库存" htmlFor="bonsai-stock" required>
            <input
              id="bonsai-stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => updateField('stock', e.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
          </Field>
          <Field label="年份" htmlFor="bonsai-year">
            <select
              id="bonsai-year"
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
          <Field label="树龄 (年)" htmlFor="bonsai-tree-age">
            <input
              id="bonsai-tree-age"
              type="number"
              min="0"
              step="1"
              value={form.treeAge}
              onChange={(e) => updateField('treeAge', e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </Field>
          <Field label="高度 (cm)" htmlFor="bonsai-height">
            <input
              id="bonsai-height"
              type="number"
              min="0"
              step="0.1"
              value={form.height}
              onChange={(e) => updateField('height', e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </Field>
          <Field label="宽度 (cm)" htmlFor="bonsai-width">
            <input
              id="bonsai-width"
              type="number"
              min="0"
              step="0.1"
              value={form.width}
              onChange={(e) => updateField('width', e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </Field>
        </div>

        {/* 精选开关（WCAG 4.1.2：使用 aria-pressed 表达切换状态） */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateField('isFeatured', !form.isFeatured)}
            aria-pressed={form.isFeatured}
            className={cn(
              'flex items-center gap-2 border px-4 py-2 font-sans text-sm transition-colors',
              form.isFeatured
                ? 'border-gold bg-gold text-ink-deepest'
                : 'border-[var(--penjing-border-fine)] text-ink-text-secondary hover:border-gold',
            )}
          >
            <Star
              className="h-4 w-4"
              strokeWidth={1.5}
              fill={form.isFeatured ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            {form.isFeatured ? '已设为精选' : '设为精选'}
          </button>
        </div>
      </section>

      {/* 图片上传 */}
      <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          <h3 className="display-card text-ink">盆景图片</h3>
        </div>

        {/* 拖拽上传区（WCAG 2.1.1：使用 button 而非 div onClick，保证键盘可访问） */}
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          aria-label="上传盆景图片，点击或拖拽图片到此处"
          className={cn(
            'flex w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-12 transition-colors',
            dragOver
              ? 'border-gold bg-gold/5'
              : 'border-[var(--penjing-border-fine)] hover:border-gold/60',
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
          ) : (
            <Upload className="h-8 w-8 text-ink-text-muted" strokeWidth={1} aria-hidden="true" />
          )}
          <p className="font-sans text-sm text-ink-text-secondary">
            {uploading ? '上传中…' : '点击或拖拽图片到此处上传'}
          </p>
          <p className="body-caption">支持多张图片，第一张默认为主图</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </button>

        {/* 已上传图片列表 */}
        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden border border-[var(--penjing-border-fine)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`图片 ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {/* 主图标识 */}
                {img.isMain && (
                  <div className="absolute left-2 top-2 bg-gold px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-ink-deepest">
                    主图
                  </div>
                )}
                {/* 操作按钮（WCAG 2.5.5：触摸目标提到 36x36，表格场景受限） */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink-deep/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {!img.isMain && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMain(i);
                      }}
                      className="flex h-9 w-9 items-center justify-center bg-gold text-ink-deepest"
                      aria-label={`将第 ${i + 1} 张图片设为主图`}
                    >
                      <Star className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className="flex h-9 w-9 items-center justify-center bg-paper text-ink"
                    aria-label={`删除第 ${i + 1} 张图片`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 视频上传（可选） */}
      <section className="border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
        <div className="mb-2 flex items-center gap-3">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          <h3 className="display-card text-ink">展示视频</h3>
        </div>
        <p className="mb-6 body-caption pl-11">可选。支持 mp4 / webm / mov，最大 1GB</p>

        {videoUrl ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden border border-[var(--penjing-border-fine)]">
              <video
                src={videoUrl}
                controls
                className="aspect-video w-full bg-ink-deep"
                preload="metadata"
              >
                您的浏览器不支持视频播放。
              </video>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={videoUploading}
                className="border border-[var(--penjing-border-fine)] px-4 py-2 font-sans text-xs uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
              >
                {videoUploading ? '上传中…' : '替换视频'}
              </button>
              <button
                type="button"
                onClick={removeVideo}
                disabled={videoUploading}
                className="flex items-center gap-1.5 border border-state-error/40 px-4 py-2 font-sans text-xs uppercase tracking-[0.2em] text-state-error transition-colors hover:bg-state-error/5 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                移除视频
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={handleVideoFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={videoUploading}
            aria-label="上传盆景展示视频"
            className={cn(
              'flex w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-12 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              'border-[var(--penjing-border-fine)] hover:border-gold/60',
            )}
          >
            {videoUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
            ) : (
              <Video className="h-8 w-8 text-ink-text-muted" strokeWidth={1} aria-hidden="true" />
            )}
            <p className="font-sans text-sm text-ink-text-secondary">
              {videoUploading ? '上传中…' : '点击上传展示视频'}
            </p>
            <p className="body-caption">mp4 / webm / mov，最大 1GB</p>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={handleVideoFileChange}
              className="hidden"
              aria-hidden="true"
            />
          </button>
        )}
      </section>

      {/* 提交按钮 */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || uploading || videoUploading}
          className="btn-gold disabled:opacity-50"
        >
          {saving
            ? '保存中…'
            : uploading
            ? '图片上传中…'
            : videoUploading
            ? '视频上传中…'
            : isEdit
            ? '保存修改'
            : '创建盆景'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/bonsais')}
          className="btn-outline-gold"
        >
          取消
        </button>
      </div>
    </form>
  );
}
