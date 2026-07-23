// 认证状态管理 - Zustand
// 持久化到 localStorage
//
// 稳定性设计：
// - 监听 api.ts 派发的 'penjing:token-refreshed' 事件，同步刷新后的 token 到内存
// - 监听 'penjing:auth-expired' 事件，立即清空内存登录态（避免 UI 残留）
// - persist 中间件保证页面刷新后状态恢复

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
  // 更新 token（同时更新 access + refresh，适配后端轮换）
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  // 更新用户信息
  updateUser: (user: Partial<User>) => void;
  // 登出
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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

      updateTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          if (refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          }
        }
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        }));
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

// 在浏览器端监听 api.ts 派发的事件，同步内存状态
// 使用 setTimeout 确保 store 已初始化（避免 SSR 阶段执行）
if (typeof window !== 'undefined') {
  // token 刷新成功：同步新 token 到内存
  window.addEventListener('penjing:token-refreshed', (event) => {
    const detail = (event as CustomEvent).detail as {
      accessToken: string;
      refreshToken?: string;
    };
    if (detail?.accessToken) {
      useAuthStore.getState().updateTokens(detail.accessToken, detail.refreshToken);
    }
  });

  // 登录态失效：立即清空内存状态（避免 UI 显示已登录但实际未登录）
  window.addEventListener('penjing:auth-expired', () => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      state.logout();
    }
  });

  // 跨标签页同步：当其他标签页登出时，当前标签页也同步登出
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.ACCESS_TOKEN && !event.newValue) {
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        state.logout();
      }
    }
  });
}
