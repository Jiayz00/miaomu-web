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
import { HealthModule } from './modules/health/health.module';
import { SettingsModule } from './modules/settings/settings.module';
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
        limit: 300, // 每分钟 300 请求（管理后台单次页面加载约 8-10 API + 轮询 + RSC 预取，需充足配额）
      },
      // 重要：不要在全局注册 'auth' 限流器。
      // NestJS Throttler v5+ 的 ThrottlerGuard 在每次请求时检查**所有**全局命名限流器，
      // 任何一个超限即返回 429。因此全局注册 'auth': 5/min 会导致所有请求都被限流到 5/min。
      // 认证接口的严格限流请改用 @Throttle({ default: { limit: 5, ttl: 60_000 } }) 装饰器。
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
    HealthModule,
    SettingsModule,
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
