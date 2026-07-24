import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
@Injectable()
export class BonsaisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 公开列表查询
   * 仅返回上架商品
   */
  async findPublicList(query: QueryBonsaiDto) {
    const { page, pageSize, skip } = resolvePagination(query);

    const where: Prisma.BonsaiWhereInput = {
      deletedAt: null,
      status: 1,
    };

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { origin: { contains: query.keyword } },
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.origin) {
      where.origin = { contains: query.origin };
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
    if (query.featured === 'true' || query.featured === '1') {
      where.isFeatured = true;
    }

    const sortField = BONSAI_SORT_FIELD_MAP[query.sortBy || 'createdAt'] || 'createdAt';
    const sortOrder = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const [list, total] = await Promise.all([
      this.prisma.bonsai.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isMain: 'desc' }, { sort: 'asc' }],
            take: 5,
          },
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
   * 详情查询（按 slug）
   * 同时记录浏览日志，浏览量 +1
   *
   * 数据一致性：浏览量自增与浏览日志写入在同一事务中，
   * 避免其中一方失败导致统计与日志脱节
   */
  async findPublicBySlug(slug: string, opts?: { userId?: number | null; ip?: string; userAgent?: string }) {
    const bonsai = await this.prisma.bonsai.findFirst({
      where: { slug, deletedAt: null, status: 1 },
      include: {
        category: true,
        images: { orderBy: [{ isMain: 'desc' }, { sort: 'asc' }] },
      },
    });

    if (!bonsai) {
      throw new NotFoundException('盆景不存在或已下架');
    }

    // 事务保证：浏览量自增与浏览日志写入要么同时成功，要么同时回滚
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

    return { ...bonsai, viewCount: bonsai.viewCount + 1 };
  }

  /**
   * 精选盆景
   */
  async findFeatured(limit = 6) {
    return this.prisma.bonsai.findMany({
      where: { deletedAt: null, status: 1, isFeatured: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: [{ isMain: 'desc' }, { sort: 'asc' }],
          take: 3,
        },
      },
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
      include: {
        images: {
          orderBy: [{ isMain: 'desc' }, { sort: 'asc' }],
          take: 1,
        },
      },
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
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.featured === 'true' || query.featured === '1') {
      where.isFeatured = true;
    }

    const sortField = BONSAI_SORT_FIELD_MAP[query.sortBy || 'createdAt'] || 'createdAt';
    const sortOrder = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const [list, total] = await Promise.all([
      this.prisma.bonsai.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isMain: 'desc' }, { sort: 'asc' }],
            take: 3,
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
        category: true,
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
        include: { images: true, category: true },
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
          include: { images: { orderBy: [{ isMain: 'desc' }, { sort: 'asc' }] }, category: true },
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
      include: { images: true, category: true },
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
