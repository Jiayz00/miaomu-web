import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

/**
 * 管理员权限守卫
 * 检查当前用户是否拥有所需角色（默认 ADMIN）
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取接口要求的角色列表
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未配置角色要求，默认需要 ADMIN
    const roles = requiredRoles && requiredRoles.length > 0 ? requiredRoles : [Role.ADMIN];

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('用户信息缺失');
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenException('权限不足，仅管理员可访问');
    }

    return true;
  }
}
