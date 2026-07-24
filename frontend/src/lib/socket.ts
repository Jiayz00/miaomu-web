// Socket.io 客户端封装
// 处理连接认证、消息收发
//
// 设计要点：
// 1. 单例：全局唯一 socket 实例，避免多实例事件重复触发
// 2. token 刷新：reconnect_attempt 时从 localStorage 读取最新 token，
//    避免 socket 用过期 token 重连
// 3. 主动断开：disconnectSocket 设置 isManualDisconnect 标记，
//    避免断开后立即被 getSocket 重新创建

'use client';

import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL, STORAGE_KEYS } from './constants';

let socket: Socket | null = null;
// 标记是否为主动断开（登出时），主动断开后不再自动重连
let isManualDisconnect = false;

/**
 * 获取已建立的 Socket 实例（如不存在且未主动断开则创建）
 *
 * 关键设计：
 * - socket 存在且未主动断开 → 复用（即使 disconnected，让 socket.io 自己重连）
 * - socket 不存在且非主动断开 → 创建新 socket
 * - 主动断开状态 → 返回 null（需调 resetSocket 重置）
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  // 主动断开后不自动重建
  if (isManualDisconnect) return null;

  // 已有实例：无论 connected 还是 disconnected 都复用
  // disconnected 状态下 socket.io 会按 reconnection 配置自动重连
  if (socket) return socket;

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
    reconnectionDelayMax: 5000,
  });

  // 关键：每次重连前刷新 auth token，避免用过期 token 重连
  socket.on('reconnect_attempt', () => {
    const freshToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (socket && freshToken) {
      socket.auth = { token: freshToken };
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Socket 连接失败:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket 断开:', reason);
    // 服务器主动断开（如 token 失效）→ 不重连，需用户重新登录
    if (reason === 'io server disconnect') {
      isManualDisconnect = true;
    }
  });

  return socket;
}

/**
 * 建立连接
 */
export function connectSocket(): Socket | null {
  // 重置主动断开标记，允许创建新连接
  isManualDisconnect = false;
  return getSocket();
}

/**
 * 断开连接（用户登出时调用）
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
  isManualDisconnect = true;
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
 * 加入会话房间
 * 后端 'messageReceived' 事件仅推送给已加入 room:${roomId} 的客户端，
 * 因此切换会话时必须调用此方法，否则收不到实时消息
 */
export function joinRoom(roomId: number): void {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('joinRoom', { roomId });
  }
}

/**
 * 监听新消息
 *
 * 后端事件设计：
 * - 'messageReceived'：发给会话房间内所有成员（用户 + 已加入房间的管理员）
 * - 'newMessage'：发给 admin 房间（管理员全局通知），payload 为 { roomId, message }
 *
 * 客户端需同时监听两个事件并归一化 payload，否则普通用户收不到消息
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

  // 'messageReceived' 的 payload 就是 message 对象本身
  const onReceived = (msg: Parameters<typeof callback>[0]) => {
    if (msg && typeof msg === 'object' && 'id' in msg) {
      callback(msg);
    }
  };

  // 'newMessage' 的 payload 为 { roomId, message }，需提取 message
  const onNew = (data: { roomId: number; message: Parameters<typeof callback>[0] }) => {
    if (data?.message && typeof data.message === 'object' && 'id' in data.message) {
      callback(data.message);
    }
  };

  s.on('messageReceived', onReceived);
  s.on('newMessage', onNew);

  return () => {
    s.off('messageReceived', onReceived);
    s.off('newMessage', onNew);
  };
}

/**
 * 重置 socket（token 变化/登出时调用）
 */
export function resetSocket(): void {
  disconnectSocket();
}
