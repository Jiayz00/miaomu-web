import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 通用状态更新 DTO
 * 严格校验 status 仅允许 0 或 1，防止任意数字写入数据库破坏语义。
 *
 * 适用场景：
 * - 盆景上架/下架（1上架 0下架）
 * - 会话标记已处理（0未处理 1已处理）
 * - 用户启用/禁用（1启用 0禁用）
 */
export class UpdateStatusDto {
  @ApiProperty({ description: '状态：1启用/上架/已处理，0禁用/下架/未处理', enum: [0, 1] })
  @IsIn([0, 1], { message: 'status 必须为 0 或 1' })
  status!: number;
}
