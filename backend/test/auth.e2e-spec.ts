import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { UsersService } from '../src/modules/users/users.service';
import { UploadService } from '../src/modules/upload/upload.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import {
  createPrismaMock,
  createRedisMock,
  type PrismaMock,
  type RedisMock,
} from './helpers/mock-services';

/**
 * Auth 流程 e2e 测试
 *
 * 通过 supertest 模拟真实 HTTP 请求，覆盖完整用户路径：
 * - 注册（成功 / 字段缺失 / 弱密码 / 多余字段 / 用户名冲突）
 * - 登录（成功 / 密码错误 / 账号不存在 - 防枚举）
 * - 获取个人信息（无 token / 无效 token / 有效 token / 黑名单 token）
 * - 修改密码（原密码错误 / 新旧相同 / 成功撤销 refresh）
 * - 刷新令牌（成功 / 无效 token / 已撤销 / 用户禁用）
 * - 登出（成功加黑名单 / 无 token）
 *
 * 数据库与 Redis 全部 mock，不依赖真实外部服务
 *
 * Mock 重置策略：
 * - beforeEach 使用 mockReset 重置所有 mock 实现，避免 mockResolvedValueOnce 跨测试残留
 * - 同时重新设置默认行为（黑名单 false、refresh 有效 true、JwtStrategy 用户存在）
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let redis: RedisMock;
  let jwtService: JwtService;
  let configService: ConfigService;
  // UsersService mock 引用，用于 beforeEach 重新设置默认行为
  let usersServiceMock: { findById: jest.Mock };

  beforeAll(async () => {
    prisma = createPrismaMock();
    redis = createRedisMock();
    usersServiceMock = {
      // JwtStrategy.validate 调用：返回有效用户，passwordChangedAt 设为 epoch 避免触发密码修改校验
      findById: jest.fn().mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
        status: 1,
        passwordChangedAt: new Date(0),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            jwt: {
              secret: process.env.JWT_SECRET,
              refreshSecret: process.env.JWT_REFRESH_SECRET,
              expiresIn: '15m',
              refreshExpiresIn: '7d',
            },
            nodeEnv: 'test',
            cors: { origin: ['http://localhost:3000'] },
          })],
        }),
        PassportModule,
        JwtModule.registerAsync({
          useFactory: (cfg: ConfigService) => ({
            secret: cfg.get<string>('jwt.secret'),
            signOptions: { expiresIn: cfg.get<string>('jwt.expiresIn') },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: UploadService, useValue: { uploadSingle: jest.fn() } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService);
    jwtService = app.get(JwtService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // 使用 mockReset 完全重置 mock 实现，避免 mockResolvedValueOnce 跨测试残留
    jest.resetAllMocks();
    // 重新设置默认行为
    redis.isAccessTokenBlacklisted.mockResolvedValue(false);
    redis.isRefreshTokenValid.mockResolvedValue(true);
    redis.blacklistAccessToken.mockResolvedValue(undefined);
    redis.revokeAllRefreshTokens.mockResolvedValue(undefined);
    redis.registerRefreshToken.mockResolvedValue(undefined);
    // JwtStrategy 默认返回有效用户
    usersServiceMock.findById.mockResolvedValue({
      id: 1,
      username: 'tester',
      email: 'tester@example.com',
      role: Role.USER,
      status: 1,
      passwordChangedAt: new Date(0),
    });
  });

  /**
   * 签发 access token，用于受保护接口的认证
   */
  function signAccessToken(payload: Record<string, unknown>): string {
    return jwtService.sign(
      { sub: 1, username: 'tester', email: 'tester@example.com', role: 'USER', ...payload },
      { secret: configService.get<string>('jwt.secret') },
    );
  }

  /**
   * 签发 refresh token（使用 refreshSecret）
   */
  function signRefreshToken(payload: Record<string, unknown>): string {
    return jwtService.sign(
      { sub: 1, username: 'tester', email: 'tester@example.com', role: 'USER', ...payload },
      {
        secret: configService.get<string>('jwt.refreshSecret'),
        expiresIn: '7d',
      },
    );
  }

  describe('POST /auth/register', () => {
    it('合法请求应注册成功并返回 token', async () => {
      prisma.user.create.mockResolvedValue({
        id: 1,
        username: 'new_user',
        email: 'new@example.com',
        role: Role.USER,
        avatar: null,
        phone: '13800138000',
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'new_user',
          email: 'new@example.com',
          password: 'Pass@1234',
          phone: '13800138000',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.username).toBe('new_user');
    });

    it('缺少必填字段应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'x' });

      expect(res.status).toBe(400);
      // HttpExceptionFilter 返回结构：{ statusCode, message, error, timestamp, path, requestId }
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('弱密码应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'new_user',
          email: 'new@example.com',
          password: 'simple',
        });

      expect(res.status).toBe(400);
    });

    it('多余字段应被 forbidNonWhitelisted 拒绝（防越权设置 role）', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'new_user',
          email: 'new@example.com',
          password: 'Pass@1234',
          role: 'ADMIN',
        });

      expect(res.status).toBe(400);
    });

    it('用户名冲突应返回 409（P2002 错误）', async () => {
      // service 直接 create 并捕获 P2002 错误，需 mock create 抛出
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique constraint', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      (p2002Error as unknown as { meta: { target: string[] } }).meta = {
        target: ['username'],
      };
      prisma.user.create.mockRejectedValue(p2002Error);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'taken',
          email: 'new@example.com',
          password: 'Pass@1234',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('用户名已被使用');
    });

    it('邮箱冲突应返回 409', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique constraint', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      (p2002Error as unknown as { meta: { target: string[] } }).meta = {
        target: ['email'],
      };
      prisma.user.create.mockRejectedValue(p2002Error);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'unique_user',
          email: 'taken@example.com',
          password: 'Pass@1234',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('邮箱已被注册');
    });
  });

  describe('POST /auth/login', () => {
    let passwordHash: string;

    beforeAll(async () => {
      passwordHash = await bcrypt.hash('Pass@1234', 4);
    });

    it('合法账号密码应登录成功', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        password: passwordHash,
        role: Role.USER,
        avatar: null,
        phone: null,
        status: 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      prisma.user.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: 'tester', password: 'Pass@1234' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.username).toBe('tester');
    });

    it('密码错误应返回 401（防枚举：与账号不存在相同信息）', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        password: passwordHash,
        role: Role.USER,
        status: 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      prisma.user.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: 'tester', password: 'Wrong@1234' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('账号或密码错误');
    });

    it('账号不存在应返回相同的 401 信息（防枚举）', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: 'not_exist', password: 'Pass@1234' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('账号或密码错误');
    });

    it('账号锁定中应返回 401 并提示剩余时间', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        password: passwordHash,
        role: Role.USER,
        status: 1,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: 'tester', password: 'Pass@1234' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('账号已被锁定');
    });
  });

  describe('POST /auth/refresh', () => {
    it('合法 refresh token 应签发新的 access + refresh', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
        status: 1,
        lockedUntil: null,
      });

      const refreshToken = signRefreshToken({ jti: 'refresh-jti-1' });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('无效 refresh token 应返回 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('刷新令牌无效');
    });

    it('已撤销的 refresh token 应返回 401', async () => {
      redis.isRefreshTokenValid.mockResolvedValue(false);

      const refreshToken = signRefreshToken({ jti: 'revoked-jti' });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('已被撤销');
    });

    it('用户被禁用应拒绝刷新', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        role: Role.USER,
        status: 0,
        lockedUntil: null,
      });

      const refreshToken = signRefreshToken({ jti: 'refresh-jti-2' });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('已被禁用');
    });
  });

  describe('GET /auth/profile（受保护接口）', () => {
    it('未携带 token 应返回 401', async () => {
      const res = await request(app.getHttpServer()).get('/auth/profile');
      expect(res.status).toBe(401);
    });

    it('携带无效 token 应返回 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('携带有效 token 应返回用户信息', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
        avatar: null,
        phone: null,
        status: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signAccessToken({ jti: 'jti-1' });

      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('tester');
      expect(res.body.data.email).toBe('tester@example.com');
    });

    it('黑名单中的 token 应返回 401（登出后失效）', async () => {
      redis.isAccessTokenBlacklisted.mockResolvedValue(true);
      const token = signAccessToken({ jti: 'blacklisted-jti' });

      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('携带有效 token 应登出成功并加黑名单', async () => {
      const token = signAccessToken({ jti: 'logout-jti' });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(redis.blacklistAccessToken).toHaveBeenCalledWith(
        'logout-jti',
        expect.any(Number),
      );
      expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
    });

    it('未携带 token 应返回 401', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('原密码错误应返回 401', async () => {
      const oldHash = await bcrypt.hash('Old@1234', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        password: oldHash,
      });
      const token = signAccessToken({ jti: 'pw-jti' });

      const res = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'Wrong@1234', newPassword: 'New@1234' });

      expect(res.status).toBe(401);
    });

    it('新旧密码相同应返回 400', async () => {
      const oldHash = await bcrypt.hash('Old@1234', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        password: oldHash,
      });
      const token = signAccessToken({ jti: 'pw-jti' });

      const res = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'Old@1234', newPassword: 'Old@1234' });

      expect(res.status).toBe(400);
    });

    it('改密成功应撤销所有 refresh token', async () => {
      const oldHash = await bcrypt.hash('Old@1234', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        password: oldHash,
      });
      prisma.user.update.mockResolvedValue({});
      const token = signAccessToken({ jti: 'pw-jti' });

      const res = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'Old@1234', newPassword: 'New@1234' });

      expect(res.status).toBe(201);
      expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
    });
  });

  describe('响应格式', () => {
    it('成功响应应包含 success/data/message 字段', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        password: await bcrypt.hash('Pass@1234', 4),
        role: Role.USER,
        status: 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      prisma.user.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: 'tester', password: 'Pass@1234' });

      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Object),
        message: '请求成功',
      });
    });

    it('错误响应应包含 statusCode/message/timestamp/path', async () => {
      const res = await request(app.getHttpServer()).get('/auth/profile');
      // HttpExceptionFilter 统一错误格式
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('path');
      expect(res.body).toHaveProperty('requestId');
    });
  });
});
