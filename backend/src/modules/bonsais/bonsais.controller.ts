import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BonsaisService } from './bonsais.service';
import { CreateBonsaiDto } from './dto/create-bonsai.dto';
import { UpdateBonsaiDto } from './dto/update-bonsai.dto';
import { QueryBonsaiDto } from './dto/query-bonsai.dto';
import { QueryLimitDto } from './dto/query-limit.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { UpdateStatusDto } from '../../common/dto/status.dto';
import { Role } from '@prisma/client';

/**
 * 公开只读接口缓存头
 * - 列表/精选/相关推荐：CDN/浏览器缓存 60s，共享缓存 120s，过期后后台重新验证 300s
 * - 详情：因异步更新浏览量，缓存时间缩短为 30s
 */
const CACHE_PUBLIC_LIST = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';
const CACHE_PUBLIC_DETAIL = 'public, max-age=30, s-maxage=30';

/**
 * 盆景公开控制器
 * 路由前缀：/bonsais
 */
@ApiTags('盆景-公开')
@Controller('bonsais')
export class BonsaisPublicController {
  constructor(private readonly bonsaisService: BonsaisService) {}

  @Public()
  @Get()
  @Header('Cache-Control', CACHE_PUBLIC_LIST)
  @ApiOperation({ summary: '盆景列表（分页/搜索/筛选/排序）' })
  findAll(@Query() query: QueryBonsaiDto) {
    return this.bonsaisService.findPublicList(query);
  }

  @Public()
  @Get('featured')
  @Header('Cache-Control', CACHE_PUBLIC_LIST)
  @ApiOperation({ summary: '精选盆景' })
  findFeatured(@Query() query: QueryLimitDto) {
    return this.bonsaisService.findFeatured(query.limit);
  }

  @Public()
  @Get('related/:id')
  @Header('Cache-Control', CACHE_PUBLIC_LIST)
  @ApiOperation({ summary: '相关推荐盆景（同分类）' })
  findRelated(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryLimitDto,
  ) {
    return this.bonsaisService.findRelated(id, query.limit);
  }

  @Public()
  @Get(':slug')
  @Header('Cache-Control', CACHE_PUBLIC_DETAIL)
  @ApiOperation({ summary: '盆景详情（按 slug，同时记录浏览日志）' })
  async findOne(
    @Param('slug') slug: string,
    @Req() req: Request,
    @CurrentUser() user?: JwtPayload,
  ) {
    // 已登录用户记录其 ID，未登录用户记录 IP 和 UA
    return this.bonsaisService.findPublicBySlug(slug, {
      userId: user?.sub ?? null,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  }
}

/**
 * 盆景管理控制器
 * 路由前缀：/admin/bonsais
 */
@ApiTags('盆景-管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@Controller('admin/bonsais')
export class BonsaisAdminController {
  constructor(private readonly bonsaisService: BonsaisService) {}

  @Get()
  @ApiOperation({ summary: '盆景列表（管理员，含下架）' })
  findAll(@Query() query: QueryBonsaiDto) {
    return this.bonsaisService.findAdminList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '盆景详情（管理员）' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bonsaisService.findAdminById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建盆景' })
  create(@Body() dto: CreateBonsaiDto) {
    return this.bonsaisService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新盆景' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBonsaiDto,
  ) {
    return this.bonsaisService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除盆景（软删除）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bonsaisService.softDelete(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '上架/下架' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.bonsaisService.updateStatus(id, dto.status);
  }
}
