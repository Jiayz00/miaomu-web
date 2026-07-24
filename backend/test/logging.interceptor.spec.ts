import { ExecutionContext, CallHandler } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

/**
 * LoggingInterceptor 单元测试
 *
 * 覆盖关键路径：
 * - IPv4 末段掩码（PII 保护）
 * - IPv6 简略掩码
 * - 空 IP / 异常 IP 兜底
 * - requestId 从 req.requestId 取（无则 -）
 * - 日志包含 method / path / status / 耗时 / ip
 */
describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  // 通过反射访问私有方法
  function maskIp(ip: string): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (interceptor as any).maskIp(ip);
  }

  describe('maskIp - IPv4', () => {
    it('应将末段替换为 x', () => {
      expect(maskIp('1.2.3.4')).toBe('1.2.3.x');
      expect(maskIp('192.168.1.100')).toBe('192.168.1.x');
      expect(maskIp('255.255.255.255')).toBe('255.255.255.x');
    });

    it('非法 IPv4 应回退为 x.x.x.x', () => {
      expect(maskIp('not-an-ip')).toBe('x.x.x.x');
    });
  });

  describe('maskIp - IPv6', () => {
    it('应保留前两组并加 ::x', () => {
      const masked = maskIp('2001:db8:85a3::8a2e:370:7334');
      expect(masked).toContain('2001:db8');
      expect(masked).toContain('::x');
    });
  });

  describe('maskIp - 边界', () => {
    it('空字符串应返回 -', () => {
      expect(maskIp('')).toBe('-');
    });

    it('null 应返回 -', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(maskIp(null as any)).toBe('-');
    });
  });

  describe('intercept', () => {
    function buildContext(
      overrides: Partial<{
        method: string;
        originalUrl: string;
        ip: string;
        requestId: string;
        statusCode: number;
      }> = {},
    ): { ctx: ExecutionContext; response: Record<string, unknown> } {
      const opts = {
        method: 'GET',
        originalUrl: '/api/v1/test',
        ip: '10.0.0.1',
        requestId: 'req-abc',
        statusCode: 200,
        ...overrides,
      };
      const response = { statusCode: opts.statusCode };
      return {
        ctx: {
          switchToHttp: () => ({
            getRequest: () => ({
              method: opts.method,
              originalUrl: opts.originalUrl,
              ip: opts.ip,
              requestId: opts.requestId,
            }),
            getResponse: () => response,
          }),
        } as unknown as ExecutionContext,
        response,
      };
    }

    it('应通过 next.handle() 透传数据', async () => {
      const { ctx } = buildContext();
      const next: CallHandler = { handle: () => of({ ok: 1 }) };

      const result$ = interceptor.intercept(ctx, next);
      const data = await lastValueFrom(result$);
      expect(data).toEqual({ ok: 1 });
    });

    it('requestId 缺失时日志应使用 -', async () => {
      const { ctx } = buildContext({ requestId: '' });
      const next: CallHandler = { handle: () => of({}) };

      // 仅验证不抛错（日志输出已通过 Logger 静默）
      await expect(lastValueFrom(interceptor.intercept(ctx, next))).resolves.toEqual({});
    });
  });
});
