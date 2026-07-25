import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 趋势查询 DTO
 * 支持固定天数（7/30/90）或自定义起止日期。
 * 当传入 startDate / endDate 时，days 失效。
 */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: '查询天数（仅支持 7、30 或 90）', enum: [7, 30, 90] })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90], { message: 'days 仅支持 7、30 或 90' })
  days?: number;

  @ApiPropertyOptional({ description: '自定义开始日期（ISO 8601，例如 2026-07-01）' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate 必须是 ISO 8601 日期格式' })
  startDate?: string;

  @ApiPropertyOptional({ description: '自定义结束日期（ISO 8601，例如 2026-07-25）' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate 必须是 ISO 8601 日期格式' })
  @ValidateIf((o: AnalyticsQueryDto) => typeof o.startDate === 'string')
  endDate?: string;
}
