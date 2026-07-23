import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async create(dto: CreateCategoryDto) {
    // slug 唯一性校验
    const exist = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });
    if (exist) throw new ConflictException('slug 已存在');

    // name 唯一性校验
    const existName = await this.prisma.category.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (existName) throw new ConflictException('分类名称已存在');

    return this.prisma.category.create({ data: dto });
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
