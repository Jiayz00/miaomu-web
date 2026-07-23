import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatController, ChatAdminController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

/**
 * 聊天模块
 * 包含 HTTP 控制器与 Socket.io 网关
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [ChatController, ChatAdminController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
