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
   * - 今日浏览量 / 今日新增用户
   *
   * 性能设计：所有 9 个查询一次性 Promise.all 并行，避免串行 await。
   */
  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalBonsais,
      totalUsers,
      totalViews,
      totalFavorites,
      totalCategories,
      pendingRooms,
      totalRooms,
      todayViews,
      todayNewUsers,
    ] = await Promise.all([
      this.bonsaisService.countAll(),
      this.usersService.countAll(),
      this.bonsaisService.sumViewCount(),
      this.favoritesService.countAll(),
      this.prisma.category.count(),
      this.prisma.chatRoom.count({ where: { status: 0 } }),
      this.prisma.chatRoom.count(),
      this.prisma.viewLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

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
   *
   * 性能设计：
   * 使用 MySQL DATE_FORMAT 在数据库层按天聚合，避免将所有 ViewLog 拉到内存分组。
   * 假设日活 1 万次浏览、30 天 = 30 万条记录：原实现单次响应约 15MB，
   * 改为聚合后仅返回 30 行（约 1KB），性能提升 1000+ 倍。
   */
  async getViewsTrend(days: number) {
    const validDays = this.resolveTrendDays(days);
    const startDate = this.getTrendStartDate(validDays);

    const rows = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM view_logs
      WHERE created_at >= ${startDate}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    `;

    return this.buildTrendResult(validDays, startDate, rows);
  }

  /**
   * 收藏量趋势
   * 同 getViewsTrend，使用数据库聚合避免全表扫描。
   */
  async getFavoritesTrend(days: number) {
    const validDays = this.resolveTrendDays(days);
    const startDate = this.getTrendStartDate(validDays);

    const rows = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM favorites
      WHERE created_at >= ${startDate}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    `;

    return this.buildTrendResult(validDays, startDate, rows);
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

  /**
   * 库存预警
   * - 低库存（stock <= 2 且 > 0）
   * - 售罄（stock = 0）
   * - 总库存价值（∑ price × stock）
   */
  async getInventoryAlert() {
    const [lowStock, outOfStock, totalStockValue, activeCount, featuredCount] =
      await Promise.all([
        this.prisma.bonsai.findMany({
          where: { stock: { lte: 2, gt: 0 }, deletedAt: null, status: 1 },
          select: {
            id: true,
            name: true,
            slug: true,
            stock: true,
            price: true,
          },
          orderBy: { stock: 'asc' },
          take: 20,
        }),
        this.prisma.bonsai.findMany({
          where: { stock: 0, deletedAt: null, status: 1 },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
          },
          take: 20,
        }),
        this.prisma.bonsai.aggregate({
          where: { deletedAt: null, status: 1 },
          _sum: { stock: true },
          _count: true,
        }),
        this.prisma.bonsai.count({
          where: { deletedAt: null, status: 1 },
        }),
        this.prisma.bonsai.count({
          where: { deletedAt: null, status: 1, isFeatured: true },
        }),
      ]);

    // 库存总值需单独计算（避免 Decimal 序列化问题）
    const valueRows = await this.prisma.$queryRaw<Array<{ totalValue: bigint }>>`
      SELECT COALESCE(SUM(stock * price), 0) AS totalValue
      FROM bonsais
      WHERE deleted_at IS NULL AND status = 1
    `;
    const totalStockValueNum = Number(valueRows[0]?.totalValue ?? 0);

    return {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      totalStockUnits: totalStockValue._sum.stock ?? 0,
      totalStockValue: totalStockValueNum,
      activeCount,
      featuredCount,
      lowStock,
      outOfStock,
    };
  }

  /**
   * 询价统计
   * - 未回复会话数（status=0）
   * - 平均首次响应时长（管理员首条消息 - 用户创建会话的时间）
   * - 询价量趋势（按天聚合）
   * - 询价转化漏斗：会话数 → 有管理员回复的会话数 → 已处理会话数
   */
  async getInquiryStats(days: number) {
    const validDays = this.resolveTrendDays(days);
    const startDate = this.getTrendStartDate(validDays);

    const [
      pendingCount,
      processedCount,
      totalCount,
      recentInquiryTrend,
      adminRepliedCount,
    ] = await Promise.all([
      this.prisma.chatRoom.count({ where: { status: 0 } }),
      this.prisma.chatRoom.count({ where: { status: 1 } }),
      this.prisma.chatRoom.count(),
      // 询价量趋势（按天聚合，使用 SQL 避免全表扫描）
      this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
        FROM chat_rooms
        WHERE created_at >= ${startDate}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      `,
      // 有管理员回复的会话数（累计指标，用于计算回复率）
      // 优化：先用子查询过滤 ADMIN 用户，使 chat_messages 可走 sender_id 索引
      // 避免对 chat_messages 全表扫描后再 JOIN users 表
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT cm.room_id) AS count
        FROM chat_messages cm
        WHERE cm.sender_id IN (SELECT id FROM users WHERE role = 'ADMIN')
      `,
    ]);

    const trend = this.buildTrendResult(validDays, startDate, recentInquiryTrend);

    return {
      pendingCount,
      processedCount,
      totalCount,
      adminRepliedCount: Number(adminRepliedCount[0]?.count ?? 0),
      conversionRate: totalCount > 0
        ? Number((Number(adminRepliedCount[0]?.count ?? 0) / totalCount * 100).toFixed(2))
        : 0,
      processedRate: totalCount > 0
        ? Number((processedCount / totalCount * 100).toFixed(2))
        : 0,
      trend,
    };
  }

  /**
   * 用户增长趋势（按天聚合新注册用户数）
   */
  async getUserGrowthTrend(days: number) {
    const validDays = this.resolveTrendDays(days);
    const startDate = this.getTrendStartDate(validDays);

    const rows = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    `;

    return this.buildTrendResult(validDays, startDate, rows);
  }

  /**
   * 校验趋势天数，仅允许 7 或 30，默认 7
   * 设计原则：DRY，4 个趋势接口共享同一校验
   */
  private resolveTrendDays(days: number): number {
    return [7, 30].includes(days) ? days : 7;
  }

  /**
   * 计算趋势起始日期（validDays 天前的当天 00:00:00）
   * 设计原则：DRY，4 个趋势接口共享同一起始日期计算
   */
  private getTrendStartDate(validDays: number): Date {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays + 1);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  /**
   * 构造趋势结果：补全缺失日期 + 按日期升序输出
   *
   * 设计原则：DRY
   * 4 个趋势接口（views / favorites / inquiry / user-growth）均使用相同的
   * "补全缺失日期 + 输出 { days, list }" 逻辑，集中到此处避免散落
   *
   * @param validDays  有效天数
   * @param startDate  起始日期
   * @param rows       数据库聚合结果（仅含已有数据的日期）
   */
  private buildTrendResult(
    validDays: number,
    startDate: Date,
    rows: Array<{ date: string; count: bigint }>,
  ): { days: number; list: Array<{ date: string; count: number }> } {
    const dateMap = new Map<string, number>();
    // 1) 补全缺失日期（无数据的日期填充 0）
    for (let i = 0; i < validDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dateMap.set(this.formatDate(d), 0);
    }
    // 2) 用数据库返回的实际数据覆盖
    for (const row of rows) {
      dateMap.set(row.date, Number(row.count));
    }
    return {
      days: validDays,
      list: Array.from(dateMap.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
