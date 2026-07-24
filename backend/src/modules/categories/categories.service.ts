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
   */
  async findPublicAll() {
    return this.prisma.category.findMany({
      where: { status: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      include: {
        _count: { select: { bonsais: { where: { deletedAt: null, status: 1 } } } },
      },
    });
  }

  /**
   * 公开分类详情（含该分类下的盆景列表）
   *
   * 性能设计：限制最大返回 100 条，避免单分类下盆景过多时
   * 一次性加载全部数据（含 images 关联）造成响应过大与内存压力
   */
  async findPublicBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, status: 1 },
    });
    if (!category) {
      throw new NotFoundException('分类不存在或已禁用');
    }

    const bonsais = await this.prisma.bonsai.findMany({
      where: { categoryId: category.id, deletedAt: null, status: 1 },
      include: {
        images: {
          orderBy: [{ isMain: 'desc' }, { sort: 'asc' }],
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // 限制最大返回数量，避免单分类数据量过大
    });

    return { ...category, bonsais };
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
   * 删除分类（检查是否仍有盆景关联）
   */
  async remove(id: number) {
    await this.findAdminById(id);

    const count = await this.prisma.bonsai.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (count > 0) {
      throw new ConflictException(`该分类下仍有 ${count} 个盆景，无法删除`);
    }

    return this.prisma.category.delete({ where: { id } });
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
