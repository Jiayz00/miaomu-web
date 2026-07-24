import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BonsaisService } from '../src/modules/bonsais/bonsais.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createPrismaMock,
  type PrismaMock,
} from './helpers/mock-services';

/**
 * BonsaisService 单元测试
 *
 * 覆盖关键路径：
 * - findPublicList：分页、关键词、分类筛选、价格区间、排序白名单（防注入）
 * - findPublicBySlug：浏览量+1、浏览日志记录、不存在抛 404
 * - findFeatured / findRelated：limit 上限保护
 * - create：slug 唯一、分类校验、Decimal 价格
 * - update：分类校验、不存在抛 404
 * - softDelete：标记 deletedAt + status=0
 * - updateStatus：仅更新 status
 */
describe('BonsaisService', () => {
  let service: BonsaisService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BonsaisService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BonsaisService);
  });

  describe('findPublicList', () => {
    it('默认查询应仅返回上架商品', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      prisma.bonsai.count.mockResolvedValue(0);

      await service.findPublicList({ page: 1, limit: 10 });

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        where: { deletedAt: null; status: number };
      };
      expect(call.where.deletedAt).toBeNull();
      expect(call.where.status).toBe(1);
    });

    it('keyword 应作为 OR 查询 name/description/origin', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      prisma.bonsai.count.mockResolvedValue(0);

      await service.findPublicList({ keyword: '松' });

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        where: { OR: unknown[] };
      };
      expect(call.where.OR).toHaveLength(3);
    });

    it('价格区间应正确传入 gte/lte', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      prisma.bonsai.count.mockResolvedValue(0);

      await service.findPublicList({ priceMin: 100, priceMax: 1000 });

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        where: { price: { gte: number; lte: number } };
      };
      expect(call.where.price.gte).toBe(100);
      expect(call.where.price.lte).toBe(1000);
    });

    it('sortBy 非白名单字段应回退为 createdAt（防 SQL 注入）', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      prisma.bonsai.count.mockResolvedValue(0);

      await service.findPublicList({
        // 企图注入：sortBy 字段不在白名单
        sortBy: 'password; DROP TABLE users;--' as never,
      });

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        orderBy: Record<string, string>;
      };
      expect(Object.keys(call.orderBy)[0]).toBe('createdAt');
    });

    it('order=asc 应正确传入 asc', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      prisma.bonsai.count.mockResolvedValue(0);

      await service.findPublicList({ order: 'asc' });

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        orderBy: Record<string, 'asc' | 'desc'>;
      };
      expect(Object.values(call.orderBy)[0]).toBe('asc');
    });

    it('featured=true 应只返回精选', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      prisma.bonsai.count.mockResolvedValue(0);

      await service.findPublicList({ featured: 'true' });

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        where: { isFeatured: boolean };
      };
      expect(call.where.isFeatured).toBe(true);
    });
  });

  describe('findPublicBySlug', () => {
    it('应返回详情并将浏览量+1，并记录浏览日志', async () => {
      const bonsai = {
        id: 10,
        slug: 'hei-song',
        viewCount: 5,
        deletedAt: null,
        status: 1,
      };
      prisma.bonsai.findFirst.mockResolvedValue(bonsai);
      prisma.bonsai.update.mockResolvedValue({});
      prisma.viewLog.create.mockResolvedValue({});

      const result = await service.findPublicBySlug('hei-song', {
        userId: 1,
        ip: '1.2.3.4',
        userAgent: 'jest',
      });

      // 返回的 viewCount 应为原值 +1
      expect(result.viewCount).toBe(6);
      expect(prisma.bonsai.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { viewCount: { increment: 1 } },
      });
      expect(prisma.viewLog.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          bonsaiId: 10,
          ip: '1.2.3.4',
          userAgent: 'jest',
        },
      });
    });

    it('未登录用户浏览日志 userId 应为 null', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({
        id: 10,
        slug: 'x',
        viewCount: 0,
      });
      prisma.bonsai.update.mockResolvedValue({});
      prisma.viewLog.create.mockResolvedValue({});

      await service.findPublicBySlug('x', { ip: '1.1.1.1' });

      const call = prisma.viewLog.create.mock.calls[0][0] as {
        data: { userId: null };
      };
      expect(call.data.userId).toBeNull();
    });

    it('不存在或已下架应抛 404', async () => {
      prisma.bonsai.findFirst.mockResolvedValue(null);
      await expect(
        service.findPublicBySlug('not-exist'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findFeatured', () => {
    it('limit 上限为 50', async () => {
      prisma.bonsai.findMany.mockResolvedValue([]);
      await service.findFeatured(9999);
      const call = prisma.bonsai.findMany.mock.calls[0][0] as { take: number };
      expect(call.take).toBe(50);
    });
  });

  describe('findRelated', () => {
    it('当前盆景不存在应抛 404', async () => {
      prisma.bonsai.findFirst.mockResolvedValue(null);
      await expect(service.findRelated(999)).rejects.toThrow(NotFoundException);
    });

    it('应排除当前盆景并按 viewCount 降序', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 10, categoryId: 1 });
      prisma.bonsai.findMany.mockResolvedValue([]);

      await service.findRelated(10, 5);

      const call = prisma.bonsai.findMany.mock.calls[0][0] as {
        where: { id: { not: number }; categoryId: number; status: number };
        orderBy: Record<string, string>;
        take: number;
      };
      expect(call.where.id.not).toBe(10);
      expect(call.where.categoryId).toBe(1);
      expect(call.where.status).toBe(1);
      expect(call.orderBy.viewCount).toBe('desc');
      // limit 上限为 20
      expect(call.take).toBeLessThanOrEqual(20);
    });
  });

  describe('create', () => {
    const validDto = {
      name: '黑松',
      slug: 'hei-song-001',
      description: '造型优美',
      price: 1280,
      origin: '江苏扬州',
      year: 2024,
      categoryId: 1,
    };

    it('slug 重复应抛 409（P2002 错误）', async () => {
      // service 先校验分类，然后 create 捕获 P2002
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      prisma.bonsai.create.mockRejectedValue(p2002Error);

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
      await expect(service.create(validDto)).rejects.toThrow('slug 已被使用');
    });

    it('分类不存在应抛 404', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
    });

    it('创建成功应将 price 转为 Prisma.Decimal', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.bonsai.create.mockResolvedValue({ id: 1, ...validDto });

      await service.create(validDto);

      const call = prisma.bonsai.create.mock.calls[0][0] as {
        data: { price: Prisma.Decimal };
      };
      expect(call.data.price).toBeInstanceOf(Prisma.Decimal);
    });

    it('附带 images 应创建关联图片', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.bonsai.create.mockResolvedValue({ id: 1 });

      await service.create({
        ...validDto,
        images: [{ url: 'http://example.com/a.jpg', isMain: true }],
      });

      const call = prisma.bonsai.create.mock.calls[0][0] as {
        data: { images?: { create: unknown[] } };
      };
      expect(call.data.images).toBeDefined();
      expect(call.data.images?.create).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('盆景不存在应抛 404（通过 findAdminById）', async () => {
      prisma.bonsai.findFirst.mockResolvedValue(null);
      await expect(service.update(999, { name: 'new' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('更新 categoryId 时分类不存在应抛 404', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 1 });
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.update(1, { categoryId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('更新成功应仅传入变更字段', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 1 });
      prisma.bonsai.update.mockResolvedValue({ id: 1 });

      await service.update(1, { name: '新名称', price: 999 });

      const call = prisma.bonsai.update.mock.calls[0][0] as {
        data: { name: string; price: Prisma.Decimal };
      };
      expect(call.data.name).toBe('新名称');
      expect(call.data.price).toBeInstanceOf(Prisma.Decimal);
    });
  });

  describe('softDelete', () => {
    it('应设置 deletedAt 与 status=0', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 1 });
      prisma.bonsai.update.mockResolvedValue({});

      const result = await service.softDelete(1);

      expect(result.id).toBe(1);
      expect(result.deletedAt).toBeInstanceOf(Date);
      const call = prisma.bonsai.update.mock.calls[0][0] as {
        data: { deletedAt: Date; status: number };
      };
      expect(call.data.status).toBe(0);
    });

    it('盆景不存在应抛 404', async () => {
      prisma.bonsai.findFirst.mockResolvedValue(null);
      await expect(service.softDelete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('应仅更新 status 字段', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 1 });
      prisma.bonsai.update.mockResolvedValue({ id: 1, status: 0 });

      await service.updateStatus(1, 0);

      const call = prisma.bonsai.update.mock.calls[0][0] as {
        data: { status: number };
        select: Record<string, boolean>;
      };
      expect(call.data.status).toBe(0);
      expect(call.select).toEqual({
        id: true,
        status: true,
        updatedAt: true,
      });
    });
  });

  describe('countAll / sumViewCount', () => {
    it('countAll 应仅统计未删除', async () => {
      prisma.bonsai.count.mockResolvedValue(10);
      const result = await service.countAll();
      expect(result).toBe(10);
      const call = prisma.bonsai.count.mock.calls[0][0] as {
        where: { deletedAt: null };
      };
      expect(call.where.deletedAt).toBeNull();
    });

    it('sumViewCount 应处理 null 结果', async () => {
      prisma.bonsai.aggregate.mockResolvedValue({ _sum: { viewCount: null } });
      const result = await service.sumViewCount();
      expect(result).toBe(0);
    });
  });
});
