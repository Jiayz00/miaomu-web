// @ts-nocheck - class-validator legacy decorator 与 TS5 class field context 类型不兼容，
// 该文件全部使用 legacy 装饰器，需要禁用 TS5 的严格装饰器类型检查。
// @see https://github.com/microsoft/TypeScript/issues/64969
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 主页区块类型
 * 与前端 frontend/src/lib/types.ts 的 HomeSectionType 保持一致
 */
export type HomeSectionType =
  | 'hero'
  | 'featured'
  | 'categories'
  | 'bonsai-grid'
  | 'showcase'
  | 'story'
  | 'cta'
  | 'contact'
  | 'stats'
  | 'carousel'
  | 'text-image'
  | 'product-list'
  | 'text';

/**
 * 单个区块 DTO
 */
export class SiteSectionDto {
  @ApiProperty({ description: '区块唯一 ID（前端生成 uuid）', example: 'hero-001' })
  @IsString()
  @MaxLength(100)
  id!: string;

  @ApiProperty({
    description: '区块类型',
    example: 'hero',
    enum: [
      'hero',
      'featured',
      'categories',
      'bonsai-grid',
      'showcase',
      'story',
      'cta',
      'contact',
      'stats',
      'carousel',
      'text-image',
      'product-list',
      'text',
    ],
  })
  @IsString()
  @IsIn([
    'hero',
    'featured',
    'categories',
    'bonsai-grid',
    'showcase',
    'story',
    'cta',
    'contact',
    'stats',
    'carousel',
    'text-image',
    'product-list',
    'text',
  ])
  type!: HomeSectionType;

  @ApiProperty({ description: '区块标题（可空）', example: '匠心之选', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: '区块副标题（可空）',
    example: '每一株皆经精心甄选',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @ApiProperty({ description: '是否显示', example: true })
  @IsBoolean()
  visible!: boolean;

  @ApiProperty({
    description: '区块专属配置',
    example: { heroImage: 'https://...', ctaText: '探索收藏', ctaLink: '/bonsais' },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiProperty({ description: '排序（升序）', example: 1 })
  @IsInt()
  @Min(0)
  order!: number;
}

/**
 * 更新站点布局 DTO
 * 接收 sections 数组，整体替换该 key 的布局配置
 */
export class UpdateSiteLayoutDto {
  @ApiProperty({
    description: '区块配置数组（整体替换）',
    type: [SiteSectionDto],
    example: [
      {
        id: 'hero-001',
        type: 'hero',
        title: '方寸之间见天地',
        subtitle: '凝练自然之美',
        visible: true,
        config: { heroImage: 'https://...', ctaText: '探索收藏', ctaLink: '/bonsais' },
        order: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteSectionDto)
  sections!: SiteSectionDto[];
}
