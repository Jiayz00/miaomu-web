import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建分类 DTO
 */
export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', example: '松柏类' })
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiProperty({ description: 'URL slug', example: 'song-bai' })
  @IsString()
  @Length(1, 50)
  slug!: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '封面图 URL' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: '排序（越小越靠前）', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sort?: number;

  @ApiPropertyOptional({ description: '状态：1启用 0禁用', enum: [0, 1] })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number;
}
