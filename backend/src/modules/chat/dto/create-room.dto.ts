import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 创建会话 DTO
 */
export class CreateRoomDto {
  @ApiPropertyOptional({ description: '关联盆景 ID（询价场景）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bonsaiId?: number;
}
