import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesPublicController, CategoriesAdminController } from './categories.controller';

/**
 * 分类模块
 */
@Module({
  controllers: [CategoriesPublicController, CategoriesAdminController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
