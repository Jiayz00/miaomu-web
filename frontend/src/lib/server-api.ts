// 服务端 fetch 辅助（仅用于 Server Component / Server Actions）
// 与客户端 lib/api.ts 隔离，避免在 Node.js SSR 阶段引用 localStorage/window

import { getApiBaseUrl } from './constants';

const DEFAULT_TIMEOUT = 10000;

export class ServerApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ServerApiError';
    this.status = status;
    this.data = data;
  }
}

interface ServerFetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * 服务端统一 fetch 封装
 * - 自动拼接绝对 Base URL（BACKEND_URL / NEXT_PUBLIC_API_URL / localhost 回退）
 * - 默认 10s 超时
 * - 统一 JSON 解析与错误包装
 */
export async function serverFetch<T>(
  endpoint: string,
  options: ServerFetchOptions = {}
): Promise<T> {
  const base = getApiBaseUrl();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const { timeout = DEFAULT_TIMEOUT, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ServerApiError(
          text.slice(0, 200) || '响应解析失败',
          res.status
        );
      }
    }

    if (!res.ok) {
      const message =
        data && typeof data === 'object' && ('message' in data || 'error' in data)
          ? ((data as { message?: string; error?: string }).message ||
              (data as { error?: string }).error ||
              `请求失败 (${res.status})`)
          : `请求失败 (${res.status})`;
      throw new ServerApiError(message, res.status, data);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ServerApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ServerApiError('请求超时，请稍后重试', 408);
    }
    throw new ServerApiError('网络连接失败，请检查网络后重试', 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const serverApi = {
  get<T>(endpoint: string, options?: ServerFetchOptions) {
    return serverFetch<T>(endpoint, { ...options, method: 'GET' });
  },
  post<T>(endpoint: string, body?: unknown, options?: ServerFetchOptions) {
    return serverFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};
