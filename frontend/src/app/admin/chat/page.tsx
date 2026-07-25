// 询价管理：会话列表 + 聊天界面
//
// 优化：
// 1. 移动端视图切换（与用户端聊天页一致）
// 2. 服务端搜索支持盆景名称、用户名、消息关键字、时间区间
// 3. 会话列表使用真实用户名替代 `用户 #N`
// 4. 筛选/搜索面板支持收起/展开，响应式布局

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Clock,
  AlertCircle,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
} from 'lucide-react';
import { ChatWidget, ChatRoomItem } from '@/components/ChatWidget';
import { useAuthStore } from '@/stores/auth-store';
import { InlineLoading } from '@/components/Loading';
import { api, ApiError } from '@/lib/api';
import { cn, getMainImage, formatDateTime, toQueryString } from '@/lib/utils';
import type { ChatRoom } from '@/lib/types';

interface RoomFilters {
  bonsaiName: string;
  username: string;
  keyword: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FILTERS: RoomFilters = {
  bonsaiName: '',
  username: '',
  keyword: '',
  startDate: '',
  endDate: '',
};

function isFiltersEmpty(filters: RoomFilters): boolean {
  return Object.values(filters).every((v) => !v);
}

export default function AdminChatPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  // 移动端视图切换
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // 待处理筛选
  const [filterPending, setFilterPending] = useState(false);

  // 筛选/搜索状态
  const [filters, setFilters] = useState<RoomFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<RoomFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = !isFiltersEmpty(appliedFilters);

