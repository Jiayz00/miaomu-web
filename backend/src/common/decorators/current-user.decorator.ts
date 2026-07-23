import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * 当前用户参数装饰器
 * 从 request.user 中提取用户信息
 * 用法：getProfile(@CurrentUser() user: JwtPayload)
 */
export interface JwtPayload {
  sub: number; // 用户 ID
  username: string;
  email: string;
  role: Role;
  jti?: string; // token id，用于黑名单/轮换校验
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    // 如果指定了字段，则返回对应字段；否则返回整个用户对象
    return data ? user?.[data] : user;
  },
);
