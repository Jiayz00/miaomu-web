// 询价聊天页：会话列表 + 实时聊天
//
// 响应式优化：
// - 移动端（< md）默认显示会话列表，点击会话切换到聊天界面，带返回按钮
// - 桌面端左右两栏并排显示
// - 筛选/搜索面板：盆景名称、用户名、消息关键字、时间区间，支持收起/展开
//
// 东方雅致设计系统：section-paper + container-penjing + eyebrow-with-line + display-section

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ChatWidget, ChatRoomItem } from '@/components/ChatWidget';
import { InlineLoading } from '@/components/Loading';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { getMainImage, toQueryString, cn } from '@/lib/utils';
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

function ChatPageContent() {
  const searchParams = useSearchParams();
  const userId = useAuthStore((s) => s.user?.id);
  const initialRoom = searchParams.get('room');
  // 解析 URL 中的 room 参数，过滤非法值（非数字 / NaN / 非正整数）
  // 否则 Number('abc') = NaN 会作为 activeRoomId 传入 ChatWidget，导致空白聊天界面
  const initialRoomId = (() => {
    if (!initialRoom) return null;
    const parsed = Number(initialRoom);
    return Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed)
      ? parsed
      : null;
  })();
  const [activeRoomId, setActiveRoomId] = useState<number | null>(initialRoomId);
  // 移动端视图切换：'list' | 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initialRoomId ? 'chat' : 'list');

  // 筛选/搜索状态
  const [filters, setFilters] = useState<RoomFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<RoomFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = !isFiltersEmpty(appliedFilters);

  // 会话列表（无筛选时走列表接口，有筛选时走搜索接口）
  const { data: rooms, isLoading } = useQuery<ChatRoom[]>({
    queryKey: ['chat-rooms', hasFilters ? appliedFilters : 'all'],
    queryFn: async () => {
      if (hasFilters) {
        const qs = toQueryString(appliedFilters as unknown as Record<string, unknown>);
        const res = await api.get<{ data: ChatRoom[] }>(`/chat/rooms/search${qs}`);
        return res.data;
      }
      const res = await api.get<{ data: ChatRoom[] }>('/chat/rooms');
      return res.data;
    },
  });

  // 默认选中第一个会话
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

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  return (
    <div className="pt-[72px]" aria-label="询价咨询">
      {/* ===== 顶部 hero ===== */}
      <section className="section-paper texture-paper border-b border-[var(--penjing-border-hairline)]">
        <div className="container-penjing py-14 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow-with-line">
              <span className="eyebrow-label">私人洽购</span>
            </span>
            <h1 className="display-section m-0 text-ink">询价咨询</h1>
            <p className="body-large mt-5 max-w-[560px] text-ink-text-secondary">
              与我们的顾问一对一交流，开启您的收藏之旅。每条消息皆由加密通道传输，确保洽谈私密。
            </p>
            <span className="mt-7 block h-px w-16 bg-gold" aria-hidden="true" />
          </motion.div>
        </div>
      </section>

      {/* ===== 主体：筛选 + 聊天 ===== */}
      <section className="section-paper" aria-label="询价会话">
        <div className="container-penjing py-10 md:py-14">
          {/* 筛选/搜索面板 */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'flex w-full items-center justify-between border px-5 py-3 font-sans text-[12px] uppercase tracking-[0.2em] transition-colors md:w-auto',
                showFilters || activeFilterCount > 0
                  ? 'border-gold bg-gold/6 text-gold-deep'
                  : 'border-[var(--penjing-border-strong)] text-ink-text-secondary hover:border-gold hover:text-gold-deep'
              )}
              aria-expanded={showFilters}
            >
              <span className="flex items-center gap-2.5">
                <Filter className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                筛选与搜索
                {activeFilterCount > 0 && (
                  <span className="ml-1 flex h-5 min-w-[1.25rem] items-center justify-center border border-gold bg-gold px-1.5 font-sans text-[10px] font-medium text-ink-deepest">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              {showFilters ? (
                <ChevronUp className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 border border-[var(--penjing-border-fine)] bg-paper-warm p-5 md:p-6"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* 盆景名称 */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="filter-bonsai-name"
                      className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep"
                    >
                      盆景名称
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 transition-colors focus-within:border-gold">
                      <Search className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                      <input
                        id="filter-bonsai-name"
                        type="text"
                        value={filters.bonsaiName}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, bonsaiName: e.target.value }))
                        }
                        placeholder="按盆景名称筛选…"
                        className="flex-1 border-0 bg-transparent font-sans text-sm text-ink-text placeholder:text-ink-text-faint focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 用户名 */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="filter-username"
                      className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep"
                    >
                      用户名
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 transition-colors focus-within:border-gold">
                      <Search className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                      <input
                        id="filter-username"
                        type="text"
                        value={filters.username}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="按发送者用户名筛选…"
                        className="flex-1 border-0 bg-transparent font-sans text-sm text-ink-text placeholder:text-ink-text-faint focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 开始日期 */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="filter-start-date"
                      className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep"
                    >
                      开始日期
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 transition-colors focus-within:border-gold">
                      <Calendar className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                      <input
                        id="filter-start-date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className="flex-1 border-0 bg-transparent font-sans text-sm text-ink-text focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 结束日期 */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="filter-end-date"
                      className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep"
                    >
                      结束日期
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 transition-colors focus-within:border-gold">
                      <Calendar className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                      <input
                        id="filter-end-date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="flex-1 border-0 bg-transparent font-sans text-sm text-ink-text focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 消息关键字 */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
                    <label
                      htmlFor="filter-keyword"
                      className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep"
                    >
                      消息内容
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--penjing-border-fine)] bg-paper px-3 py-2 transition-colors focus-within:border-gold">
                      <Search className="h-4 w-4 text-ink-text-faint" strokeWidth={1.5} aria-hidden="true" />
                      <input
                        id="filter-keyword"
                        type="text"
                        value={filters.keyword}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                        }
                        placeholder="搜索消息内容关键字…"
                        className="flex-1 border-0 bg-transparent font-sans text-sm text-ink-text placeholder:text-ink-text-faint focus:outline-none"
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
          </div>

          {/* 聊天容器 */}
          <div className="flex h-[70vh] min-h-[520px] overflow-hidden border border-[var(--penjing-border-fine)] bg-paper shadow-[var(--penjing-shadow-static)]">
            {/* 左：会话列表（移动端根据视图切换） */}
            <div
              className={`flex w-full flex-col border-r border-[var(--penjing-border-hairline)] md:w-80 ${
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="border-b border-[var(--penjing-border-hairline)] px-5 py-4">
                <h2 className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                  <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  会话列表
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <InlineLoading />
                ) : rooms && rooms.length > 0 ? (
                  rooms.map((room) => (
                    <ChatRoomItem
                      key={room.id}
                      name={room.bonsai?.name || `会话 #${room.id}`}
                      subtitle={
                        room.bonsai ? `关于：${room.bonsai.name}` : '一般咨询'
                      }
                      time={room.createdAt}
                      active={room.id === activeRoomId}
                      onClick={() => handleSelectRoom(room.id)}
                    />
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                    <Plus className="h-10 w-10 text-ink-text-faint" strokeWidth={1} aria-hidden="true" />
                    <div>
                      <p className="display-card text-ink">
                        {hasFilters ? '未找到匹配的会话' : '暂无会话'}
                      </p>
                      <p className="body-caption mt-2">
                        {!hasFilters && '从盆景详情页发起询价'}
                      </p>
                    </div>
                    {!hasFilters && (
                      <Link href="/bonsais" className="btn-outline-gold mt-2 !px-5 !py-2.5 !text-[11px]">
                        去浏览盆景
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右：聊天界面（移动端根据视图切换） */}
            <div
              className={`flex-1 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
            >
              {activeRoom && (
                <div className="flex h-full w-full flex-col">
                  {/* 移动端返回按钮 + 关联盆景 */}
                  <div className="flex items-center gap-3 border-b border-[var(--penjing-border-hairline)] px-5 py-4 md:px-6">
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="flex items-center justify-center text-ink-text-secondary transition-colors hover:text-ink md:hidden"
                      aria-label="返回会话列表"
                    >
                      <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                    {activeRoom.bonsai && (
                      <>
                        <div className="relative h-10 w-10 overflow-hidden bg-ink-deep">
                          {getMainImage(activeRoom.bonsai.images) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getMainImage(activeRoom.bonsai.images)}
                              alt={activeRoom.bonsai.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-[15px] font-semibold text-ink">
                            {activeRoom.bonsai.name}
                          </p>
                          <p className="font-sans text-xs text-ink-text-muted">
                            关于此盆景的咨询
                          </p>
                        </div>
                      </>
                    )}
                    {!activeRoom.bonsai && (
                      <p className="font-serif text-[15px] font-semibold text-ink">一般咨询</p>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatWidget
                      roomId={activeRoomId}
                      currentUserId={userId}
                      placeholder="输入您的咨询内容…"
                    />
                  </div>
                </div>
              )}
              {!activeRoom && (
                <div className="flex h-full w-full items-center justify-center text-center">
                  <div>
                    <MessageSquare
                      className="mx-auto mb-4 h-12 w-12 text-ink-text-faint"
                      strokeWidth={1}
                      aria-hidden="true"
                    />
                    <p className="display-card text-ink">选择一个会话开始对话</p>
                    <p className="body-caption mt-2">
                      从左侧列表中选取要继续的洽购会话
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<InlineLoading />}>
        <ChatPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
