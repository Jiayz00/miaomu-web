// 分类页默认布局配置
//
// 与后端 DEFAULT_CATEGORIES_LAYOUT 保持一致
// 修改时需同步两端（backend/src/modules/settings/settings.service.ts）

import type { CategoriesLayoutConfig } from './types';

export const DEFAULT_CATEGORIES_LAYOUT: CategoriesLayoutConfig = {
  layout: 'grid',
  aspect: '4/5',
  sortBy: 'sort',
  columns: 3,
  showDescription: true,
  showArrow: true,
  showOverlay: true,
  title: '分类一览',
  subtitle: '按品类探索盆景，寻觅心仪之选',
  eyebrow: '分类导览',
};

// 选项常量（编辑器使用）

export const LAYOUT_MODE_OPTIONS: Array<{
  value: CategoriesLayoutConfig['layout'];
  label: string;
  description: string;
}> = [
  { value: 'grid', label: '网格', description: '等高网格排列，规整紧凑' },
  { value: 'masonry', label: '瀑布流', description: '按图片自然高度错落排列' },
  { value: 'list', label: '列表', description: '单列大图，适合沉浸浏览' },
];

export const CARD_ASPECT_OPTIONS: Array<{
  value: CategoriesLayoutConfig['aspect'];
  label: string;
}> = [
  { value: '4/5', label: '4 : 5（竖图，默认）' },
  { value: '1/1', label: '1 : 1（方形）' },
  { value: '3/4', label: '3 : 4（竖图）' },
  { value: '16/9', label: '16 : 9（横图）' },
];

export const COLUMNS_OPTIONS: Array<{
  value: 2 | 3 | 4;
  label: string;
}> = [
  { value: 2, label: '2 列' },
  { value: 3, label: '3 列' },
  { value: 4, label: '4 列' },
];

export const SORT_BY_OPTIONS: Array<{
  value: CategoriesLayoutConfig['sortBy'];
  label: string;
}> = [
  { value: 'sort', label: '手动排序（按 sort 字段）' },
  { value: 'name', label: '名称字典序' },
  { value: 'createdAt', label: '创建时间倒序' },
];

// 将 aspect 字符串转为 CSS aspect-ratio 值
export function aspectToCss(aspect: CategoriesLayoutConfig['aspect']): string {
  switch (aspect) {
    case '4/5':
      return '4 / 5';
    case '1/1':
      return '1 / 1';
    case '3/4':
      return '3 / 4';
    case '16/9':
      return '16 / 9';
    default:
      return '4 / 5';
  }
}

// 根据列数返回 tailwind grid 类
export function columnsToClass(columns: CategoriesLayoutConfig['columns']): string {
  switch (columns) {
    case 2:
      return 'sm:grid-cols-2';
    case 3:
      return 'sm:grid-cols-2 lg:grid-cols-3';
    case 4:
      return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    default:
      return 'sm:grid-cols-2 lg:grid-cols-3';
  }
}
