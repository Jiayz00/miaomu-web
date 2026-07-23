// 我的收藏页：展示收藏的盆景，可取消收藏

'use client';

import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BonsaiGridSkeleton } from '@/components/Loading';
import { useFavorites, useToggleFavorite } from '@/hooks/use-favorites';
import { formatPrice, getMainImage } from '@/lib/utils';

function FavoritesContent() {
  const { data: favorites, isLoading } = useFavorites();
  const toggleFav = useToggleFavorite();

  const list = favorites || [];

  return (
    <div className="pt-28">
      <div className="container-luxury py-12 text-center">
        <span className="section-eyebrow justify-center">我的珍藏</span>
        <h1 className="font-serif text-4xl text-primary md:text-5xl">我的收藏</h1>
        <p className="mt-3 text-sm text-text-light">
          {list.length > 0 ? `已收藏 ${list.length} 件盆景` : '您还没有收藏任何盆景'}
        </p>
      </div>

      <div className="container-luxury pb-28">
        {isLoading ? (
          <BonsaiGridSkeleton count={4} />
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((bonsai, i) => (
              <div key={bonsai.id} className="group">
                <div className="relative overflow-hidden bg-primary-dark/5">
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    {getMainImage(bonsai.images) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMainImage(bonsai.images)}
                        alt={bonsai.name}
                        className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="font-serif text-4xl text-primary/30">盆</span>
                      </div>
                    )}
                  </div>
                  {/* 取消收藏按钮 */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleFav.mutate({ bonsaiId: bonsai.id, favorited: true })
                    }
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary-dark transition-all duration-300 hover:scale-110"
                    aria-label="取消收藏"
                  >
                    <Heart className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="pt-5">
                  <Link href={`/bonsais/${bonsai.slug}`}>
                    <h3 className="font-serif text-xl font-medium text-primary transition-colors group-hover:text-accent">
                      {bonsai.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xs text-text-muted">¥</span>
                      <span className="font-serif text-lg text-accent">
                        {formatPrice(bonsai.price)}
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Heart className="mb-4 h-12 w-12 text-text-muted/30" strokeWidth={1} />
            <p className="font-serif text-2xl text-primary">收藏夹空空如也</p>
            <p className="mt-2 text-sm text-text-muted">浏览盆景，点击收藏您心仪的藏品</p>
            <Link
              href="/bonsais"
              className="mt-8 inline-flex items-center gap-2 border border-accent px-8 py-3.5 text-xs uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:bg-accent hover:text-primary"
            >
              去逛逛 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  );
}
