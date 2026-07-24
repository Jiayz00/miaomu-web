import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AdminGuard } from '../src/common/guards/admin.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';

/**
 * AdminGuard 单元测试
 *
 * 覆盖关键路径：
 * - 未配置 ROLES 元数据时默认要求 ADMIN
 * - 普通用户访问 admin 接口应抛 403
 * - 管理员访问应放行
 * - request.user 缺失应抛 403（防止上游守卫跳过导致越权）
 * - 自定义角色配置
 */
describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new AdminGuard(reflector);
  });

  function buildContext(user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('未配置 ROLES 元数据时默认要求 ADMIN', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({ role: Role.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('未配置 ROLES 元数据且用户为 USER 时应抛 403', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({ role: Role.USER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('配置 ROLES=[ADMIN] 且用户为 ADMIN 时放行', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = buildContext({ role: Role.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('配置 ROLES=[ADMIN] 且用户为 USER 时抛 403', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = buildContext({ role: Role.USER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('request.user 缺失时应抛 403（防御）', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = buildContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('用户 role 字段缺失应抛 403', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({ sub: 1 }); // 无 role
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('空 ROLES 数组应回退为默认 ADMIN 要求', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = buildContext({ role: Role.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
