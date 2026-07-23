import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * 收藏服务
 */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 我的收藏列表（分页）
   */
  async findMyList(userId: number, query: PaginationDto) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.limit || 10);
    const skip = (page - 1) * pageSize;

    const where: Prisma.FavoriteWhereInput = { userId };
    if (query.keyword) {
      where.bonsai = {
        OR: [
          { name: { contains: query.keyword } },
          { description: { contains: query.keyword } },
        ],
      };
    }

    const [list, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        include: {
          bonsai: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              origin: true,
              year: true,
              status: true,
              images: {
                orderBy: [{ isMain: 'desc' }, { sort: 'asc' }],
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.favorite.count({ where }),
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
   * 收藏盆景
   */
  async favorite(userId: number, bonsaiId: number) {
    // 校验盆景存在
    const bonsai = await this.prisma.bonsai.findFirst({
      where: { id: bonsaiId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!bonsai) throw new NotFoundException('盆景不存在');

    // 使用 upsert 处理重复收藏（unique 索引）
    const fav = await this.prisma.favorite.upsert({
      where: { userId_bonsaiId: { userId, bonsaiId } },
      create: { userId, bonsaiId },
      update: {},
    });

    return { favorited: true, id: fav.id, bonsaiId };
  }

  /**
   * 取消收藏
   */
  async unfavorite(userId: number, bonsaiId: number) {
    // 不存在也不报错，幂等操作
    await this.prisma.favorite.deleteMany({
      where: { userId, bonsaiId },
    });
    return { favorited: false, bonsaiId };
  }

  /**
   * 检查是否已收藏
   */
  async check(userId: number, bonsaiId: number) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_bonsaiId: { userId, bonsaiId } },
      select: { id: true, createdAt: true },
    });
    return { favorited: !!fav, favorite: fav };
  }

  /**
   * 收藏总数（数据分析用）
   */
  async countAll(): Promise<number> {
    return this.prisma.favorite.count();
  }
}
