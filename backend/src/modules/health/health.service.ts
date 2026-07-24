import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

/**
 * 健康检查服务
 * - 检查数据库连通性（轻量查询，SELECT 1）
 * - 检查 Redis 连通性（PING）
 * - 返回各依赖项状态与总体状态
 *
 * 设计原则：
 * - 轻量：不执行业务查询，避免拖慢健康检查
 * - 快速：每个依赖超时 2 秒，避免雪崩
 * - 可观测：返回详细状态便于排查
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly CHECK_TIMEOUT_MS = 2_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 执行全量健康检查
   * 返回各组件状态与总体状态
   */
  async check(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    uptime: number;
    checks: {
      database: HealthCheckResult;
      redis: HealthCheckResult;
    };
  }> {
    const [database, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbResult =
      database.status === 'fulfilled'
        ? database.value
        : { status: 'down' as const, error: String(database.reason) };
    const redisResult =
      redis.status === 'fulfilled'
        ? redis.value
        : { status: 'down' as const, error: String(redis.reason) };

    // 总体状态：数据库 down 即整体 down；Redis down 则 degraded
    let overall: 'ok' | 'degraded' | 'down' = 'ok';
    if (dbResult.status === 'down') {
      overall = 'down';
    } else if (redisResult.status === 'down') {
      overall = 'degraded';
    }

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbResult,
        redis: redisResult,
      },
    };
  }

  /**
   * 轻量级存活检查（仅检测进程存活，不查依赖）
   * 用于 k8s liveness probe / docker healthcheck
   */
  liveness(): { status: 'ok'; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 数据库连通性检查
   * 使用 $queryRaw`SELECT 1` 而非业务表查询，避免锁表/索引扫描
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        this.timeout(this.CHECK_TIMEOUT_MS, 'database'),
      ]);
      return { status: 'ok', latency: undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`数据库健康检查失败: ${msg}`);
      return { status: 'down', error: msg };
    }
  }

  /**
   * Redis 连通性检查
   * 使用 PING 命令，期待 PONG 响应
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      await Promise.race([
        this.redis.ping(),
        this.timeout(this.CHECK_TIMEOUT_MS, 'redis'),
      ]);
      return { status: 'ok', latency: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis 健康检查失败: ${msg}`);
      return { status: 'down', error: msg };
    }
  }

  /**
   * 超时工具：避免依赖故障导致健康检查挂起
   */
  private timeout(ms: number, name: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${name} 检查超时 (${ms}ms)`)), ms);
    });
  }
}

interface HealthCheckResult {
  status: 'ok' | 'down';
  latency?: number;
  error?: string;
}
