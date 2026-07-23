// 全局常量定义

import type { BonsaiQuery } from './types';

// API 基础路径（相对路径，由 Nginx 反向代理转发）
export const API_BASE_URL = '/api/v1';

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

// 产地选项
export const ORIGIN_OPTIONS = [
  '江苏',
  '浙江',
  '广东',
  '福建',
  '四川',
  '安徽',
  '日本',
  '其他',
] as const;

// 年份选项（近 30 年）
export const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => {
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

// 导航菜单
export const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/bonsais', label: '盆景收藏' },
  { href: '/categories', label: '分类' },
  { href: '/chat', label: '询价' },
] as const;

// 管理后台导航
export const ADMIN_NAV_LINKS = [
  { href: '/admin/dashboard', label: '数据看板', icon: 'LayoutDashboard' },
  { href: '/admin/bonsais', label: '盆景管理', icon: 'TreePine' },
  { href: '/admin/categories', label: '分类管理', icon: 'FolderTree' },
  { href: '/admin/users', label: '用户管理', icon: 'Users' },
  { href: '/admin/chat', label: '询价管理', icon: 'MessageSquare' },
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
