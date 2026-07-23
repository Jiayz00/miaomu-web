import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Redis 全局模块
 * 提供 JWT 黑名单、refresh token 白名单、限流计数等能力
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
