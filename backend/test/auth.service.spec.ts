import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { Role } from '@prisma/client';
import {
  createPrismaMock,
  createRedisMock,
  createJwtMock,
  createConfigMock,
  type PrismaMock,
  type RedisMock,
  type JwtMock,
} from './helpers/mock-services';

/**
 * AuthService 单元测试
 *
 * 覆盖关键路径：
 * - 注册：成功、用户名冲突、邮箱冲突
 * - 登录：成功、用户不存在（统一错误防枚举）、密码错误、账号锁定、账号禁用
 * - 登录失败计数：累计到阈值锁定、锁定中拒绝
 * - 刷新令牌：成功、token 无效、token 已撤销、用户不存在/禁用/锁定
 * - 登出：access token 加黑名单 + 撤销 refresh
 * - 修改密码：原密码错误、新旧相同、成功后撤销 refresh
 * - 用户信息：查询、更新、唯一性冲突
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let redis: RedisMock;
  let jwt: JwtMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    redis = createRedisMock();
    jwt = createJwtMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: createConfigMock() },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ---------- register ----------
  describe('register', () => {
    const dto = {
      username: 'new_user',
      email: 'new@example.com',
      password: 'Pass@1234',
      phone: '13800138000',
    };

    it('注册成功应返回用户与令牌', async () => {
      prisma.user.create.mockResolvedValue({
        id: 1,
        username: dto.username,
        email: dto.email,
        role: Role.USER,
        avatar: null,
        phone: dto.phone,
        createdAt: new Date(),
      });

      const result = await service.register(dto);

      expect(result.user).toMatchObject({ id: 1, username: dto.username });
      expect(result.accessToken).toBe('mocked-token');
      expect(result.refreshToken).toBe('mocked-token');
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
      expect(redis.registerRefreshToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(Number),
      );
    });

    it('用户名已存在应抛 ConflictException（P2002 错误）', async () => {
      // service 直接 create 并捕获 P2002 错误，mock create 抛出
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      (p2002Error as unknown as { meta: { target: string[] } }).meta = {
        target: ['username'],
      };
      prisma.user.create.mockRejectedValue(p2002Error);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow('用户名已被使用');
    });

    it('邮箱已存在应抛 ConflictException（P2002 错误）', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      (p2002Error as unknown as { meta: { target: string[] } }).meta = {
        target: ['email'],
      };
      prisma.user.create.mockRejectedValue(p2002Error);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow('邮箱已被注册');
    });

    it('密码必须被 bcrypt 哈希后存储', async () => {
      prisma.user.create.mockImplementation(async (args: { data: { password: string } }) => ({
        id: 1,
        username: dto.username,
        email: dto.email,
        role: Role.USER,
        avatar: null,
        phone: dto.phone,
        createdAt: new Date(),
        // 暴露 hash 给断言
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any));

      await service.register(dto);

      const createCall = prisma.user.create.mock.calls[0][0] as {
        data: { password: string };
      };
      // 不应等于明文
      expect(createCall.data.password).not.toBe(dto.password);
      // 应为 bcrypt 哈希格式
      expect(createCall.data.password.startsWith('$2')).toBe(true);
    });
  });

  // ---------- login ----------
  describe('login', () => {
    const dto = { account: 'tester', password: 'Pass@1234' };
    let hashedPassword: string;

    beforeAll(async () => {
      hashedPassword = await bcrypt.hash('Pass@1234', 4);
    });

    const buildUser = (overrides: Record<string, unknown> = {}) => ({
      id: 1,
      username: 'tester',
      email: 'tester@example.com',
      password: hashedPassword,
      role: Role.USER,
      avatar: null,
      phone: null,
      status: 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      ...overrides,
    });

    it('登录成功应返回用户与令牌，并重置失败计数', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser());
      prisma.user.update.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result.user).toMatchObject({ id: 1, username: 'tester' });
      expect(result.accessToken).toBe('mocked-token');
      // 应重置失败计数与锁定
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );
    });

    it('用户不存在应抛 401（统一错误信息防枚举）', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('账号或密码错误');
    });

    it('密码错误应抛 401 并记录失败计数', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser());
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.login({ ...dto, password: 'Wrong@1234' }),
      ).rejects.toThrow('账号或密码错误');

      // 失败计数应被累加（第 1 次）
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { failedLoginAttempts: 1 },
        }),
      );
    });

    it('连续失败 5 次应锁定账号 15 分钟', async () => {
      prisma.user.findFirst.mockResolvedValue(
        buildUser({ failedLoginAttempts: 4 }),
      );
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.login({ ...dto, password: 'Wrong@1234' }),
      ).rejects.toThrow('账号或密码错误');

      // 第 5 次失败应触发锁定
      const updateCall = prisma.user.update.mock.calls[0][0] as {
        data: { failedLoginAttempts: number; lockedUntil: Date };
      };
      expect(updateCall.data.failedLoginAttempts).toBe(0);
      expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);
      // 锁定时间应在未来 14-16 分钟之间（容差）
      const remainMin = (updateCall.data.lockedUntil.getTime() - Date.now()) / 60000;
      expect(remainMin).toBeGreaterThan(13);
      expect(remainMin).toBeLessThan(16);
    });

    it('账号锁定中应拒绝登录并提示剩余时间', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟后
      prisma.user.findFirst.mockResolvedValue(buildUser({ lockedUntil }));

      await expect(service.login(dto)).rejects.toThrow(/账号已被锁定/);
    });

    it('账号被禁用应抛 401', async () => {
      prisma.user.findFirst.mockResolvedValue(buildUser({ status: 0 }));

      await expect(service.login(dto)).rejects.toThrow('账号已被禁用');
    });
  });

  // ---------- refresh ----------
  describe('refresh', () => {
    const validPayload = {
      sub: 1,
      username: 'tester',
      email: 'tester@example.com',
      role: Role.USER,
      jti: 'refresh-jti-1',
    };

    it('刷新成功应签发新令牌', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
        status: 1,
        lockedUntil: null,
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mocked-token');
      expect(redis.isRefreshTokenValid).toHaveBeenCalledWith(1, 'refresh-jti-1');
    });

    it('refresh token 无效应抛 401', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('invalid')).rejects.toThrow(
        '刷新令牌无效或已过期',
      );
    });

    it('refresh token 已被撤销应抛 401', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      redis.isRefreshTokenValid.mockResolvedValue(false);

      await expect(service.refresh('revoked')).rejects.toThrow(
        '刷新令牌已被撤销',
      );
    });

    it('用户已禁用应拒绝刷新', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        status: 0,
        lockedUntil: null,
      });

      await expect(service.refresh('valid')).rejects.toThrow('账号已被禁用');
    });

    it('用户已锁定应拒绝刷新', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        status: 1,
        lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(service.refresh('valid')).rejects.toThrow('账号已被锁定');
    });

    it('用户不存在应拒绝刷新', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid')).rejects.toThrow('用户不存在');
    });
  });

  // ---------- logout ----------
  describe('logout', () => {
    it('登出应将 access token 加黑名单并撤销所有 refresh', async () => {
      const user = {
        sub: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
        jti: 'access-jti-1',
        exp: Math.floor(Date.now() / 1000) + 600,
      };

      await service.logout(user);

      expect(redis.blacklistAccessToken).toHaveBeenCalledWith(
        'access-jti-1',
        user.exp,
      );
      expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
    });

    it('无 jti/exp 的旧 token 登出不应报错', async () => {
      await service.logout({
        sub: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
      });

      expect(redis.blacklistAccessToken).not.toHaveBeenCalled();
      expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
    });
  });

  // ---------- changePassword ----------
  describe('changePassword', () => {
    let oldHash: string;

    beforeAll(async () => {
      oldHash = await bcrypt.hash('Old@1234', 4);
    });

    it('原密码错误应抛 401', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        password: oldHash,
      });

      await expect(
        service.changePassword(1, {
          oldPassword: 'Wrong@1234',
          newPassword: 'New@1234',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('新旧密码相同应抛 400', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        password: oldHash,
      });

      await expect(
        service.changePassword(1, {
          oldPassword: 'Old@1234',
          newPassword: 'Old@1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('改密成功应更新密码并撤销所有 refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        password: oldHash,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword(1, {
        oldPassword: 'Old@1234',
        newPassword: 'New@1234',
      });

      expect(result.message).toContain('密码修改成功');
      // 验证更新了 passwordChangedAt
      const updateCall = prisma.user.update.mock.calls[0][0] as {
        data: { password: string; passwordChangedAt: Date };
      };
      expect(updateCall.data.passwordChangedAt).toBeInstanceOf(Date);
      expect(updateCall.data.password).not.toBe(oldHash);
      expect(updateCall.data.password).not.toBe('New@1234');
      expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
    });

    it('用户不存在应抛 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(1, {
          oldPassword: 'Old@1234',
          newPassword: 'New@1234',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- getUserProfile / validateUserById ----------
  describe('getUserProfile', () => {
    it('用户存在应返回用户信息', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: Role.USER,
      });

      const result = await service.getUserProfile(1);
      expect(result.username).toBe('tester');
    });

    it('用户不存在应抛 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateUserById', () => {
    it('禁用账号应抛 401', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        status: 0,
      });
      await expect(service.validateUserById(1)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ---------- updateProfile ----------
  describe('updateProfile', () => {
    it('更新用户名为已存在应抛 409（P2002 错误）', async () => {
      // service 调用 findUnique 检查用户存在，然后 update 捕获 P2002
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'old',
        email: 'old@x.com',
      });
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      (p2002Error as unknown as { meta: { target: string[] } }).meta = {
        target: ['username'],
      };
      prisma.user.update.mockRejectedValue(p2002Error);

      await expect(
        service.updateProfile(1, { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.updateProfile(1, { username: 'taken' }),
      ).rejects.toThrow('用户名已被使用');
    });

    it('更新邮箱为已存在应抛 409（P2002 错误）', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'u',
        email: 'old@x.com',
      });
      const p2002Error = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      (p2002Error as unknown as { meta: { target: string[] } }).meta = {
        target: ['email'],
      };
      prisma.user.update.mockRejectedValue(p2002Error);

      await expect(
        service.updateProfile(1, { email: 'taken@x.com' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.updateProfile(1, { email: 'taken@x.com' }),
      ).rejects.toThrow('邮箱已被注册');
    });

    it('成功更新应只传入提供的字段', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'u',
        email: 'u@x.com',
      });
      prisma.user.update.mockResolvedValue({ id: 1, username: 'newname' });

      await service.updateProfile(1, { username: 'newname' });

      const updateCall = prisma.user.update.mock.calls[0][0] as {
        data: Record<string, string>;
      };
      expect(updateCall.data).toEqual({ username: 'newname' });
      // 不应误改 email/phone/avatar
      expect(updateCall.data).not.toHaveProperty('email');
    });

    it('用户不存在应抛 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateProfile(1, { username: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
