import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { resolvePagination, buildPaginatedResponse } from '../../common/dto/pagination.helper';
import { CreateBonsaiDto } from './dto/create-bonsai.dto';
import { UpdateBonsaiDto } from './dto/update-bonsai.dto';
import { QueryBonsaiDto } from './dto/query-bonsai.dto';

/**
 * 排序字段白名单映射（防止 SQL 注入，仅允许白名单字段）
 *
 * 设计原则：DRY
 * findPublicList 与 findAdminList 共享同一映射，避免重复定义
 */
const BONSAI_SORT_FIELD_MAP: Record<string, string> = {
  createdAt: 'createdAt',
  price: 'price',
  viewCount: 'viewCount',
  year: 'year',
};

/**
 * 盆景服务
 * 处理盆景商品的 CRUD、查询、浏览记录
 */
const PUBLIC_LIST_CACHE_PREFIX = 'bonsai:public:list';
const FEATURED_CACHE_PREFIX = 'bonsai:public:featured';
const PUBLIC_CACHE_PATTERN = 'bonsai:public:*';
const LIST_CACHE_TTL_SECONDS = 60;
const FEATURED_CACHE_TTL_SECONDS = 120;

/**
 * 列表/卡片场景字段白名单
 *
 * 覆盖 BonsaiCard（公开列表/精选/相关推荐）与管理端列表所需字段：
 * id/name/slug/price/stock/origin/year/treeAge/height/width/isFeatured/status/createdAt/categoryId
 * + category { id/name/slug }
 * + images { id/url/isMain/sort }（列表仅取主图 1 张，见 images.where）
 *
 * 避免把 video/description/deletedAt/updatedAt 等未使用字段带回前端，
 * 同时避免 admin 列表 _count 之外的多余关联。
 */
const BONSAI_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  stock: true,
  origin: true,
  year: true,
  treeAge: true,
  height: true,
  width: true,
  isFeatured: true,
  status: true,
  createdAt: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    where: { isMain: true },
    orderBy: [{ sort: 'asc' as const }],
    take: 1,
    select: { id: true, url: true, isMain: true, sort: true },
  },
} satisfies Prisma.BonsaiSelect;

/**
 * 管理端列表在卡片字段基础上追加收藏数统计
 */
const ADMIN_BONSAI_LIST_SELECT = {
  ...BONSAI_CARD_SELECT,
  _count: { select: { favorites: true } },
} satisfies Prisma.BonsaiSelect;

