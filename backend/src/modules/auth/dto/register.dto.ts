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

  @ApiProperty({
    description: '密码（需 8-32 位，必须包含大小写字母、数字、特殊字符）',
    example: 'Penjing@2024',
    minLength: 8,
    maxLength: 32,
  })
  @IsString()
  @Length(8, 32, { message: '密码长度需在 8-32 之间' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,32}$/, {
    message: '密码必须包含大小写字母、数字和特殊字符',
  })
  password!: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;
}
