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

/**
 * 聊天 Socket.io 网关
 * - 连接时通过 JWT 认证
 * - 接收消息并持久化，转发给对方
 * - 事件：'newMessage'（管理员收到）、'messageReceived'（用户/管理员收到）
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || [
      'http://localhost:3000',
    ],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  // socket.id -> userId 映射，便于断开时清理
  private socketUserMap = new Map<string, number>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(): void {
    this.logger.log('✅ 聊天网关已启动 (/chat)');
  }

  /**
   * 连接握手：从 auth.token 中验证 JWT
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

      // 将用户信息挂载到 socket
      (client.data as Record<string, unknown>).user = payload;
      this.socketUserMap.set(client.id, payload.sub);

      // 加入以用户ID命名的房间，方便定向推送
      await client.join(`user:${payload.sub}`);
      // 管理员额外加入 admin 房间
      if (payload.role === 'ADMIN') {
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

    // 校验用户对房间有访问权（管理员可访问任意会话）
    try {
      await this.chatService.ensureUserRoomAccess(data.roomId, user.sub, user.role);
      await client.join(`room:${data.roomId}`);
      return { joined: true, roomId: data.roomId };
    } catch (err) {
      client.emit('error', {
        message: err instanceof Error ? err.message : '无权加入该会话',
      });
      return { joined: false, roomId: data.roomId };
    }
  }

  /**
   * 处理客户端发送的消息
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
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '参数校验失败',
      };
    }

    // 防 XSS：HTML 实体转义
    const sanitizedContent = this.escapeHtml(data.content);

    try {
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
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '消息发送失败',
      };
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
