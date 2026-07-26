// 个人中心：个人信息编辑、修改密码、我的收藏、询价记录、退出登录
// 东方雅致设计系统：profile-banner (section-ink) + profile-layout (sidebar + content)

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

  const tabs: { key: Tab; label: string; icon: typeof UserIcon; char: string }[] = [
    { key: 'profile', label: '账户设置', icon: UserIcon, char: '设' },
    { key: 'security', label: '账号安全', icon: Key, char: '安' },
    { key: 'favorites', label: '我的收藏', icon: Heart, char: '藏' },
    { key: 'inquiries', label: '询价记录', icon: MessageSquare, char: '询' },
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

  const favCount = favorites?.length ?? 0;
  const inquiryCount = rooms?.length ?? 0;

  return (
    <div className="pt-[72px]" aria-label="个人中心">
      {/* ===== 用户欢迎横幅 ===== */}
      <section
        className="section-ink texture-ink relative overflow-hidden"
        aria-label="个人中心欢迎区"
      >
        <div className="container-penjing py-14 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.4fr_1fr] md:gap-12"
          >
            <div className="flex items-center gap-5 md:gap-6">
              {/* 头像：可点击上传 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="group relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-ink-deep font-serif text-2xl font-semibold text-gold-bright shadow-[0_0_0_6px_var(--penjing-gold-10)] transition-all hover:opacity-90 disabled:opacity-50 md:h-16 md:w-16"
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
                <span
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-paper" />
                  ) : (
                    <Camera className="h-5 w-5 text-paper" strokeWidth={1.5} />
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
              <div className="min-w-0">
                <div className="eyebrow-label mb-2 text-gold-bright">
                  {user?.role === 'ADMIN' ? '藏苑雅士' : '藏苑雅客'}
                </div>
                <h1 className="display-section m-0 text-paper">
                  {user?.username}
                </h1>
                <p className="mt-1.5 font-sans text-[13px] tracking-[0.08em] text-paper/65">
                  {user?.email}
                  {user?.phone && ` · ${user.phone}`}
                </p>
              </div>
            </div>

            {/* 统计数字 */}
            <dl className="flex items-center justify-start gap-8 md:justify-end">
              <div className="flex flex-col-reverse gap-1">
                <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-paper/55">
                  收藏
                </dt>
                <dd className="m-0 font-serif text-[32px] font-semibold leading-none text-gold-bright md:text-[44px]">
                  {favCount}
                  <span className="ml-1 font-sans text-sm font-normal text-gold-bright/70">
                    件
                  </span>
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-1">
                <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-paper/55">
                  询价
                </dt>
                <dd className="m-0 font-serif text-[32px] font-semibold leading-none text-gold-bright md:text-[44px]">
                  {inquiryCount}
                  <span className="ml-1 font-sans text-sm font-normal text-gold-bright/70">
                    次
                  </span>
                </dd>
              </div>
              {user?.role === 'ADMIN' && (
                <div className="flex flex-col-reverse gap-1">
                  <dt className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-paper/55">
                    身份
                  </dt>
                  <dd className="m-0 flex items-center font-serif text-[18px] font-semibold text-gold-bright">
                    <Shield className="mr-1.5 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    管理员
                  </dd>
                </div>
              )}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* ===== 个人中心主体 ===== */}
      <section className="section-paper" aria-label="个人中心主体">
        <div className="container-penjing">
          <div className="grid grid-cols-1 gap-8 py-14 md:py-16 lg:grid-cols-[260px_1fr] lg:gap-12">
            {/* 左侧导航 */}
            <aside className="lg:sticky lg:top-[100px]" aria-label="个人中心导航">
              <nav
                className="flex flex-col gap-0 border-t border-[var(--penjing-border-hairline)]"
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
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      id={tabId}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={panelId}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        'flex items-center gap-3.5 border-b border-[var(--penjing-border-hairline)] border-l-2 px-4 py-4 text-left font-sans text-sm transition-colors',
                        active
                          ? 'border-l-gold bg-paper-warm font-medium text-ink'
                          : 'border-l-transparent text-ink-text-secondary hover:border-l-gold hover:text-ink-text'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center font-serif text-sm transition-opacity',
                          active ? 'text-gold-deep opacity-100' : 'text-gold-deep opacity-70'
                        )}
                        aria-hidden="true"
                      >
                        {t.char}
                      </span>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-3.5 border-b border-[var(--penjing-border-hairline)] border-l-2 border-l-transparent px-4 py-4 text-left font-sans text-sm text-ink-text-muted transition-colors hover:border-l-[var(--penjing-state-error)] hover:text-[var(--penjing-state-error)] disabled:opacity-50"
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center font-serif text-sm opacity-70"
                    aria-hidden="true"
                  >
                    出
                  </span>
                  <span className="flex items-center gap-1.5">
                    {loggingOut ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    )}
                    退出登录
                  </span>
                </button>
              </nav>
            </aside>

            {/* 右侧内容 */}
            <div className="min-w-0">
              {/* 面板：账户设置（个人信息） */}
              {tab === 'profile' && (
                <div
                  id="profile-panel-profile"
                  role="tabpanel"
                  aria-labelledby="profile-tab-profile"
                  tabIndex={0}
                  className="focus:outline-none"
                >
                  <div className="mb-8 border-b border-[var(--penjing-border-fine)] pb-6">
                    <h2 className="display-section m-0 mb-2 text-[28px] md:text-[36px]">
                      账户设置
                    </h2>
                    <p className="font-sans text-[13px] text-ink-text-muted">
                      维护您的藏苑身份
                    </p>
                  </div>

                  {/* role="status" 让屏读器播报操作结果（WCAG 4.1.3 Status Messages） */}
                  {profileMsg && (
                    <div
                      role={profileMsg.type === 'error' ? 'alert' : 'status'}
                      aria-live="polite"
                      className={cn(
                        'mb-6 border px-4 py-3 font-sans text-sm',
                        profileMsg.type === 'success'
                          ? 'border-[rgba(45,90,61,0.25)] bg-[rgba(45,90,61,0.08)] text-[var(--penjing-state-success)]'
                          : 'border-[rgba(184,66,58,0.25)] bg-[rgba(184,66,58,0.08)] text-[var(--penjing-state-error)]'
                      )}
                    >
                      {profileMsg.text}
                    </div>
                  )}

                  <form
                    className="flex flex-col gap-10"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleProfileSave();
                    }}
                  >
                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-6 flex w-full items-center gap-3 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                        基本信息
                        <span className="h-px flex-1 bg-[var(--penjing-border-fine)]" aria-hidden="true" />
                      </legend>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label
                            className="font-sans text-xs font-medium tracking-[0.1em] text-ink-text-secondary"
                            htmlFor="profile-username"
                          >
                            用户名
                          </label>
                          <div className="relative">
                            <UserIcon
                              className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-text-faint"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            <input
                              id="profile-username"
                              type="text"
                              value={profileForm.username}
                              onChange={(e) =>
                                setProfileForm((prev) => ({ ...prev, username: e.target.value }))
                              }
                              className="input-penjing !pl-6"
                              placeholder="用户名"
                              autoComplete="username"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label
                            className="font-sans text-xs font-medium tracking-[0.1em] text-ink-text-secondary"
                            htmlFor="profile-email"
                          >
                            邮箱
                          </label>
                          <div className="relative">
                            <Mail
                              className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-text-faint"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            <input
                              id="profile-email"
                              type="email"
                              value={profileForm.email}
                              onChange={(e) =>
                                setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                              }
                              className="input-penjing !pl-6"
                              placeholder="邮箱"
                              autoComplete="email"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label
                            className="font-sans text-xs font-medium tracking-[0.1em] text-ink-text-secondary"
                            htmlFor="profile-phone"
                          >
                            手机号
                          </label>
                          <div className="relative">
                            <Phone
                              className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-text-faint"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            <input
                              id="profile-phone"
                              type="tel"
                              value={profileForm.phone}
                              onChange={(e) =>
                                setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                              }
                              className="input-penjing !pl-6"
                              placeholder="手机号（选填）"
                              autoComplete="tel"
                            />
                          </div>
                        </div>
                      </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-sans text-xs text-ink-text-muted">
                        角色：{user?.role === 'ADMIN' ? '管理员' : '普通用户'} · ID #{user?.id}
                      </p>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="btn-ink disabled:opacity-50"
                      >
                        {profileSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        )}
                        保存修改
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 面板：账号安全（修改密码） */}
              {tab === 'security' && (
                <div
                  id="profile-panel-security"
                  role="tabpanel"
                  aria-labelledby="profile-tab-security"
                  tabIndex={0}
                  className="focus:outline-none"
                >
                  <div className="mb-8 border-b border-[var(--penjing-border-fine)] pb-6">
                    <h2 className="display-section m-0 mb-2 text-[28px] md:text-[36px]">
                      账号安全
                    </h2>
                    <p className="font-sans text-[13px] text-ink-text-muted">
                      定期更换密码以保护账户安全
                    </p>
                  </div>

                  <form
                    className="flex flex-col gap-8"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePasswordChange();
                    }}
                  >
                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-6 flex w-full items-center gap-3 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-deep">
                        修改密码
                        <span className="h-px flex-1 bg-[var(--penjing-border-fine)]" aria-hidden="true" />
                      </legend>

                      {pwdMsg && (
                        <div
                          role={pwdMsg.type === 'error' ? 'alert' : 'status'}
                          aria-live="polite"
                          className={cn(
                            'mb-6 border px-4 py-3 font-sans text-sm',
                            pwdMsg.type === 'success'
                              ? 'border-[rgba(45,90,61,0.25)] bg-[rgba(45,90,61,0.08)] text-[var(--penjing-state-success)]'
                              : 'border-[rgba(184,66,58,0.25)] bg-[rgba(184,66,58,0.08)] text-[var(--penjing-state-error)]'
                          )}
                        >
                          {pwdMsg.text}
                        </div>
                      )}

                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1.5">
                          <label
                            className="font-sans text-xs font-medium tracking-[0.1em] text-ink-text-secondary"
                            htmlFor="profile-old-password"
                          >
                            原密码
                          </label>
                          <input
                            id="profile-old-password"
                            type="password"
                            value={pwdForm.oldPassword}
                            onChange={(e) =>
                              setPwdForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                            }
                            className="input-penjing"
                            placeholder="请输入原密码"
                            autoComplete="current-password"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label
                            className="font-sans text-xs font-medium tracking-[0.1em] text-ink-text-secondary"
                            htmlFor="profile-new-password"
                          >
                            新密码
                          </label>
                          <input
                            id="profile-new-password"
                            type="password"
                            value={pwdForm.newPassword}
                            onChange={(e) =>
                              setPwdForm((prev) => ({ ...prev, newPassword: e.target.value }))
                            }
                            className="input-penjing"
                            placeholder="8-32 位，需含大小写字母、数字、特殊字符"
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label
                            className="font-sans text-xs font-medium tracking-[0.1em] text-ink-text-secondary"
                            htmlFor="profile-confirm-password"
                          >
                            确认新密码
                          </label>
                          <input
                            id="profile-confirm-password"
                            type="password"
                            value={pwdForm.confirmPassword}
                            onChange={(e) =>
                              setPwdForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                            }
                            className="input-penjing"
                            placeholder="请再次输入新密码"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-sans text-xs text-ink-text-muted">
                        修改密码后，所有设备的登录状态将自动失效，需使用新密码重新登录。
                      </p>
                      <button
                        type="submit"
                        disabled={pwdSaving}
                        className="btn-ink disabled:opacity-50"
                      >
                        {pwdSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Key className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        )}
                        确认修改
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 面板：我的收藏 */}
              {tab === 'favorites' && (
                <div
                  id="profile-panel-favorites"
                  role="tabpanel"
                  aria-labelledby="profile-tab-favorites"
                  tabIndex={0}
                  className="focus:outline-none"
                >
                  <div className="mb-8 flex items-end justify-between gap-6 border-b border-[var(--penjing-border-fine)] pb-6">
                    <div>
                      <h2 className="display-section m-0 mb-2 text-[28px] md:text-[36px]">
                        我的收藏
                      </h2>
                      <p className="font-sans text-[13px] text-ink-text-muted">
                        共 {favCount} 件藏品
                      </p>
                    </div>
                  </div>

                  {favLoading ? (
                    <InlineLoading />
                  ) : favorites && favorites.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {favorites.map((b) => (
                        <Link
                          key={b.id}
                          href={`/bonsais/${b.slug}`}
                          className="group flex flex-col border border-[var(--penjing-border-hairline)] bg-paper transition-all duration-500 hover:-translate-y-1 hover:border-gold hover:shadow-[var(--penjing-shadow-hover)]"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-ink-deepest">
                            {getMainImage(b.images) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getMainImage(b.images)}
                                alt={b.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 p-4">
                            <h3 className="display-card m-0 text-[18px] text-ink transition-colors group-hover:text-ink-deep">
                              {b.name}
                            </h3>
                            <p className="font-sans text-xs text-ink-text-muted">
                              {b.origin} · {b.year}
                            </p>
                            <p className="mt-2 font-serif text-[15px] text-ink">
                              ¥{formatPrice(b.price)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-5 border border-[var(--penjing-border-fine)] bg-paper-warm p-12">
                      <p className="body-base m-0 text-ink-text-muted">
                        您尚未收藏任何藏品，浏览盆景并点击收藏您心仪的作品。
                      </p>
                      <Link href="/bonsais" className="btn-outline-gold">
                        步入藏苑
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* 面板：询价记录 */}
              {tab === 'inquiries' && (
                <div
                  id="profile-panel-inquiries"
                  role="tabpanel"
                  aria-labelledby="profile-tab-inquiries"
                  tabIndex={0}
                  className="focus:outline-none"
                >
                  <div className="mb-8 flex items-end justify-between gap-6 border-b border-[var(--penjing-border-fine)] pb-6">
                    <div>
                      <h2 className="display-section m-0 mb-2 text-[28px] md:text-[36px]">
                        询价记录
                      </h2>
                      <p className="font-sans text-[13px] text-ink-text-muted">
                        共 {inquiryCount} 条询价
                      </p>
                    </div>
                  </div>

                  {roomLoading ? (
                    <InlineLoading />
                  ) : rooms && rooms.length > 0 ? (
                    <div className="flex flex-col border border-[var(--penjing-border-fine)]">
                      {rooms.map((room) => {
                        // status === 0 表示待处理（管理员尚未回复），1 表示已回复
                        const pending = room.status === 0;
                        return (
                          <Link
                            key={room.id}
                            href={`/chat?room=${room.id}`}
                            className="grid grid-cols-1 gap-3 border-b border-[var(--penjing-border-hairline)] p-5 transition-colors last:border-b-0 hover:bg-paper-warm md:grid-cols-[1.5fr_1fr_auto] md:items-center md:gap-4 md:px-6"
                          >
                            <div className="min-w-0">
                              <h3 className="m-0 mb-1 font-serif text-[18px] font-semibold text-ink">
                                {room.bonsai?.name || `会话 #${room.id}`}
                              </h3>
                              <p className="m-0 font-sans text-xs text-ink-text-muted">
                                {room.bonsai ? `关于：${room.bonsai.name}` : '一般咨询'}
                              </p>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-ink-text-faint">
                                询价时间
                              </span>
                              <span className="font-serif text-sm text-ink-text-secondary">
                                {formatDateTime(room.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 md:justify-end">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center whitespace-nowrap border px-3.5 py-1.5 font-sans text-[11px] font-medium tracking-[0.1em]',
                                  pending
                                    ? 'border-[var(--penjing-border-gold)] bg-gold/12 text-gold-deep'
                                    : 'border-[rgba(45,90,61,0.25)] bg-[rgba(45,90,61,0.10)] text-[var(--penjing-state-success)]'
                                )}
                              >
                                {pending ? '待回复' : '已回复'}
                              </span>
                              <span className="font-sans text-xs uppercase tracking-[0.1em] text-gold-deep">
                                查看
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-5 border border-[var(--penjing-border-fine)] bg-paper-warm p-12">
                      <p className="body-base m-0 text-ink-text-muted">
                        您还没有询价记录，从盆景详情页发起咨询。
                      </p>
                      <Link href="/bonsais" className="btn-outline-gold">
                        去发起询价
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
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
