// @ts-nocheck - class-validator legacy decorator 与 TS5 class field context 类型不兼容
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 站点资源类别
 * - image: 图片（image/jpeg | image/png | image/webp）
 * - video: 视频（video/mp4 | video/webm | video/quicktime）
 */
export const SITE_ASSET_CATEGORIES = ['image', 'video'] as const;
export type SiteAssetCategory = (typeof SITE_ASSET_CATEGORIES)[number];

/**
 * 查询图集列表 DTO（GET /admin/assets 查询参数）
 */
export class ListSiteAssetQueryDto {
  @ApiProperty({
    description: '资源类别筛选（不传则返回全部）',
    required: false,
    enum: SITE_ASSET_CATEGORIES,
  })
  @IsOptional()
  @IsIn(SITE_ASSET_CATEGORIES)
  category?: SiteAssetCategory;

  @ApiProperty({ description: '页码（从 1 开始）', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: '每页数量（最大 100）',
    required: false,
    default: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/**
 * 更新图集资源 DTO（PATCH /admin/assets/:id）
 * 仅允许更新 alt 替代文本（其他字段由上传时确定，不可改）
 */
export class UpdateSiteAssetDto {
  @ApiProperty({
    description: '替代文本（用于无障碍与 SEO）',
    required: false,
    example: '迎客松盆景',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;
}

/**
 * 图集资源响应（列表与详情共用）
 */
export class SiteAssetDto {
  @ApiProperty({ description: '资源 ID' })
  id!: number;

  @ApiProperty({ description: '访问 URL（相对路径）', example: '/uploads/abc.jpg' })
  url!: string;

  @ApiProperty({ description: '文件名', example: 'abc-def-123.jpg' })
  filename!: string;

  @ApiProperty({ description: 'MIME 类型', example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ description: '文件大小（字节）', example: 234567 })
  size!: number;

  @ApiProperty({ description: '图片宽度（视频为 null）', example: 1200, nullable: true })
  width!: number | null;

  @ApiProperty({ description: '图片高度（视频为 null）', example: 800, nullable: true })
  height!: number | null;

  @ApiProperty({ description: '视频时长秒（图片为 null）', nullable: true })
  duration!: number | null;

  @ApiProperty({ description: '替代文本', nullable: true })
  alt!: string | null;

  @ApiProperty({ description: '类别', example: 'image' })
  category!: SiteAssetCategory;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;
}

/**
 * 图集列表响应（分页）
 */
export class SiteAssetListResponseDto {
  @ApiProperty({ description: '资源列表', type: [SiteAssetDto] })
  items!: SiteAssetDto[];

  @ApiProperty({ description: '总数', example: 56 })
  total!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页数量', example: 24 })
  pageSize!: number;

  @ApiProperty({ description: '总占用空间（字节）', example: 123456789 })
  totalSize!: number;
}
