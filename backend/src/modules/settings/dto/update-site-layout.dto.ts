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
 *
 * 原有 13 种（向后兼容）：
 *   hero / featured / categories / bonsai-grid / showcase / story / cta /
 *   contact / stats / carousel / text-image / product-list / text
 *
 * 站点编辑器新增 10 种（对应设计稿组件库）：
 *   banner / divider / spacer / heading / bonsai-card / gallery-grid /
 *   inquiry / tag / single-image / video
 *
 * 各新类型的 config 字段形状（参考，由前端 getDefaultConfigByType 维护）：
 *   banner:        { image, eyebrow, title, subtitle, height, align, overlay, overlayOpacity }
 *                  height ∈ [40, 100]（vh），align ∈ 'left'|'center'|'right'，
 *                  overlay boolean，overlayOpacity ∈ [0, 100]
 *   divider:       { style: 'gold-line'|'ornament', color? }
 *   spacer:        { height: number }（px）
 *   heading:       { text, level: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6', align? }
 *   bonsai-card:   { bonsaiId: number } 或 { name, price, image, link }（手动配置）
 *   gallery-grid:  { images: Array<{ url, alt?, caption? }>, columns: 2|3|4, gap? }
 *   inquiry:       { buttonText, ctaLink, style?: 'gold'|'ink'|'outline' }
 *   tag:           { label, color?, link? }
 *   single-image:  { image, alt?, caption?, align?, width: 'full'|'content'|'narrow' }
 *   video:         { url, poster?, autoplay?, loop?, muted?, controls? }
 */
export type HomeSectionType =
  // 原有 13 种
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
  | 'text'
  // 站点编辑器新增 10 种
  | 'banner'
  | 'divider'
  | 'spacer'
  | 'heading'
  | 'bonsai-card'
  | 'gallery-grid'
  | 'inquiry'
  | 'tag'
  | 'single-image'
  | 'video';

/**
 * 区块类型枚举值数组（用于 @IsIn 校验与 Swagger 文档）
 */
export const HOME_SECTION_TYPES: HomeSectionType[] = [
  // 原有 13 种
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
  // 站点编辑器新增 10 种
  'banner',
  'divider',
  'spacer',
  'heading',
  'bonsai-card',
  'gallery-grid',
  'inquiry',
  'tag',
  'single-image',
  'video',
];

/**
 * 站点编辑器支持的布局 key（多页面）
 * homepage: 首页 / collection: 盆景收藏列表页 / detail: 藏品详情页
 */
export const SUPPORTED_LAYOUT_KEYS = ['homepage', 'collection', 'detail'] as const;
export type SupportedLayoutKey = (typeof SUPPORTED_LAYOUT_KEYS)[number];

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
    enum: HOME_SECTION_TYPES,
  })
  @IsString()
  @IsIn(HOME_SECTION_TYPES)
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
 * 接收 sections 数组，整体替换该 key 的【已发布】布局配置
 *
 * 注意：此接口直接覆盖已发布版本，不经过草稿流程。
 * 站点编辑器应优先使用 UpdateSiteLayoutDraftDto 保存草稿，再调用 publish 发布。
 */
export class UpdateSiteLayoutDto {
  @ApiProperty({
    description: '区块配置数组（整体替换已发布版本）',
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

/**
 * 保存草稿 DTO
 * 仅写入 draftSections + draftUpdatedAt，不影响已发布的 sections
 * 站点编辑器自动保存（debounce）与手动"保存草稿"均使用此 DTO
 */
export class UpdateSiteLayoutDraftDto {
  @ApiProperty({
    description: '草稿区块配置数组（仅写入 draftSections，不影响已发布版本）',
    type: [SiteSectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteSectionDto)
  sections!: SiteSectionDto[];
}

/**
 * 发布草稿 DTO
 * 将 draftSections 复制到 sections（已发布版本），并清空 draftSections
 */
export class PublishLayoutDto {
  @ApiProperty({
    description: '发布后是否清空草稿（默认 true）。false 表示保留草稿继续编辑。',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  clearDraft?: boolean;
}
