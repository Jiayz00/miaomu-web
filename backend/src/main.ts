import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

/**
 * 应用入口
 *
 * 安全设计：
 * - Helmet 全局安全头
 * - CORS 白名单（来自环境变量）
 * - 全局 ValidationPipe（whitelist + forbidNonWhitelisted + transform）
 * - 生产环境关闭 Swagger，避免 API 结构泄露
 * - 信任反向代理（Nginx），从 X-Forwarded-For 取真实 IP 用于限流
 *
 * 可观测性设计：
 * - RequestIdMiddleware：注入 X-Request-Id（优先透传上游），全链路追踪
 * - 日志拦截器/异常过滤器均输出 requestId，便于按请求聚合日志
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const corsOrigin = configService.get<string>('cors.origin') || 'http://localhost:3000';
  const uploadDir = configService.get<string>('upload.dir') || './uploads';
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const isProduction = nodeEnv === 'production';

  // 0. 信任反向代理，使 req.ip 取真实客户端 IP（限流准确）
  // Nginx 通过 X-Forwarded-For 透传，仅信任第一跳
  app.set('trust proxy', 1);

  // 1. 安全头部（生产环境收紧 CORP）
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: isProduction ? 'same-origin' : 'cross-origin' },
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              // 允许播放同源上传的视频
              mediaSrc: ["'self'", 'blob:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameSrc: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // 2. CORS 配置（白名单 + 仅 JSON API 所需方法）
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: false, // 使用 Bearer Token，无需 Cookie，关闭以缩小 CSRF 攻击面
  });

  // 3. cookie 解析（保留以备未来使用，当前认证基于 Authorization 头）
  app.use(cookieParser());

  // 4. Request ID 中间件（必须最早执行，为后续日志/异常提供追踪 ID）
  //    优先使用上游 Nginx 透传的 X-Request-Id，否则本地生成 UUID
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(
    (req: Request, res: Response, next: NextFunction) =>
      requestIdMiddleware.use(req, res, next),
  );

  // 5. 全局 ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离未定义的属性
      transform: true, // 自动类型转换
      forbidNonWhitelisted: true, // 包含未定义属性时抛错
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 6. 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 7. WebSocket 适配器
  app.useWebSocketAdapter(new IoAdapter(app));

  // 8. 静态文件服务：/uploads 映射到上传目录
  const absUploadDir = path.resolve(uploadDir);
  if (!fs.existsSync(absUploadDir)) {
    fs.mkdirSync(absUploadDir, { recursive: true, mode: 0o750 });
  }
  app.useStaticAssets(absUploadDir, { prefix: '/uploads/' });

  // 9. 全局 API 版本前缀
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/uploads', 'health'], // 静态文件与健康检查不添加前缀
  });

  // 10. Swagger 文档（仅非生产环境开放，生产环境关闭以避免 API 结构泄露）
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('盆景艺术展示平台 API')
      .setDescription('Penjing Bonsai Platform - 后端 API 接口文档')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          name: 'Authorization',
        },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`📚 Swagger 文档: http://localhost:${port}/api/docs`);
  } else {
    logger.warn('🔒 生产环境已关闭 Swagger 文档');
  }

  // 11. 启用优雅关闭
  // SIGTERM/SIGINT 时触发 onModuleDestroy，让 Prisma/Redis 正常断开连接
  // 避免容器停止时未提交事务丢失、连接残留
  app.enableShutdownHooks();

  // 12. 启动监听
  await app.listen(port);
  logger.log(`🚀 应用已启动: http://localhost:${port}`);
  logger.log(`🔐 API 前缀: /${apiPrefix}`);
  logger.log(`📁 静态文件目录: ${absUploadDir}`);
  logger.log(`🌐 运行环境: ${nodeEnv}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
