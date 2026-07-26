// 询价管理：会话列表 + 聊天界面
//
// 视觉语言：东方雅致 · 墨绿+金色
// - section-paper + container-penjing 顶栏
// - 筛选/搜索面板：纸面卡片 + 金色 eyebrow 标签
// - 会话列表：hairline 分隔 + 选中态金色描边
// - 聊天界面：复用 ChatWidget（已对齐设计系统）
//
// 优化：
// 1. 移动端视图切换（与用户端聊天页一致）
// 2. 服务端搜索支持盆景名称、用户名、消息关键字、时间区间
// 3. 会话列表使用真实用户名替代 `用户 #N`
// 4. 筛选/搜索面板支持收起/展开，响应式布局

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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

const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

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

  // 表单字段统一样式：底线式输入框，金色焦点
  const filterInputWrapClass =
    'flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 transition-colors focus-within:border-gold';
  const filterInputClass =
    'flex-1 border-0 bg-transparent font-sans text-sm text-ink-text placeholder:text-ink-text-faint focus:outline-none';
  const filterLabelClass =
    'font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep';

  return (
    <div className="section-paper">
      <div className="container-penjing py-10 md:py-14">
        {/* 页面标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_SOFT }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <span className="eyebrow-with-line">
              <span className="eyebrow-label">控制台 · 询价管理</span>
            </span>
            <h1 className="display-section m-0 text-ink">询价管理</h1>
            <p className="body-base mt-3 max-w-[640px] text-ink-text-secondary">
              共 {rooms?.length || 0} 个会话
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-gold-deep">
                  · {pendingCount} 个待处理
                </span>
              )}
            </p>
            <span className="mt-5 block h-px w-16 bg-gold" aria-hidden="true" />
          </div>

          {/* 顶部操作按钮 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 筛选/搜索展开按钮 */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={cn(
                'flex items-center gap-2 border px-4 py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] transition-colors',
                showFilters || activeFilterCount > 0
                  ? 'border-gold bg-gold/6 text-gold-deep'
                  : 'border-[var(--penjing-border-strong)] text-ink-text-secondary hover:border-gold hover:text-gold-deep',
              )}
            >
              <Filter className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              筛选与搜索
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 min-w-[1.25rem] items-center justify-center border border-gold bg-gold px-1.5 font-sans text-[10px] font-medium text-ink-deepest">
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
                'flex items-center gap-2 border px-4 py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] transition-colors',
                filterPending
                  ? 'border-gold bg-gold text-ink-deepest'
                  : 'border-[var(--penjing-border-strong)] text-ink-text-secondary hover:border-gold hover:text-gold-deep',
              )}
            >
              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              {filterPending ? '仅看待处理' : '显示全部'}
            </button>
          </div>
        </motion.div>

        {/* 筛选/搜索面板 */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3, ease: EASE_SOFT }}
            className="mb-6 overflow-hidden border border-[var(--penjing-border-fine)] bg-paper-warm p-5 md:p-6"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* 盆景名称 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-filter-bonsai-name" className={filterLabelClass}>
                  盆景名称
                </label>
                <div className={filterInputWrapClass}>
                  <Search className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                  <input
                    id="admin-filter-bonsai-name"
                    type="text"
                    value={filters.bonsaiName}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, bonsaiName: e.target.value }))
                    }
                    placeholder="按盆景名称筛选…"
                    className={filterInputClass}
                  />
                </div>
              </div>

              {/* 用户名 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-filter-username" className={filterLabelClass}>
                  用户名
                </label>
                <div className={filterInputWrapClass}>
                  <Search className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                  <input
                    id="admin-filter-username"
                    type="text"
                    value={filters.username}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="按会话用户筛选…"
                    className={filterInputClass}
                  />
                </div>
              </div>

              {/* 开始日期 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-filter-start-date" className={filterLabelClass}>
                  开始日期
                </label>
                <div className={filterInputWrapClass}>
                  <Calendar className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                  <input
                    id="admin-filter-start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className={filterInputClass}
                  />
                </div>
              </div>

              {/* 结束日期 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-filter-end-date" className={filterLabelClass}>
                  结束日期
                </label>
                <div className={filterInputWrapClass}>
                  <Calendar className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                  <input
                    id="admin-filter-end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className={filterInputClass}
                  />
                </div>
              </div>

              {/* 消息关键字 */}
              <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
                <label htmlFor="admin-filter-keyword" className={filterLabelClass}>
                  消息内容
                </label>
                <div className={filterInputWrapClass}>
                  <Search className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                  <input
                    id="admin-filter-keyword"
                    type="text"
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                    }
                    placeholder="搜索消息内容关键字…"
                    className={filterInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--penjing-border-hairline)] pt-5">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="btn-ink !px-5 !py-2.5 !text-[11px]"
              >
                <Search className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                搜索
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-outline-gold !px-5 !py-2.5 !text-[11px]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                重置
              </button>
              <p className="font-sans text-xs text-ink-text-muted">
                至少填写一项即可搜索
              </p>
            </div>
          </motion.div>
        )}

        {/* 聊天容器：两栏布局 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_SOFT, delay: 0.1 }}
          className="flex h-[72vh] min-h-[520px] overflow-hidden border border-[var(--penjing-border-fine)] bg-paper"
        >
          {/* 左：会话列表 */}
          <div
            className={cn(
              'flex w-full flex-col border-r border-[var(--penjing-border-hairline)] md:w-80',
              mobileView === 'chat' ? 'hidden md:flex' : 'flex',
            )}
          >
            {/* 列表标题栏 */}
            <div className="flex items-center justify-between border-b border-[var(--penjing-border-hairline)] px-5 py-3">
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                会话列表
              </span>
              {filterPending && pendingCount > 0 && (
                <span className="border border-gold bg-gold/8 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-gold-deep">
                  {pendingCount} 待处理
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <InlineLoading />
              ) : isError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertCircle
                    className="h-8 w-8 text-state-error"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <p className="font-sans text-sm text-state-error" role="alert">
                    {error instanceof ApiError ? error.message : '加载失败，请稍后重试'}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-1.5 border border-[var(--penjing-border-strong)] px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-text-secondary transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn('h-3 w-3', isFetching && 'animate-spin')}
                      aria-hidden="true"
                    />
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
                        className="absolute right-3 top-4 flex h-2 w-2 rounded-full bg-gold shadow-penjing-gold-glow"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <MessageSquare
                    className="h-8 w-8 text-ink-text-faint"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <p className="font-sans text-sm text-ink-text-muted">
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
              mobileView === 'list' ? 'hidden md:flex' : 'flex',
            )}
          >
            {activeRoom && (
              <div className="flex h-full w-full flex-col">
                {/* 顶部：返回按钮 + 关联盆景 + 用户信息 */}
                <div className="flex items-center gap-3 border-b border-[var(--penjing-border-hairline)] px-4 py-3 md:px-6">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="flex items-center justify-center text-ink-text-secondary transition-colors hover:text-ink md:hidden"
                    aria-label="返回会话列表"
                  >
                    <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  {activeRoom.bonsai && (
                    <div className="relative h-10 w-10 overflow-hidden border border-[var(--penjing-border-fine)] bg-paper-warm">
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
                    <p className="truncate font-sans text-sm font-medium text-ink">
                      {activeRoom.bonsai?.name || `会话 #${activeRoom.id}`}
                    </p>
                    <p className="font-sans text-xs text-ink-text-muted">
                      {activeRoom.user?.username || `用户 #${activeRoom.userId}`} ·{' '}
                      {formatDateTime(activeRoom.createdAt)}
                    </p>
                  </div>
                  {activeRoom.status === 0 && (
                    <span className="border border-gold bg-gold/10 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-gold-deep">
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
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--penjing-border-fine)] bg-paper-warm"
                  aria-hidden="true"
                >
                  <MessageSquare className="h-7 w-7 text-gold-deep" strokeWidth={1} />
                </div>
                <div>
                  <p className="display-card font-serif text-ink">选择会话开始回复</p>
                  <p className="body-caption mt-2 text-ink-text-muted">
                    从左侧列表选择一个询价会话
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
