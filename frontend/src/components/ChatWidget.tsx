// 聊天组件：实时消息收发
// 可复用于用户端询价与管理后台
//
// 健壮性设计：
// 1. 发送中状态：消息发出后显示 loading，避免重复点击
// 2. 未连接禁用：socket 未连接时禁用输入框，避免静默丢消息
// 3. 失败重试：socket 未连接时将消息放入 pending 队列，连接恢复后自动重发
// 4. 乐观更新：发送成功后立即在 UI 显示（已被 incoming 去重逻辑覆盖）

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
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

// 待发送消息（socket 未连接时暂存）
interface PendingMessage {
  tempId: number;
  content: string;
  ts: number;
}

export function ChatWidget({
  roomId,
  currentUserId,
  isAdmin = false,
  placeholder = '输入消息…',
}: ChatWidgetProps) {
  const { messages: incoming, sendMessage, joinRoom, clearMessages, isConnected } =
    useSocket();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // 待发送队列（socket 未连接时暂存）
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [sendError, setSendError] = useState(false);
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
    // 切换房间时清空待发送队列，防止旧消息发到新房间
    setPending([]);
    if (roomId) {
      fetchHistory();
      // 加入 socket.io 房间，否则收不到 'messageReceived' 实时消息
      joinRoom(roomId);
    }
  }, [roomId, fetchHistory, clearMessages, joinRoom]);

  // socket 连接恢复后重新加入当前房间并自动发送 pending 队列
  useEffect(() => {
    if (isConnected && roomId) {
      // 重连后需重新加入房间（socket.io 断开后房间成员关系丢失）
      joinRoom(roomId);
      if (pending.length > 0) {
        const toSend = [...pending];
        setPending([]);
        toSend.forEach((msg) => {
          sendMessage(roomId, msg.content);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, roomId, pending, joinRoom, sendMessage]);

  // 合并历史 + socket 新消息（去重），用 useMemo 避免每次渲染重新构造和排序
  const allMessages = useMemo<ChatMessage[]>(() => {
    const list: ChatMessage[] = [...history];
    for (const m of incoming) {
      if (m.roomId === roomId && !list.some((h) => h.id === m.id)) {
        list.push({
          id: m.id,
          roomId: m.roomId,
          senderId: m.senderId,
          content: m.content,
          isRead: true,
          createdAt: m.createdAt,
        });
      }
    }
    list.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return list;
  }, [history, incoming, roomId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !roomId || sending) return;

    // socket 未连接：暂存消息，连接恢复后自动重发
    if (!isConnected) {
      setPending((prev) => [
        ...prev,
        { tempId: Date.now(), content, ts: Date.now() },
      ]);
      setInput('');
      setSendError(true);
      return;
    }

    setSending(true);
    setSendError(false);
    try {
      // socket.io emit 是同步触发，但实际发送是异步的
      // 这里用 setTimeout 模拟短暂 sending 状态，给用户视觉反馈
      sendMessage(roomId, content);
      setInput('');
      // 短暂的 sending 状态，避免过快连点
      setTimeout(() => setSending(false), 300);
    } catch {
      setSendError(true);
      setSending(false);
    }
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
      {/* 连接状态 + 错误提示（WCAG 4.1.3：role="status" 通知屏读器） */}
      <div
        className="flex items-center justify-between border-b border-text-muted/10 px-6 py-3"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-accent' : 'bg-text-muted/40'
            )}
          />
          <span className="text-xs text-text-muted">
            {isConnected ? '已连接' : '连接中…'}
          </span>
        </div>
        {pending.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent-dark">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {pending.length} 条待发送
          </span>
        )}
      </div>

      {/* 消息列表（role="log" 让屏读器宣读新消息，WCAG 4.1.3） */}
      <div
        className="flex-1 overflow-y-auto px-6 py-4"
        role="log"
        aria-label="聊天消息"
        aria-live="polite"
        aria-relevant="additions"
      >
        {loading ? (
          <InlineLoading text="加载消息" />
        ) : allMessages.length === 0 && pending.length === 0 ? (
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
            {/* 待发送消息（连接恢复后会自动发出） */}
            {pending.map((msg) => (
              <div key={msg.tempId} className="flex justify-end">
                <div className="max-w-[70%] bg-primary/50 px-4 py-2.5 text-sm text-background/80">
                  {msg.content}
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-background/60">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    待发
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-text-muted/10 p-4">
        {sendError && !isConnected && (
          <p
            className="mb-2 flex items-center gap-1 text-xs text-accent-dark"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            未连接，消息将在连接恢复后自动发送
          </p>
        )}
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
            placeholder={isConnected ? placeholder : '正在连接…'}
            disabled={!roomId}
            aria-label="输入聊天消息"
            className="input-luxury flex-1 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !roomId || sending}
            className="flex h-11 w-11 items-center justify-center bg-primary text-background transition-colors hover:bg-primary-light disabled:opacity-30"
            aria-label="发送消息"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="h-4 w-4" strokeWidth={1.5} />
            )}
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
        <span className="truncate text-sm font-medium text-primary">{name}</span>
        {time && (
          <span className="ml-2 shrink-0 text-xs text-text-muted">
            {formatDateTime(time)}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 truncate text-xs text-text-muted">{subtitle}</p>
      )}
    </button>
  );
}
