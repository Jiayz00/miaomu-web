import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 刷新令牌请求 DTO
 * - 长度上限 2048，防止超长字符串触发 JWT 解析 DoS
 */
export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌', maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  refreshToken!: string;
}
