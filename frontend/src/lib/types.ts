// 盆景艺术展示平台 - 数据类型定义

export interface Bonsai {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  origin: string;
  year: number;
  treeAge: number | null;
  height: number | null;
  width: number | null;
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
}

export interface ChatRoom {
  id: number;
  userId: number;
  bonsaiId: number | null;
  status: number;
  createdAt: string;
  bonsai?: Bonsai;
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

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
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
