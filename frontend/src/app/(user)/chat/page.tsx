// 询价聊天页：会话列表 + 实时聊天
//
// 响应式优化：
// - 移动端（< md）默认显示会话列表，点击会话切换到聊天界面，带返回按钮
// - 桌面端左右两栏并排显示

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ChatWidget, ChatRoomItem } from '@/components/ChatWidget';
import { InlineLoading } from '@/components/Loading';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { formatDateTime, getMainImage } from '@/lib/utils';
import type { ChatRoom } from '@/lib/types';

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

  // 会话列表
  const { data: rooms, isLoading } = useQuery<ChatRoom[]>({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
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

  return (
    <div className="pt-24">
      <div className="container-luxury py-10">
        <div className="mb-8 text-center">
          <span className="section-eyebrow justify-center">私人洽购</span>
          <h1 className="font-serif text-4xl text-primary md:text-5xl">询价咨询</h1>
          <p className="mt-3 text-sm text-text-light">
            与我们的顾问一对一交流，开启收藏之旅
          </p>
        </div>

        {/* 聊天容器 */}
        <div className="mx-auto flex h-[70vh] max-w-6xl overflow-hidden border border-text-muted/15 bg-surface">
          {/* 左：会话列表（移动端根据视图切换） */}
          <div
            className={`flex w-full flex-col border-r border-text-muted/10 md:w-72 ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="border-b border-text-muted/10 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-primary">
                <MessageSquare className="h-4 w-4 text-accent" strokeWidth={1.5} />
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
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <Plus className="h-8 w-8 text-text-muted/40" strokeWidth={1} />
                  <p className="text-sm text-text-muted">
                    暂无会话
                    <br />
                    从盆景详情页发起询价
                  </p>
                  <Link
                    href="/bonsais"
                    className="mt-2 inline-flex items-center gap-2 border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
                  >
                    去浏览盆景
                  </Link>
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
                    <>
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-primary">
                          {activeRoom.bonsai.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          关于此盆景的咨询
                        </p>
                      </div>
                    </>
                  )}
                  {!activeRoom.bonsai && (
                    <p className="text-sm font-medium text-primary">一般咨询</p>
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
              <div className="flex h-full w-full items-center justify-center text-center text-text-muted">
                <div>
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-text-muted/30" strokeWidth={1} />
                  <p className="text-sm">选择一个会话开始对话</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
