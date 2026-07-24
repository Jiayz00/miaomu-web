import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { resolvePagination, buildPaginatedResponse } from '../../common/dto/pagination.helper';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { Prisma, Role } from '@prisma/client';

/**
 * 用户服务
 * 提供用户查询、状态管理（管理员）
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 通过 ID 查询用户（含密码字段，仅用于内部认证）
   */
  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /**
   * 通过邮箱查询用户
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * 用户列表（分页 + 搜索）
   */
  async findAll(query: PaginationDto) {
    const { page, pageSize, skip } = resolvePagination(query);

    const where: Prisma.UserWhereInput = {};
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword } },
        { email: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(list, total, page, pageSize);
  }

  /**
   * 用户详情
   */
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            favorites: true,
            messages: true,
            chatRooms: true,
            viewLogs: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /**
   * 更新用户状态（启用/禁用）
   */
  async updateStatus(id: number, dto: UpdateUserStatusDto) {
    await this.findById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
    return user;
  }

  /**
   * 更新用户信息
   */
  async update(id: number, dto: UpdateUserDto) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 获取用户统计数据
   */
  async countByRole(role: Role): Promise<number> {
    return this.prisma.user.count({ where: { role } });
  }

  async countAll(): Promise<number> {
    return this.prisma.user.count();
  }
}
