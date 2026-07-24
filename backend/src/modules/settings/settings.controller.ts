import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService, CategoriesLayoutService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateSiteLayoutDto } from './dto/update-site-layout.dto';
import {
  UpdateCategoriesLayoutDto,
  CategoriesLayoutConfigDto,
} from './dto/update-categories-layout.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * 站点设置控制器
 *
 * 路由：
 * - 公开：GET /settings（前台展示用，仅返回启用的字段）
 * - 管理：GET /admin/settings、PUT /admin/settings（管理员编辑）
 */
@ApiTags('站点设置')
@Controller()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly categoriesLayoutService: CategoriesLayoutService,
  ) {}

  /**
   * 公开接口：获取站点联系信息（仅展示启用的字段）
   * 前台 Footer 等组件调用
   */
  @Public()
  @Get('settings')
  @ApiOperation({ summary: '获取站点设置（公开，仅展示启用项）' })
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  /**
   * 管理员接口：获取全部设置（含可见性开关）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/settings')
  @ApiOperation({ summary: '获取全部站点设置（管理员）' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  /**
   * 管理员接口：批量更新设置
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings')
  @ApiOperation({ summary: '批量更新站点设置（管理员）' })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto.settings || {});
  }

  /**
   * 管理员接口：重置为默认设置
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings/reset')
  @ApiOperation({ summary: '重置站点设置为默认值（管理员）' })
  async resetToDefaults() {
    return this.settingsService.resetToDefaults();
  }

  // ============ 主页布局（SiteLayout）接口 ============

  /**
   * 公开接口：获取指定 key 当前激活的布局配置
   * 前台 SSR 渲染主页调用，无需鉴权
   */
  @Public()
  @Get('settings/layout/:key')
  @ApiOperation({ summary: '获取当前激活的布局配置（公开）' })
  async getActiveLayout(@Param('key') key: string) {
    return this.settingsService.getActiveLayout(key);
  }

  /**
   * 管理员接口：获取全部布局列表
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/settings/layouts')
  @ApiOperation({ summary: '获取全部布局列表（管理员）' })
  async getAllLayouts() {
    return this.settingsService.getAllLayouts();
  }

  /**
   * 管理员接口：获取指定 key 的布局（编辑回显用）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/settings/layout/:key')
  @ApiOperation({ summary: '获取指定布局详情（管理员）' })
  async getLayoutByKey(@Param('key') key: string) {
    return this.settingsService.getLayoutByKey(key);
  }

  /**
   * 管理员接口：更新指定 key 的布局 sections
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Put('admin/settings/layout/:key')
  @ApiOperation({ summary: '更新布局配置（管理员）' })
  async updateLayout(
    @Param('key') key: string,
    @Body() dto: UpdateSiteLayoutDto,
  ) {
    return this.settingsService.updateLayout(key, dto.sections);
  }

  /**
   * 管理员接口：激活指定 key 的布局
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/settings/layout/:key/activate')
  @ApiOperation({ summary: '激活指定布局（管理员）' })
  async activateLayout(@Param('key') key: string) {
    return this.settingsService.activateLayout(key);
  }

  /**
   * 管理员接口：重置指定 key 的布局为默认配置
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings/layout/:key/reset')
  @ApiOperation({ summary: '重置布局为默认配置（管理员）' })
  async resetLayout(@Param('key') key: string) {
    return this.settingsService.resetLayout(key);
  }

  // ============ 分类页布局配置接口 ============

  /**
   * 公开接口：获取分类页布局配置
   * 前台 SSR 渲染 /categories 页面调用
   */
  @Public()
  @Get('settings/categories-layout')
  @ApiOperation({ summary: '获取分类页布局配置（公开）' })
  async getCategoriesLayout(): Promise<CategoriesLayoutConfigDto> {
    return this.categoriesLayoutService.getConfig();
  }

  /**
   * 管理员接口：获取分类页布局配置（同公开接口，保留以保持对称）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/settings/categories-layout')
  @ApiOperation({ summary: '获取分类页布局配置（管理员）' })
  async getCategoriesLayoutAdmin(): Promise<CategoriesLayoutConfigDto> {
    return this.categoriesLayoutService.getConfig();
  }

  /**
   * 管理员接口：更新分类页布局配置
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Put('admin/settings/categories-layout')
  @ApiOperation({ summary: '更新分类页布局配置（管理员）' })
  async updateCategoriesLayout(
    @Body() dto: UpdateCategoriesLayoutDto,
  ): Promise<CategoriesLayoutConfigDto> {
    return this.categoriesLayoutService.updateConfig(dto.config);
  }

  /**
   * 管理员接口：重置分类页布局配置为默认值
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings/categories-layout/reset')
  @ApiOperation({ summary: '重置分类页布局配置为默认值（管理员）' })
  async resetCategoriesLayout(): Promise<CategoriesLayoutConfigDto> {
    return this.categoriesLayoutService.resetConfig();
  }
}
