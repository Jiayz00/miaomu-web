import {
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
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

/**
 * 认证服务
 * 处理注册、登录、刷新令牌、登出、用户验证
 *
 * 安全设计：
 * - bcrypt 12 轮哈希
 * - access token 携带 jti，登出加入 Redis 黑名单
 * - refresh token 一次性轮换：刷新时签发新 refresh，旧 refresh 立即失效
 * - 用户禁用后 token 即时失效（在 JwtStrategy.validate 中校验）
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS: number;

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
   * 1. 检查用户名/邮箱唯一性
   * 2. bcrypt 哈希密码
   * 3. 创建用户
   * 4. 签发带 jti 的 access + refresh token，登记 refresh 白名单
   */
  async register(dto: RegisterDto) {
    // 检查用户名是否已存在
    const existUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });
    if (existUsername) {
      throw new ConflictException('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    // bcrypt 哈希密码
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // 创建用户
    const user = await this.prisma.user.create({
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
   *
   * 防越权：
   * - 水平越权：登录返回的 token 携带 sub（用户 ID），所有用户态接口用 user.sub 隔离
   * - 垂直越权：admin 接口由 AdminGuard + Roles(ADMIN) 守卫，普通用户 token 无法访问
   */
  async login(dto: LoginDto) {
    // account 可为用户名或邮箱，统一查找
    // 用 OR 条件一次查询，避免多次往返
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.account }, { email: dto.account }],
      },
    });

    // 用户不存在或密码错误统一返回，避免账号枚举攻击
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('账号或密码错误');
    }

    // 账号被禁用
    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }

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
