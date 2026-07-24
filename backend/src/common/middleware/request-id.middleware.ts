import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * 请求 ID 注入中间件
 *
 * 设计：
 * - 优先使用上游（Nginx）透传的 X-Request-Id
 * - 上游未提供时本地生成 UUID v4
 * - 同一回写响应头，便于客户端日志关联
 * - 挂载到 req.requestId，供下游日志拦截器、异常过滤器统一引用
 *
 * 可观测性：
 * - 全链路唯一 ID：Nginx -> 后端 -> 数据库慢查询 -> 出站日志
 * - 便于在 ELK / Loki / CloudWatch 中聚合同一请求的所有日志
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly HEADER = 'x-request-id';

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(this.HEADER);
    // 仅接受合法的 UUID 或 16-128 位字母数字字符（防注入）
    const isValid =
      incoming &&
      /^[a-fA-F0-9-]{16,128}$/.test(incoming) &&
      incoming.length <= 128;

    const requestId = isValid ? (incoming as string) : randomUUID();

    // 挂载到 req 上，供下游使用
    // Express 类型未声明 requestId，使用类型断言
    (req as unknown as { requestId: string }).requestId = requestId;

    // 回写响应头，便于客户端关联
    res.setHeader(this.HEADER, requestId);

    next();
  }
}
