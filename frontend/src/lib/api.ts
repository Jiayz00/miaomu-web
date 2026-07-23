// API 客户端封装
// 统一处理请求头、token、错误处理、token 刷新

import { API_BASE_URL, STORAGE_KEYS } from './constants';
import type { ApiResponse } from './types';

// 自定义错误类型
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// 请求配置
interface RequestOptions extends RequestInit {
  // 是否跳过 token（公开接口）
  skipAuth?: boolean;
  // 是否以 multipart 形式发送（不设置 Content-Type）
  isFormData?: boolean;
  // 是否返回原始响应（不解析 JSON）
  rawResponse?: boolean;
}

// 从 localStorage 读取 token
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

// 刷新 token
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // 防止并发刷新
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('refresh failed');
      const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json();
      const newAccessToken = json.data.accessToken;
      const newRefreshToken = json.data.refreshToken;
      // 后端实行 refresh token 轮换，需同时更新两个 token
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }
      return newAccessToken;
    } catch {
      // 刷新失败，清除登录态
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// 核心 fetch 封装
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    skipAuth = false,
    isFormData = false,
    rawResponse = false,
    headers: customHeaders = {},
    ...rest
  } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...customHeaders,
  } as Record<string, string>;

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res = await fetch(url, {
    headers,
    ...rest,
  });

  // 401 时尝试刷新 token 重试一次
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { headers, ...rest });
    } else {
      // 刷新失败，跳转登录
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        if (!currentPath.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
      throw new ApiError('登录已过期，请重新登录', 401);
    }
  }

  // 403 权限不足：统一提示，不跳转（保留在当前页）
  if (res.status === 403) {
    throw new ApiError('权限不足，无法执行此操作', 403);
  }

  if (rawResponse) {
    return res as unknown as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // 响应非合法 JSON，降级为纯文本错误
      throw new ApiError(text.slice(0, 200) || '响应解析失败', res.status);
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && ('message' in data || 'error' in data))
        ? ((data as { message?: string; error?: string }).message ||
           (data as { error?: string }).error ||
           `请求失败 (${res.status})`)
        : `请求失败 (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

// 便捷方法
export const api = {
  get<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },
  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? (isFormData(body) ? body : JSON.stringify(body)) : undefined,
      isFormData: isFormData(body),
    });
  },
  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

// 判断是否为 FormData
function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export default api;
