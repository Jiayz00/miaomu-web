import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户自助更新个人信息 DTO
 * - 仅允许修改 username/email/phone/avatar
 * - role/status/password 不在此处修改（防越权）
 * - 所有字段可选，按需更新
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '用户名', example: 'penjing_lover' })
  @IsOptional()
  @IsString()
  @Length(3, 50, { message: '用户名长度需在 3-50 之间' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名仅允许字母、数字、下划线' })
  username?: string;

  @ApiPropertyOptional({ description: '邮箱', example: 'user@penjing.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Length(5, 100)
  email?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '头像 URL', example: '/uploads/avatar-xxx.png' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  avatar?: string;
}
