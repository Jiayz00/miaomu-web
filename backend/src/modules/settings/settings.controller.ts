import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  SettingsService,
  CategoriesLayoutService,
  SiteAssetService,
} from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  UpdateSiteLayoutDto,
  UpdateSiteLayoutDraftDto,
  PublishLayoutDto,
} from './dto/update-site-layout.dto';
import {
  UpdateCategoriesLayoutDto,
  CategoriesLayoutConfigDto,
} from './dto/update-categories-layout.dto';
import {
  ListSiteAssetQueryDto,
  UpdateSiteAssetDto,
} from './dto/site-asset.dto';
import { CreatePreviewTokenDto } from './dto/preview-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * 站点设置公开接口缓存头
 */
const CACHE_PUBLIC_SETTINGS = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';
const CACHE_PUBLIC_LAYOUT = 'public, max-age=30, s-maxage=30';
const CACHE_NO_STORE = 'no-store';

/**
 * 站点设置控制器
 *
 * 路由分组：
 * - 公开（无需鉴权）：
 *   - GET /settings                            获取站点联系信息（仅展示启用项）
 *   - GET /settings/layout/:key                获取当前激活的布局（前台 SSR）
 *   - GET /settings/categories-layout          获取分类页布局
 *   - GET /preview/layout/:key?token=xxx       通过预览 token 获取草稿内容
 *
 * - 管理员（JWT + AdminGuard）：
 *   - GET  /admin/settings                     获取全部设置
 *   - POST /admin/settings                     批量更新设置
 *   - POST /admin/settings/reset               重置为默认
 *   - GET  /admin/settings/layouts             获取全部布局列表
 *   - GET  /admin/settings/layout/:key         获取指定布局（含草稿）
 *   - PUT  /admin/settings/layout/:key         直接更新已发布布局
 *   - GET  /admin/settings/layout/:key/draft         获取草稿
 *   - PUT  /admin/settings/layout/:key/draft         保存草稿（自动保存）
 *   - POST /admin/settings/layout/:key/publish       发布草稿
 *   - POST /admin/settings/layout/:key/draft/discard 丢弃草稿
 *   - POST /admin/settings/layout/:key/preview-token 生成预览 token
 *   - PATCH /admin/settings/layout/:key/activate    激活布局
 *   - POST  /admin/settings/layout/:key/reset       重置布局为默认
 *   - 分类页布局：GET/PUT/POST /admin/settings/categories-layout[...]
 *   - 图集：GET/POST/PATCH/DELETE /admin/assets[...]
 */
