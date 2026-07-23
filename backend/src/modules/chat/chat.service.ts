import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { Role } from '@prisma/client';

/**
 * 聊天服务
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建会话
   * 若同一盆景已有会话则复用
   */
  async createRoom(userId: number, dto: CreateRoomDto) {
    // 校验盆景存在
    if (dto.bonsaiId) {
      const bonsai = await this.prisma.bonsai.findFirst({
        where: { id: dto.bonsaiId, deletedAt: null },
        select: { id: true },
      });
      if (!bonsai) throw new NotFoundException('盆景不存在');
    }

    // 同一用户对同一盆景已有会话则复用
    if (dto.bonsaiId) {
      const exist = await this.prisma.chatRoom.findFirst({
        where: { userId, bonsaiId: dto.bonsaiId },
        include: {
          bonsai: { select: { id: true, name: true, slug: true, price: true } },
          _count: { select: { messages: true } },
        },
      });
      if (exist) return exist;
    }

    return this.prisma.chatRoom.create({
      data: { userId, bonsaiId: dto.bonsaiId ?? null },
      include: {
        bonsai: { select: { id: true, name: true, slug: true, price: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  /**
   * 我的会话列表
   */
  async findMyRooms(userId: number) {
    return this.prisma.chatRoom.findMany({
      where: { userId },
      include: {
        bonsai: { select: { id: true, name: true, slug: true, price: true } },
        user: {
          select: { id: true, username: true, avatar: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 校验用户是否为会话成员（普通用户只能访问自己的会话）
   * 管理员可访问任意会话
   */
  async ensureUserRoomAccess(roomId: number, userId: number, role?: Role) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('会话不存在');
    // 管理员放行
    if (role === Role.ADMIN) {
      return room;
    }
    if (room.userId !== userId) {
      throw new ForbiddenException('无权访问该会话');
    }
    return room;
  }

  /**
   * 获取会话消息（分页）
   */
  async findRoomMessages(roomId: number, userId: number, query: PaginationDto, role?: Role) {
    await this.ensureUserRoomAccess(roomId, userId, role);

    const page = Number(query.page || 1);
    const pageSize = Number(query.limit || 20);
    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.chatMessage.count({ where: { roomId } }),
    ]);

    return {
      list: list.reverse(), // 升序展示
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 保存消息到数据库
   * 入站消息内容预先在 controller/gateway 中完成 HTML 转义
   */
  async saveMessage(roomId: number, senderId: number, content: string) {
    return this.prisma.chatMessage.create({
      data: { roomId, senderId, content },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, role: true },
        },
      },
    });
  }

  /**
   * 管理员：所有会话列表
   */
  async findAdminRooms() {
    return this.prisma.chatRoom.findMany({
      include: {
        user: { select: { id: true, username: true, avatar: true, email: true } },
        bonsai: { select: { id: true, name: true, slug: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 管理员：会话详情
   */
  async findAdminRoom(id: number) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true, email: true } },
        bonsai: { select: { id: true, name: true, slug: true, price: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, username: true, avatar: true, role: true } },
          },
        },
      },
    });
    if (!room) throw new NotFoundException('会话不存在');
    return room;
  }

  /**
   * 管理员：标记已处理
   */
  async updateRoomStatus(id: number, status: number) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('会话不存在');
    return this.prisma.chatRoom.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  /**
   * 管理员：根据用户ID获取会话（用于管理员接收消息时定位房间）
   */
  async findRoomByUserAndBonsai(userId: number, bonsaiId: number | null) {
    if (bonsaiId) {
      return this.prisma.chatRoom.findFirst({
        where: { userId, bonsaiId },
      });
    }
    return this.prisma.chatRoom.findFirst({
      where: { userId, bonsaiId: null },
    });
  }
}
