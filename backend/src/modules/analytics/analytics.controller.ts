import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/query-days.dto';
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
  @ApiOperation({ summary: '浏览量趋势（支持 7/30/90 天或自定义起止日期）' })
  getViews(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getViewsTrend(query);
  }

  @Get('favorites')
  @ApiOperation({ summary: '收藏量趋势（支持 7/30/90 天或自定义起止日期）' })
  getFavorites(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getFavoritesTrend(query);
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

  @Get('inventory-alert')
  @ApiOperation({ summary: '库存预警（低库存/售罄/总值）' })
  getInventoryAlert() {
    return this.analyticsService.getInventoryAlert();
  }

  @Get('inquiry-stats')
  @ApiOperation({ summary: '询价统计与转化漏斗（支持 7/30/90 天或自定义起止日期）' })
  getInquiryStats(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getInquiryStats(query);
  }

  @Get('user-growth')
  @ApiOperation({ summary: '用户增长趋势（支持 7/30/90 天或自定义起止日期）' })
  getUserGrowth(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getUserGrowthTrend(query);
  }
}
