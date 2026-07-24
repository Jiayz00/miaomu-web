// 区块配置编辑面板：根据 section.type 渲染不同字段
// 通用字段（title / subtitle / visible）始终显示，专属配置按 type 分支

'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { HomeSection } from '@/lib/types';

interface SectionConfigEditorProps {
  section: HomeSection;
  onUpdate: (patch: Partial<HomeSection>) => void;
  onUpdateConfig: (configPatch: Record<string, unknown>) => void;
}

const inputClass =
  'w-full border border-text-muted/20 bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-accent focus:outline-none';
const labelClass =
  'mb-1.5 block text-xs uppercase tracking-[0.15em] text-text-muted';

export function SectionConfigEditor({
  section,
  onUpdate,
  onUpdateConfig,
}: SectionConfigEditorProps) {
  const type = section.type;

  return (
    <div className="border border-text-muted/15 bg-surface p-6">
      {/* 通用字段 */}
      <div className="mb-6 space-y-4 border-b border-text-muted/10 pb-6">
        <div>
          <label htmlFor="section-title" className={labelClass}>
            区块标题
          </label>
          <input
            id="section-title"
            type="text"
            value={section.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="区块标题（可空）"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="section-subtitle" className={labelClass}>
            区块副标题
          </label>
          <textarea
            id="section-subtitle"
            value={section.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="区块副标题（可空）"
            rows={2}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="section-visible" className="text-sm text-text-light">
            是否显示
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={section.visible}
            onClick={() => onUpdate({ visible: !section.visible })}
            className={
              section.visible
                ? 'relative h-6 w-11 rounded-full bg-accent transition-colors'
                : 'relative h-6 w-11 rounded-full bg-text-muted/30 transition-colors'
            }
          >
            <span
              className={
                section.visible
                  ? 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary-dark transition-transform translate-x-5'
                  : 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition-transform'
              }
            />
          </button>
        </div>
      </div>

      {/* 专属配置 */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.2em] text-accent">
          专属配置 · {type}
        </h3>
        {type === 'hero' && (
          <HeroConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'featured' && (
          <FeaturedConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'categories' && (
          <CategoriesConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'bonsai-grid' && (
          <BonsaiGridConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'showcase' && (
          <ShowcaseConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'story' && (
          <StoryConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'cta' && (
          <CtaConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'contact' && (
          <ContactConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
        {type === 'stats' && (
          <StatsConfig section={section} onUpdateConfig={onUpdateConfig} />
        )}
      </div>
    </div>
  );
}

// ====== 通用子组件 ======

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) onChange(n);
        }}
        min={min}
        max={max}
        className={inputClass}
      />
    </div>
  );
}

function ToggleField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-sm text-text-light">
        {label}
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={
          value
            ? 'relative h-6 w-11 rounded-full bg-accent transition-colors'
            : 'relative h-6 w-11 rounded-full bg-text-muted/30 transition-colors'
        }
      >
        <span
          className={
            value
              ? 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary-dark transition-transform translate-x-5'
              : 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition-transform'
          }
        />
      </button>
    </div>
  );
}

// ====== 各 type 的专属配置 ======

type ConfigEditorProps = {
  section: HomeSection;
  onUpdateConfig: (configPatch: Record<string, unknown>) => void;
};

function HeroConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  return (
    <>
      <TextField
        id="hero-image"
        label="背景图 URL"
        value={(cfg.heroImage as string) || ''}
        onChange={(v) => onUpdateConfig({ heroImage: v })}
        placeholder="https://picsum.photos/seed/xxx/1920/800 或 /uploads/xxx.jpg"
      />
      <TextField
        id="hero-eyebrow"
        label="眉标文字"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="Penjing · Bonsai Art"
      />
      <TextField
        id="hero-cta-primary-text"
        label="主按钮文本"
        value={(cfg.ctaPrimaryText as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaPrimaryText: v })}
        placeholder="探索收藏"
      />
      <TextField
        id="hero-cta-primary-link"
        label="主按钮链接"
        value={(cfg.ctaPrimaryLink as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaPrimaryLink: v })}
        placeholder="/bonsais"
      />
      <TextField
        id="hero-cta-secondary-text"
        label="次按钮文本"
        value={(cfg.ctaSecondaryText as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaSecondaryText: v })}
        placeholder="询价咨询"
      />
      <TextField
        id="hero-cta-secondary-link"
        label="次按钮链接"
        value={(cfg.ctaSecondaryLink as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaSecondaryLink: v })}
        placeholder="/chat"
      />
    </>
  );
}

function FeaturedConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  return (
    <>
      <TextField
        id="featured-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="精选典藏"
      />
      <NumberField
        id="featured-limit"
        label="显示数量"
        value={(cfg.limit as number) || 6}
        onChange={(v) => onUpdateConfig({ limit: v })}
        min={1}
        max={20}
      />
      <TextField
        id="featured-cta-text"
        label="CTA 文本"
        value={(cfg.ctaText as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaText: v })}
        placeholder="浏览全部盆景"
      />
      <TextField
        id="featured-cta-link"
        label="CTA 链接"
        value={(cfg.ctaLink as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaLink: v })}
        placeholder="/bonsais"
      />
    </>
  );
}

function CategoriesConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  return (
    <>
      <TextField
        id="categories-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="分类导览"
      />
      <NumberField
        id="categories-limit"
        label="显示数量"
        value={(cfg.limit as number) || 4}
        onChange={(v) => onUpdateConfig({ limit: v })}
        min={1}
        max={12}
      />
      <ToggleField
        id="categories-show-desc"
        label="显示分类描述"
        value={cfg.showDescription !== false}
        onChange={(v) => onUpdateConfig({ showDescription: v })}
      />
    </>
  );
}

function BonsaiGridConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  return (
    <>
      <TextField
        id="grid-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="盆景收藏"
      />
      <NumberField
        id="grid-limit"
        label="显示数量"
        value={(cfg.limit as number) || 8}
        onChange={(v) => onUpdateConfig({ limit: v })}
        min={1}
        max={24}
      />
      <ToggleField
        id="grid-show-filter"
        label="显示筛选器"
        value={cfg.showFilter === true}
        onChange={(v) => onUpdateConfig({ showFilter: v })}
      />
      <TextField
        id="grid-cta-text"
        label="CTA 文本"
        value={(cfg.ctaText as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaText: v })}
        placeholder="浏览全部"
      />
      <TextField
        id="grid-cta-link"
        label="CTA 链接"
        value={(cfg.ctaLink as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaLink: v })}
        placeholder="/bonsais"
      />
    </>
  );
}

function ShowcaseConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  const rawIds = cfg.bonsaiIds;
  const ids: number[] = Array.isArray(rawIds)
    ? (rawIds as unknown[]).filter((x): x is number => typeof x === 'number')
    : [];
  const [idInput, setIdInput] = useState('');

  const addId = () => {
    const n = parseInt(idInput, 10);
    if (!isNaN(n) && !ids.includes(n)) {
      onUpdateConfig({ bonsaiIds: [...ids, n] });
    }
    setIdInput('');
  };

  const removeId = (id: number) => {
    onUpdateConfig({ bonsaiIds: ids.filter((x) => x !== id) });
  };

  return (
    <>
      <TextField
        id="showcase-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="臻品展示"
      />
      <div>
        <label htmlFor="showcase-id-input" className={labelClass}>
          添加盆景 ID
        </label>
        <div className="flex gap-2">
          <input
            id="showcase-id-input"
            type="number"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addId();
              }
            }}
            placeholder="输入盆景 ID"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addId}
            className="flex items-center gap-1 border border-accent px-3 text-xs uppercase tracking-wider text-accent hover:bg-accent hover:text-primary"
          >
            <Plus className="h-3 w-3" />
            添加
          </button>
        </div>
        {ids.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ids.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 border border-text-muted/30 bg-text-muted/5 px-2 py-1 text-xs text-text-light"
              >
                ID: {id}
                <button
                  type="button"
                  onClick={() => removeId(id)}
                  aria-label={`移除 ID ${id}`}
                  className="text-text-muted hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StoryConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  const paragraphs = (cfg.paragraphs as string[]) || [];

  const updateParagraph = (idx: number, text: string) => {
    const next = [...paragraphs];
    next[idx] = text;
    onUpdateConfig({ paragraphs: next });
  };

  const addParagraph = () => {
    onUpdateConfig({ paragraphs: [...paragraphs, ''] });
  };

  const removeParagraph = (idx: number) => {
    onUpdateConfig({ paragraphs: paragraphs.filter((_, i) => i !== idx) });
  };

  return (
    <>
      <TextField
        id="story-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="品牌故事"
      />
      <TextField
        id="story-image"
        label="图片 URL"
        value={(cfg.image as string) || ''}
        onChange={(v) => onUpdateConfig({ image: v })}
        placeholder="https://..."
      />
      <div>
        <label className={labelClass}>内容段落</label>
        <div className="space-y-2">
          {paragraphs.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <textarea
                value={p}
                onChange={(e) => updateParagraph(idx, e.target.value)}
                rows={3}
                placeholder={`第 ${idx + 1} 段`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeParagraph(idx)}
                aria-label={`删除第 ${idx + 1} 段`}
                className="flex-shrink-0 self-start border border-text-muted/30 p-2 text-text-muted hover:border-red-500 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addParagraph}
          className="mt-2 flex items-center gap-1 text-xs uppercase tracking-wider text-accent hover:text-accent-light"
        >
          <Plus className="h-3 w-3" />
          添加段落
        </button>
      </div>
      <TextField
        id="story-badge-value"
        label="徽章数值"
        value={
          ((cfg.badge as { value?: string } | undefined)?.value) || ''
        }
        onChange={(v) =>
          onUpdateConfig({
            badge: {
              value: v,
              label: ((cfg.badge as { label?: string } | undefined)?.label) || '',
            },
          })
        }
        placeholder="30+"
      />
      <TextField
        id="story-badge-label"
        label="徽章标签"
        value={
          ((cfg.badge as { label?: string } | undefined)?.label) || ''
        }
        onChange={(v) =>
          onUpdateConfig({
            badge: {
              value: ((cfg.badge as { value?: string } | undefined)?.value) || '',
              label: v,
            },
          })
        }
        placeholder="载匠心传承"
      />
    </>
  );
}

function CtaConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  return (
    <>
      <TextField
        id="cta-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="私人洽购"
      />
      <TextField
        id="cta-text"
        label="按钮文本"
        value={(cfg.ctaText as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaText: v })}
        placeholder="开始询价"
      />
      <TextField
        id="cta-link"
        label="按钮链接"
        value={(cfg.ctaLink as string) || ''}
        onChange={(v) => onUpdateConfig({ ctaLink: v })}
        placeholder="/chat"
      />
    </>
  );
}

function ContactConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  return (
    <>
      <TextField
        id="contact-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="联系我们"
      />
      <ToggleField
        id="contact-show-phone"
        label="显示电话"
        value={cfg.showPhone !== false}
        onChange={(v) => onUpdateConfig({ showPhone: v })}
      />
      <ToggleField
        id="contact-show-email"
        label="显示邮箱"
        value={cfg.showEmail !== false}
        onChange={(v) => onUpdateConfig({ showEmail: v })}
      />
      <ToggleField
        id="contact-show-address"
        label="显示地址"
        value={cfg.showAddress !== false}
        onChange={(v) => onUpdateConfig({ showAddress: v })}
      />
      <ToggleField
        id="contact-show-wechat"
        label="显示微信"
        value={cfg.showWechat === true}
        onChange={(v) => onUpdateConfig({ showWechat: v })}
      />
      <ToggleField
        id="contact-show-weibo"
        label="显示微博"
        value={cfg.showWeibo === true}
        onChange={(v) => onUpdateConfig({ showWeibo: v })}
      />
    </>
  );
}

function StatsConfig({ section, onUpdateConfig }: ConfigEditorProps) {
  const cfg = section.config;
  const items = Array.isArray(cfg.items)
    ? (cfg.items as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  const toggleItem = (key: string) => {
    if (items.includes(key)) {
      onUpdateConfig({ items: items.filter((x) => x !== key) });
    } else {
      onUpdateConfig({ items: [...items, key] });
    }
  };

  const STAT_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'bonsais', label: '盆景藏品数' },
    { key: 'categories', label: '分类数' },
    { key: 'views', label: '累计浏览量' },
    { key: 'favorites', label: '用户收藏数' },
  ];

  return (
    <>
      <TextField
        id="stats-eyebrow"
        label="眉标"
        value={(cfg.eyebrow as string) || ''}
        onChange={(v) => onUpdateConfig({ eyebrow: v })}
        placeholder="平台数据"
      />
      <div>
        <label className={labelClass}>显示哪些统计项</label>
        <div className="space-y-2">
          {STAT_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 text-sm text-text-light"
            >
              <input
                type="checkbox"
                checked={items.includes(opt.key)}
                onChange={() => toggleItem(opt.key)}
                className="h-4 w-4 accent-accent"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
