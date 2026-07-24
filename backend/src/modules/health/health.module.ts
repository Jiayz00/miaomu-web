import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * 健康检查模块
 * 提供容器编排与运维监控所需的 /health 端点
 * 依赖 PrismaService 与 RedisService（均为全局模块，直接注入）
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
