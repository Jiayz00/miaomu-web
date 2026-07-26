import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 盆景图片 DTO
 */
export class BonsaiImageDto {
  @ApiProperty({ description: '图片 URL', maxLength: 500 })
  @IsString()
  @Length(1, 500, { message: '图片 URL 长度需在 1-500 之间' })
  url!: string;

  @ApiPropertyOptional({ description: '是否为主图' })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number;
}

/**
 * 创建盆景 DTO
 */
export class CreateBonsaiDto {
  @ApiProperty({ description: '名称', example: '黑松盆景' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ description: 'URL slug', example: 'hei-song-001' })
  @IsString()
  @Length(1, 120)
  slug!: string;

  @ApiPropertyOptional({ description: '藏品编号', example: 'PJ-2024-001' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  catalogNumber?: string;

  @ApiProperty({ description: '描述' })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ description: '艺术描述/鉴赏' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  artisticDescription?: string;

  @ApiPropertyOptional({ description: '年代/创作时期', example: '当代' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  era?: string;

  @ApiPropertyOptional({ description: '材质/树种', example: '黑松' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  material?: string;

  @ApiPropertyOptional({ description: '盆器描述' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  potDescription?: string;

  @ApiPropertyOptional({ description: '冠幅(cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  canopyWidth?: number;

  @ApiPropertyOptional({ description: '整体尺寸描述', example: '高65cm×宽80cm' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  dimensions?: string;

  @ApiPropertyOptional({ description: '来源/传承' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  provenance?: string;

  @ApiPropertyOptional({ description: '参展记录 JSON 数组', example: [{ name: '苏州盆景艺术展', year: 2024, location: '苏州' }] })
  @IsOptional()
  exhibitions?: Array<{ name: string; year?: number; location?: string }>;

  @ApiProperty({ description: '价格', example: 1280.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: '库存', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ description: '产地', example: '江苏扬州' })
  @IsString()
  @Length(1, 100)
  origin!: string;

  @ApiProperty({ description: '年份', example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({ description: '树龄' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  treeAge?: number;

  @ApiPropertyOptional({ description: '高度(cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: '宽度(cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: '展示视频 URL（mp4/webm/mov）', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/|\/uploads\/).+$/, { message: '视频 URL 必须是 http(s) 链接或 /uploads/ 站内路径' })
  video?: string;

  @ApiProperty({ description: '分类 ID' })
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @ApiPropertyOptional({ description: '是否精选' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: '图片列表', type: [BonsaiImageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BonsaiImageDto)
  images?: BonsaiImageDto[];
}
