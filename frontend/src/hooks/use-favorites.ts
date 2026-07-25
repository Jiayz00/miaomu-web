// 收藏 Hook
// 封装收藏 API，提供查询、添加、取消收藏能力
//
// 性能优化：
// - useFavoriteMap：批量查询收藏状态，解决列表页 N+1 问题
//   原 useFavoriteCheck 每个卡片一个请求，列表 12 卡 = 12 个并发请求
//   改为批量后，整个列表只需 1 个请求

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Bonsai } from '@/lib/types';

// 收藏列表（分页）
// 后端返回 { list: { bonsai: Bonsai }[], total, page, pageSize, totalPages }
// 提取 list 并映射为 Bonsai[] 供页面使用
export function useFavorites() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Bonsai[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await api.get<{ data: { list: { bonsai: Bonsai }[]; total: number } }>(
        '/favorites'
      );
      return res.data.list.map((item) => item.bonsai);
    },
    enabled: isAuthenticated,
  });
}

/**
 * 批量查询收藏状态（列表页推荐使用）
 *
 * 用法：
 *   const ids = bonsais.map(b => b.id);
 *   const { data: favoriteMap } = useFavoriteMap(ids);
 *   const isFavorited = favoriteMap?.[bonsai.id] ?? false;
 *
 * 整个列表只发 1 个请求，避免 N+1
 */
export function useFavoriteMap(bonsaiIds: number[]) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // 稳定化 ids，避免数组引用变化导致重复查询
  const idsKey = bonsaiIds.slice().sort((a, b) => a - b).join(',');
  return useQuery<Record<number, boolean>>({
    queryKey: ['favorite-map', idsKey],
    queryFn: async () => {
      if (bonsaiIds.length === 0) return {};
      const idsParam = bonsaiIds.join(',');
      const res = await api.get<{ data: Record<string, boolean> }>(
        `/favorites/batch-check?ids=${idsParam}`
      );
      // 后端返回 { "1": true, "2": false }，转为 { 1: true, 2: false }
      const result: Record<number, boolean> = {};
      for (const [k, v] of Object.entries(res.data)) {
        result[Number(k)] = v;
      }
      return result;
    },
    enabled: isAuthenticated && bonsaiIds.length > 0,
    staleTime: 30_000, // 30 秒内不重复查询
  });
}

// 检查单个盆景是否已收藏（仅在详情页等单卡片场景使用）
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
      const newFavorited = !variables.favorited;
      // 更新单卡片检查缓存
      queryClient.setQueryData(['favorite-check', variables.bonsaiId], newFavorited);
      // 乐观更新批量缓存，避免 invalidate 触发重新请求造成 UI 闪烁
      // 采用 setQueriesData 遍历所有 favorite-map 查询（不同 idsKey）
      queryClient.setQueriesData<Record<number, boolean>>(
        { queryKey: ['favorite-map'] },
        (old) => {
          if (!old) return old;
          return { ...old, [variables.bonsaiId]: newFavorited };
        }
      );
      // 收藏列表需重新拉取（增删条目）
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
