// 收藏 Hook
// 封装收藏 API，提供查询、添加、取消收藏能力

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Bonsai } from '@/lib/types';

// 收藏列表
export function useFavorites() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Bonsai[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await api.get<{ data: Bonsai[] }>('/favorites');
      return res.data;
    },
    enabled: isAuthenticated,
  });
}

// 检查单个盆景是否已收藏
export function useFavoriteCheck(bonsaiId: number | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<boolean>({
    queryKey: ['favorite-check', bonsaiId],
    queryFn: async () => {
      if (!bonsaiId) return false;
      const res = await api.get<{ data: { favorited: boolean } }>(
        `/favorites/check/${bonsaiId}`
      );
      return res.data.favorited;
    },
    enabled: isAuthenticated && !!bonsaiId,
  });
}

// 切换收藏状态
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bonsaiId,
      favorited,
    }: {
      bonsaiId: number;
      favorited: boolean;
    }) => {
      if (favorited) {
        await api.delete(`/favorites/${bonsaiId}`);
        return { favorited: false };
      }
      const res = await api.post<{ data: { favorited: boolean } }>(
        `/favorites/${bonsaiId}`
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      // 更新检查缓存
      queryClient.setQueryData(['favorite-check', variables.bonsaiId], !variables.favorited);
      // 失效收藏列表
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
