import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

/**
 * JwtAuthGuard 单元测试
 *
 * 设计说明：
 * JwtAuthGuard 继承 Passport AuthGuard('jwt')，super.canActivate 触发 JWT 验证。
 * 我们不模拟整个 Passport 流程（应在 e2e 中覆盖），仅单测 canActivate 的公开接口分支
 * 与 handleRequest 的错误处理逻辑。
 *
 * 覆盖关键路径：
 * - 公开接口 + 无 Authorization 头：直接返回 true（不调用 super.canActivate）
 * - 公开接口 + 非 Bearer Authorization 头：直接返回 true
 * - 受保护接口：调用 super.canActivate（由 e2e 覆盖完整认证流程）
 * - handleRequest：err 存在抛 err；user 缺失抛 401；正常返回 user
 */
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new JwtAuthGuard(reflector);
  });

  function buildContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers, socket: {} }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  describe('canActivate - 公开接口', () => {
    it('无 Authorization 头应匿名放行（不调用 super.canActivate）', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = buildContext({});

      // 监视 super.canActivate，确保不被调用
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const protoParent = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as any;
      const parentSpy = jest
        .spyOn(protoParent, 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(parentSpy).not.toHaveBeenCalled();
      parentSpy.mockRestore();
    });

    it('Authorization 非 Bearer 头应匿名放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = buildContext({ authorization: 'Basic xxx' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const protoParent = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as any;
      const parentSpy = jest
        .spyOn(protoParent, 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(parentSpy).not.toHaveBeenCalled();
      parentSpy.mockRestore();
    });

    it('携带 Bearer token 但认证失败应降级匿名放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = buildContext({ authorization: 'Bearer invalid' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const protoParent = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as any;
      const parentSpy = jest
        .spyOn(protoParent, 'canActivate')
        .mockRejectedValue(new UnauthorizedException('jwt malformed'));

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      parentSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('err 存在时应抛出 err', () => {
      const err = new UnauthorizedException('expired');
      expect(() => guard.handleRequest(err, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('user 缺失且无 err 时应抛默认 401', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, undefined)).toThrow(
        '未登录或登录已过期',
      );
    });

    it('user 存在时应返回 user', () => {
      const user = { sub: 1, username: 'u' };
      expect(guard.handleRequest(null, user)).toEqual(user);
    });
  });
});
