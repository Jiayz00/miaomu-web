import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * 分类公开控制器
 */
@ApiTags('分类-公开')
@Controller('categories')
export class CategoriesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '分类列表' })
  findAll() {
    return this.categoriesService.findPublicAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: '分类详情（含盆景列表）' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findPublicBySlug(slug);
  }
}

/**
 * 分类管理控制器
 */
@ApiTags('分类-管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '分类列表（管理员）' })
  findAll() {
    return this.categoriesService.findAdminAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '分类详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findAdminById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建分类' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新分类' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分类' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
