import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BonsaisService } from '../bonsais/bonsais.service';
import { CategoriesService } from '../categories/categories.service';
import { FavoritesService } from '../favorites/favorites.service';
import { UsersService } from '../users/users.service';

/**
 * 数据分析服务
 * 使用 Prisma 聚合查询生成统计数据
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bonsaisService: BonsaisService,
    private readonly categoriesService: CategoriesService,
    private readonly favoritesService: FavoritesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * 看板汇总数据
   * - 总盆景数
   * - 总用户数
   * - 总浏览量
   * - 总收藏量
   * - 待处理会话数
   */
  async getDashboard() {
    const [
      totalBonsais,
      totalUsers,
      totalViews,
      totalFavorites,
      totalCategories,
      pendingRooms,
      totalRooms,
    ] = await Promise.all([
      this.bonsaisService.countAll(),
      this.usersService.countAll(),
      this.bonsaisService.sumViewCount(),
      this.favoritesService.countAll(),
      this.prisma.category.count(),
      this.prisma.chatRoom.count({ where: { status: 0 } }),
      this.prisma.chatRoom.count(),
    ]);

    // 今日浏览量
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayViews = await this.prisma.viewLog.count({
      where: { createdAt: { gte: todayStart } },
    });

    // 今日新增用户
    const todayNewUsers = await this.prisma.user.count({
      where: { createdAt: { gte: todayStart } },
    });

    return {
      totalBonsais,
      totalUsers,
      totalViews,
      totalFavorites,
      totalCategories,
      totalRooms,
      pendingRooms,
      todayViews,
      todayNewUsers,
    };
  }

  /**
   * 浏览量趋势
   * @param days 天数（7 或 30）
   */
  async getViewsTrend(days: number) {
    const validDays = [7, 30].includes(days) ? days : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays + 1);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.viewLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    // 按日期分组
    const dateMap = new Map<string, number>();
    for (let i = 0; i < validDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = this.formatDate(d);
      dateMap.set(key, 0);
    }

    for (const r of records) {
      const key = this.formatDate(r.createdAt);
      dateMap.set(key, (dateMap.get(key) || 0) + 1);
    }

    return {
      days: validDays,
      list: Array.from(dateMap.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  /**
   * 收藏量趋势
   */
  async getFavoritesTrend(days: number) {
    const validDays = [7, 30].includes(days) ? days : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays + 1);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.favorite.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const dateMap = new Map<string, number>();
    for (let i = 0; i < validDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = this.formatDate(d);
      dateMap.set(key, 0);
    }

    for (const r of records) {
      const key = this.formatDate(r.createdAt);
      dateMap.set(key, (dateMap.get(key) || 0) + 1);
    }

    return {
      days: validDays,
      list: Array.from(dateMap.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  /**
   * 热门盆景 TOP10（按浏览量 + 收藏量综合排序）
   */
  async getTopBonsais() {
    const [byViews, byFavorites] = await Promise.all([
      this.bonsaisService.getTopByViewCount(10),
      this.bonsaisService.getTopByFavoriteCount(10),
    ]);

    return {
      byViews,
      byFavorites,
    };
  }

  /**
   * 分类占比
   */
  async getCategoryDistribution() {
    const distribution = await this.categoriesService.getDistribution();
    const total = distribution.reduce((sum, c) => sum + c.count, 0);
    return {
      total,
      list: distribution.map((c) => ({
        ...c,
        percentage: total > 0 ? Number(((c.count / total) * 100).toFixed(2)) : 0,
      })),
    };
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
