// 默认图片资源
// 对齐 design-assets 设计稿：当后端无数据或图片缺失时，使用这些图片作为兜底
// 设计稿来源：d:\盆景网站开发\design-assets\assets\image_0~5_yi19x4.jpg

export const DEFAULT_IMAGES = {
  // 首页 Hero 主视觉：东方盆景艺术馆（松影斜倚、苔痕沉沉的盆景园景）
  heroGarden: '/images/hero-penjing-garden.jpg',
  // 匠人手记：匠人执剪修整盆景苔面的近景特写
  artisanPruning: '/images/artisan-pruning.jpg',
  // 幽园（站点编辑器/通用场景）
  sereneGarden: '/images/serene-garden.jpg',
  // 盆景默认图（三张艺术盆景）
  bonsais: {
    welcomePine: '/images/bonsais/welcome-pine.jpg', // 迎客松 · 黑松
    cliffCypress: '/images/bonsais/cliff-cypress.jpg', // 悬崖柏 · 真柏
    winterPlum: '/images/bonsais/winter-plum.jpg', // 寒梅 · 宫粉梅
  },
} as const;

// 盆景默认图片轮转池（用于 BonsaiCard 兜底，避免所有卡片显示同一张图）
export const BONSAI_FALLBACK_POOL = [
  DEFAULT_IMAGES.bonsais.welcomePine,
  DEFAULT_IMAGES.bonsais.cliffCypress,
  DEFAULT_IMAGES.bonsais.winterPlum,
] as const;

// 分类默认图片轮转池
export const CATEGORY_FALLBACK_POOL = [
  DEFAULT_IMAGES.bonsais.welcomePine,
  DEFAULT_IMAGES.bonsais.cliffCypress,
  DEFAULT_IMAGES.bonsais.winterPlum,
] as const;

// 根据盆景 ID 取稳定的兜底图片（同一盆景始终使用同一张图）
export function getBonsaiFallback(id: number | string): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) || 0 : id;
  return BONSAI_FALLBACK_POOL[numId % BONSAI_FALLBACK_POOL.length];
}

// 根据分类 ID 取稳定的兜底图片
export function getCategoryFallback(id: number | string): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) || 0 : id;
  return CATEGORY_FALLBACK_POOL[numId % CATEGORY_FALLBACK_POOL.length];
}
