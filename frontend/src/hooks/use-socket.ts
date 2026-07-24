// Socket.io Hook
// 管理连接生命周期、消息收发

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { connectSocket, disconnectSocket, onNewMessage, sendMessage as emitMessage, joinRoom as emitJoinRoom } from '@/lib/socket';
import type { ChatMessage } from '@/lib/types';

export interface IncomingMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  createdAt: string;
}

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 建立连接
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // 监听新消息
    const unsubscribe = onNewMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    unsubscribeRef.current = unsubscribe;

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubscribe();
    };
  }, [isAuthenticated]);

  // 发送消息
  const sendMessage = useCallback((roomId: number, content: string) => {
    emitMessage(roomId, content);
  }, []);

  // 加入会话房间（切换会话时调用，否则收不到 'messageReceived' 事件）
  const joinRoom = useCallback((roomId: number) => {
    emitJoinRoom(roomId);
  }, []);

  // 清空消息记录（切换房间时）
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 断开连接（登出时）
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    disconnectSocket();
    setIsConnected(false);
    setMessages([]);
  }, []);

  return {
    isConnected,
    messages,
    currentUserId: userId,
    sendMessage,
    joinRoom,
    clearMessages,
    disconnect,
  };
}
