/**
 * 文件上传相关常量
 *
 * 设计原则：单一数据源（Single Source of Truth）
 * - Controller 与 Service 共享同一常量，避免魔法数字散落多处
 * - 若需通过环境变量调整，应在 configuration.ts 读取后注入 UploadService，
 *   Controller 装饰器因 multer 在类装饰阶段执行，无法读取运行时配置，
 *   故保留为模块常量作为上限保护（Service 内仍会读取 ConfigService 做精确校验）
 *
 * 业务要求：
 * - 图片：单张 30MB 上限，不限制上传数量
 * - 视频：单个 1GB 上限，不限制上传数量
 */
export const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB（单张图片）

/**
 * 视频文件大小上限：1GB
 * 视频体积远大于图片，需独立限制
 */
export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB（单个视频）

/**
 * 单次批量上传最大文件数
 * 业务需求：不限制上传数量，这里设置为较大值（1000）作为上限保护，
 * 防止恶意请求同时上传过多文件导致 OOM
 */
export const MAX_FILES_PER_REQUEST = 1000;
