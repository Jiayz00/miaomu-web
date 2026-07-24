import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FavoritesService } from '../src/modules/favorites/favorites.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createPrismaMock,
  type PrismaMock,
} from './helpers/mock-services';

/**
 * FavoritesService 单元测试
 *
 * 覆盖关键路径：
 * - findMyList：分页、关键词过滤、总数计算
 * - favorite：盆景不存在抛 404、upsert 重复收藏幂等
 * - unfavorite：幂等删除
 * - check：已收藏 / 未收藏
 * - batchCheck：批量查、空数组、超 100 项截断
 */
describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(FavoritesService);
  });

  describe('findMyList', () => {
    it('默认分页应返回正确结构', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { id: 1, bonsai: { id: 10, name: '黑松' } },
      ]);
      prisma.favorite.count.mockResolvedValue(1);

      const result = await service.findMyList(1, { page: 1, limit: 10 });

      expect(result).toMatchObject({
        list: expect.any(Array),
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('keyword 应作为查询条件传入', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);
      prisma.favorite.count.mockResolvedValue(0);

      await service.findMyList(1, { keyword: '松' });

      const call = prisma.favorite.findMany.mock.calls[0][0] as {
        where: { bonsai?: { OR: unknown[] } };
      };
      expect(call.where.bonsai).toBeDefined();
      expect(call.where.bonsai?.OR).toHaveLength(2);
    });

    it('totalPages 应向上取整', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);
      prisma.favorite.count.mockResolvedValue(25);

      const result = await service.findMyList(1, { page: 1, limit: 10 });
      expect(result.totalPages).toBe(3);
    });
  });

  describe('favorite', () => {
    it('盆景不存在应抛 404', async () => {
      prisma.bonsai.findFirst.mockResolvedValue(null);

      await expect(service.favorite(1, 999)).rejects.toThrow(NotFoundException);
      expect(prisma.favorite.upsert).not.toHaveBeenCalled();
    });

    it('盆景存在应调用 upsert（重复收藏幂等）', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 10, name: '黑松' });
      prisma.favorite.upsert.mockResolvedValue({ id: 1, bonsaiId: 10 });

      const result = await service.favorite(1, 10);

      expect(result).toEqual({ favorited: true, id: 1, bonsaiId: 10 });
      expect(prisma.favorite.upsert).toHaveBeenCalledWith({
        where: { userId_bonsaiId: { userId: 1, bonsaiId: 10 } },
        create: { userId: 1, bonsaiId: 10 },
        update: {},
      });
    });

    it('软删除的盆景应抛 404', async () => {
      // findFirst 已带 deletedAt: null 条件，DB 返回空即视为不存在
      prisma.bonsai.findFirst.mockResolvedValue(null);
      await expect(service.favorite(1, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unfavorite', () => {
    it('取消收藏应调用 deleteMany 且幂等', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfavorite(1, 10);

      expect(result).toEqual({ favorited: false, bonsaiId: 10 });
      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, bonsaiId: 10 },
      });
    });

    it('未收藏时取消不应抛错（幂等）', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.unfavorite(1, 10)).resolves.toEqual({
        favorited: false,
        bonsaiId: 10,
      });
    });
  });

  describe('check', () => {
    it('已收藏应返回 favorited: true', async () => {
      prisma.favorite.findUnique.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
      });
      const result = await service.check(1, 10);
      expect(result.favorited).toBe(true);
      expect(result.favorite).toMatchObject({ id: 1 });
    });

    it('未收藏应返回 favorited: false', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      const result = await service.check(1, 10);
      expect(result.favorited).toBe(false);
      expect(result.favorite).toBeNull();
    });
  });

  describe('batchCheck', () => {
    it('空数组应直接返回空对象，不查询 DB', async () => {
      const result = await service.batchCheck(1, []);
      expect(result).toEqual({});
      expect(prisma.favorite.findMany).not.toHaveBeenCalled();
    });

    it('应返回每个 bonsaiId 的收藏状态', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { bonsaiId: 10 },
        { bonsaiId: 30 },
      ]);

      const result = await service.batchCheck(1, [10, 20, 30]);

      expect(result).toEqual({ 10: true, 20: false, 30: true });
    });

    it('超过 100 个 ID 应只查前 100 个', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);

      await service.batchCheck(1, ids);

      const call = prisma.favorite.findMany.mock.calls[0][0] as {
        where: { bonsaiId: { in: number[] } };
      };
      expect(call.where.bonsaiId.in).toHaveLength(100);
    });
  });

  describe('countAll', () => {
    it('应返回总收藏数', async () => {
      prisma.favorite.count.mockResolvedValue(42);
      const result = await service.countAll();
      expect(result).toBe(42);
    });
  });
});
