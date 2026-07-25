import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { resolvePagination, buildPaginatedResponse } from '../../common/dto/pagination.helper';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Prisma, Role } from '@prisma/client';

/**
 * 用户服务
 * 提供用户查询、状态管理（管理员）
 */
@Injectable()
export class UsersService {
  private readonly BCRYPT_ROUNDS: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const env = this.configService.get<string>('nodeEnv') || 'development';
    this.BCRYPT_ROUNDS = env === 'production' ? 12 : 10;
  }

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
          lastLoginAt: true,
          lastLoginIp: true,
          lastActiveAt: true,
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
        lastLoginAt: true,
        lastLoginIp: true,
        lastActiveAt: true,
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
   * 管理员重置/修改任意用户密码
   * - 对密码做 bcrypt 哈希
   * - 更新 passwordChangedAt，使旧 token 失效
   * - 同时刷新 lastActiveAt
   */
  async adminChangePassword(id: number, dto: AdminChangePasswordDto) {
    const target = await this.findById(id);
    const hashedPassword = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return { message: `用户 ${target.username} 的密码已修改`, user };
  }

  /**
   * 管理员变更用户角色（用户 <-> 管理员）
   */
  async updateRole(id: number, dto: UpdateUserRoleDto) {
    const target = await this.findById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return {
      message: `用户 ${target.username} 已${dto.role === Role.ADMIN ? '升级为管理员' : '降级为普通用户'}`,
      user,
    };
  }

  /**
   * 管理员删除用户
   * - 禁止删除自身，避免管理员误删唯一可用账号
   */
  async remove(id: number, currentAdminId: number) {
    if (id === currentAdminId) {
      throw new BadRequestException('不能删除当前登录的管理员账号');
    }
    const target = await this.findById(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: `用户 ${target.username} 已删除` };
  }

  /**
   * 更新用户最后活动时间
   */
  async updateLastActive(id: number): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
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
