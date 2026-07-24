import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { resolvePagination, buildPaginatedResponse } from '../../common/dto/pagination.helper';

/**
 * 收藏服务
 */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 我的收藏列表（分页）
   * 数据一致性：过滤掉已软删除的盆景，避免向用户展示失效商品
   */
  async findMyList(userId: number, query: PaginationDto) {
    const { page, pageSize, skip } = resolvePagination(query);

    const where: Prisma.FavoriteWhereInput = {
      userId,
      // 软删除过滤：已删除盆景不展示在收藏列表中
      bonsai: { deletedAt: null },
    };
    if (query.keyword) {
      where.bonsai = {
        deletedAt: null,
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

    return buildPaginatedResponse(list, total, page, pageSize);
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
   * 批量检查收藏状态（解决列表页 N+1 查询问题）
   * 一次性返回用户对多个盆景的收藏状态，避免每个卡片单独请求
   *
   * @param userId   用户 ID
   * @param bonsaiIds 盆景 ID 列表（最多 100 个）
   * @returns { [bonsaiId]: boolean } 收藏状态映射
   */
  async batchCheck(userId: number, bonsaiIds: number[]): Promise<Record<number, boolean>> {
    // 防御：限制批量查询数量
    const ids = bonsaiIds.slice(0, 100);
    if (ids.length === 0) return {};

    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        bonsaiId: { in: ids },
      },
      select: { bonsaiId: true },
    });

    const favoritedSet = new Set(favorites.map((f) => f.bonsaiId));
    const result: Record<number, boolean> = {};
    for (const id of ids) {
      result[id] = favoritedSet.has(id);
    }
    return result;
  }

  /**
   * 收藏总数（数据分析用）
   */
  async countAll(): Promise<number> {
    return this.prisma.favorite.count();
  }
}
