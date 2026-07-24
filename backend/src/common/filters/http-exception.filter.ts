import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * 全局异常过滤器
 * 统一错误响应格式：{ statusCode, message, error, timestamp, path, requestId }
 *
 * 可观测性：
 * - 错误日志含 requestId，便于按请求聚合全链路日志
 * - 响应体含 requestId，客户端可在反馈问题时提供该 ID 加速定位
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // requestId 由 RequestIdMiddleware 注入，兜底 '-'
    const requestId =
      (request as unknown as { requestId?: string }).requestId || '-';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string | string[] | undefined)
          ? Array.isArray(r.message)
            ? r.message.join('; ')
            : (r.message as string)
          : (r.error as string) || message;
        error = (r.error as string) || error;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // 处理 Prisma 已知错误
      switch (exception.code) {
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          message = '数据唯一性冲突';
          error = 'Conflict';
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = '记录不存在';
          error = 'Not Found';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          message = `数据库错误: ${exception.code}`;
          error = 'Bad Request';
      }
    } else if (exception instanceof Error) {
      // 非 HttpException / 非 Prisma 错误：不向客户端泄露内部细节
      // 仅在服务端日志记录真实 message 与 stack（含 requestId 便于追踪）
      this.logger.error(
        `rid=${requestId} 未处理异常: ${exception.message}`,
        exception.stack,
      );
      // message 保持默认"服务器内部错误"
    } else {
      this.logger.error(`rid=${requestId} 未知异常`, String(exception));
    }

    // 记录错误日志（非 4xx 错误）
    if (statusCode >= 500) {
      this.logger.error(
        `rid=${requestId} ${request.method} ${request.url} ${statusCode} - ${message}`,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    });
  }
}