@Injectable()
export class BonsaisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 生成公开列表缓存 key
   * 按字母顺序序列化查询参数，确保相同查询得到相同 key
   */
  private buildPublicListCacheKey(query: QueryBonsaiDto): string {
    const entries = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    return `${PUBLIC_LIST_CACHE_PREFIX}:${JSON.stringify(entries)}`;
  }

  /**
   * 清除公开相关缓存（创建/更新/删除/状态变更后调用）
   */
  private async clearPublicCache(): Promise<void> {
    try {
      await this.redis.deletePattern(PUBLIC_CACHE_PATTERN);
    } catch {
      // 缓存清除失败不应阻塞主流程
    }
  }

  /**
   * 公开列表查询
   * 仅返回上架商品
   */
  async findPublicList(query: QueryBonsaiDto) {
    const { page, pageSize, skip } = resolvePagination(query);

    // 尝试读取缓存（缓存失败不阻塞主流程）
    const cacheKey = this.buildPublicListCacheKey(query);
    try {
      const cached = await this.redis.getJson<ReturnType<typeof buildPaginatedResponse<unknown>>>(cacheKey);
      if (cached) return cached;
    } catch {
      // 继续走数据库
    }

    const where: Prisma.BonsaiWhereInput = {
      deletedAt: null,
      status: 1,
    };

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { origin: { contains: query.keyword } },
        { catalogNumber: { contains: query.keyword } },
        { material: { contains: query.keyword } },
        { era: { contains: query.keyword } },
        { artisticDescription: { contains: query.keyword } },
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.origin) {
      where.origin = { contains: query.origin };
    }
    if (query.catalogNumber) {
      where.catalogNumber = { contains: query.catalogNumber };
    }
    if (query.material) {
      where.material = { contains: query.material };
    }
    if (query.era) {
      where.era = { contains: query.era };
    }
    if (query.yearFrom || query.yearTo) {
      where.year = {};
      if (query.yearFrom) where.year.gte = query.yearFrom;
      if (query.yearTo) where.year.lte = query.yearTo;
    }
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      where.price = {};
      if (query.priceMin !== undefined) where.price.gte = query.priceMin;
      if (query.priceMax !== undefined) where.price.lte = query.priceMax;
    }
    if (query.featured === true) {
      where.isFeatured = true;
    }

    const sortField = BONSAI_SORT_FIELD_MAP[query.sortBy || 'createdAt'] || 'createdAt';
    const sortOrder = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const [list, total] = await Promise.all([
      this.prisma.bonsai.findMany({
        where,
        select: BONSAI_CARD_SELECT,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.bonsai.count({ where }),
    ]);

    const result = buildPaginatedResponse(list, total, page, pageSize);

    // 写入缓存（失败不阻塞返回）
    try {
      await this.redis.setJson(cacheKey, result, LIST_CACHE_TTL_SECONDS);
    } catch {
      // 忽略缓存写入失败
    }

    return result;
  }

  /**
   * 详情查询（按 slug）
   * 同时记录浏览日志，浏览量 +1
   *
   * 性能优化：浏览量自增与浏览日志写入改为异步后台执行，
   * 避免阻塞详情 API 响应。失败仅影响统计，不影响用户查看详情。
   */
  async findPublicBySlug(slug: string, opts?: { userId?: number | null; ip?: string; userAgent?: string }) {
    // 兼容前端对中文 slug 的 URL 编码：部分浏览器/反向代理会保留编码形态传入，
    // 而数据库通常存储原始中文 slug，先 decode 再查询可避免 404。
    let decodedSlug: string;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch {
      // 非法编码视为不存在，不暴露内部 URIError 细节
      throw new BadRequestException('slug 格式不正确');
    }
    const bonsai = await this.prisma.bonsai.findFirst({
      where: { slug: decodedSlug, deletedAt: null, status: 1 },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isMain: 'desc' }, { sort: 'asc' }] },
      },
    });

    if (!bonsai) {
      throw new NotFoundException('盆景不存在或已下架');
    }

    // 异步后台记录浏览量与日志，不阻塞响应
    Promise.resolve().then(async () => {
      try {
        await this.prisma.$transaction([
          this.prisma.bonsai.update({
            where: { id: bonsai.id },
            data: { viewCount: { increment: 1 } },
          }),
          this.prisma.viewLog.create({
            data: {
              userId: opts?.userId ?? null,
              bonsaiId: bonsai.id,
              ip: opts?.ip ?? null,
              userAgent: opts?.userAgent ?? null,
            },
          }),
        ]);
      } catch (err) {
        // 浏览统计失败不应影响主流程，记录日志即可
        console.error('记录浏览日志失败:', err);
      }
    });

    return { ...bonsai, viewCount: bonsai.viewCount + 1 };
  }

  /**
   * 精选盆景
   */
  async findFeatured(limit = 6) {
    return this.prisma.bonsai.findMany({
      where: { deletedAt: null, status: 1, isFeatured: true },
      select: BONSAI_CARD_SELECT,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  }

  /**
   * 相关推荐（同分类）
   */
  async findRelated(id: number, limit = 6) {
    const current = await this.prisma.bonsai.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, categoryId: true },
    });
    if (!current) {
      throw new NotFoundException('盆景不存在');
    }

    return this.prisma.bonsai.findMany({
      where: {
        categoryId: current.categoryId,
        id: { not: id },
        deletedAt: null,
        status: 1,
      },
      select: BONSAI_CARD_SELECT,
      take: Math.min(limit, 20),
      orderBy: { viewCount: 'desc' },
    });
  }

  /**
   * 管理员列表查询（含下架/全部）
   */
  async findAdminList(query: QueryBonsaiDto) {
    const { page, pageSize, skip } = resolvePagination(query);

    const where: Prisma.BonsaiWhereInput = {
      deletedAt: null,
    };

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { catalogNumber: { contains: query.keyword } },
        { material: { contains: query.keyword } },
        { era: { contains: query.keyword } },
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.featured === true) {
      where.isFeatured = true;
    }

    const sortField = BONSAI_SORT_FIELD_MAP[query.sortBy || 'createdAt'] || 'createdAt';
    const sortOrder = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const [list, total] = await Promise.all([
      this.prisma.bonsai.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          // 管理端列表也只需主图
          images: {
            where: { isMain: true },
            orderBy: [{ sort: 'asc' }],
            take: 1,
          },
          _count: { select: { favorites: true } },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.bonsai.count({ where }),
    ]);

    return buildPaginatedResponse(list, total, page, pageSize);
  }

  /**
   * 管理员详情
   */
  async findAdminById(id: number) {
    const bonsai = await this.prisma.bonsai.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isMain: 'desc' }, { sort: 'asc' }] },
        _count: { select: { favorites: true, viewLogs: true, chatRooms: true } },
      },
    });
    if (!bonsai) {
      throw new NotFoundException('盆景不存在');
    }
    return bonsai;
  }

  /**
   * 创建盆景
   *
   * 并发安全：slug 唯一性由数据库 UNIQUE 约束兜底，
   * 捕获 P2002 错误转换为 ConflictException，避免 check-then-create 竞态
   */
  async create(dto: CreateBonsaiDto) {
    // 校验分类存在
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const { images, ...bonsaiData } = dto;

    try {
      return await this.prisma.bonsai.create({
        data: {
          ...bonsaiData,
          price: new Prisma.Decimal(bonsaiData.price),
          images: images
            ? { create: images.map((img) => ({ url: img.url, isMain: img.isMain ?? false, sort: img.sort ?? 0 })) }
            : undefined,
        },
        include: { images: true, category: { select: { id: true, name: true, slug: true } } },
      });
    } catch (e) {
      // P2002: Unique constraint failed — slug 并发重复
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('slug 已被使用');
      }
      throw e;
    }
  }

  /**
   * 更新盆景
   *
   * 图片更新策略：若 dto.images 提供，则先删除该盆景所有旧图片，再创建新图片
   * 事务保证：删除旧图 + 创建新图原子化，避免中途失败导致图片丢失
   */
  async update(id: number, dto: UpdateBonsaiDto) {
    await this.findAdminById(id);

    const { images, price, categoryId, ...rest } = dto;

    // 分类校验
    if (categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new NotFoundException('分类不存在');
    }

    // 若提供了 images（含空数组），则更新图片：先删后建
    // 注意：images === undefined 表示不更新图片，images === [] 表示清空图片
    const shouldUpdateImages = images !== undefined;

    // 使用事务保证图片更新的原子性
    if (shouldUpdateImages) {
      return this.prisma.$transaction(async (tx) => {
        // 1. 删除所有旧图片
        await tx.bonsaiImage.deleteMany({ where: { bonsaiId: id } });
        // 2. 创建新图片
        if (images.length > 0) {
          await tx.bonsaiImage.createMany({
            data: images.map((img, idx) => ({
              bonsaiId: id,
              url: img.url,
              isMain: img.isMain ?? false,
              sort: img.sort ?? idx,
            })),
          });
        }
        // 3. 更新盆景其他字段
        return tx.bonsai.update({
          where: { id },
          data: {
            ...rest,
            ...(price !== undefined && { price: new Prisma.Decimal(price) }),
            ...(categoryId !== undefined && { categoryId }),
          },
          include: { images: { orderBy: [{ isMain: 'desc' }, { sort: 'asc' }] }, category: { select: { id: true, name: true, slug: true } } },
        });
      });
    }

    return this.prisma.bonsai.update({
      where: { id },
      data: {
        ...rest,
        ...(price !== undefined && { price: new Prisma.Decimal(price) }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: { images: true, category: { select: { id: true, name: true, slug: true } } },
    });
  }

  /**
   * 软删除
   */
  async softDelete(id: number) {
    await this.findAdminById(id);
    await this.prisma.bonsai.update({
      where: { id },
      data: { deletedAt: new Date(), status: 0 },
    });
    return { id, deletedAt: new Date() };
  }

  /**
   * 上架/下架
   */
  async updateStatus(id: number, status: number) {
    await this.findAdminById(id);
    return this.prisma.bonsai.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  /**
   * 内部调用：通过 ID 集合获取盆景（聚合统计用）
   */
  async getTopByViewCount(limit = 10) {
    return this.prisma.bonsai.findMany({
      where: { deletedAt: null },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        viewCount: true,
        price: true,
      },
    });
  }

  async getTopByFavoriteCount(limit = 10) {
    return this.prisma.bonsai.findMany({
      where: { deletedAt: null },
      orderBy: { favorites: { _count: 'desc' } },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        _count: { select: { favorites: true } },
      },
    });
  }

  async countAll(): Promise<number> {
    return this.prisma.bonsai.count({ where: { deletedAt: null } });
  }

  async sumViewCount(): Promise<number> {
    const result = await this.prisma.bonsai.aggregate({
      _sum: { viewCount: true },
      where: { deletedAt: null },
    });
    return result._sum.viewCount ?? 0;
  }
}
