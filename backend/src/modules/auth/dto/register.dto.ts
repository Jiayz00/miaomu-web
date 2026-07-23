import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 注册请求 DTO
 */
export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'penjing_lover', minLength: 3, maxLength: 50 })
  @IsString()
  @Length(3, 50, { message: '用户名长度需在 3-50 之间' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名仅允许字母、数字、下划线' })
  username!: string;

  @ApiProperty({ description: '邮箱', example: 'user@penjing.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Length(5, 100)
  email!: string;

  @ApiProperty({ description: '密码', example: 'Pass1234', minLength: 6, maxLength: 32 })
  @IsString()
  @Length(6, 32, { message: '密码长度需在 6-32 之间' })
  password!: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;
}
