import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * 请求日志拦截器
 * 记录每个请求的方法、路径、状态码、耗时、requestId
 *
 * 结构化日志（便于 ELK / Loki 等日志聚合系统检索）：
 * - requestId: 全链路追踪 ID（由 RequestIdMiddleware 注入）
 * - method / path / status / duration: 标准请求字段
 * - ip: 末段掩码（PII 保护）
 *
 * PII 保护：对 IP 做末段掩码（如 1.2.3.4 -> 1.2.3.x），不记录 UA 完整字符串
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * IPv4 掩码：保留前三段，末段替换为 x
   * IPv6 掩码：保留前两组
   */
  private maskIp(ip: string): string {
    if (!ip) return '-';
    // IPv4
    const ipv4Match = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}$/);
    if (ipv4Match) return `${ipv4Match[1]}x`;
    // IPv6（简略处理）
    if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + '::x';
    return 'x.x.x.x';
  }

  /**
   * 从 req 上取 requestId（由 RequestIdMiddleware 注入）
   * 兜底：若中间件未执行（如直接命中静态资源），返回 '-'
   */
  private getRequestId(req: Request): string {
    const requestId = (req as unknown as { requestId?: string }).requestId;
    return requestId || '-';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl, ip } = request;
    const maskedIp = this.maskIp(ip || '');
    const requestId = this.getRequestId(request);
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const { statusCode } = response;
        const elapsed = Date.now() - now;
        // 结构化输出：rid=xxx 是关键追踪字段，便于日志聚合系统按请求聚合
        this.logger.log(
          `rid=${requestId} ${method} ${originalUrl} ${statusCode} ${elapsed}ms - ${maskedIp}`,
        );
      }),
    );
  }
}