@ApiTags('站点设置')
@Controller()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly categoriesLayoutService: CategoriesLayoutService,
    private readonly siteAssetService: SiteAssetService,
  ) {}

  /**
   * 公开接口：获取站点联系信息（仅展示启用的字段）
   * 前台 Footer 等组件调用
   */
  @Public()
  @Get('settings')
  @Header('Cache-Control', CACHE_PUBLIC_SETTINGS)
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
  @Header('Cache-Control', CACHE_PUBLIC_LAYOUT)
  @ApiOperation({ summary: '获取当前激活的布局配置（公开）' })
  async getActiveLayout(@Param('key') key: string) {
    return this.settingsService.getActiveLayout(key);
  }

  /**
   * 公开接口（带 token 校验）：通过预览 token 获取草稿内容
   * 用于 /preview/layout/:key 路由，新窗口预览编辑中的草稿
   *
   * 安全设计：
   * - token 必须为有效 JWT 签名（防伪造）
   * - sub 必须为 'preview'（防复用普通用户 token）
   * - token 中的 key 必须与请求的 key 一致（防越权预览其他页面）
   * - token 有过期时间（默认 10 分钟）
   */
  @Public()
  @Get('preview/layout/:key')
  @Header('Cache-Control', CACHE_NO_STORE)
  @ApiOperation({ summary: '通过预览 token 获取草稿内容（公开，需 token）' })
  async getLayoutByPreviewToken(
    @Param('key') key: string,
    @Query('token') token?: string,
  ) {
    if (!token) {
      throw new BadRequestException('缺少预览 token');
    }
    const result = await this.settingsService.getLayoutByPreviewToken(key, token);
    if (!result) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }
    return result;
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
   * 管理员接口：获取指定 key 的布局（编辑回显用，含草稿）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/settings/layout/:key')
  @ApiOperation({ summary: '获取指定布局详情（含草稿状态，管理员）' })
  async getLayoutByKey(@Param('key') key: string) {
    const layout = await this.settingsService.getLayoutByKey(key);
    if (!layout) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }
    return layout;
  }

  /**
   * 管理员接口：更新指定 key 的布局 sections（直接覆盖已发布版本，不走草稿流程）
   * 站点编辑器应优先使用 PUT draft + POST publish 工作流
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Put('admin/settings/layout/:key')
  @ApiOperation({ summary: '更新布局配置（直接覆盖已发布版本，管理员）' })
  async updateLayout(
    @Param('key') key: string,
    @Body() dto: UpdateSiteLayoutDto,
  ) {
    return this.settingsService.updateLayout(key, dto.sections);
  }

  // ============ 草稿管理接口 ============

  /**
   * 管理员接口：获取指定 key 的草稿（编辑器进入时拉取）
   * 若无草稿（draftSections 为 null），返回已发布 sections 作为初始草稿
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/settings/layout/:key/draft')
  @ApiOperation({ summary: '获取布局草稿（管理员，无草稿时返回已发布版本）' })
  async getDraftLayout(@Param('key') key: string) {
    const draft = await this.settingsService.getDraftLayout(key);
    if (!draft) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }
    return draft;
  }

  /**
   * 管理员接口：保存草稿（自动保存 / 手动保存草稿）
   * 仅写入 draftSections + draftUpdatedAt，不影响已发布 sections
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Put('admin/settings/layout/:key/draft')
  @ApiOperation({ summary: '保存布局草稿（自动保存，管理员）' })
  async updateDraftLayout(
    @Param('key') key: string,
    @Body() dto: UpdateSiteLayoutDraftDto,
  ) {
    return this.settingsService.updateDraftLayout(key, dto.sections);
  }

  /**
   * 管理员接口：发布草稿
   * 将 draftSections 复制到 sections（已发布版本），可选清空草稿
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings/layout/:key/publish')
  @ApiOperation({ summary: '发布布局草稿（管理员）' })
  async publishLayout(
    @Param('key') key: string,
    @Body() dto?: PublishLayoutDto,
  ) {
    return this.settingsService.publishLayout(key, dto?.clearDraft ?? true);
  }

  /**
   * 管理员接口：丢弃草稿
   * 清空 draftSections，回退到已发布 sections
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings/layout/:key/draft/discard')
  @ApiOperation({ summary: '丢弃布局草稿（管理员）' })
  async discardDraft(@Param('key') key: string) {
    return this.settingsService.discardDraft(key);
  }

  /**
   * 管理员接口：生成草稿预览 token
   * 返回带 token 的 previewUrl，前端用此 URL 在新窗口打开预览
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Post('admin/settings/layout/:key/preview-token')
  @ApiOperation({ summary: '生成草稿预览 token（管理员）' })
  async createPreviewToken(
    @Param('key') key: string,
    @Body() dto?: CreatePreviewTokenDto,
  ) {
    return this.settingsService.createPreviewToken(
      key,
      dto?.ttlMinutes ?? 10,
    );
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
  @Header('Cache-Control', CACHE_PUBLIC_SETTINGS)
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

  // ============ 站点资源（图集管理）接口 ============

  /**
   * 管理员接口：分页查询图集列表
   * 支持按类别筛选（image / video），按创建时间降序排列
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/assets')
  @ApiOperation({ summary: '分页查询图集列表（管理员）' })
  async listAssets(@Query() query: ListSiteAssetQueryDto) {
    return this.siteAssetService.list({
      category: query.category,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 管理员接口：按 ID 查询资源详情
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Get('admin/assets/:id')
  @ApiOperation({ summary: '查询资源详情（管理员）' })
  async getAssetById(@Param('id', ParseIntPipe) id: number) {
    const asset = await this.siteAssetService.getById(id);
    if (!asset) {
      throw new NotFoundException(`资源 [${id}] 不存在`);
    }
    return asset;
  }

  /**
   * 管理员接口：更新资源（目前仅允许更新 alt 替代文本）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/assets/:id')
  @ApiOperation({ summary: '更新资源 alt 文本（管理员）' })
  async updateAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteAssetDto,
  ) {
    return this.siteAssetService.update(id, dto);
  }

  /**
   * 管理员接口：删除资源记录
   * 注意：仅删除数据库记录，不清理磁盘文件（避免误删被引用的图片）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/assets/:id')
  @ApiOperation({ summary: '删除资源记录（管理员，不清理磁盘文件）' })
  async deleteAsset(@Param('id', ParseIntPipe) id: number) {
    return this.siteAssetService.delete(id);
  }
}
