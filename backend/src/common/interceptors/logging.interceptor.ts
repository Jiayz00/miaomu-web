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
 * 记录每个请求的方法、路径、状态码、耗时
 *
 * PII 保护：对 IP 做末段掩码（如 1.2.3.4 -> 1.2.3.x），对 UA 仅记录类型而非完整字符串
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl, ip } = request;
    const maskedIp = this.maskIp(ip || '');
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const { statusCode } = response;
        const elapsed = Date.now() - now;
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} ${elapsed}ms - ${maskedIp}`,
        );
      }),
    );
  }
}
