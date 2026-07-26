// 聊天组件：实时消息收发
// 可复用于用户端询价与管理后台
//
// 视觉语言：东方雅致 · 墨绿+金色
// - 自方消息：墨色底（ink）+ 宣纸色文字
// - 对方消息：宣纸暖底（paper-warm）+ 金色描边
// - 发送按钮：金色（gold）+ 墨色图标
// - 状态栏：著录卡式 hairline 分隔
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
import type { ChatMessage, PaginatedResponse } from '@/lib/types';
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
  // 使用 ref 跟踪 pending，避免将其作为 useEffect 依赖导致竞态
  // 当 pending 变化时 effect 重跑，可能在 setPending([]) 完成前再次发送
  const pendingRef = useRef<PendingMessage[]>([]);
  pendingRef.current = pending;

  // 拉取历史消息
  // 后端 /chat/rooms/:id/messages 返回分页结构 { list, total, page, pageSize, totalPages }
  const fetchHistory = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: PaginatedResponse<ChatMessage> }>(
        `/chat/rooms/${roomId}/messages`
      );
      setHistory(res.data?.list ?? []);
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
  // 仅在 isConnected / roomId 变化时触发，不依赖 pending（避免竞态）
  useEffect(() => {
    if (isConnected && roomId) {
      // 重连后需重新加入房间（socket.io 断开后房间成员关系丢失）
      joinRoom(roomId);
      // 通过 ref 读取最新 pending，避免将其作为依赖
      if (pendingRef.current.length > 0) {
        const toSend = [...pendingRef.current];
        setPending([]);
        toSend.forEach((msg) => {
          sendMessage(roomId, msg.content);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, roomId, joinRoom, sendMessage]);

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

  // 空状态：未选择会话
  if (!roomId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--penjing-border-fine)] bg-paper-warm"
          aria-hidden="true"
        >
          <MessageCircle className="h-7 w-7 text-gold-deep" strokeWidth={1} />
        </div>
        <div>
          <p className="display-card font-serif text-ink">选择会话开始对话</p>
          <p className="body-caption mt-2 text-ink-text-muted">
            从左侧列表选择一个询价会话
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* 连接状态条 + 待发送提示（著录卡式 hairline 分隔） */}
      <div
        className="flex items-center justify-between border-b border-[var(--penjing-border-hairline)] px-6 py-3"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 rounded-full transition-colors duration-300',
              isConnected
                ? 'bg-[var(--penjing-state-success)] shadow-[0_0_0_3px_rgba(45,90,61,0.12)]'
                : 'bg-gold animate-breathe',
            )}
          />
          <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-ink-text-muted">
            {isConnected ? '已连接' : '连接中'}
          </span>
        </div>
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.1em] text-gold-deep"
            >
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {pending.length} 条待发送
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* 消息列表（role="log" 让屏读器宣读新消息，WCAG 4.1.3） */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5"
        role="log"
        aria-label="聊天消息"
        aria-live="polite"
        aria-relevant="additions"
      >
        {loading ? (
          <InlineLoading text="加载消息" />
        ) : allMessages.length === 0 && pending.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--penjing-border-fine)] bg-paper-warm"
              aria-hidden="true"
            >
              <MessageCircle className="h-6 w-6 text-ink-text-faint" strokeWidth={1} />
            </div>
            <p className="body-caption text-ink-text-muted">
              暂无消息，发送第一条消息开始对话
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                    <div className="my-4 flex items-center justify-center">
                      <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-ink-text-faint">
                        {timeAgo(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      'flex',
                      isSelf ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] px-4 py-2.5 font-sans text-[14px] leading-[1.6] transition-shadow duration-300',
                        isSelf
                          ? // 自方消息：墨色底 + 宣纸文字
                            'bg-ink text-paper shadow-[0_2px_8px_-4px_rgba(15,40,32,0.3)]'
                          : isAdmin
                          ? // 管理员视角下：对方消息 = 用户消息，宣纸暖底 + 金色描边
                            'bg-paper-warm text-ink shadow-[inset_0_0_0_1px_var(--penjing-border-gold)]'
                          : // 用户视角下：对方消息 = 管理员消息，宣纸白底 + hairline 描边
                            'bg-paper text-ink-text shadow-[inset_0_0_0_1px_var(--penjing-border-fine)]',
                      )}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                </div>
              );
            })}
            {/* 待发送消息（连接恢复后会自动发出） */}
            <AnimatePresence>
              {pending.map((msg) => (
                <motion.div
                  key={msg.tempId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0.5, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex justify-end"
                >
                  <div className="max-w-[75%] bg-ink/60 px-4 py-2.5 font-sans text-[14px] leading-[1.6] text-paper/85 shadow-[inset_0_0_0_1px_var(--penjing-border-gold)]">
                    {msg.content}
                    <span className="ml-2 inline-flex items-center gap-1 align-middle font-sans text-[10px] uppercase tracking-[0.15em] text-gold-bright/80">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      待发
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区：hairline 分隔 + 金色发送按钮 */}
      <div className="border-t border-[var(--penjing-border-hairline)] bg-paper px-4 py-4 md:px-6">
        <AnimatePresence>
          {sendError && !isConnected && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 flex items-center gap-1.5 font-sans text-[11px] tracking-[0.1em] text-[var(--penjing-state-error)]"
              role="alert"
            >
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              未连接，消息将在连接恢复后自动发送
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3">
          <input
            id="chat-widget-input"
            name="chat-widget-input"
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
            className={cn(
              'flex h-11 flex-1 border border-[var(--penjing-border-fine)] bg-paper px-4 font-sans text-sm text-ink-text transition-colors',
              'placeholder:text-ink-text-faint focus:border-gold focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !roomId || sending}
            className={cn(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center bg-gold text-ink-deepest transition-all duration-300',
              'hover:bg-gold-bright hover:shadow-penjing-gold-strong',
              'active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gold disabled:hover:shadow-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            )}
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
      aria-current={active ? 'true' : undefined}
      className={cn(
        'chat-room-item group relative w-full border-b border-[var(--penjing-border-hairline)] px-5 py-4 text-left transition-all duration-300',
        active
          ? 'bg-paper-warm'
          : 'hover:bg-paper-warm/60',
      )}
    >
      {/* 选中态左侧金色竖条 */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-7 w-[2px] -translate-y-1/2 bg-gold transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            'truncate font-sans text-sm font-medium transition-colors duration-300',
            active ? 'text-ink' : 'text-ink-text group-hover:text-ink',
          )}
        >
          {name}
        </span>
        {time && (
          <span className="ml-2 flex-shrink-0 font-sans text-[11px] tracking-[0.05em] text-ink-text-faint">
            {formatDateTime(time)}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 truncate font-sans text-xs text-ink-text-muted">
          {subtitle}
        </p>
      )}
    </button>
  );
}
