import { Module } from '@nestjs/common';
import { BonsaisService } from './bonsais.service';
import { BonsaisPublicController, BonsaisAdminController } from './bonsais.controller';

/**
 * 盆景模块
 * 包含公开控制器与管理控制器
 */
@Module({
  controllers: [BonsaisPublicController, BonsaisAdminController],
  providers: [BonsaisService],
  exports: [BonsaisService],
})
export class BonsaisModule {}
