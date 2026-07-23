import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { BonsaisModule } from '../bonsais/bonsais.module';
import { CategoriesModule } from '../categories/categories.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { UsersModule } from '../users/users.module';

/**
 * 数据分析模块
 * 依赖 bonsais、categories、favorites、users 服务
 */
@Module({
  imports: [BonsaisModule, CategoriesModule, FavoritesModule, UsersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
