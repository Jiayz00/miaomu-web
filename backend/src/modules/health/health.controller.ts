import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

/**
 * 健康检查控制器
 *
 * 暴露三个端点：
 * - GET /health         全量健康检查（含 DB/Redis 状态），用于 readiness probe
 * - GET /health/live    存活检查（仅进程存活），用于 liveness probe
 * - GET /health/ready   就绪检查（含依赖检查），等同 /health
 *
 * 所有端点都标记 @Public()，不需要认证
 * 限流守卫仍生效，避免外部滥用
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 全量健康检查
   * - 200: 所有依赖正常
   * - 503: 数据库 down（服务不可用）
   * - 200 + degraded: Redis down（服务降级但仍可用）
   */
  @Public()
  @Get()
  async check(@Res() res: Response) {
    const result = await this.healthService.check();
    const httpStatus =
      result.status === 'down'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    return res.status(httpStatus).json(result);
  }

  /**
   * 存活检查（liveness）
   * 仅检测进程是否存活，不查依赖
   * 用于容器编排判断是否需要重启容器
   */
  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  liveness() {
    return this.healthService.liveness();
  }

  /**
   * 就绪检查（readiness）
   * 等同 /health，用于容器编排判断是否可以接收流量
   */
  @Public()
  @Get('ready')
  async ready(@Res() res: Response) {
    const result = await this.healthService.check();
    const httpStatus =
      result.status === 'down'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    return res.status(httpStatus).json(result);
  }
}
