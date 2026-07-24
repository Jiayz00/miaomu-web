/**
 * Jest 单元测试配置
 *
 * 覆盖范围：src/ 下所有 *.spec.ts
 * 排除：e2e 测试（由 test/jest-e2e.json 单独配置）
 *
 * 设计：
 * - preset: ts-jest（TypeScript 直接执行，无需预编译）
 * - NODE_ENV=test：触发 configuration.ts 中短密钥豁免，避免启动期校验失败
 * - setupFilesAfterEnv：加载全局 mock 工具与 jest.setup
 * - moduleNameMapper：@/* 别名与 src 保持一致
 * - coverage：仅统计 src/modules 与 src/common 业务代码，排除配置/入口/Prisma 生成代码
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: [
    'src/modules/**/*.service.ts',
    'src/modules/**/*.controller.ts',
    'src/common/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov'],
  verbose: false,
};
