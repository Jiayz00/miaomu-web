/**
 * 文件上传相关常量
 *
 * 设计原则：单一数据源（Single Source of Truth）
 * - Controller 与 Service 共享同一常量，避免 5MB 硬编码散落多处
 * - 若需通过环境变量调整，应在 configuration.ts 读取后注入 UploadService，
 *   Controller 装饰器因 multer 在类装饰阶段执行，无法读取运行时配置，
 *   故保留为模块常量作为上限保护（Service 内仍会读取 ConfigService 做精确校验）
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 单次批量上传最大文件数
 */
export const MAX_FILES_PER_REQUEST = 10;
