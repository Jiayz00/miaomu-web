import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
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
  @Length(1, 500)
  @Matches(/^(https?:\/\/|\/uploads\/).+$/, { message: '头像 URL 必须是 http(s) 链接或 /uploads/ 站内路径' })
  avatar?: string;

  @ApiPropertyOptional({ description: '状态：1启用 0禁用', enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}
