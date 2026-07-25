import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 管理员重置/修改任意用户密码 DTO
 */
export class AdminChangePasswordDto {
  @ApiProperty({ description: '新密码', example: 'NewPass1234' })
  @IsString()
  @Length(6, 32, { message: '密码长度需在 6-32 之间' })
  newPassword!: string;
}
