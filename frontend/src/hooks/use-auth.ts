// 认证 Hook
// 封装 auth-store + API 调用，提供完整的登录/注册/登出流程

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
  const login = useCallback(
    async (params: LoginParams): Promise<User> => {
      const res = await api.post<AuthResponse>('/auth/login', params, {
        skipAuth: true,
      });
      setAuth(res);
      return res.user;
    },
    [setAuth]
  );

  // 注册
  const register = useCallback(
    async (params: RegisterParams): Promise<User> => {
      const res = await api.post<AuthResponse>('/auth/register', params, {
        skipAuth: true,
      });
      setAuth(res);
      return res.user;
    },
    [setAuth]
  );

  // 登出
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // 忽略登出接口错误
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
    updateUser,
  };
}
