// 个人中心：个人信息、我的收藏、询价记录

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { User as UserIcon, Heart, MessageSquare, Mail, Shield } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { InlineLoading } from '@/components/Loading';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { api } from '@/lib/api';
import { cn, formatPrice, formatDateTime, getMainImage } from '@/lib/utils';
import type { ChatRoom } from '@/lib/types';

type Tab = 'profile' | 'favorites' | 'inquiries';

function ProfileContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  const { data: favorites, isLoading: favLoading } = useFavorites();
  const { data: rooms, isLoading: roomLoading } = useQuery<ChatRoom[]>({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const res = await api.get<{ data: ChatRoom[] }>('/chat/rooms');
      return res.data;
    },
  });

  const tabs: { key: Tab; label: string; icon: typeof UserIcon }[] = [
    { key: 'profile', label: '个人信息', icon: UserIcon },
    { key: 'favorites', label: '我的收藏', icon: Heart },
    { key: 'inquiries', label: '询价记录', icon: MessageSquare },
  ];

  return (
    <div className="pt-28">
      <div className="container-luxury py-12">
        <div className="mb-10 text-center">
          <span className="section-eyebrow justify-center">个人中心</span>
          <h1 className="font-serif text-4xl text-primary md:text-5xl">
            我的账户
          </h1>
        </div>

        <div className="mx-auto max-w-5xl">
          {/* 用户概览 */}
          <div className="mb-8 flex items-center gap-6 border border-text-muted/15 bg-surface p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-serif text-2xl text-background">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-primary">{user?.username}</h2>
              <p className="text-sm text-text-muted">{user?.email}</p>
            </div>
            {user?.role === 'ADMIN' && (
              <span className="flex items-center gap-1.5 border border-accent/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-accent">
                <Shield className="h-3 w-3" strokeWidth={1.5} />
                管理员
              </span>
            )}
          </div>

          {/* 标签切换 */}
          <div className="mb-8 flex gap-2 border-b border-text-muted/15">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-5 py-3 text-sm transition-colors',
                  tab === t.key
                    ? 'border-accent text-primary'
                    : 'border-transparent text-text-light hover:text-primary'
                )}
              >
                <t.icon className="h-4 w-4" strokeWidth={1.5} />
                {t.label}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          {tab === 'profile' && (
            <div className="border border-text-muted/15 bg-surface p-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="label-luxury">用户名</p>
                  <p className="text-primary">{user?.username}</p>
                </div>
                <div>
                  <p className="label-luxury">邮箱</p>
                  <p className="flex items-center gap-2 text-primary">
                    <Mail className="h-4 w-4 text-accent" strokeWidth={1.5} />
                    {user?.email}
                  </p>
                </div>
                <div>
                  <p className="label-luxury">角色</p>
                  <p className="text-primary">
                    {user?.role === 'ADMIN' ? '管理员' : '普通用户'}
                  </p>
                </div>
                <div>
                  <p className="label-luxury">用户 ID</p>
                  <p className="text-primary">#{user?.id}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'favorites' && (
            <div className="border border-text-muted/15 bg-surface">
              {favLoading ? (
                <InlineLoading />
              ) : favorites && favorites.length > 0 ? (
                <div className="divide-y divide-text-muted/10">
                  {favorites.map((b) => (
                    <Link
                      key={b.id}
                      href={`/bonsais/${b.slug}`}
                      className="flex items-center gap-4 p-5 transition-colors hover:bg-background"
                    >
                      <div className="h-16 w-16 overflow-hidden bg-primary-dark/10">
                        {getMainImage(b.images) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMainImage(b.images)}
                            alt={b.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-serif text-lg text-primary">{b.name}</p>
                        <p className="text-xs text-text-muted">
                          {b.origin} · {b.year}
                        </p>
                      </div>
                      <span className="font-serif text-lg text-accent">
                        ¥{formatPrice(b.price)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Heart className="mb-3 h-10 w-10 text-text-muted/30" strokeWidth={1} />
                  <p className="text-sm text-text-muted">还没有收藏任何盆景</p>
                </div>
              )}
            </div>
          )}

          {tab === 'inquiries' && (
            <div className="border border-text-muted/15 bg-surface">
              {roomLoading ? (
                <InlineLoading />
              ) : rooms && rooms.length > 0 ? (
                <div className="divide-y divide-text-muted/10">
                  {rooms.map((room) => (
                    <Link
                      key={room.id}
                      href={`/chat?room=${room.id}`}
                      className="flex items-center gap-4 p-5 transition-colors hover:bg-background"
                    >
                      <MessageSquare className="h-8 w-8 text-accent" strokeWidth={1} />
                      <div className="flex-1">
                        <p className="font-serif text-lg text-primary">
                          {room.bonsai?.name || `会话 #${room.id}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDateTime(room.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-accent">
                        查看
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-text-muted/30" strokeWidth={1} />
                  <p className="text-sm text-text-muted">还没有询价记录</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
