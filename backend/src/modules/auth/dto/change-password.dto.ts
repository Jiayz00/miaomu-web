import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 修改密码 DTO
 * - 需提供原密码以防会话劫持后改密
 * - 新密码与注册时一致：8-32 位，含大小写字母、数字、特殊字符
 */
export class ChangePasswordDto {
  @ApiProperty({ description: '原密码', example: 'OldPass@1234' })
  @IsString()
  @Length(1, 128)
  oldPassword!: string;

  @ApiProperty({
    description: '新密码（需 8-32 位，必须包含大小写字母、数字、特殊字符）',
    example: 'NewPass@2024',
    minLength: 8,
    maxLength: 32,
  })
  @IsString()
  @Length(8, 32, { message: '新密码长度需在 8-32 之间' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,32}$/,
    { message: '新密码必须包含大小写字母、数字和特殊字符' },
  )
  newPassword!: string;
}
