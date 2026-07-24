// 底部信息

import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-background/80">
      <div className="container-luxury py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* 品牌信息 */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-3xl text-background">
              盆景艺术
              <span className="ml-3 text-xs font-sans uppercase tracking-[0.3em] text-accent">
                Penjing
              </span>
            </h3>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-background/80">
              凝练自然之美，传承千年技艺。每一株盆景，皆是时间与匠心的结晶，于方寸之间见天地。
            </p>
          </div>

          {/* 快速导航 */}
          <nav aria-label="底部导航">
            <h4 className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
              探索
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/bonsais" className="text-background/80 transition-colors hover:text-background">
                  盆景收藏
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-background/80 transition-colors hover:text-background">
                  分类浏览
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-background/80 transition-colors hover:text-background">
                  询价咨询
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="text-background/80 transition-colors hover:text-background">
                  我的收藏
                </Link>
              </li>
            </ul>
          </nav>

          {/* 联系方式 */}
          <div>
            <h4 className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
              联系
            </h4>
            <ul className="space-y-4 text-sm text-background/80">
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-accent" strokeWidth={1.5} aria-hidden="true" />
                <span>+86 400-888-0000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-accent" strokeWidth={1.5} aria-hidden="true" />
                <span>contact@penjing.example.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-accent" strokeWidth={1.5} aria-hidden="true" />
                <span>江苏省苏州市姑苏区盆景园 88 号</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 分隔线 + 版权 */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 text-xs text-background/70 md:flex-row">
          <p>© {year} 盆景艺术 Penjing. 保留所有权利。</p>
          <p className="tracking-wider">以匠心，敬自然</p>
        </div>
      </div>
    </footer>
  );
}
