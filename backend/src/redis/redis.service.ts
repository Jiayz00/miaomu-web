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
    this.client = createClient({
      url: this.url,
      // 显式配置重连策略：指数退避，最长 5 秒重试一次
      // Redis 断连后自动重连，避免服务永久不可用
      socket: {
        reconnectStrategy: (retries: number) => {
          const delay = Math.min(retries * 100, 5000);
          this.logger.warn(`🔄 Redis 重连中（第 ${retries + 1} 次，${delay}ms 后重试）`);
          return delay;
        },
        connectTimeout: 10_000,
      },
    }) as RedisClientType;

    this.client.on('error', (err: unknown) => {
      this.logger.error(`Redis 连接异常: ${err instanceof Error ? err.message : String(err)}`);
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis 连接已建立');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('🔄 Redis 尝试重连...');
    });

    this.client.on('ready', () => {
      this.logger.log('✅ Redis 就绪');
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
   *
   * 健壮性设计（fail-open）：
   * Redis 不可用时返回 false（放行），避免 Redis 故障导致所有用户被踢出登录。
   * 安全权衡：放行已在黑名单的 token（登出后的旧 token）只是让其继续有效至自然过期
   * （access token 通常 15 分钟），危害远小于全站用户被踢出。
   * Redis 恢复后黑名单立即恢复精确校验。
   */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      if (!this.client?.isOpen) return false;
      const value = await this.client.get(`blacklist:access:${jti}`);
      return value === '1';
    } catch (err) {
      this.logger.warn(
        `⚠️ Redis 黑名单查询失败，fail-open 放行: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
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
   *
   * 健壮性设计（fail-closed）：
   * Redis 不可用时返回 false（拒绝刷新），用户需重新登录。
   * 安全权衡：refresh token 失效会强制用户重登，但不会让已被撤销的 token 复活，
   * 安全性优先于可用性。Redis 恢复后自动恢复。
   */
  async isRefreshTokenValid(userId: number, jti: string): Promise<boolean> {
    try {
      if (!this.client?.isOpen) return false;
      const stored = await this.client.hGet(`refresh:valid:${userId}`, 'jti');
      return stored === jti;
    } catch (err) {
      this.logger.warn(
        `⚠️ Redis refresh 校验失败，fail-closed 拒绝: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /**
   * 主动撤销用户所有 refresh token（改密/禁用时调用）
   */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.client.del(`refresh:valid:${userId}`);
  }

  /**
   * PING 命令（用于健康检查）
   * 返回 'PONG' 表示 Redis 可达
   */
  async ping(): Promise<string> {
    if (!this.client?.isOpen) {
      throw new Error('Redis 客户端未连接');
    }
    return this.client.ping();
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
