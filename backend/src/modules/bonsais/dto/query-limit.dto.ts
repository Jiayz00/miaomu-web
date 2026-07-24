import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 通用 limit 查询 DTO
 * 严格校验 limit 为 1-50 之间的整数，防止恶意传入负数或超大值。
 *
 * 适用场景：
 * - 精选盆景数量
 * - 相关推荐数量
 * - analytics 天数（虽为 days，但同样适用）
 */
export class QueryLimitDto {
  @ApiPropertyOptional({ description: '数量限制', minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit 必须为整数' })
  @Min(1, { message: 'limit 最小为 1' })
  @Max(50, { message: 'limit 最大为 50' })
  limit?: number;
}
