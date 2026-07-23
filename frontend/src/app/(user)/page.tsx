// 首页：Hero + 精选盆景 + 分类导航 + 品牌故事 + CTA

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TreePine, Leaf, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { BonsaiCard } from '@/components/BonsaiCard';
import { BonsaiGridSkeleton, Skeleton } from '@/components/Loading';
import type { Bonsai, Category } from '@/lib/types';

// 分类封面图（使用稳定的外链图）
const CATEGORY_IMAGES: Record<string, string> = {
  default1:
    'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=800&q=80',
  default2:
    'https://images.unsplash.com/photo-1597055181300-e3633a917e3a?auto=format&fit=crop&w=800&q=80',
  default3:
    'https://images.unsplash.com/photo-1603991832113-9a4d7a8d4c3a?auto=format&fit=crop&w=800&q=80',
  default4:
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80',
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=1920&q=80';

const STORY_IMAGE =
  'https://images.unsplash.com/photo-1597055181300-e3633a917e3a?auto=format&fit=crop&w=1000&q=80';

export default function HomePage() {
  // 精选盆景
  const { data: featured, isLoading: featuredLoading } = useQuery<Bonsai[]>({
    queryKey: ['bonsais-featured'],
    queryFn: async () => {
      const res = await api.get<{ data: Bonsai[] }>('/bonsais/featured');
      return res.data;
    },
  });

  // 分类
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data;
    },
  });

  const displayCategories = (categories || []).slice(0, 4);
  const displayFeatured = (featured || []).slice(0, 6);

  return (
    <>
      {/* ============ Hero 区域 ============ */}
      <section className="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden">
        {/* 背景图 + 呼吸感缩放 */}
        <div className="absolute inset-0">
          <div
            className="h-full w-full bg-cover bg-center animate-slow-zoom"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          />
          {/* 渐变遮罩，确保文字可读 */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/50 via-primary-dark/40 to-primary-dark/70" />
        </div>

        {/* 标题 */}
        <div className="relative z-10 container-luxury text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6 text-xs uppercase tracking-[0.5em] text-accent"
          >
            Penjing · Bonsai Art
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-5xl font-medium leading-tight text-background md:text-7xl lg:text-8xl"
          >
            方寸之间
            <br />
            <span className="text-accent">见天地</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-background/70"
          >
            凝练自然之美，传承千年技艺。
            <br />
            每一株盆景，皆是时间与匠心的结晶。
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/bonsais"
              className="inline-flex items-center gap-2 bg-accent px-10 py-4 text-xs uppercase tracking-[0.3em] text-primary-dark transition-all duration-500 hover:bg-accent-light"
            >
              探索收藏
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 border border-background/40 px-10 py-4 text-xs uppercase tracking-[0.3em] text-background transition-all duration-500 hover:border-background hover:bg-background/10"
            >
              询价咨询
            </Link>
          </motion.div>
        </div>

        {/* 底部滚动提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="flex h-12 w-7 items-start justify-center rounded-full border border-background/30 p-1.5">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-1 rounded-full bg-accent"
            />
          </div>
        </motion.div>
      </section>

      {/* ============ 精选盆景 ============ */}
      <section className="bg-background py-28">
        <div className="container-luxury">
          <div className="mb-16 text-center">
            <span className="section-eyebrow justify-center">精选典藏</span>
            <h2 className="font-serif text-4xl text-primary md:text-5xl">
              匠心之选
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-light">
              每一株皆经精心甄选，承载着岁月的沉淀与自然的韵律。
            </p>
          </div>

          {featuredLoading ? (
            <BonsaiGridSkeleton count={6} />
          ) : displayFeatured.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {displayFeatured.map((bonsai, i) => (
                <BonsaiCard key={bonsai.id} bonsai={bonsai} index={i} />
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-text-muted">
              暂无精选盆景
            </p>
          )}

          <div className="mt-16 text-center">
            <Link
              href="/bonsais"
              className="inline-flex items-center gap-2 text-sm tracking-[0.2em] text-accent transition-all duration-300 hover:gap-3"
            >
              浏览全部盆景
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 分类导航 ============ */}
      <section className="bg-primary-dark py-28 text-background">
        <div className="container-luxury">
          <div className="mb-16 text-center">
            <span className="section-eyebrow justify-center">分类导览</span>
            <h2 className="font-serif text-4xl text-background md:text-5xl">
              探索品类
            </h2>
          </div>

          {categories ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {displayCategories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="group relative block aspect-[3/4] overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${
                          cat.coverImage || CATEGORY_IMAGES[`default${i + 1}`]
                        })`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/30 to-transparent transition-all duration-500 group-hover:from-primary-dark/95" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <TreePine
                        className="mb-3 h-6 w-6 text-accent"
                        strokeWidth={1.5}
                      />
                      <h3 className="font-serif text-2xl text-background">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-background/60">
                          {cat.description}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent opacity-0 transition-all duration-500 group-hover:opacity-100">
                        查看更多 <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ 品牌故事 ============ */}
      <section className="bg-background py-28">
        <div className="container-luxury">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* 左：图 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div
                className="aspect-[4/5] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${STORY_IMAGE})` }}
              />
              <div className="absolute -bottom-6 -right-6 hidden bg-accent p-8 md:block">
                <span className="font-serif text-4xl text-primary-dark">30+</span>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary-dark">
                  载匠心传承
                </p>
              </div>
            </motion.div>

            {/* 右：文 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="section-eyebrow">品牌故事</span>
              <h2 className="font-serif text-4xl text-primary md:text-5xl">
                以匠心
                <br />
                敬自然
              </h2>
              <div className="mt-8 space-y-5 text-sm leading-relaxed text-text-light">
                <p>
                  盆景艺术源远流长，始于唐代，盛于明清。它以"以小见大"的艺术手法，将山川草木的壮丽浓缩于方寸之间，是中华园林艺术的瑰宝。
                </p>
                <p>
                  我们遍访江南名园与岭南古苑，甄选每一株承载岁月痕迹的盆景。从选材、蟠扎到养护，每一步皆遵循古法，又融入现代审美，让千年技艺在当代焕发新生。
                </p>
                <p>
                  在这里，您寻得的不仅是一株盆景，更是一段与自然对话的时光。
                </p>
              </div>
              <div className="mt-10 flex gap-8">
                <div className="flex items-start gap-3">
                  <Leaf className="mt-1 h-5 w-5 text-accent" strokeWidth={1.5} />
                  <div>
                    <p className="font-serif text-2xl text-primary">古法</p>
                    <p className="text-xs text-text-muted">传承技艺</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-5 w-5 text-accent" strokeWidth={1.5} />
                  <div>
                    <p className="font-serif text-2xl text-primary">甄选</p>
                    <p className="text-xs text-text-muted">匠心之品</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ CTA 询价引导 ============ */}
      <section className="relative overflow-hidden bg-primary py-28 text-center">
        {/* 装饰性背景纹理 */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_50%,rgba(201,169,97,0.4),transparent_50%)]" />
        </div>
        <div className="container-luxury relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="section-eyebrow justify-center">私人洽购</span>
            <h2 className="font-serif text-4xl text-background md:text-6xl">
              寻觅您的那一株
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-background/60">
              每一株盆景皆独一无二。若您心仪某件藏品，或希望寻觅特定品类，
              <br className="hidden md:block" />
              欢迎与我们的顾问一对一交流，开启您的盆景收藏之旅。
            </p>
            <Link
              href="/chat"
              className="mt-12 inline-flex items-center gap-2 border border-accent px-12 py-4 text-xs uppercase tracking-[0.3em] text-accent transition-all duration-500 hover:bg-accent hover:text-primary"
            >
              开始询价
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
