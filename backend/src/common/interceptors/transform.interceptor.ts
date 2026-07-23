import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';

/**
 * 响应拦截器元数据 Key
 * 用于标记接口跳过统一响应包装（如文件下载）
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * 统一成功响应拦截器
 * 包装返回数据为 { success: true, data, message }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    // 检查是否需要跳过响应包装
    const skipTransform = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data) => {
        // 跳过包装：直接返回原始数据
        if (skipTransform) {
          return data;
        }

        // 已经是统一格式则不重复包装
        if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
          return data;
        }

        return {
          success: true,
          data,
          message: '请求成功',
        };
      }),
    );
  }
}
