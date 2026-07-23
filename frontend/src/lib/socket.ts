// Socket.io 客户端封装
// 处理连接认证、消息收发

'use client';

import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL, STORAGE_KEYS } from './constants';

let socket: Socket | null = null;

/**
 * 获取已建立的 Socket 实例（如不存在则创建）
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (socket && socket.connected) return socket;

  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token) return null;

  // SOCKET_URL 为空时连接同源（生产环境通过 Nginx 代理 /socket.io/）
  // 显式指定时连接指定地址（开发环境）
  const socketUrl = SOCKET_URL || undefined;
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (err) => {
    console.error('Socket 连接失败:', err.message);
  });

  return socket;
}

/**
 * 建立连接
 */
export function connectSocket(): Socket | null {
  return getSocket();
}

/**
 * 断开连接
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * 发送消息
 */
export function sendMessage(roomId: number, content: string): void {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('sendMessage', { roomId, content });
  }
}

/**
 * 监听新消息
 */
export function onNewMessage(
  callback: (message: {
    id: number;
    roomId: number;
    senderId: number;
    content: string;
    createdAt: string;
  }) => void
): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on('newMessage', callback);
  return () => {
    s.off('newMessage', callback);
  };
}

/**
 * 重置 socket（token 变化时调用）
 */
export function resetSocket(): void {
  disconnectSocket();
}
