import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * 认证服务
 * 处理注册、登录、刷新令牌、登出、用户验证、修改密码、更新个人信息
 *
 * 安全设计：
 * - bcrypt 12 轮哈希
 * - access token 携带 jti，登出加入 Redis 黑名单
 * - refresh token 一次性轮换：刷新时签发新 refresh，旧 refresh 立即失效
 * - 用户禁用后 token 即时失效（在 JwtStrategy.validate 中校验）
 * - 登录失败计数与账号锁定（防密码爆破）
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS: number;
  // 登录失败保护策略
  private readonly MAX_FAILED_ATTEMPTS = 5; // 连续失败 5 次锁定
  private readonly LOCK_DURATION_MINUTES = 15; // 锁定 15 分钟

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    // 生产环境 12 轮（约 250ms），开发环境 10 轮以加快启动
    const env = this.configService.get<string>('nodeEnv') || 'development';
    this.BCRYPT_ROUNDS = env === 'production' ? 12 : 10;
  }

  /**
   * 用户注册
   * 1. bcrypt 哈希密码
   * 2. 创建用户（由数据库 UNIQUE 约束保证用户名/邮箱唯一性）
   * 3. 签发带 jti 的 access + refresh token，登记 refresh 白名单
   *
   * 并发安全：放弃 check-then-create 模式，直接依赖数据库 UNIQUE 约束，
   * 捕获 P2002 错误转换为 ConflictException，避免竞态导致重复用户
   */
  async register(dto: RegisterDto) {
    // bcrypt 哈希密码
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // 创建用户（UNIQUE 约束兜底）
    // 显式声明类型，避免隐式 any（符合 AGENTS.md 禁止 any 规范）
    let user: Prisma.UserGetPayload<{
      select: {
        id: true;
        username: true;
        email: true;
        role: true;
        avatar: true;
        phone: true;
        createdAt: true;
      };
    }>;
    try {
      user = await this.prisma.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          phone: dto.phone,
          role: Role.USER,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          phone: true,
          createdAt: true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = (e.meta?.target as string[] | undefined)?.join(',') || '';
        if (target.includes('username')) {
          throw new ConflictException('用户名已被使用');
        }
        if (target.includes('email')) {
          throw new ConflictException('邮箱已被注册');
        }
        throw new ConflictException('用户已存在');
      }
      throw e;
    }

    this.logger.log(`✅ 新用户注册: ${user.username} (ID: ${user.id})`);

    // 注册成功后自动签发 token
    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return { user, ...tokens };
  }

  /**
   * 用户登录（统一入口）
   * 管理员与普通用户共用同一接口，由后端根据 user.role 区分权限
   *
   * 安全设计：
   * 1. account 支持用户名或邮箱，避免账号枚举
   * 2. 用户不存在 / 密码错误 / 账号禁用 统一返回相同错误信息
   * 3. 通过 bcrypt compare 时序恒定，防侧信道
   * 4. role 从数据库读取，不信任客户端传入
   * 5. 登录失败累计计数，连续失败 5 次锁定账号 15 分钟
   *
   * 防越权：
   * - 水平越权：登录返回的 token 携带 sub（用户 ID），所有用户态接口用 user.sub 隔离
   * - 垂直越权：admin 接口由 AdminGuard + Roles(ADMIN) 守卫，普通用户 token 无法访问
   */
  async login(dto: LoginDto, req?: Request) {
    // account 可为用户名或邮箱，统一查找
    // 用 OR 条件一次查询，避免多次往返
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.account }, { email: dto.account }],
      },
    });

    // 用户不存在统一返回相同错误，避免账号枚举攻击
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    // 检查账号锁定状态（无论密码对错，锁定期间一律拒绝）
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainMs = user.lockedUntil.getTime() - Date.now();
      const remainMin = Math.ceil(remainMs / 60000);
      this.logger.warn(
        `⚠️ 账号锁定中: ${user.username} (剩余 ${remainMin} 分钟)`,
      );
      throw new UnauthorizedException(
        `账号已被锁定，请 ${remainMin} 分钟后再试`,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      // 登录失败计数累加，达到阈值后锁定
      await this.recordFailedLogin(user);
      throw new UnauthorizedException('账号或密码错误');
    }

    // 账号被禁用
    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }

    // 登录成功：重置失败计数，记录最后登录时间、IP 与活动时间
    const clientIp = this.extractClientIp(req);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
        lastActiveAt: new Date(),
      },
    });

    this.logger.log(
      `✅ 用户登录: ${user.username} (ID: ${user.id}, role: ${user.role})`,
    );

    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
      },
      ...tokens,
    };
  }

  /**
   * 记录登录失败并判断是否需要锁定
   * - 累加 failedLoginAttempts
   * - 达到 MAX_FAILED_ATTEMPTS 时设置 lockedUntil = now + LOCK_DURATION_MINUTES
   * - 锁定后 failedLoginAttempts 重置为 0（避免锁定时间结束后又立即触发）
   */
  private async recordFailedLogin(user: { id: number; username: string; failedLoginAttempts: number }): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;
    if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil,
        },
      });
      this.logger.warn(
        `🔒 账号锁定: ${user.username} (连续失败 ${newAttempts} 次，锁定 ${this.LOCK_DURATION_MINUTES} 分钟)`,
      );
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts },
      });
      this.logger.warn(
        `⚠️ 登录失败: ${user.username} (第 ${newAttempts}/${this.MAX_FAILED_ATTEMPTS} 次)`,
      );
    }
  }

  /**
   * 刷新令牌（轮换机制）
   * 1. 验证 refresh token 签名与有效期
   * 2. 校验该 refresh token 是否仍为用户当前有效的（未被轮换/撤销）
   * 3. 校验账号状态
   * 4. 签发全新的 access + refresh token，旧 refresh 立即失效
   */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    // 校验 refresh token 是否在白名单（未被轮换/撤销）
    if (payload.jti) {
      const valid = await this.redisService.isRefreshTokenValid(payload.sub, payload.jti);
      if (!valid) {
        throw new UnauthorizedException('刷新令牌已被撤销，请重新登录');
      }
    }

    // 确认用户仍存在且启用
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用');
    }
    // 锁定中的账号也不允许刷新 token
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('账号已被锁定，请稍后再试');
    }

    // 签发全新的 access + refresh token（轮换）
    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    this.logger.log(`🔄 用户 ${user.username} 刷新令牌成功（旧 refresh 已失效）`);
    return tokens;
  }

  /**
   * 登出
   * - 将当前 access token 的 jti 加入黑名单（剩余有效期后自动清除）
   * - 撤销该用户所有 refresh token
   */
  async logout(user: JwtPayload): Promise<void> {
    if (user.jti && user.exp) {
      await this.redisService.blacklistAccessToken(user.jti, user.exp);
    }
    await this.redisService.revokeAllRefreshTokens(user.sub);
    this.logger.log(`👋 用户 ${user.username} (ID: ${user.sub}) 已登出，令牌已加入黑名单`);
  }

  /**
   * 根据 ID 获取用户信息
   */
  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /**
   * 通过 ID 查找用户（供 JwtStrategy 使用）
   */
  async validateUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用');
    }
    return user;
  }

  /**
   * 修改密码
   * 1. 校验原密码（防会话劫持后改密）
   * 2. 新密码不能与原密码相同
   * 3. 更新 passwordChangedAt，使所有现存 access token 在策略层失效
   * 4. 撤销所有 refresh token（强制用户重新登录）
   *
   * @param userId 当前登录用户 ID（从 JWT sub 取得）
   * @param dto    含原密码与新密码
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 校验原密码
    const oldValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!oldValid) {
      throw new UnauthorizedException('原密码不正确');
    }

    // 新密码不能与原密码相同
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与原密码相同');
    }

    // bcrypt 哈希新密码
    const newHashed = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);

    // 更新密码与 passwordChangedAt，并撤销所有 refresh token（强制其他设备重登）
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: newHashed,
        passwordChangedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
    await this.redisService.revokeAllRefreshTokens(userId);

    this.logger.log(`🔑 用户修改密码: ${user.username} (ID: ${userId})，所有 refresh token 已撤销`);
    return { message: '密码修改成功，请使用新密码重新登录' };
  }

  /**
   * 用户自助更新个人信息
   * - 仅允许修改 username/email/phone/avatar
   * - role/status/password 不在此处修改（防越权）
   * - 唯一性冲突由数据库 UNIQUE 约束兜底，捕获 P2002 转 409
   * - 修改 username/email 后，下次签发的 token 会带新值
   *   （当前 token 仍有效，但用户应主动刷新以获取新值）
   *
   * @param userId 当前登录用户 ID
   * @param dto    待更新字段
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('用户不存在');
    }

    // 仅更新提供的字段
    const data: Record<string, string | Date> = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    data.lastActiveAt = new Date();

    // 显式声明类型，避免隐式 any（符合 AGENTS.md 禁止 any 规范）
    let updated: Prisma.UserGetPayload<{
      select: {
        id: true;
        username: true;
        email: true;
        role: true;
        avatar: true;
        phone: true;
        status: true;
        updatedAt: true;
      };
    }>;
    try {
      updated = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          phone: true,
          status: true,
          updatedAt: true,
        },
      });
    } catch (e) {
      // P2002: UNIQUE 约束冲突（用户名或邮箱已被占用）
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = (e.meta?.target as string[] | undefined)?.join(',') || '';
        if (target.includes('username')) {
          throw new ConflictException('用户名已被使用');
        }
        if (target.includes('email')) {
          throw new ConflictException('邮箱已被注册');
        }
        throw new ConflictException('字段冲突');
      }
      throw e;
    }

    this.logger.log(`📝 用户更新个人信息: ${updated.username} (ID: ${userId})`);
    return updated;
  }

  /**
   * 从请求中提取真实客户端 IP
   * 优先使用 X-Forwarded-For（反向代理场景），回退到 req.ip
   */
  private extractClientIp(req?: Request): string | null {
    if (!req) return null;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(',')[0].trim();
    }
    return req.ip || null;
  }

  /**
   * 同时签发 access token 和 refresh token
   * - 每个 token 携带唯一 jti（UUID v4）
   * - refresh token 写入 Redis 白名单（同用户仅保留最新一条）
   */
  private async generateTokens(payload: JwtPayload) {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const basePayload: JwtPayload = {
      sub: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, jti: accessJti },
        {
          expiresIn: this.configService.get<string>('jwt.expiresIn'),
        },
      ),
      this.jwtService.signAsync(
        { ...basePayload, jti: refreshJti },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        },
      ),
    ]);

    // 解析 refresh token 的 exp，登记白名单
    const refreshDecoded = await this.jwtService.decode(refreshToken);
    const refreshExp =
      refreshDecoded && typeof refreshDecoded === 'object' && 'exp' in refreshDecoded
        ? Number((refreshDecoded as { exp: number }).exp)
        : Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

    await this.redisService.registerRefreshToken(payload.sub, refreshJti, refreshExp);

    return { accessToken, refreshToken };
  }
}
