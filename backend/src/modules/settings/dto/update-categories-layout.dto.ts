// @ts-nocheck - class-validator legacy decorator 与 TS5 class field context 类型不兼容
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 分类页排版方式
 * - grid：等高网格（默认）
 * - masonry：瀑布流（按图片自然高度排列）
 * - list：单列大图列表
 */
export enum CategoryLayoutMode {
  GRID = 'grid',
  MASONRY = 'masonry',
  LIST = 'list',
}

/**
 * 卡片宽高比
 */
export enum CategoryCardAspect {
  R_4_5 = '4/5',
  R_1_1 = '1/1',
  R_3_4 = '3/4',
  R_16_9 = '16/9',
}

/**
 * 排序方式
 * - sort：按分类.sort 字段（手动排序）
 * - name：按名称字典序
 * - createdAt：按创建时间倒序
 */
export enum CategorySortBy {
  SORT = 'sort',
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

/**
 * 分类页布局配置 DTO
 * 通过 SiteSetting（key: categories_layout_config）存储 JSON 字符串
 */
export class CategoriesLayoutConfigDto {
  @ApiProperty({ enum: CategoryLayoutMode, description: '排版方式' })
  @IsEnum(CategoryLayoutMode)
  layout!: CategoryLayoutMode;

  @ApiProperty({ enum: CategoryCardAspect, description: '卡片宽高比' })
  @IsEnum(CategoryCardAspect)
  aspect!: CategoryCardAspect;

  @ApiProperty({ enum: CategorySortBy, description: '排序方式' })
  @IsEnum(CategorySortBy)
  sortBy!: CategorySortBy;

  @ApiProperty({ description: '桌面端每行列数（2-4）', minimum: 2, maximum: 4 })
  @IsInt()
  @Min(2)
  @Max(4)
  columns!: number;

  @ApiProperty({ description: '是否显示分类描述', default: true })
  @IsBoolean()
  showDescription!: boolean;

  @ApiProperty({ description: '是否显示卡片悬浮箭头', default: true })
  @IsBoolean()
  showArrow!: boolean;

  @ApiProperty({ description: '是否显示渐变遮罩', default: true })
  @IsBoolean()
  showOverlay!: boolean;

  @ApiProperty({ description: '页面标题（留空则用默认）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: '页面副标题', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @ApiProperty({ description: '页面顶部小标签', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  eyebrow?: string;
}

/**
 * 兼容 record 形式的批量更新结构
 */
export class UpdateCategoriesLayoutDto {
  @ApiProperty({ description: '分类页布局配置' })
  @IsObject()
  @ValidateNested()
  @Type(() => CategoriesLayoutConfigDto)
  config!: CategoriesLayoutConfigDto;
}
