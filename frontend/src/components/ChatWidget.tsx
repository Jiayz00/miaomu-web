// 聊天组件：实时消息收发
// 可复用于用户端询价与管理后台

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/use-socket';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';
import { InlineLoading } from './Loading';

interface ChatWidgetProps {
  roomId: number | null;
  currentUserId: number | undefined;
  // 是否为管理员视角（影响气泡对齐）
  isAdmin?: boolean;
  // 管理员发送时需要指定对方，可选回调
  placeholder?: string;
}

export function ChatWidget({
  roomId,
  currentUserId,
  isAdmin = false,
  placeholder = '输入消息…',
}: ChatWidgetProps) {
  const { messages: incoming, sendMessage, clearMessages, isConnected } =
    useSocket();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 拉取历史消息
  const fetchHistory = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: ChatMessage[] }>(
        `/chat/rooms/${roomId}/messages`
      );
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    clearMessages();
    setHistory([]);
    if (roomId) {
      fetchHistory();
    }
  }, [roomId, fetchHistory, clearMessages]);

  // 合并历史 + socket 新消息（去重）
  const allMessages: ChatMessage[] = [...history];
  for (const m of incoming) {
    if (m.roomId === roomId && !allMessages.some((h) => h.id === m.id)) {
      allMessages.push({
        id: m.id,
        roomId: m.roomId,
        senderId: m.senderId,
        content: m.content,
        isRead: true,
        createdAt: m.createdAt,
      });
    }
  }

  // 排序
  allMessages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !roomId) return;
    sendMessage(roomId, content);
    setInput('');
  };

  // 空状态
  if (!roomId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <MessageCircle className="h-12 w-12 text-text-muted/40" strokeWidth={1} />
        <div>
          <p className="font-serif text-xl text-primary">选择会话开始对话</p>
          <p className="mt-1 text-sm text-text-muted">
            从左侧列表选择一个询价会话
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 连接状态 */}
      <div className="flex items-center gap-2 border-b border-text-muted/10 px-6 py-3">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            isConnected ? 'bg-accent' : 'bg-text-muted/40'
          )}
        />
        <span className="text-xs text-text-muted">
          {isConnected ? '已连接' : '连接中…'}
        </span>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <InlineLoading text="加载消息" />
        ) : allMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-text-muted">
            <p className="text-sm">暂无消息，发送第一条消息开始对话</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allMessages.map((msg, i) => {
              const isSelf = msg.senderId === currentUserId;
              const showTime =
                i === 0 ||
                new Date(allMessages[i - 1].createdAt).getTime() +
                  5 * 60 * 1000 <
                  new Date(msg.createdAt).getTime();
              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="my-4 text-center text-xs text-text-muted">
                      {timeAgo(msg.createdAt)}
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex',
                      isSelf ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] px-4 py-2.5 text-sm',
                        isSelf
                          ? 'bg-primary text-background'
                          : isAdmin
                          ? 'bg-accent/20 text-primary'
                          : 'bg-surface text-text border border-text-muted/10'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-text-muted/10 p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            className="input-luxury flex-1"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !roomId}
            className="flex h-10 w-10 items-center justify-center bg-primary text-background transition-colors hover:bg-primary-light disabled:opacity-30"
            aria-label="发送"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// 房间列表项辅助组件
export function ChatRoomItem({
  name,
  subtitle,
  time,
  active,
  onClick,
}: {
  name: string;
  subtitle?: string;
  time?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full border-b border-text-muted/10 px-4 py-4 text-left transition-colors',
        active ? 'bg-background' : 'hover:bg-background/50'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">{name}</span>
        {time && (
          <span className="text-xs text-text-muted">{formatDateTime(time)}</span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 truncate text-xs text-text-muted">{subtitle}</p>
      )}
    </button>
  );
}
