import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 认证守卫
 * - 标记 @Public() 的接口跳过认证
 * - 其余接口必须携带有效 JWT
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  // 注意：使用 any 是为了与 Passport 的 IAuthGuard 接口签名兼容
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    _info?: unknown,
    _context?: ExecutionContext,
    _status?: unknown,
  ): TUser {
    // 认证失败抛出 401
    if (err || !user) {
      throw err || new UnauthorizedException('未登录或登录已过期');
    }
    return user as TUser;
  }
}
