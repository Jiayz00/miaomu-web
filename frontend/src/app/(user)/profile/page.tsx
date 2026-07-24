// 个人中心：个人信息编辑、修改密码、我的收藏、询价记录、退出登录

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User as UserIcon,
  Heart,
  MessageSquare,
  Mail,
  Shield,
  LogOut,
  Save,
  Key,
  Camera,
  Loader2,
  Phone,
  AtSign,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { InlineLoading } from '@/components/Loading';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { api, ApiError } from '@/lib/api';
import { cn, formatPrice, formatDateTime, getMainImage, resolveImageUrl } from '@/lib/utils';
import type { ChatRoom } from '@/lib/types';

type Tab = 'profile' | 'security' | 'favorites' | 'inquiries';

function ProfileContent() {
  const router = useRouter();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 个人信息编辑表单
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  // 监听 user 变化，挂载后异步获取的用户数据需同步到表单
  // 避免页面刷新时 user 初始为 null，表单显示空值
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 修改密码表单
  const [pwdForm, setPwdForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 头像上传
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 退出登录
  const [loggingOut, setLoggingOut] = useState(false);

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
    { key: 'security', label: '账号安全', icon: Key },
    { key: 'favorites', label: '我的收藏', icon: Heart },
    { key: 'inquiries', label: '询价记录', icon: MessageSquare },
  ];

  // 头像上传处理
  // 客户端预校验：类型、大小（最大 2MB），避免无效上传消耗带宽
  const handleAvatarUpload = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;

      // 类型校验
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setProfileMsg({
          type: 'error',
          text: '仅支持 JPG / PNG / WebP 格式',
        });
        return;
      }

      // 大小校验（2MB）
      const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
      if (file.size > MAX_AVATAR_SIZE) {
        setProfileMsg({
          type: 'error',
          text: '图片大小不能超过 2MB',
        });
        return;
      }

      setAvatarUploading(true);
      setProfileMsg(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<{ data: { avatar: string } }>(
          '/auth/avatar',
          formData
        );
        const updated = res.data ?? res;
        updateProfile({ avatar: updated.avatar });
        setProfileMsg({ type: 'success', text: '头像更新成功' });
      } catch (err) {
        setProfileMsg({
          type: 'error',
          text: err instanceof ApiError ? err.message : '头像上传失败',
        });
      } finally {
        setAvatarUploading(false);
      }
    },
    [updateProfile]
  );

  // 个人信息保存
  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({
        username: profileForm.username,
        email: profileForm.email,
        phone: profileForm.phone || undefined,
      });
      setProfileMsg({ type: 'success', text: '个人信息更新成功' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err instanceof ApiError ? err.message : '更新失败，请重试',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // 修改密码
  const handlePasswordChange = async () => {
    setPwdMsg(null);
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: '新密码至少 8 位' });
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword({
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdMsg({
        type: 'success',
        text: '密码修改成功，即将跳转登录页...',
      });
      // 后端已撤销所有 refresh token，前端已登出，跳转登录页
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err) {
      setPwdMsg({
        type: 'error',
        text: err instanceof ApiError ? err.message : '密码修改失败',
      });
    } finally {
      setPwdSaving(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push('/');
  };

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
          {/* 用户概览 - 头像可点击上传 */}
          <div className="mb-8 flex items-center gap-6 border border-text-muted/15 bg-surface p-8">
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary font-serif text-3xl text-background transition-all hover:opacity-80 disabled:opacity-50"
                aria-label="更换头像"
              >
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(user.avatar)}
                    alt={user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{user?.username.charAt(0).toUpperCase()}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                  {avatarUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />
                  )}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAvatarUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-primary">{user?.username}</h2>
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                {user?.email}
              </p>
              {user?.phone && (
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  {user.phone}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {user?.role === 'ADMIN' && (
                <span className="flex items-center gap-1.5 border border-accent/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-accent">
                  <Shield className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  管理员
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 border border-red-500/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                aria-label="退出登录"
              >
                {loggingOut ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                )}
                退出登录
              </button>
            </div>
          </div>

          {/* 标签切换（WCAG 4.1.2：tablist/tab/tabpanel 语义 + 方向键导航） */}
          <div
            className="mb-8 flex flex-wrap gap-2 border-b border-text-muted/15"
            role="tablist"
            aria-label="个人中心功能区"
            onKeyDown={(e) => {
              const keys: Tab[] = ['profile', 'security', 'favorites', 'inquiries'];
              const idx = keys.indexOf(tab);
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                setTab(keys[(idx + 1) % keys.length]);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setTab(keys[(idx - 1 + keys.length) % keys.length]);
              } else if (e.key === 'Home') {
                e.preventDefault();
                setTab(keys[0]);
              } else if (e.key === 'End') {
                e.preventDefault();
                setTab(keys[keys.length - 1]);
              }
            }}
          >
            {tabs.map((t) => {
              const panelId = `profile-panel-${t.key}`;
              const tabId = `profile-tab-${t.key}`;
              return (
                <button
                  key={t.key}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  aria-controls={panelId}
                  tabIndex={tab === t.key ? 0 : -1}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-5 py-3 text-sm transition-colors',
                    tab === t.key
                      ? 'border-accent text-primary'
                      : 'border-transparent text-text-light hover:text-primary'
                  )}
                >
                  <t.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 内容区 */}
          {tab === 'profile' && (
            <div
              id="profile-panel-profile"
              role="tabpanel"
              aria-labelledby="profile-tab-profile"
              tabIndex={0}
              className="border border-text-muted/15 bg-surface p-8 focus:outline-none"
            >
              <h3 className="mb-6 font-serif text-xl text-primary">编辑个人信息</h3>

              {/* role="status" 让屏读器播报操作结果（WCAG 4.1.3 Status Messages） */}
              {profileMsg && (
                <div
                  role={profileMsg.type === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                  className={cn(
                    'mb-4 border px-4 py-3 text-sm',
                    profileMsg.type === 'success'
                      ? 'border-green-500/30 bg-green-50 text-green-700'
                      : 'border-red-500/30 bg-red-50 text-red-700'
                  )}
                >
                  {profileMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="label-luxury" htmlFor="profile-username">用户名</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                    <input
                      id="profile-username"
                      type="text"
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, username: e.target.value }))
                      }
                      className="w-full border border-text-muted/20 bg-background py-2.5 pl-10 pr-3 text-primary outline-none transition-colors focus:border-accent"
                      placeholder="用户名"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-luxury" htmlFor="profile-email">邮箱</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                    <input
                      id="profile-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full border border-text-muted/20 bg-background py-2.5 pl-10 pr-3 text-primary outline-none transition-colors focus:border-accent"
                      placeholder="邮箱"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label-luxury" htmlFor="profile-phone">手机号</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                    <input
                      id="profile-phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full border border-text-muted/20 bg-background py-2.5 pl-10 pr-3 text-primary outline-none transition-colors focus:border-accent"
                      placeholder="手机号（选填）"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  角色：{user?.role === 'ADMIN' ? '管理员' : '普通用户'} · ID #{user?.id}
                </p>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="flex items-center gap-2 border border-accent bg-accent px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-primary transition-all hover:bg-accent/90 disabled:opacity-50"
                >
                  {profileSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  保存修改
                </button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div
              id="profile-panel-security"
              role="tabpanel"
              aria-labelledby="profile-tab-security"
              tabIndex={0}
              className="space-y-6 focus:outline-none"
            >
              {/* 修改密码 */}
              <div className="border border-text-muted/15 bg-surface p-8">
                <h3 className="mb-6 flex items-center gap-2 font-serif text-xl text-primary">
                  <Key className="h-5 w-5 text-accent" strokeWidth={1.5} aria-hidden="true" />
                  修改密码
                </h3>

                {pwdMsg && (
                  <div
                    role={pwdMsg.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className={cn(
                      'mb-4 border px-4 py-3 text-sm',
                      pwdMsg.type === 'success'
                        ? 'border-green-500/30 bg-green-50 text-green-700'
                        : 'border-red-500/30 bg-red-50 text-red-700'
                    )}
                  >
                    {pwdMsg.text}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="label-luxury" htmlFor="profile-old-password">原密码</label>
                    <input
                      id="profile-old-password"
                      type="password"
                      value={pwdForm.oldPassword}
                      onChange={(e) =>
                        setPwdForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                      }
                      className="w-full border border-text-muted/20 bg-background px-3 py-2.5 text-primary outline-none transition-colors focus:border-accent"
                      placeholder="请输入原密码"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="label-luxury" htmlFor="profile-new-password">新密码</label>
                    <input
                      id="profile-new-password"
                      type="password"
                      value={pwdForm.newPassword}
                      onChange={(e) =>
                        setPwdForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      className="w-full border border-text-muted/20 bg-background px-3 py-2.5 text-primary outline-none transition-colors focus:border-accent"
                      placeholder="8-32 位，需含大小写字母、数字、特殊字符"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="label-luxury" htmlFor="profile-confirm-password">确认新密码</label>
                    <input
                      id="profile-confirm-password"
                      type="password"
                      value={pwdForm.confirmPassword}
                      onChange={(e) =>
                        setPwdForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className="w-full border border-text-muted/20 bg-background px-3 py-2.5 text-primary outline-none transition-colors focus:border-accent"
                      placeholder="请再次输入新密码"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={pwdSaving}
                    className="flex items-center gap-2 border border-accent bg-accent px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-primary transition-all hover:bg-accent/90 disabled:opacity-50"
                  >
                    {pwdSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Key className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    )}
                    确认修改
                  </button>
                </div>

                <p className="mt-4 text-xs text-text-muted">
                  修改密码后，所有设备的登录状态将自动失效，需使用新密码重新登录。
                </p>
              </div>

              {/* 退出登录 */}
              <div className="border border-red-200/30 bg-surface p-8">
                <h3 className="mb-2 flex items-center gap-2 font-serif text-xl text-red-600">
                  <LogOut className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  退出登录
                </h3>
                <p className="mb-4 text-sm text-text-muted">
                  退出后将清除当前设备的登录状态，需重新登录才能访问个人内容。
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 border border-red-500/50 bg-red-50 px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  退出登录
                </button>
              </div>
            </div>
          )}

          {tab === 'favorites' && (
            <div
              id="profile-panel-favorites"
              role="tabpanel"
              aria-labelledby="profile-tab-favorites"
              tabIndex={0}
              className="border border-text-muted/15 bg-surface focus:outline-none"
            >
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
                  <Link
                    href="/bonsais"
                    className="mt-4 inline-flex items-center gap-2 border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
                  >
                    去浏览盆景
                  </Link>
                </div>
              )}
            </div>
          )}

          {tab === 'inquiries' && (
            <div
              id="profile-panel-inquiries"
              role="tabpanel"
              aria-labelledby="profile-tab-inquiries"
              tabIndex={0}
              className="border border-text-muted/15 bg-surface focus:outline-none"
            >
              {roomLoading ? (
                <InlineLoading />
              ) : rooms && rooms.length > 0 ? (
                <div className="divide-y divide-text-muted/10">
                  {rooms.map((room) => {
                    // status === 0 表示待处理（管理员尚未回复），1 表示已回复
                    const pending = room.status === 0;
                    return (
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
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider',
                          pending
                            ? 'bg-accent/15 text-accent-dark'
                            : 'bg-primary/10 text-primary-light'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            pending ? 'bg-accent' : 'bg-primary-light'
                          )}
                          aria-hidden="true"
                        />
                        {pending ? '待回复' : '已回复'}
                      </span>
                      <span className="ml-2 text-xs uppercase tracking-[0.2em] text-accent">
                        查看
                      </span>
                    </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-text-muted/30" strokeWidth={1} />
                  <p className="text-sm text-text-muted">还没有询价记录</p>
                  <Link
                    href="/bonsais"
                    className="mt-4 inline-flex items-center gap-2 border border-accent px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
                  >
                    去发起询价
                  </Link>
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
