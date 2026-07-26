// 默认示例盆景数据
// 对齐 design-assets 设计稿：当后端无数据时，首页/列表页使用这些示例数据展示视觉效果
// 设计稿来源：d:\盆景网站开发\design-assets\pages\首页.html 第 1787-1860 行（精选藏品区）
// 图片来源：design-assets/assets/image_1~3_yi19x4.jpg

import { DEFAULT_IMAGES } from './default-images';
import type { Bonsai } from './types';

// 示例盆景数据（3 件镇馆之品，与设计稿一致）
// 注意：id 使用负数，避免与后端真实数据冲突；slug 使用 example- 前缀
export const DEFAULT_BONSAIS: Bonsai[] = [
  {
    id: -1,
    slug: 'example-welcome-pine',
    name: '迎客松',
    catalogNumber: 'PJ-DEMO-001',
    description:
      '黑松悬崖式造型，主干虬曲向一侧探出，绿冠层叠如盖。枝片经年蟠扎，层叠有序，如迎客之姿，气韵生动。',
    artisticDescription:
      '主干自盆中向右探出，势如揖客；枝片层叠如云，针叶苍翠。整树姿态端庄而不失灵动，是传统迎客松造型的当代表达。',
    era: '当代',
    material: '黑松',
    potDescription: '宜兴紫砂椭圆盆，赭褐色',
    canopyWidth: 82,
    dimensions: '高65cm×宽80cm×冠82cm',
    provenance: '岭南盆景园藏',
    exhibitions: [{ name: '岭南盆景精品展', year: 2024, location: '广州' }],
    price: '0', // 询价
    stock: 1,
    origin: '岭南',
    year: 2024,
    treeAge: 45,
    height: 65,
    width: 80,
    video: null,
    categoryId: 1,
    status: 1,
    isFeatured: true,
    viewCount: 0,
    images: [
      {
        id: -1,
        url: DEFAULT_IMAGES.bonsais.welcomePine,
        isMain: true,
        sort: 0,
      },
    ],
    createdAt: new Date('2024-03-15').toISOString(),
    updatedAt: new Date('2024-03-15').toISOString(),
  },
  {
    id: -2,
    slug: 'example-cliff-cypress',
    name: '悬崖柏',
    catalogNumber: 'PJ-DEMO-002',
    description:
      '真柏悬崖式造型，主干悬垂倒挂如崖间探出，翠叶团簇。枝叶经年修剪，团簇如云，临渊之姿，清逸出尘。',
    artisticDescription:
      '主干悬垂而出，枝叶团簇于梢端，如崖边孤柏临风。翠绿团云与苍劲主干形成对比，清雅出尘。',
    era: '当代',
    material: '真柏',
    potDescription: '景德镇青花高脚盆',
    canopyWidth: 68,
    dimensions: '高55cm×宽70cm×冠68cm',
    provenance: '江南文人盆景旧藏',
    exhibitions: [{ name: '江南文人盆景展', year: 2024, location: '苏州' }],
    price: '0',
    stock: 1,
    origin: '江南',
    year: 2024,
    treeAge: 38,
    height: 55,
    width: 70,
    video: null,
    categoryId: 1,
    status: 1,
    isFeatured: true,
    viewCount: 0,
    images: [
      {
        id: -2,
        url: DEFAULT_IMAGES.bonsais.cliffCypress,
        isMain: true,
        sort: 0,
      },
    ],
    createdAt: new Date('2024-03-10').toISOString(),
    updatedAt: new Date('2024-03-10').toISOString(),
  },
  {
    id: -3,
    slug: 'example-winter-plum',
    name: '寒梅',
    catalogNumber: 'PJ-DEMO-003',
    description:
      '宫粉梅苍干虬枝，含苞待放。老干横卧，疏枝点粉，含苞将放，清骨天成。寒梅之姿，疏影横斜，暗香浮动。',
    artisticDescription:
      '老干横斜，疏枝点粉，含苞欲放。以少胜多，以疏见雅，尽显寒梅清骨与文人意趣。',
    era: '当代',
    material: '宫粉梅',
    potDescription: '宜兴紫砂浅口长方盆',
    canopyWidth: 62,
    dimensions: '高70cm×宽60cm×冠62cm',
    provenance: '江南梅园老桩选育',
    exhibitions: [{ name: '迎春梅花盆景雅集', year: 2024, location: '杭州' }],
    price: '0',
    stock: 1,
    origin: '江南',
    year: 2024,
    treeAge: 52,
    height: 70,
    width: 60,
    video: null,
    categoryId: 2,
    status: 1,
    isFeatured: true,
    viewCount: 0,
    images: [
      {
        id: -3,
        url: DEFAULT_IMAGES.bonsais.winterPlum,
        isMain: true,
        sort: 0,
      },
    ],
    createdAt: new Date('2024-03-05').toISOString(),
    updatedAt: new Date('2024-03-05').toISOString(),
  },
];

// 取默认精选盆景（前 N 件）
export function getDefaultFeaturedBonsais(limit = 6): Bonsai[] {
  return DEFAULT_BONSAIS.slice(0, limit);
}
