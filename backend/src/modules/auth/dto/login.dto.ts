import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录请求 DTO
 * 统一登录入口：account 可为用户名或邮箱
 * 管理员与普通用户共用同一登录接口，由后端根据 role 区分权限
 */
export class LoginDto {
  @ApiProperty({
    description: '账号（用户名或邮箱）',
    example: 'admin',
  })
  @IsString()
  @Length(2, 128, { message: '账号长度需在 2-128 之间' })
  account!: string;

  @ApiProperty({ description: '密码', example: 'Pass1234' })
  @IsString()
  @Length(6, 32, { message: '密码长度需在 6-32 之间' })
  password!: string;
}
