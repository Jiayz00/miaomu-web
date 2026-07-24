/**
 * 测试 mock 工厂
 *
 * 设计原则：
 * - 所有测试通过 mock 完全隔离真实依赖（MySQL / Redis / 文件系统）
 * - mock 实现仅返回 jest.fn()，具体返回值由各测试用例 .mockResolvedValueOnce 设置
 * - 不在工厂中硬编码业务数据，保持 mock 中性
 *
 * 使用方式：
 *   const prismaMock = createPrismaMock();
 *   const module = await Test.createTestingModule({ ... })
 *     .overrideProvider(PrismaService).useValue(prismaMock)
 *     .compile();
 */
import type { ConfigService } from '@nestjs/config';

/**
 * 创建 PrismaService mock
 * 暴露常用 model（user/bonsai/category/favorite/chatRoom/chatMessage/viewLog）
 * 每个 model 的每个方法都是独立的 jest.fn，便于断言
 */
export function createPrismaMock() {
  const buildModel = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  });

  return {
    user: buildModel(),
    bonsai: buildModel(),
    category: buildModel(),
    bonsaiImage: buildModel(),
    favorite: buildModel(),
    chatRoom: buildModel(),
    chatMessage: buildModel(),
    viewLog: buildModel(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    // $transaction 支持两种调用方式：
    // 1. 数组形式：$transaction([promise1, promise2]) -> Promise.all
    // 2. 函数形式：$transaction(async (tx) => {...}) -> 执行函数（隔离事务）
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(
          arg.map((p: unknown) => (p instanceof Promise ? p : Promise.resolve(p))),
        );
      }
      if (typeof arg === 'function') {
        return Promise.resolve((arg as (p: unknown) => unknown)(undefined));
      }
      return Promise.resolve(undefined);
    }),
  };
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

/**
 * 创建 RedisService mock
 * - 默认黑名单/refresh 校验返回 false（token 视为有效）
 * - 各测试可 override 具体 mock 返回值
 */
export function createRedisMock() {
  return {
    blacklistAccessToken: jest.fn().mockResolvedValue(undefined),
    isAccessTokenBlacklisted: jest.fn().mockResolvedValue(false),
    registerRefreshToken: jest.fn().mockResolvedValue(undefined),
    isRefreshTokenValid: jest.fn().mockResolvedValue(true),
    revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
  };
}

export type RedisMock = ReturnType<typeof createRedisMock>;

/**
 * 创建 JwtService mock
 * - signAsync 返回固定字符串，便于断言
 * - verifyAsync 默认成功，由测试用例覆盖错误场景
 * - decode 返回固定 exp
 */
export function createJwtMock() {
  return {
    signAsync: jest.fn().mockResolvedValue('mocked-token'),
    verifyAsync: jest.fn().mockResolvedValue({
      sub: 1,
      username: 'tester',
      email: 'tester@example.com',
      role: 'USER',
      jti: 'mock-jti',
    }),
    decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  };
}

export type JwtMock = ReturnType<typeof createJwtMock>;

/**
 * 创建 ConfigService mock
 * 返回与 configuration.ts 一致的配置结构
 */
export function createConfigMock(): Partial<ConfigService> {
  const config = {
    port: 4001,
    apiPrefix: 'api/v1',
    nodeEnv: 'test',
    database: { url: 'mysql://test:test@localhost:3306/test' },
    redis: { url: 'redis://localhost:6379' },
    jwt: {
      secret: 'test-jwt-secret-at-least-32-bytes-long-padding',
      refreshSecret: 'test-jwt-refresh-secret-at-least-32-bytes-long',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    cors: { origin: ['http://localhost:3000'] },
    upload: {
      dir: './uploads-test',
      maxFileSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    adminDefaultPassword: 'TestAdmin123',
    adminEmail: 'admin@example.com',
  };
  return {
    get: jest.fn((key: string) => {
      // 支持点号分隔的嵌套 key（如 jwt.secret）
      const parts = key.split('.');
      let cur: unknown = config;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          return undefined;
        }
      }
      return cur;
    }),
  };
}
