import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * 角色装饰器
 * 配合 AdminGuard 使用，标记接口所需的角色
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
