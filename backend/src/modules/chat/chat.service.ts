import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { resolvePagination, buildPaginatedResponse } from '../../common/dto/pagination.helper';
import { CreateRoomDto } from './dto/create-room.dto';

/**
 * 聊天服务
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建会话
   * 若同一盆景已有会话则复用
   *
   * 并发安全：findFirst + create 之间存在竞态，可能创建重复会话。
   * 由于 bonsai_id 可空，无法对 (user_id, bonsai_id) 加 UNIQUE 约束（NULL 语义特殊），
   * 此处采用「创建失败时回查复用」模式：若并发请求同时创建，后到的一个会因
   * 应用层去重（findFirst 已存在）或网络层冲突被捕获，最终回查复用现有会话。
   * 配合 [user_id, bonsai_id] 复合索引，findFirst 回查高效。
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

    try {
      return await this.prisma.chatRoom.create({
        data: { userId, bonsaiId: dto.bonsaiId ?? null },
        include: {
          bonsai: { select: { id: true, name: true, slug: true, price: true } },
          _count: { select: { messages: true } },
        },
      });
    } catch (e) {
      // 并发场景：另一请求已创建同 (userId, bonsaiId) 会话 → 回查复用
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        dto.bonsaiId
      ) {
        const exist = await this.prisma.chatRoom.findFirst({
          where: { userId, bonsaiId: dto.bonsaiId },
          include: {
            bonsai: { select: { id: true, name: true, slug: true, price: true } },
            _count: { select: { messages: true } },
          },
        });
        if (exist) return exist;
      }
      throw e;
    }
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
   * WebSocket 连接鉴权辅助：查询数据库当前用户状态与角色
   * 用于在 WS 握手时同步校验（HTTP 的 JwtStrategy.validate 不适用于 WS）
   *
   * 安全设计：
   * - 被禁用账号（status=0）禁止连接，避免旧 token 在有效期内继续访问 WS
   * - 以数据库当前 role 为准，避免 token 中的 role 过期（降权后仍可访问 admin 房间）
   * - 校验密码修改时间，改密后旧 token 立即失效
   *
   * @returns 校验通过则返回数据库中最新的 role，供 gateway 重新挂载到 client.data
   */
  async verifyUserForWebSocket(
    userId: number,
    tokenIat?: number,
  ): Promise<{ role: Role }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, role: true, passwordChangedAt: true },
    });
    if (!user) {
      throw new ForbiddenException('用户不存在');
    }
    if (user.status === 0) {
      throw new ForbiddenException('账号已被禁用');
    }
    // 校验密码是否在 token 签发后被修改过
    if (tokenIat && user.passwordChangedAt) {
      const passwordChangedSec = Math.floor(
        user.passwordChangedAt.getTime() / 1000,
      );
      // 1 秒容差，与 JwtStrategy.validate 保持一致
      if (tokenIat < passwordChangedSec - 1) {
        throw new UnauthorizedException('密码已修改，请重新登录');
      }
    }
    return { role: user.role };
  }

  /**
   * 获取会话消息（分页）
   */
  async findRoomMessages(roomId: number, userId: number, query: PaginationDto, role?: Role) {
    await this.ensureUserRoomAccess(roomId, userId, role);

    const { page, pageSize, skip } = resolvePagination(query);

    const [list, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.chatMessage.count({ where: { roomId } }),
    ]);

    return buildPaginatedResponse(list.reverse(), total, page, pageSize);
  }

  /**
   * 保存消息到数据库
   * 入站消息内容预先在 controller/gateway 中完成 HTML 转义
   *
   * 数据一致性：消息创建与 ChatRoom.updatedAt 刷新在同一事务中，
   * 确保 findMyRooms / findAdminRooms 按 updatedAt 排序反映最新消息
   */
  async saveMessage(roomId: number, senderId: number, content: string) {
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { roomId, senderId, content },
        include: {
          sender: {
            select: { id: true, username: true, avatar: true, role: true },
          },
        },
      }),
      // 显式触发 @updatedAt，使会话列表按最新消息排序
      this.prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  }

  /**
   * 管理员：所有会话列表
   * 限制最新 200 条，避免会话数过多导致响应过大
   * 客户端如有更多需求应使用分页接口
   */
  async findAdminRooms() {
    return this.prisma.chatRoom.findMany({
      take: 200,
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
   * 消息分页加载（最新 100 条），完整历史通过 findRoomMessages 分页获取
   * 防止单个会话消息过多导致 OOM
   */
  async findAdminRoom(id: number) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true, email: true } },
        bonsai: { select: { id: true, name: true, slug: true, price: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            sender: { select: { id: true, username: true, avatar: true, role: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    });
    if (!room) throw new NotFoundException('会话不存在');
    // 反转为升序，便于前端直接渲染
    room.messages = room.messages.reverse();
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
