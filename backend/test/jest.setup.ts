/**
 * Jest 全局 setup
 * - 在所有测试前执行
 * - 设置 NODE_ENV=test，触发 configuration.ts 短密钥豁免
 * - 设置测试用环境变量（JWT 密钥、Redis URL、DATABASE_URL 等占位符）
 * - 这些变量仅用于满足配置加载，实际 IO 由 mock 接管
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-bytes-long-padding';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-32-bytes-long';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UPLOAD_DIR = './uploads-test';
process.env.ADMIN_DEFAULT_PASSWORD = 'TestAdmin123';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '4001';

// 静默 NestJS Logger 输出，减少测试噪音
// 如需调试，临时注释此行
const { Logger } = require('@nestjs/common');
Logger.overrideLogger(false);
