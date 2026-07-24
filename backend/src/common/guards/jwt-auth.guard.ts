import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Request } from 'express';

/**
 * JWT 认证守卫
 * - 标记 @Public() 的接口：若携带 JWT 则认证用户（可选认证），未携带则匿名放行
 * - 其余接口必须携带有效 JWT，否则 401
 *
 * 可选认证设计：
 * 公开接口（如盆景详情）希望同时服务匿名与已登录用户。
 * 若用户携带有效 token，则 request.user 被填充，可用于个性化（如记录浏览者 ID）；
 * 若未携带或 token 无效，则匿名放行，不抛错。
 *
 * 安全说明：
 * - "无效 token 匿名放行" 仅影响公开接口的个性化能力，不影响授权决策
 *   （公开接口本就允许匿名访问，授权由 AdminGuard 等独立守卫保障）
 * - 受保护接口仍严格要求有效 token
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // 公开接口：仅当请求携带 Authorization 头时才尝试认证
      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 无 token，匿名放行
        return true;
      }
      // 有 token：走正常认证流程，认证失败也放行（降级为匿名）
      return (super.canActivate(context) as Promise<boolean>).catch(() => true);
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
    // 认证失败抛出 401（仅受保护接口会走到这里，公开接口的失败已被 canActivate 捕获）
    if (err || !user) {
      throw err || new UnauthorizedException('未登录或登录已过期');
    }
    return user as TUser;
  }
}
