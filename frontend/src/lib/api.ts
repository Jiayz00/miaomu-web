// API 客户端封装
// 统一处理请求头、token、错误处理、token 刷新
//
// 稳定性设计：
// - 主动刷新：每次请求前检查 access token 是否即将过期（提前 60s），主动刷新
// - 并发保护：refreshPromise 单例，多个并发请求只触发一次刷新
// - 状态同步：刷新成功后同时更新 access + refresh token，并触发 auth-store 同步
// - 优雅降级：刷新失败时清除登录态并通过事件通知 UI 层跳转登录
// - 防抖：避免短时间内重复 401 跳转登录页造成抖动

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

// 解析 JWT payload（不验证签名，仅读取 exp）
function getTokenExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url -> base64 -> JSON
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

// 通知 UI 层登录态失效（auth-store 监听此事件以同步状态）
function notifyAuthExpired(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  // 触发自定义事件，auth-store 监听后同步内存状态
  window.dispatchEvent(new CustomEvent('penjing:auth-expired'));
}

// 刷新 token（并发保护）
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // 防止并发刷新
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    notifyAuthExpired();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      // 401/403：refresh token 确实无效（过期/被撤销/被轮换），必须登出
      if (res.status === 401 || res.status === 403) {
        notifyAuthExpired();
        return null;
      }

      // 5xx 或其他错误：可能是后端瞬时故障，不清除登录态，避免误登出
      // 返回 null 让调用方走 401 重试或正常错误流程
      if (!res.ok) {
        return null;
      }

      const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json();
      const newAccessToken = json.data.accessToken;
      const newRefreshToken = json.data.refreshToken;
      // 后端实行 refresh token 轮换，需同时更新两个 token
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }
      // 通知 UI 层 token 已更新
      window.dispatchEvent(
        new CustomEvent('penjing:token-refreshed', {
          detail: { accessToken: newAccessToken, refreshToken: newRefreshToken },
        }),
      );
      return newAccessToken;
    } catch {
      // 网络错误（断网/DNS/超时）：不清除登录态，避免网络抖动导致误登出
      // 返回 null，调用方可选择继续用旧 token 或提示网络异常
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// 主动刷新：检查 access token 是否即将过期（提前 60s）
async function ensureFreshAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;

  const exp = getTokenExp(token);
  if (!exp) return token; // 无法解析 exp，按原样使用

  const nowSec = Math.floor(Date.now() / 1000);
  const remainSec = exp - nowSec;
  // 提前 60s 主动刷新，避免请求到达后端时正好过期
  if (remainSec > 60) return token;

  // 即将过期，主动刷新
  const newToken = await refreshAccessToken();
  // 刷新失败时（瞬时故障/网络错误），回退到旧 token：
  // - 旧 token 可能还有几秒有效期，能撑过这次请求
  // - 即使过期，后端会返回 401，由 401 重试逻辑处理
  // 避免因刷新瞬时失败而直接放弃，导致用户体验抖动
  return newToken ?? token;
}

// 跳转登录页（防抖：5 秒内只跳转一次，避免抖动）
let lastRedirectTime = 0;
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastRedirectTime < 5000) return; // 5 秒内已跳转过，跳过
  lastRedirectTime = now;

  const currentPath = window.location.pathname + window.location.search;
  if (!currentPath.startsWith('/login')) {
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  }
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

  let accessToken: string | null = null;
  if (!skipAuth) {
    // 主动检查 token 是否即将过期，提前刷新
    accessToken = await ensureFreshAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
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
      // 区分两种失败场景：
      // 1) refresh token 确实无效（已被清除）→ 跳转登录
      // 2) 网络/服务瞬时故障（token 仍在）→ 不跳转，抛出错误让调用方处理
      const stillHasRefreshToken = getRefreshToken() !== null;
      if (!stillHasRefreshToken) {
        redirectToLogin();
        throw new ApiError('登录已过期，请重新登录', 401);
      }
      // 瞬时故障：抛出 401 但不跳转，避免误登出
      throw new ApiError('认证暂时失败，请稍后重试', 401);
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
