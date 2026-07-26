import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * 分类服务
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 公开分类列表（仅启用，按 sort 排序）
   *
   * 字段精简：前台 /categories 仅使用 id/name/slug/description/coverImage/sort，
   * 不再返回 status/_count 与 createdAt/updatedAt，减少响应体积。
   */
  async findPublicAll() {
    return this.prisma.category.findMany({
      where: { status: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImage: true,
        sort: true,
      },
    });
  }

  /**
   * 公开分类详情
   *
   * 字段精简：前台 /categories/[slug] 实际只使用 category 自身字段，
   * 盆景列表通过 /bonsais?categoryId= 单独获取，故不再附带 bonsais，
   * 避免一次性加载大量图片与冗余数据。
   */
  async findPublicBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, status: 1 },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImage: true,
        sort: true,
      },
    });
    if (!category) {
      throw new NotFoundException('分类不存在或已禁用');
    }

    return category;
  }

  /**
   * 管理员分类列表（含禁用）
   */
  async findAdminAll() {
    return this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      include: {
        _count: { select: { bonsais: { where: { deletedAt: null } } } },
      },
    });
  }

  async findAdminById(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }

  /**
   * 创建分类
   *
   * 并发安全：slug 与 name 的唯一性由数据库 UNIQUE 约束兜底，
   * 捕获 P2002 错误转换为 ConflictException，避免 check-then-create 竞态
   */
  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // 根据 target 区分冲突字段
        const target = (e.meta?.target as string[] | undefined)?.join(',') || '';
        if (target.includes('slug')) {
          throw new ConflictException('slug 已存在');
        }
        if (target.includes('name')) {
          throw new ConflictException('分类名称已存在');
        }
        throw new ConflictException('分类已存在');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findAdminById(id);

    if (dto.name !== undefined) {
      const exist = await this.prisma.category.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (exist) throw new ConflictException('分类名称已存在');
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除分类
   *
   * 设计说明：
   * - 仍有"未软删除"的盆景时阻止删除（避免误删活跃分类）
   * - 已软删除的盆景对外不可见，但因其 categoryId 外键仍指向分类，
   *   会阻止分类硬删除。这里在事务内先硬删除这些已软删除的盆景及其关联数据，
   *   再删除分类，使管理员可清理废弃分类。
   * - BonsaiImage / Favorite / ViewLog / ChatRoom 均配置了 onDelete: Cascade / SetNull，
   *   硬删除盆景时关联数据会自动清理（ChatRoom.bonsaiId 被置为 null）
   */
  async remove(id: number) {
    await this.findAdminById(id);

    const count = await this.prisma.bonsai.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (count > 0) {
      throw new ConflictException(`该分类下仍有 ${count} 个盆景，无法删除`);
    }

    // 事务：先清理该分类下已软删除的盆景（含关联数据），再删除分类
    await this.prisma.$transaction([
      // 1. 删除关联的图片（BonsaiImage 配置了 onDelete: Cascade，
      //    但显式删除可避免 Prisma 在某些版本下不级联的情况）
      this.prisma.bonsaiImage.deleteMany({
        where: {
          bonsai: { categoryId: id, deletedAt: { not: null } },
        },
      }),
      // 2. 删除收藏记录
      this.prisma.favorite.deleteMany({
        where: {
          bonsai: { categoryId: id, deletedAt: { not: null } },
        },
      }),
      // 3. 删除浏览日志
      this.prisma.viewLog.deleteMany({
        where: {
          bonsai: { categoryId: id, deletedAt: { not: null } },
        },
      }),
      // 4. 解除询价会话与盆景的关联（ChatRoom.bonsaiId 配置为 SetNull，
      //    但显式置 null 更安全）
      this.prisma.chatRoom.updateMany({
        where: {
          bonsai: { categoryId: id, deletedAt: { not: null } },
        },
        data: { bonsaiId: null },
      }),
      // 5. 硬删除已软删除的盆景
      this.prisma.bonsai.deleteMany({
        where: { categoryId: id, deletedAt: { not: null } },
      }),
      // 6. 删除分类
      this.prisma.category.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  /**
   * 各分类下盆景数量占比（数据分析用）
   */
  async getDistribution() {
    const categories = await this.prisma.category.findMany({
      where: { status: 1 },
      include: {
        _count: { select: { bonsais: { where: { deletedAt: null, status: 1 } } } },
      },
      orderBy: { sort: 'asc' },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c._count.bonsais,
    }));
  }
}
