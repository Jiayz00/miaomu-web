// 盆景艺术展示平台 - 数据类型定义

export interface Bonsai {
  id: number;
  name: string;
  slug: string;
  catalogNumber: string | null;
  description: string;
  artisticDescription: string | null;
  era: string | null;
  material: string | null;
  potDescription: string | null;
  canopyWidth: number | null;
  dimensions: string | null;
  provenance: string | null;
  exhibitions: Array<{ name: string; year?: number; location?: string }> | null;
  price: string;
  stock: number;
  origin: string;
  year: number;
  treeAge: number | null;
  height: number | null;
  width: number | null;
  video: string | null;
  categoryId: number;
  status: number;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  images: BonsaiImage[];
}

export interface BonsaiImage {
  id: number;
  url: string;
  isMain: boolean;
  sort: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  sort: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  avatar: string | null;
  phone?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastActiveAt?: string | null;
}

export interface ChatRoom {
  id: number;
  userId: number;
  bonsaiId: number | null;
  status: number;
  createdAt: string;
  bonsai?: Bonsai;
  user?: User;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// 认证相关
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// 分页响应（与后端 { list, total, page, pageSize, totalPages } 结构一致）
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 通用 API 响应包装
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// 图表数据
export interface ChartPoint {
  date: string;
  count: number;
}

export interface TopBonsai {
  id: number;
  name: string;
  viewCount: number;
  favoriteCount: number;
}

export interface CategoryDistribution {
  name: string;
  count: number;
}

export interface DashboardStats {
  totalBonsais: number;
  totalUsers: number;
  totalViews: number;
  totalFavorites: number;
  totalCategories?: number;
  totalRooms?: number;
  pendingRooms?: number;
  todayViews?: number;
  todayNewUsers?: number;
}

// 库存预警
export interface InventoryAlert {
  lowStockCount: number;
  outOfStockCount: number;
  totalStockUnits: number;
  totalStockValue: number;
  activeCount: number;
  featuredCount: number;
  lowStock: Array<{
    id: number;
    name: string;
    slug: string;
    stock: number;
    price: string;
  }>;
  outOfStock: Array<{
    id: number;
    name: string;
    slug: string;
    price: string;
  }>;
}

// 询价统计
export interface InquiryStats {
  pendingCount: number;
  processedCount: number;
  totalCount: number;
  adminRepliedCount: number;
  conversionRate: number;
  processedRate: number;
  trend: {
    days: number;
    list: ChartPoint[];
  };
}

// 用户增长趋势
export interface UserGrowthTrend {
  days: number;
  list: ChartPoint[];
}

// 筛选参数
export interface BonsaiQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number | string;
  minPrice?: number;
  maxPrice?: number;
  origin?: string;
  year?: number | string;
  sort?: string;
}

// ============ 主页布局（SiteLayout）============

// 区块类型（与后端 HomeSectionType 保持一致）
export type HomeSectionType =
  | 'hero'
  | 'featured'
  | 'categories'
  | 'bonsai-grid'
  | 'showcase'
  | 'story'
  | 'cta'
  | 'contact'
  | 'stats'
  | 'carousel'
  | 'text-image'
  | 'product-list'
  | 'text';

// 区块专属配置（按 type 不同字段不同，统一用宽松索引签名）
export interface SectionConfig {
  [key: string]: unknown;
}

// 单个区块配置
export interface HomeSection {
  id: string;
  type: HomeSectionType;
  title?: string;
  subtitle?: string;
  visible: boolean;
  config: SectionConfig;
  order: number;
}

// 站点布局（与后端 SiteLayout 表对应）
export interface SiteLayout {
  id?: number;
  key: string;
  sections: HomeSection[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 布局草稿（后端 GET /admin/settings/layout/:key/draft 返回）
export interface LayoutDraft {
  key: string;
  sections: HomeSection[];
  draftUpdatedAt: string | null;
  hasUnpublishedChanges: boolean;
  isActive: boolean;
}

// 布局草稿预览 token（后端 POST /admin/settings/layout/:key/preview-token 返回）
export interface LayoutPreviewToken {
  previewUrl: string;
  token: string;
  expiresAt: number;
}

// 轮播图单条配置
export interface CarouselSlide {
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

// 图文区块配置
export interface TextImageConfig {
  image?: string;
  body?: string;
  buttonText?: string;
  buttonLink?: string;
  imagePosition?: 'left' | 'right';
}

// 产品列表来源
export type ProductListSource = 'category' | 'featured' | 'latest' | 'hot';

// 产品列表区块配置
export interface ProductListConfig {
  source: ProductListSource;
  categoryId?: number;
  limit: number;
  eyebrow?: string;
  ctaText?: string;
  ctaLink?: string;
}

// 纯文本 / HTML 区块配置
export interface TextBlockConfig {
  content?: string;
}

// ============ 分类页布局配置 ============

// 排版方式
export type CategoryLayoutMode = 'grid' | 'masonry' | 'list';
// 卡片宽高比
export type CategoryCardAspect = '4/5' | '1/1' | '3/4' | '16/9';
// 排序方式
export type CategorySortBy = 'sort' | 'name' | 'createdAt';

// 分类页布局配置（与后端 CategoriesLayoutConfigDto 保持一致）
export interface CategoriesLayoutConfig {
  layout: CategoryLayoutMode;
  aspect: CategoryCardAspect;
  sortBy: CategorySortBy;
  columns: 2 | 3 | 4;
  showDescription: boolean;
  showArrow: boolean;
  showOverlay: boolean;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
}
