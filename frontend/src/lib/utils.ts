// 工具函数库

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getPublicOrigin } from './constants';

/**
 * 合并 Tailwind 类名，处理冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化价格（分转元 / 字符串数字格式化为千分位）
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '—';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化日期为中文格式
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * 格式化日期时间（含时分）
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const base = formatDate(d);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${base} ${h}:${m}`;
}

/**
 * 相对时间（如"3 分钟前"）
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return formatDate(d);
}

/**
 * 获取盆景主图 URL
 */
export function getMainImage(images: { url: string; isMain: boolean }[]): string {
  const main = images?.find((img) => img.isMain);
  return resolveImageUrl(main?.url || images?.[0]?.url || '');
}

/**
 * 解析图片 URL：将相对路径（/uploads/xxx.jpg）转为可访问 URL
 *
 * 使用场景：
 * - 图片/视频 src、CSS background-image 等最终由浏览器加载的资源
 * - 浏览器天然支持相对路径，由 Caddy/Nginx 反向代理到后端 uploads 目录
 * - 因此不需要（也不应该）在 SSR 阶段拼接 Docker 内网 backend 地址，
 *   否则初始 HTML 会包含 http://backend:4000/uploads/...，导致客户端无法加载
 *
 * 已是绝对 URL（http/https 开头）则原样返回
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  // 已是绝对 URL，直接返回
  if (/^https?:\/\//.test(url)) return url;
  // 相对路径：直接返回，浏览器会根据当前 origin 自动解析
  if (url.startsWith('/')) {
    return url;
  }
  return url;
}

/**
 * 解析为公网可访问的图片 URL
 *
 * 专为对外暴露的场景设计（OG 元数据、分享卡片、邮件链接等）：
 * - 社交平台爬虫无法访问 Docker 内网地址（http://backend:4000）
 * - 必须使用公网域名（NEXT_PUBLIC_PUBLIC_ORIGIN）
 *
 * 与 resolveImageUrl 的差异：
 * - resolveImageUrl: SSR 用内网地址（Docker 内部 fetch），CSR 用相对路径
 * - resolvePublicImageUrl: SSR 与 CSR 都用公网域名（外部可访问）
 */
export function resolvePublicImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  // 已是绝对 URL，直接返回
  if (/^https?:\/\//.test(url)) return url;
  // 相对路径：拼接公网 origin（CSR 下也使用公网域名，因为 OG 是 SSR 生成）
  if (url.startsWith('/')) {
    const publicOrigin = getPublicOrigin();
    return publicOrigin ? `${publicOrigin}${url}` : url;
  }
  return url;
}

/**
 * 截断文本
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '…';
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 对象转 URL 查询字符串（过滤空值）
 */
export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

/**
 * 数字动画：将目标数字逐步增长
 * 返回取消函数，用于在组件卸载时停止动画，避免内存泄漏
 */
export function animateValue(
  from: number,
  to: number,
  duration: number,
  callback: (value: number) => void
): () => void {
  let rafId = 0;
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.floor(from + (to - from) * eased);
    callback(current);
    if (progress < 1) rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

/**
 * 生成范围数组
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
