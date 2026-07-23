import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBonsaiDto } from './dto/create-bonsai.dto';
import { UpdateBonsaiDto } from './dto/update-bonsai.dto';
import { QueryBonsaiDto } from './dto/query-bonsai.dto';

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
    const page = Number(query.page || 1);
    const pageSize = Number(query.limit || 10);
    const skip = (page - 1) * pageSize;

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

    // 排序映射（防止 SQL 注入，仅允许白名单字段）
    const sortFieldMap: Record<string, string> = {
      createdAt: 'createdAt',
      price: 'price',
      viewCount: 'viewCount',
      year: 'year',
    };
    const sortField = sortFieldMap[query.sortBy || 'createdAt'] || 'createdAt';
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

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 详情查询（按 slug）
   * 同时记录浏览日志，浏览量 +1
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

    // 浏览量 +1，并写入浏览日志（异步并行）
    await Promise.all([
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
    const page = Number(query.page || 1);
    const pageSize = Number(query.limit || 10);
    const skip = (page - 1) * pageSize;

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

    const sortFieldMap: Record<string, string> = {
      createdAt: 'createdAt',
      price: 'price',
      viewCount: 'viewCount',
      year: 'year',
    };
    const sortField = sortFieldMap[query.sortBy || 'createdAt'] || 'createdAt';
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

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
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
   */
  async create(dto: CreateBonsaiDto) {
    // 检查 slug 唯一
    const exist = await this.prisma.bonsai.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });
    if (exist) {
      throw new ConflictException('slug 已被使用');
    }

    // 校验分类存在
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const { images, ...bonsaiData } = dto;

    return this.prisma.bonsai.create({
      data: {
        ...bonsaiData,
        price: new Prisma.Decimal(bonsaiData.price),
        images: images
          ? { create: images.map((img) => ({ url: img.url, isMain: img.isMain ?? false, sort: img.sort ?? 0 })) }
          : undefined,
      },
      include: { images: true, category: true },
    });
  }

  /**
   * 更新盆景
   */
  async update(id: number, dto: UpdateBonsaiDto) {
    await this.findAdminById(id);

    const { images, price, categoryId, ...rest } = dto;

    // 分类校验
    if (categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new NotFoundException('分类不存在');
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
