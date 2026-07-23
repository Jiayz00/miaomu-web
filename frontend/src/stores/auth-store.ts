// 认证状态管理 - Zustand
// 持久化到 localStorage

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  // 设置登录态
  setAuth: (payload: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  // 更新 token
  updateToken: (accessToken: string) => void;
  // 更新用户信息
  updateUser: (user: Partial<User>) => void;
  // 登出
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: ({ user, accessToken, refreshToken }) => {
        // 同步写入 localStorage（供 api.ts 读取）
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateToken: (accessToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        }
        set({ accessToken });
      },

      updateUser: (partial) =>
        set((state) => {
          if (!state.user) return state;
          const user = { ...state.user, ...partial };
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          }
          return { user };
        }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'penjing-auth',
      // 只持久化必要字段
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
