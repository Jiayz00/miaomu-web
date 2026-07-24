// 认证 Hook
// 封装 auth-store + API 调用，提供完整的登录/注册/登出/改密/更新信息流程

'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { resetSocket } from '@/lib/socket';
import type { AuthResponse, User } from '@/lib/types';

interface LoginParams {
  account: string;
  password: string;
}

interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
}

interface UpdateProfileParams {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export function useAuth() {
  const {
    user,
    accessToken,
    isAuthenticated,
    setAuth,
    logout: storeLogout,
    updateUser,
  } = useAuthStore();

  // 登录
  // 后端 TransformInterceptor 会将响应包装为 { success, data, message }
  // 因此类型断言为 { data: AuthResponse }，解构 res.data 取实际 payload
  const login = useCallback(
    async (params: LoginParams): Promise<User> => {
      const res = await api.post<{ data: AuthResponse }>('/auth/login', params, {
        skipAuth: true,
      });
      const payload = res.data;
      setAuth(payload);
      return payload.user;
    },
    [setAuth]
  );

  // 注册
  const register = useCallback(
    async (params: RegisterParams): Promise<User> => {
      const res = await api.post<{ data: AuthResponse }>('/auth/register', params, {
        skipAuth: true,
      });
      const payload = res.data;
      setAuth(payload);
      return payload.user;
    },
    [setAuth]
  );

  // 登出
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // 忽略登出接口错误（如 token 已过期）
    }
    resetSocket();
    storeLogout();
  }, [storeLogout]);

  // 获取当前用户信息（刷新页面后同步）
  const fetchProfile = useCallback(async (): Promise<User | null> => {
    if (!accessToken) return null;
    try {
      const res = await api.get<{ data: User }>('/auth/profile');
      updateUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [accessToken, updateUser]);

  // 修改密码：需原密码，改密后后端撤销所有 refresh token，前端强制登出
  const changePassword = useCallback(
    async (params: ChangePasswordParams): Promise<{ message: string }> => {
      const res = await api.post<{ data: { message: string } }>(
        '/auth/change-password',
        params
      );
      // 改密成功后，后端已撤销所有 refresh token，前端必须强制登出
      resetSocket();
      storeLogout();
      return res.data ?? res;
    },
    [storeLogout]
  );

  // 更新个人信息：仅允许 username/email/phone/avatar
  const updateProfile = useCallback(
    async (params: UpdateProfileParams): Promise<User> => {
      const res = await api.patch<{ data: User }>('/auth/profile', params);
      const updated = res.data ?? res;
      updateUser(updated);
      return updated;
    },
    [updateUser]
  );

  // 是否为管理员
  const isAdmin = user?.role === 'ADMIN';

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    fetchProfile,
    changePassword,
    updateProfile,
    updateUser,
  };
}
