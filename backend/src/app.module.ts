import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BonsaisModule } from './modules/bonsais/bonsais.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ChatModule } from './modules/chat/chat.module';
import { UploadModule } from './modules/upload/upload.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import configuration from './config/configuration';

/**
 * 应用根模块
 * - ConfigModule 全局加载 .env
 * - ThrottlerModule 全局限流：每分钟 100 请求
 * - 注册全局守卫、过滤器、拦截器
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 分钟
        limit: 100, // 每分钟 100 请求
      },
      {
        name: 'auth',
        ttl: 60_000, // 1 分钟
        limit: 5, // 认证接口每分钟 5 请求（防暴力破解）
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    BonsaisModule,
    CategoriesModule,
    FavoritesModule,
    ChatModule,
    UploadModule,
    AnalyticsModule,
  ],
  providers: [
    // 全局异常过滤器
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // 全局响应拦截器（先日志后转换，按注册顺序逆序执行：日志在外层）
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局限流守卫
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // 全局 JWT 守卫（接口默认需要认证，标记 @Public() 的接口跳过）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
