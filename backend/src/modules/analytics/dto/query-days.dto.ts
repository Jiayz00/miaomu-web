import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 趋势查询 DTO
 * 严格限制 days 只能为 7、30 或 90，防止恶意传入任意值。
 */
export class QueryDaysDto {
  @ApiPropertyOptional({ description: '查询天数（仅支持 7、30 或 90）', enum: [7, 30, 90] })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90], { message: 'days 仅支持 7、30 或 90' })
  days?: number;
}
