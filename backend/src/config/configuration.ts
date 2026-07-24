import * as dotenv from 'dotenv';

// 加载 .env 文件，确保环境变量在配置工厂中可用
dotenv.config();

/**
 * 安全校验：生产环境下强制要求关键密钥已显式注入
 * - 缺失或长度 < 32 字节直接终止启动
 */
function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    // 仅在非测试环境下抛错，便于单测使用短密钥
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        `[CONFIG] 环境变量 ${name} 未设置或长度不足 32 字节。` +
          `请使用 \`openssl rand -hex 32\` 生成强随机密钥后通过环境变量注入。`,
      );
    }
  }
  return value || '';
}

/**
 * 校验数据库连接字符串
 *
 * 设计原则：Fail-Fast
 * DATABASE_URL 是 Prisma 连接的前置依赖，缺失会导致 onModuleInit 阶段
 * 抛出难以定位的连接错误。启动期显式校验，给出清晰的失败原因。
 * - 测试环境允许空（单测通常 mock PrismaService）
 * - 生产/开发环境缺失或非 mysql:// 协议直接终止启动
 */
function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      return '';
    }
    throw new Error(
      '[CONFIG] 环境变量 DATABASE_URL 未设置。请通过 .env 文件或环境变量注入 ' +
        'MySQL 连接字符串（如 mysql://user:pass@host:port/dbname）。',
    );
  }
  if (!value.startsWith('mysql://')) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        '[CONFIG] DATABASE_URL 必须是 mysql:// 开头的 MySQL 连接字符串。',
      );
    }
  }
  return value;
}

/**
 * 校验管理员默认密码复杂度（首次部署用）
 */
function validateAdminPassword(): string {
  const value = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[CONFIG] 生产环境必须通过 ADMIN_DEFAULT_PASSWORD 显式注入管理员初始密码。',
      );
    }
    return 'admin123456'; // 仅开发环境兜底
  }
  // 复杂度：>= 10 位且同时包含字母与数字
  if (value.length < 10 || !/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[CONFIG] ADMIN_DEFAULT_PASSWORD 复杂度不足：至少 10 位且同时包含字母与数字。',
      );
    }
  }
  return value;
}

/**
 * 应用配置工厂函数
 * 从环境变量读取所有配置项
 *
 * 注意：JWT 密钥不提供兜底默认值，缺失或过弱将直接抛错终止启动
 */
export default () => {
  // 启动期校验关键密钥与连接串
  const jwtSecret = requireSecret('JWT_SECRET');
  const jwtRefreshSecret = requireSecret('JWT_REFRESH_SECRET');
  const adminDefaultPassword = validateAdminPassword();
  const databaseUrl = requireDatabaseUrl();

  return {
    // 服务配置
    port: parseInt(process.env.PORT || '4000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    nodeEnv: process.env.NODE_ENV || 'development',

    // 数据库配置
    database: {
      url: databaseUrl,
    },

    // Redis 配置
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    // JWT 配置（密钥强制注入，无默认值）
    jwt: {
      secret: jwtSecret,
      refreshSecret: jwtRefreshSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // CORS 配置
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },

    // 文件上传配置
    upload: {
      dir: process.env.UPLOAD_DIR || './uploads',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },

    // 管理员默认密码（首次启动时使用，强校验）
    adminDefaultPassword,

    // 管理员联系邮箱
    adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  };
};