  // 管理员会话列表（无筛选时走列表接口，有筛选时走搜索接口）
  const {
    data: rooms,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ChatRoom[]>({
    queryKey: ['admin-chat-rooms', hasFilters ? appliedFilters : 'all'],
    queryFn: async () => {
      if (hasFilters) {
        const qs = toQueryString(appliedFilters as unknown as Record<string, unknown>);
        const res = await api.get<{ data: ChatRoom[] }>(`/admin/chat/search${qs}`);
        return res.data;
      }
      const res = await api.get<{ data: ChatRoom[] }>('/admin/chat/rooms');
      return res.data;
    },
  });

  // 默认选中第一个
  useEffect(() => {
    if (!activeRoomId && rooms && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const activeRoom = rooms?.find((r) => r.id === activeRoomId);

  const handleSelectRoom = (roomId: number) => {
    setActiveRoomId(roomId);
    setMobileView('chat');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setActiveRoomId(null);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setActiveRoomId(null);
  };

  // 待处理筛选 + 搜索结果后的列表
  const filteredRooms = (rooms || []).filter((room) => {
    if (filterPending && room.status !== 0) return false;
    return true;
  });

  const pendingCount = (rooms || []).filter((r) => r.status === 0).length;
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-primary">询价管理</h1>
          <p className="mt-1 text-sm text-text-muted">
            共 {rooms?.length || 0} 个会话
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-accent">
                · {pendingCount} 个待处理
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* 筛选/搜索展开按钮 */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={cn(
              'flex items-center gap-2 border px-4 py-2 text-xs uppercase tracking-[0.15em] transition-colors',
              showFilters || activeFilterCount > 0
                ? 'border-accent bg-accent/5 text-primary'
                : 'border-text-muted/30 text-text-light hover:border-accent hover:text-accent'
            )}
          >
            <Filter className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            筛选与搜索
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-primary-dark">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          {/* 待处理筛选开关 */}
          <button
            type="button"
            onClick={() => setFilterPending((v) => !v)}
            aria-pressed={filterPending}
            className={cn(
              'flex items-center gap-2 border px-4 py-2 text-xs uppercase tracking-[0.15em] transition-colors',
              filterPending
                ? 'border-accent bg-accent text-primary-dark'
                : 'border-text-muted/30 text-text-light hover:border-accent hover:text-accent'
            )}
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            {filterPending ? '仅看待处理' : '显示全部'}
          </button>
        </div>
      </div>

      {/* 筛选/搜索面板 */}
      {showFilters && (
        <div className="mb-4 border border-text-muted/15 bg-surface p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 盆景名称 */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-filter-bonsai-name"
                className="text-xs uppercase tracking-wider text-text-muted"
              >
                盆景名称
              </label>
              <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
                <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <input
                  id="admin-filter-bonsai-name"
                  type="text"
                  value={filters.bonsaiName}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, bonsaiName: e.target.value }))
                  }
                  placeholder="按盆景名称筛选…"
                  className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* 用户名 */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-filter-username"
                className="text-xs uppercase tracking-wider text-text-muted"
              >
                用户名
              </label>
              <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
                <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <input
                  id="admin-filter-username"
                  type="text"
                  value={filters.username}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="按会话用户筛选…"
                  className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* 开始日期 */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-filter-start-date"
                className="text-xs uppercase tracking-wider text-text-muted"
              >
                开始日期
              </label>
              <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
                <Calendar className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <input
                  id="admin-filter-start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* 结束日期 */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-filter-end-date"
                className="text-xs uppercase tracking-wider text-text-muted"
              >
                结束日期
              </label>
              <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
                <Calendar className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <input
                  id="admin-filter-end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* 消息关键字 */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <label
                htmlFor="admin-filter-keyword"
                className="text-xs uppercase tracking-wider text-text-muted"
              >
                消息内容
              </label>
              <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
                <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <input
                  id="admin-filter-keyword"
                  type="text"
                  value={filters.keyword}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                  }
                  placeholder="搜索消息内容关键字…"
                  className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex items-center gap-2 bg-primary px-5 py-2 text-xs uppercase tracking-[0.15em] text-background transition-colors hover:bg-primary-light"
            >
              <Search className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              搜索
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-2 border border-text-muted/30 px-5 py-2 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              重置
            </button>
            <p className="text-xs text-text-muted">至少填写一项即可搜索</p>
          </div>
        </div>
      )}

      <div className="flex h-[72vh] overflow-hidden border border-text-muted/15 bg-surface">
        {/* 左：会话列表 */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-text-muted/10 md:w-80',
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <InlineLoading />
            ) : isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-sm text-red-600" role="alert">
                  {error instanceof ApiError ? error.message : '加载失败，请稍后重试'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="flex items-center gap-1.5 border border-text-muted/30 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-text-light transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} aria-hidden="true" />
                  重试
                </button>
              </div>
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div key={room.id} className="relative">
                  <ChatRoomItem
                    name={room.bonsai?.name || `会话 #${room.id}`}
                    subtitle={`${room.user?.username || `用户 #${room.userId}`}${room.bonsai ? ` · ${room.bonsai.name}` : ''}`}
                    time={room.createdAt}
                    active={room.id === activeRoomId}
                    onClick={() => handleSelectRoom(room.id)}
                  />
                  {room.status === 0 && (
                    <span
                      className="absolute right-3 top-4 flex h-2 w-2 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <MessageSquare className="h-8 w-8 text-text-muted/40" strokeWidth={1} aria-hidden="true" />
                <p className="text-sm text-text-muted">
                  {hasFilters || filterPending ? '未找到匹配的会话' : '暂无询价会话'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 右：聊天界面 */}
        <div
          className={cn(
            'flex-1',
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          )}
        >
          {activeRoom && (
            <div className="flex h-full w-full flex-col">
              {/* 顶部：返回按钮 + 关联盆景 + 用户信息 */}
              <div className="flex items-center gap-3 border-b border-text-muted/10 px-4 py-3 md:px-6">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex items-center justify-center text-text-light transition-colors hover:text-primary md:hidden"
                  aria-label="返回会话列表"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {activeRoom.bonsai && (
                  <div className="relative h-10 w-10 overflow-hidden bg-primary-dark/10">
                    {getMainImage(activeRoom.bonsai.images) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMainImage(activeRoom.bonsai.images)}
                        alt={activeRoom.bonsai.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">
                    {activeRoom.bonsai?.name || `会话 #${activeRoom.id}`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {activeRoom.user?.username || `用户 #${activeRoom.userId}`} · {formatDateTime(activeRoom.createdAt)}
                  </p>
                </div>
                {activeRoom.status === 0 && (
                  <span className="bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-dark">
                    待处理
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWidget
                  roomId={activeRoomId}
                  currentUserId={adminId}
                  isAdmin
                  placeholder="回复用户咨询…"
                />
              </div>
            </div>
          )}
          {!activeRoom && (
            <div className="flex h-full w-full items-center justify-center text-center text-text-muted">
              <div>
                <MessageSquare
                  className="mx-auto mb-3 h-12 w-12 text-text-muted/30"
                  strokeWidth={1}
                  aria-hidden="true"
                />
                <p className="text-sm">选择左侧会话开始回复</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
