// 全局常量定义

import type { BonsaiQuery } from './types';

/**
 * API 基础路径
 *
 * 关键设计：SSR 与 CSR 差异化处理
 * - 客户端（浏览器）：使用相对路径 `/api/v1`，由 Caddy/Nginx 反向代理转发到后端
 * - 服务端（SSR/Node.js）：必须使用绝对 URL，因为 Node.js 的 fetch 无法解析相对路径
 *   优先级：process.env.BACKEND_URL（Docker 内部网络）> NEXT_PUBLIC_API_URL（若为绝对 URL）> 本地回退
 *
 * 部署说明：
 * - Docker 部署：在 docker-compose.yml 中为 frontend 容器设置 BACKEND_URL=http://backend:4000/api/v1
 * - 本地开发：NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1（绝对 URL，前后端均可用）
 * - 生产同源：NEXT_PUBLIC_API_URL=/api/v1（客户端相对路径），BACKEND_URL=http://backend:4000/api/v1（SSR 用）
 */
function resolveApiBaseUrl(): string {
  // 服务端渲染（Node.js）：必须使用绝对 URL
  if (typeof window === 'undefined') {
    // Docker 内部网络：frontend → backend 容器
    if (process.env.BACKEND_URL) {
      return process.env.BACKEND_URL.replace(/\/$/, '');
    }
    // 本地开发：NEXT_PUBLIC_API_URL 为绝对 URL 时直接使用
    const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicApiUrl && /^https?:\/\//.test(publicApiUrl)) {
      return publicApiUrl.replace(/\/$/, '');
    }
    // 回退：本地后端
    return 'http://localhost:4000/api/v1';
  }
  // 客户端（浏览器）：使用相对路径，由反向代理转发
  return '/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * 后端 origin（不含路径），用于将相对路径的 /uploads/ 图片 URL 转为绝对 URL
 * - SSR 时：图片 URL 需要绝对路径才能被 Node.js fetch 解析（OG 图片等）
 * - CSR 时：浏览器使用相对路径 /uploads/xxx.jpg，由 Caddy 代理
 */
export const BACKEND_ORIGIN = (() => {
  if (typeof window === 'undefined') {
    if (process.env.BACKEND_URL) {
      return process.env.BACKEND_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
    const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicApiUrl && /^https?:\/\//.test(publicApiUrl)) {
      return publicApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
    return 'http://localhost:4000';
  }
  return '';
})();

/**
 * 公网 origin（不含路径），用于生成对外可访问的绝对 URL
 *
 * 使用场景：
 * - Open Graph 元数据：社交平台爬虫无法访问 Docker 内网地址（http://backend:4000）
 * - 分享卡片、邮件链接等需要公网可达的 URL
 *
 * 配置：
 * - 生产环境：NEXT_PUBLIC_PUBLIC_ORIGIN=https://miaomu.jiayyy.cn
 * - 未配置时：回退到 BACKEND_ORIGIN（开发环境可用，生产 OG 会失效但不影响功能）
 */
export const PUBLIC_ORIGIN = (() => {
  // 公网域名在 SSR 与 CSR 下都可用，优先读取
  const publicOrigin = process.env.NEXT_PUBLIC_PUBLIC_ORIGIN;
  if (publicOrigin) {
    return publicOrigin.replace(/\/$/, '');
  }
  // 回退到后端 origin（开发环境或未配置公网域名时）
  return BACKEND_ORIGIN;
})();

// Socket.io 连接地址
// 生产环境通过 Nginx 代理 /socket.io/，使用同源（空字符串表示同源）
// 开发环境显式指定后端地址
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || '';

// 排序选项
export const SORT_OPTIONS = [
  { value: 'newest', label: '最新上架' },
  { value: 'oldest', label: '最早发布' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
  { value: 'popular', label: '热门优先' },
] as const;

// 价格区间选项
export const PRICE_RANGES = [
  { value: '0-1000', label: '¥0 - ¥1,000', min: 0, max: 1000 },
  { value: '1000-5000', label: '¥1,000 - ¥5,000', min: 1000, max: 5000 },
  { value: '5000-20000', label: '¥5,000 - ¥20,000', min: 5000, max: 20000 },
  { value: '20000-100000', label: '¥20,000 - ¥100,000', min: 20000, max: 100000 },
  { value: '100000-99999999', label: '¥100,000 以上', min: 100000, max: 99999999 },
] as const;

// 产地选项（涵盖全国各省及主要盆景产区）
export const ORIGIN_OPTIONS = [
  // 国内 - 直辖市
  '北京', '上海', '天津', '重庆',
  // 国内 - 华东
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  // 国内 - 华南
  '广东', '广西', '海南',
  // 国内 - 华中
  '河南', '湖北', '湖南',
  // 国内 - 华北
  '河北', '山西', '内蒙古',
  // 国内 - 东北
  '辽宁', '吉林', '黑龙江',
  // 国内 - 西南
  '四川', '贵州', '云南', '西藏',
  // 国内 - 西北
  '陕西', '甘肃', '青海', '宁夏', '新疆',
  // 港澳台
  '香港', '澳门', '台湾',
  // 国外产区
  '日本', '韩国', '越南', '泰国',
  // 兜底
  '其他',
] as const;

// 年份选项（从 1900 年至今，覆盖百年盆景）
export const YEAR_OPTIONS = Array.from({ length: 127 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: `${year} 年` };
});

// 默认分页
export const DEFAULT_PAGE_SIZE = 12;

// 默认查询参数
export const DEFAULT_QUERY: BonsaiQuery = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  sort: 'newest',
};

// 导航菜单（用户端顶部导航）
export const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/bonsais', label: '盆景收藏' },
  { href: '/categories', label: '分类' },
  { href: '/chat', label: '询价' },
  { href: '/favorites', label: '我的收藏' },
] as const;

// 管理后台导航
export const ADMIN_NAV_LINKS = [
  { href: '/admin/dashboard', label: '数据看板', icon: 'LayoutDashboard' },
  { href: '/admin/bonsais', label: '盆景管理', icon: 'TreePine' },
  { href: '/admin/categories', label: '分类管理', icon: 'FolderTree' },
  { href: '/admin/users', label: '用户管理', icon: 'Users' },
  { href: '/admin/chat', label: '询价管理', icon: 'MessageSquare' },
  { href: '/admin/settings', label: '站点设置', icon: 'Settings' },
  { href: '/admin/layout-editor', label: '主页布局', icon: 'LayoutTemplate' },
] as const;

// localStorage 键名
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'penjing_access_token',
  REFRESH_TOKEN: 'penjing_refresh_token',
  USER: 'penjing_user',
} as const;

// 图表配色（与设计系统一致）
export const CHART_COLORS = {
  primary: '#1a3a2e',
  primaryLight: '#2d5a3d',
  accent: '#c9a961',
  accentLight: '#d9bd7a',
  muted: '#9a9a9a',
  background: '#faf8f5',
};

// 图表分类配色序列
export const CHART_PALETTE = [
  '#1a3a2e',
  '#c9a961',
  '#2d5a3d',
  '#d9bd7a',
  '#0f2820',
  '#a8893f',
  '#6b8e7f',
  '#e6d4a8',
];
