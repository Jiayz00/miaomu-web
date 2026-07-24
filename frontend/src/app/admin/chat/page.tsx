// 询价管理：会话列表 + 聊天界面
//
// 优化：
// 1. 移动端视图切换（与用户端聊天页一致）
// 2. 搜索支持盆景名称、用户名、会话 ID
// 3. 显示用户头像与未处理标记

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Search, ArrowLeft, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { ChatWidget, ChatRoomItem } from '@/components/ChatWidget';
import { useAuthStore } from '@/stores/auth-store';
import { InlineLoading } from '@/components/Loading';
import { api, ApiError } from '@/lib/api';
import { cn, getMainImage, formatDateTime } from '@/lib/utils';
import type { ChatRoom } from '@/lib/types';

export default function AdminChatPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  // 移动端视图切换
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // 待处理筛选
  const [filterPending, setFilterPending] = useState(false);

  // 管理员会话列表
  const { data: rooms, isLoading, isError, error, refetch, isFetching } = useQuery<ChatRoom[]>({
    queryKey: ['admin-chat-rooms'],
    queryFn: async () => {
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

  // 多字段搜索 + 待处理筛选
  const filteredRooms = (rooms || []).filter((room) => {
    // 待处理筛选
    if (filterPending && room.status !== 0) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      room.bonsai?.name?.toLowerCase().includes(q) ||
      `会话 #${room.id}`.toLowerCase().includes(q) ||
      String(room.id).includes(q) ||
      `用户 #${room.userId}`.toLowerCase().includes(q) ||
      String(room.userId).includes(q)
    );
  });

  const activeRoom = rooms?.find((r) => r.id === activeRoomId);

  const handleSelectRoom = (roomId: number) => {
    setActiveRoomId(roomId);
    setMobileView('chat');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const pendingCount = (rooms || []).filter((r) => r.status === 0).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
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
          <Clock className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          {filterPending ? '仅看待处理' : '显示全部'}
        </button>
      </div>

      <div className="flex h-[72vh] overflow-hidden border border-text-muted/15 bg-surface">
        {/* 左：会话列表 */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-text-muted/10 md:w-80',
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* 搜索 */}
          <div className="border-b border-text-muted/10 p-3">
            <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
              <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
              <input
                id="admin-chat-search"
                name="admin-chat-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索盆景、用户或会话 ID…"
                aria-label="搜索询价会话"
                className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

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
                    subtitle={`用户 #${room.userId}${room.bonsai ? ` · ${room.bonsai.name}` : ''}`}
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
                  {search || filterPending ? '未找到匹配的会话' : '暂无询价会话'}
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
                    用户 #{activeRoom.userId} · {formatDateTime(activeRoom.createdAt)}
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
