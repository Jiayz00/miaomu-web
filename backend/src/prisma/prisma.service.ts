import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Prisma 服务
 * 继承 PrismaClient，统一管理数据库连接的生命周期
 *
 * DBA 设计：
 * - 查询日志：开启 query 级别日志，对耗时 >= 100ms 的查询输出 warn，
 *   便于线上慢查询排查（连接池/索引问题快速定位）
 * - 连接池：通过 DATABASE_URL 的 connection_limit 参数控制，
 *   生产环境推荐 = (cpu * 2 + 1)，默认值已适合中小流量
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryThresholdMs = 100;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // 慢查询监控：耗时超过阈值的查询输出 warn 日志
    // 包含查询语句（参数已由 Prisma 占位符化，无 SQL 注入风险）
    // 注：Prisma 5 继承 PrismaClient 时 $on 重载类型不可见（已知问题），
    // 使用类型断言绕过，运行时正常工作
    // 详见 https://github.com/prisma/prisma/issues/20253
    (this as unknown as {
      $on: (event: 'query', cb: (e: Prisma.QueryEvent) => void) => void;
    }).$on('query', (e) => {
      if (e.duration >= this.slowQueryThresholdMs) {
        this.logger.warn(`🐢 慢查询 (${e.duration}ms): ${e.query}`);
      }
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ 数据库连接已建立');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('✅ 数据库连接已断开');
  }
}
