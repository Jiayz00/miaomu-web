import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../redis/redis.service';

/**
 * 聊天 Socket.io 网关
 * - 连接时通过 JWT 认证 + 黑名单校验（登出/改密后立即失效）
 * - 消息发送限流（每用户 10 条 / 10 秒，防洪水攻击）
 * - 接收消息并持久化，转发给对方
 * - 事件：'newMessage'（管理员收到）、'messageReceived'（用户/管理员收到）
 *
 * 安全设计：
 * - CORS 通过 ConfigService 读取，与 HTTP 保持一致
 * - credentials: false（用 Bearer Token，无需 cookie）
 * - 连接握手校验 access token 是否在黑名单
 */
@WebSocketGateway({
  cors: {
    origin: false, // 实际 origin 列表在 afterInit 中由 ConfigService 注入
    credentials: false,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  // 消息限流参数
  private readonly MSG_RATE_LIMIT_WINDOW = 10; // 10 秒窗口
  private readonly MSG_RATE_LIMIT_MAX = 10; // 窗口内最多 10 条

  @WebSocketServer()
  server!: Server;

  // socket.id -> userId 映射，便于断开时清理
  private socketUserMap = new Map<string, number>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(): void {
    // 在网关初始化后，通过 ConfigService 动态设置 CORS origin
    // 这样可以与 HTTP CORS 配置保持单一来源
    // configuration.ts 中 cors.origin 是字符串，这里统一规范化为数组
    const rawOrigin =
      this.configService.get<string | string[]>('cors.origin') ||
      'http://localhost:3000';
    const origins = Array.isArray(rawOrigin) ? rawOrigin : [rawOrigin];
    if (this.server.engine && typeof this.server.engine.opts === 'object') {
      (this.server.engine.opts as Record<string, unknown>).cors = {
        origin: origins,
        credentials: false,
      };
    }
    this.logger.log(`✅ 聊天网关已启动 (/chat)，CORS origins: ${origins.join(', ')}`);
  }

  /**
   * 连接握手：从 auth.token 中验证 JWT + 校验黑名单
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') as
          | string
          | undefined);

      if (!token) {
        client.emit('error', { message: '未提供认证令牌' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // 校验 access token 是否已在黑名单（登出/改密后）
      // fail-open：Redis 不可用时放行（与 HTTP 策略一致）
      if (payload.jti) {
        const blacklisted = await this.redisService.isAccessTokenBlacklisted(payload.jti);
        if (blacklisted) {
          this.logger.warn(
            `⚠️ 黑名单 token 尝试连接 WebSocket: 用户 ${payload.username} (ID: ${payload.sub})`,
          );
          client.emit('error', { message: '令牌已失效，请重新登录' });
          client.disconnect(true);
          return;
        }
      }

      // 数据库实时校验：被禁用账号 / 降权 / 改密后旧 token 立即失效
      // 不直接信任 JWT 中的 role，避免降权后仍可加入 admin 房间
      const verified = await this.chatService.verifyUserForWebSocket(
        payload.sub,
        payload.iat,
      );

      // 以数据库最新 role 为准重新挂载（防止 token role 过期）
      const trustedPayload: JwtPayload = { ...payload, role: verified.role };
      (client.data as Record<string, unknown>).user = trustedPayload;
      this.socketUserMap.set(client.id, payload.sub);

      // 加入以用户ID命名的房间，方便定向推送
      await client.join(`user:${payload.sub}`);
      // 管理员额外加入 admin 房间（基于数据库当前角色，非 token 中的角色）
      if (verified.role === 'ADMIN') {
        await client.join('admin');
      }

      this.logger.log(`✅ 用户 ${payload.username} (ID: ${payload.sub}) 已连接聊天`);
    } catch {
      client.emit('error', { message: '认证失败' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.socketUserMap.get(client.id);
    this.socketUserMap.delete(client.id);
    if (userId) {
      this.logger.log(`⚡ 用户 ID ${userId} 已断开聊天`);
    }
  }

  /**
   * 客户端请求加入指定会话房间
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ): Promise<{ joined: boolean; roomId: number }> {
    const user = (client.data as { user?: JwtPayload }).user;
    if (!user) return { joined: false, roomId: data.roomId };

    // 手动校验 roomId 类型（WebSocket 不走全局 ValidationPipe）
    const roomId = Number(data?.roomId);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return { joined: false, roomId: data?.roomId ?? 0 };
    }

    // 校验用户对房间有访问权（管理员可访问任意会话）
    try {
      await this.chatService.ensureUserRoomAccess(roomId, user.sub, user.role);
      await client.join(`room:${roomId}`);
      return { joined: true, roomId };
    } catch {
      // 不向客户端暴露具体失败原因，防止信息泄露
      return { joined: false, roomId };
    }
  }

  /**
   * 处理客户端发送的消息
   *
   * 限流：基于 Redis 滑动窗口，每用户 10 秒内最多 10 条
   * 防止恶意客户端高频发送消息造成数据库压力与 DoS
   */
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const user = (client.data as { user?: JwtPayload }).user;
    if (!user) {
      return { success: false, error: '未认证' };
    }

    // 参数校验（DTO + class-validator）
    try {
      const dto = plainToInstance(SendMessageDto, data);
      await validateOrReject(dto);
    } catch {
      // 不向客户端暴露校验细节
      return { success: false, error: '参数校验失败' };
    }

    // 消息限流：基于 Redis 计数器
    const rateLimitKey = `rate:chat:${user.sub}`;
    const allowed = await this.checkRateLimit(rateLimitKey);
    if (!allowed) {
      this.logger.warn(`⚠️ 用户 ${user.username} 触发消息限流`);
      return { success: false, error: '发送过于频繁，请稍后再试' };
    }

    // 防 XSS：HTML 实体转义
    const sanitizedContent = this.escapeHtml(data.content);

    try {
      // 校验用户对该房间有访问权限（普通用户只能向自己的会话发消息）
      // 防止越权向他人会话注入消息
      await this.chatService.ensureUserRoomAccess(data.roomId, user.sub, user.role);

      // 持久化消息
      const message = await this.chatService.saveMessage(
        data.roomId,
        user.sub,
        sanitizedContent,
      );

      // 转发给会话房间内所有成员
      this.server.to(`room:${data.roomId}`).emit('messageReceived', message);

      // 同时通知管理员房间（便于管理员后台实时收到新消息）
      this.server.to('admin').emit('newMessage', {
        roomId: data.roomId,
        message,
      });

      return { success: true, message: '已发送' };
    } catch {
      // 不向客户端暴露内部错误细节
      return { success: false, error: '消息发送失败' };
    }
  }

  /**
   * 基于 Redis 的滑动窗口限流
   * 窗口内第一次请求创建计数器并设置 TTL，后续请求 INCR
   * Redis 不可用时 fail-open（放行），避免影响正常用户
   */
  private async checkRateLimit(key: string): Promise<boolean> {
    try {
      const count = await this.redisService.incr(key);
      if (count === 1) {
        await this.redisService.expire(key, this.MSG_RATE_LIMIT_WINDOW);
      }
      return count <= this.MSG_RATE_LIMIT_MAX;
    } catch (err) {
      this.logger.warn(
        `⚠️ 限流检查失败，fail-open 放行: ${err instanceof Error ? err.message : String(err)}`,
      );
      return true;
    }
  }

  /**
   * HTML 实体转义，防止 XSS
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
