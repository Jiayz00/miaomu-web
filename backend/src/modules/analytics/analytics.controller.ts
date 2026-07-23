import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * 数据分析控制器（管理员）
 * 路由前缀：/admin/analytics
 */
@ApiTags('数据分析')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '看板汇总数据' })
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('views')
  @ApiOperation({ summary: '浏览量趋势（支持 7/30 天）' })
  getViews(@Query('days') days?: string) {
    return this.analyticsService.getViewsTrend(days ? parseInt(days, 10) : 7);
  }

  @Get('favorites')
  @ApiOperation({ summary: '收藏量趋势' })
  getFavorites(@Query('days') days?: string) {
    return this.analyticsService.getFavoritesTrend(days ? parseInt(days, 10) : 7);
  }

  @Get('top-bonsais')
  @ApiOperation({ summary: '热门盆景 TOP10' })
  getTopBonsais() {
    return this.analyticsService.getTopBonsais();
  }

  @Get('category-distribution')
  @ApiOperation({ summary: '分类占比' })
  getCategoryDistribution() {
    return this.analyticsService.getCategoryDistribution();
  }
}
