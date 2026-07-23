import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../../redis/redis.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

/**
 * JWT Passport 策略
 * 从 Authorization Bearer Token 解析用户身份
 * - 校验 token 是否在登出黑名单
 * - 校验账号当前状态（被禁用立即失效）
 * - 校验 role 是否为合法枚举值
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  /**
   * Passport 自动调用：验证 token 后，将返回值挂载到 request.user
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // 1) 校验 role 合法性，防止伪造
    if (!Object.values(Role).includes(payload.role)) {
      throw new UnauthorizedException('令牌角色非法');
    }

    // 2) 校验 access token 是否已被加入黑名单（登出）
    if (payload.jti) {
      const blacklisted = await this.redisService.isAccessTokenBlacklisted(payload.jti);
      if (blacklisted) {
        throw new UnauthorizedException('令牌已失效，请重新登录');
      }
    }

    // 3) 查询用户当前状态：被禁用的账号即使 token 未过期也立即失效
    //    findById 抛 NotFoundException，在认证上下文中应转为 401
    let user;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException('用户不存在或令牌无效');
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 返回精简的用户信息供后续守卫使用
    return {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      jti: payload.jti,
    };
  }
}
