import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户状态更新 DTO
 */
export class UpdateUserStatusDto {
  @ApiPropertyOptional({ description: '状态：1启用 0禁用', enum: [0, 1] })
  @IsIn([0, 1], { message: '状态值必须为 0 或 1' })
  status!: number;
}

/**
 * 用户信息更新 DTO（管理员）
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: '用户名' })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  username?: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '状态：1启用 0禁用', enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}
