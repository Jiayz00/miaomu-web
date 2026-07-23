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
  @ApiProperty({ description: '图片 URL' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ description: '是否为主图' })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
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

  @ApiProperty({ description: '描述' })
  @IsString()
  @MaxLength(5000)
  description!: string;

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
