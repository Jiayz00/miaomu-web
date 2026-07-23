import { SetMetadata } from '@nestjs/common';

/**
 * 公开接口标记装饰器
 * 标记的接口不需要 JWT 认证
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
