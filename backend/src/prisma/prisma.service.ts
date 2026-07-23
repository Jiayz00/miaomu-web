import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 服务
 * 继承 PrismaClient，统一管理数据库连接的生命周期
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ 数据库连接已建立');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('✅ 数据库连接已断开');
  }
}
