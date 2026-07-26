import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * 盆景列表查询 DTO
 * 支持分页、搜索、分类筛选、价格区间、产地、年份、排序
 */
export class QueryBonsaiDto extends PaginationDto {
  @ApiPropertyOptional({ description: '分类 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: '产地' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: '起始年份' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  yearFrom?: number;

  @ApiPropertyOptional({ description: '结束年份' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(2100)
  yearTo?: number;

  @ApiPropertyOptional({ description: '最低价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: '最高价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['createdAt', 'price', 'viewCount', 'year'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'price', 'viewCount', 'year'])
  sortBy?: string;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: '是否只看精选' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: '藏品编号' })
  @IsOptional()
  @IsString()
  catalogNumber?: string;

  @ApiPropertyOptional({ description: '材质/树种' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: '年代/创作时期' })
  @IsOptional()
  @IsString()
  era?: string;
}
