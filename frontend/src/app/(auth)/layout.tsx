// 认证页面布局：无 Header/Footer，纯净全屏体验

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
