import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

/**
 * Redis 服务
 * - 管理 JWT access token 黑名单（登出后短期失效）
 * - 管理 refresh token 白名单（轮换 + 一次性使用）
 * - 提供通用 KV / 计数能力供其他模块复用
 *
 * 所有 key 均带业务前缀，避免冲突：
 *   blacklist:access:<jti>      登出后的 access token 黑名单，TTL = token 剩余有效期
 *   refresh:valid:<userId>:<jti> 用户当前有效的 refresh token，TTL = refresh 有效期
 */
@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('redis.url') || 'redis://localhost:6379';
  }

  async onModuleInit(): Promise<void> {
    this.client = createClient({ url: this.url }) as RedisClientType;

    this.client.on('error', (err: unknown) => {
      this.logger.error(`Redis 连接异常: ${err instanceof Error ? err.message : String(err)}`);
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis 连接已建立');
    });

    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.logger.log('✅ Redis 连接已断开');
    }
  }

  /**
   * 将 access token 加入黑名单（登出时调用）
   * @param jti        token id
   * @param exp        token 过期时间戳（秒）
   */
  async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(exp - now, 1); // 至少存活 1 秒，避免负 TTL 报错
    await this.client.set(`blacklist:access:${jti}`, '1', { EX: ttl });
  }

  /**
   * 检查 access token 是否在黑名单
   */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const value = await this.client.get(`blacklist:access:${jti}`);
    return value === '1';
  }

  /**
   * 登记用户当前有效的 refresh token（登录/刷新时调用）
   * 同一用户仅保留最新一条，旧的自动失效
   *
   * 原子性保证：使用 MULTI/EXEC pipeline 一次性执行 del + hSet + expire，
   * 避免中途崩溃导致无 TTL 的 key 永驻 Redis
   *
   * @param userId
   * @param jti        refresh token id
   * @param exp        过期时间戳（秒）
   */
  async registerRefreshToken(userId: number, jti: string, exp: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(exp - now, 1);
    const key = `refresh:valid:${userId}`;

    // 使用 pipeline 保证原子性（del + hSet + expire 一起执行）
    await this.client.multi()
      .del(key)
      .hSet(key, { jti })
      .expire(key, ttl)
      .exec();
  }

  /**
   * 校验 refresh token 是否为用户当前有效的那一条
   * 返回 true 表示有效，false 表示已被轮换/失效
   */
  async isRefreshTokenValid(userId: number, jti: string): Promise<boolean> {
    const stored = await this.client.hGet(`refresh:valid:${userId}`, 'jti');
    return stored === jti;
  }

  /**
   * 主动撤销用户所有 refresh token（改密/禁用时调用）
   */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.client.del(`refresh:valid:${userId}`);
  }

  /**
   * 通用 SET（带可选 TTL，秒）
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * 通用 GET
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * 通用 DEL
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * 原子自增（用于计数器/限流）
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * 为 key 设置过期时间（秒）
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.client.expire(key, ttlSeconds);
  }
}
