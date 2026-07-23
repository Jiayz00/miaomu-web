// 根布局：字体、Provider、metadata

import type { Metadata } from 'next';
import { Cormorant_Garamond, Noto_Sans_SC } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// 衬线体标题（高级感）
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

// 无衬线正文（中文友好）
const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '盆景艺术 | Penjing',
    template: '%s | 盆景艺术',
  },
  description:
    '盆景艺术展示平台 —— 凝练自然之美，传承千年技艺。精选各地名贵盆景，每一株都是时间与匠心的结晶。',
  keywords: ['盆景', '盆景艺术', 'Penjing', 'Bonsai', '艺术收藏', '园林艺术'],
  authors: [{ name: '盆景艺术' }],
  openGraph: {
    title: '盆景艺术 | Penjing',
    description: '凝练自然之美，传承千年技艺。',
    type: 'website',
    locale: 'zh_CN',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${cormorant.variable} ${notoSans.variable}`}>
      <body className="min-h-screen bg-background text-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
