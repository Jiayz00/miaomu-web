// @ts-nocheck - class-validator legacy decorator 与 TS5 class field context 类型不兼容
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 创建预览 token DTO
 * 站点编辑器"预览"按钮调用，生成短期 token 用于新窗口预览草稿
 *
 * 实现方式：JWT 签名（stateless，签名密钥复用 JWT_SECRET）
 * 默认有效期 10 分钟，最长 30 分钟
 */
export class CreatePreviewTokenDto {
  @ApiProperty({
    description: '预览有效期（分钟），默认 10，最大 30',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  ttlMinutes?: number;
}

/**
 * 预览 token 响应
 */
export class PreviewTokenResponseDto {
  @ApiProperty({ description: '预览访问 URL（含 token 参数）', example: '/preview/layout/homepage?token=xxx.yyy.zzz' })
  previewUrl!: string;

  @ApiProperty({ description: 'JWT token（可独立使用）' })
  token!: string;

  @ApiProperty({ description: '过期时间（Unix 秒）', example: 1785056000 })
  expiresAt!: number;
}
