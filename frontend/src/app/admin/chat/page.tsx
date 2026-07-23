// 询价管理：会话列表 + 聊天界面

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Search } from 'lucide-react';
import { ChatWidget, ChatRoomItem } from '@/components/ChatWidget';
import { useAuthStore } from '@/stores/auth-store';
import { InlineLoading } from '@/components/Loading';
import { api } from '@/lib/api';
import { getMainImage } from '@/lib/utils';
import type { ChatRoom } from '@/lib/types';

export default function AdminChatPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // 管理员会话列表
  const { data: rooms, isLoading } = useQuery<ChatRoom[]>({
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

  // 搜索过滤
  const filteredRooms = (rooms || []).filter((room) =>
    room.bonsai?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeRoom = rooms?.find((r) => r.id === activeRoomId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-primary">询价管理</h1>
        <p className="mt-1 text-sm text-text-muted">
          处理用户询价会话，共 {rooms?.length || 0} 个会话
        </p>
      </div>

      <div className="flex h-[72vh] overflow-hidden border border-text-muted/15 bg-surface">
        {/* 左：会话列表 */}
        <div className="flex w-80 flex-col border-r border-text-muted/10">
          {/* 搜索 */}
          <div className="border-b border-text-muted/10 p-3">
            <div className="flex items-center gap-2 border border-text-muted/20 px-3 py-2">
              <Search className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索盆景名称…"
                className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <InlineLoading />
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <ChatRoomItem
                  key={room.id}
                  name={room.bonsai?.name || `会话 #${room.id}`}
                  subtitle={`用户 #${room.userId}`}
                  time={room.createdAt}
                  active={room.id === activeRoomId}
                  onClick={() => setActiveRoomId(room.id)}
                />
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <MessageSquare className="h-8 w-8 text-text-muted/40" strokeWidth={1} />
                <p className="text-sm text-text-muted">暂无询价会话</p>
              </div>
            )}
          </div>
        </div>

        {/* 右：聊天界面 */}
        <div className="flex-1">
          {activeRoom && (
            <div className="flex h-full flex-col">
              {/* 顶部：关联盆景 */}
              {activeRoom.bonsai && (
                <div className="flex items-center gap-3 border-b border-text-muted/10 px-6 py-3">
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
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {activeRoom.bonsai.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      用户 #{activeRoom.userId}
                    </p>
                  </div>
                </div>
              )}
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
            <div className="flex h-full items-center justify-center text-center text-text-muted">
              <div>
                <MessageSquare
                  className="mx-auto mb-3 h-12 w-12 text-text-muted/30"
                  strokeWidth={1}
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
