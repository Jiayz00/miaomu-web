// 数据看板：指标卡片 + 趋势图 + 排行 + 分类占比 + 库存预警 + 询价漏斗 + 用户增长
//
// 重构要点：
// 1. recharts 通过 next/dynamic 懒加载，避免进入主 bundle（体积优化 ~400KB）
// 2. 修复响应结构：后端返回 { days, list } / { byViews, byFavorites } / { total, list }，
//    前端需正确解构，原实现直接当数组用导致图表空白
// 3. 新增库存预警、询价统计、用户增长、转化漏斗模块，看板更完整

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  TreePine,
  Users,
  Eye,
  Heart,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Clock,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { api } from '@/lib/api';
import { animateValue, formatDateTime, formatPrice, cn } from '@/lib/utils';
import type {
  DashboardStats,
  ChartPoint,
  TopBonsai,
  CategoryDistribution,
  ChatRoom,
  InventoryAlert,
  InquiryStats,
  UserGrowthTrend,
} from '@/lib/types';

// 懒加载图表组件（recharts 体积大，单独分包）
const ViewsTrendChart = dynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.ViewsTrendChart),
  { loading: () => <ChartSkeletonLazy />, ssr: false }
);
const FavoritesTrendChart = dynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.FavoritesTrendChart),
  { loading: () => <ChartSkeletonLazy />, ssr: false }
);
const UserGrowthChart = dynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.UserGrowthChart),
  { loading: () => <ChartSkeletonLazy />, ssr: false }
);
const InquiryTrendChart = dynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.InquiryTrendChart),
  { loading: () => <ChartSkeletonLazy />, ssr: false }
);
const TopBonsaisChart = dynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.TopBonsaisChart),
  { loading: () => <ChartSkeletonLazy />, ssr: false }
);
const CategoryDistChart = dynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.CategoryDistChart),
  { loading: () => <ChartSkeletonLazy />, ssr: false }
);

// 图表骨架（懒加载占位）
function ChartSkeletonLazy() {
  return (
    <div className="flex h-[280px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <span className="font-sans text-[11px] uppercase tracking-[0.3em]">
          图表加载中
        </span>
      </div>
    </div>
  );
}

// 数字动画卡片：东方雅致风格的指标卡
// - 顶部金色 eyebrow 标签 + 大号 serif 数字
// - 右上角金色图标徽章
// - 趋势指示：正向 ink-soft / 负向 state-error
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
}: {
  icon: typeof TreePine;
  label: string;
  value: number;
  suffix?: string;
  trend?: { value: number; label: string };
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 返回取消函数，组件卸载或 value 变化时清理 RAF，避免内存泄漏
    return animateValue(0, value, 1500, (v) => setDisplay(v));
  }, [value]);

  return (
    <div className="group relative overflow-hidden border border-[var(--penjing-border-fine)] bg-paper-warm p-6 transition-all duration-500 hover:border-[var(--penjing-border-gold)] hover:shadow-[var(--penjing-shadow-hover)]">
      {/* 顶部金色短线装饰 */}
      <span
        className="absolute left-0 top-0 h-px w-12 bg-gold transition-all duration-500 group-hover:w-16"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="eyebrow-label">{label}</p>
          <p
            ref={ref}
            className="mt-3 font-serif text-[40px] leading-none text-ink"
          >
            {display.toLocaleString('zh-CN')}
            {suffix && (
              <span className="ml-1 font-sans text-sm text-ink-text-secondary">
                {suffix}
              </span>
            )}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-3 flex items-center gap-1 font-sans text-xs',
                trend.value >= 0 ? 'text-ink-soft' : 'text-state-error',
              )}
            >
              <TrendingUp className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              {trend.value >= 0 ? '+' : ''}
              {trend.value} {trend.label}
            </p>
          )}
        </div>
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-[var(--penjing-border-gold)] bg-paper"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

// 图表卡片容器：纸面卡片 + serif 标题 + 金色短线
function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border border-[var(--penjing-border-fine)] bg-paper-warm p-6',
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="h-px w-8 bg-gold"
            aria-hidden="true"
          />
          <h3 className="display-card text-ink">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

type RangeType = 'preset' | 'custom';

interface DateRangeState {
  type: RangeType;
  days: number;
  startDate: string;
  endDate: string;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(): DateRangeState {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    type: 'preset',
    days: 7,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

function buildRangeQuery(range: DateRangeState): string {
  const params = new URLSearchParams();
  if (range.type === 'custom') {
    params.set('startDate', range.startDate);
    params.set('endDate', range.endDate);
  } else {
    params.set('days', String(range.days));
  }
  return `?${params.toString()}`;
}

export default function DashboardPage() {
  const [range, setRange] = useState<DateRangeState>(getDefaultDateRange);
  const querySuffix = buildRangeQuery(range);

  // 看板概览
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardStats }>(
        '/admin/analytics/dashboard'
      );
      return res.data;
    },
  });

  // 浏览量趋势（后端返回 { days, list }）
  const { data: viewsTrend } = useQuery<{ days: number; list: ChartPoint[] }>({
    queryKey: ['admin-views', range],
    queryFn: async () => {
      const res = await api.get<{ data: { days: number; list: ChartPoint[] } }>(
        `/admin/analytics/views${querySuffix}`
      );
      return res.data;
    },
  });

  // 收藏量趋势
  const { data: favoritesTrend } = useQuery<{ days: number; list: ChartPoint[] }>({
    queryKey: ['admin-favorites-trend', range],
    queryFn: async () => {
      const res = await api.get<{ data: { days: number; list: ChartPoint[] } }>(
        `/admin/analytics/favorites${querySuffix}`
      );
      return res.data;
    },
  });

  // 用户增长趋势
  const { data: userGrowth } = useQuery<UserGrowthTrend>({
    queryKey: ['admin-user-growth', range],
    queryFn: async () => {
      const res = await api.get<{ data: UserGrowthTrend }>(
        `/admin/analytics/user-growth${querySuffix}`
      );
      return res.data;
    },
  });

  // 询价统计（含转化漏斗与趋势）
  const { data: inquiryStats } = useQuery<InquiryStats>({
    queryKey: ['admin-inquiry-stats', range],
    queryFn: async () => {
      const res = await api.get<{ data: InquiryStats }>(
        `/admin/analytics/inquiry-stats${querySuffix}`
      );
      return res.data;
    },
  });

  // 库存预警
  const { data: inventory } = useQuery<InventoryAlert>({
    queryKey: ['admin-inventory-alert'],
    queryFn: async () => {
      const res = await api.get<{ data: InventoryAlert }>(
        '/admin/analytics/inventory-alert'
      );
      return res.data;
    },
  });

  // 热门盆景（后端返回 { byViews, byFavorites }）
  const { data: topBonsaisRaw } = useQuery<{
    byViews: TopBonsai[];
    byFavorites: TopBonsai[];
  }>({
    queryKey: ['admin-top-bonsais'],
    queryFn: async () => {
      const res = await api.get<{
        data: { byViews: TopBonsai[]; byFavorites: TopBonsai[] };
      }>('/admin/analytics/top-bonsais');
      return res.data;
    },
  });

  // 分类分布（后端返回 { total, list }）
  const { data: categoryDistRaw } = useQuery<{
    total: number;
    list: CategoryDistribution[];
  }>({
    queryKey: ['admin-category-dist'],
    queryFn: async () => {
      const res = await api.get<{
        data: { total: number; list: CategoryDistribution[] };
      }>('/admin/analytics/category-distribution');
      return res.data;
    },
  });

  // 最新询价
  const { data: recentRooms } = useQuery<ChatRoom[]>({
    queryKey: ['admin-chat-rooms'],
    queryFn: async () => {
      const res = await api.get<{ data: ChatRoom[] }>('/admin/chat/rooms');
      return res.data;
    },
  });

  const timeRangePicker = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex border border-[var(--penjing-border-fine)]">
        {[7, 30, 90].map((d) => {
          const active = range.type === 'preset' && range.days === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() =>
                setRange((prev) => ({
                  ...prev,
                  type: 'preset',
                  days: d,
                }))
              }
              aria-pressed={active}
              className={cn(
                'px-3 py-1 font-sans text-xs transition-colors',
                active
                  ? 'bg-ink text-paper'
                  : 'text-ink-text-secondary hover:bg-paper/50 hover:text-ink',
              )}
            >
              {d} 天
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setRange((prev) => ({ ...prev, type: 'custom' }))}
          aria-pressed={range.type === 'custom'}
          className={cn(
            'px-3 py-1 font-sans text-xs transition-colors',
            range.type === 'custom'
              ? 'bg-ink text-paper'
              : 'text-ink-text-secondary hover:bg-paper/50 hover:text-ink',
          )}
        >
          自定义
        </button>
      </div>

      {range.type === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={range.startDate}
            max={range.endDate}
            onChange={(e) =>
              setRange((prev) => ({ ...prev, startDate: e.target.value }))
            }
            className="border border-[var(--penjing-border-fine)] bg-paper px-2 py-1 font-sans text-xs text-ink-text outline-none focus:border-gold"
            aria-label="开始日期"
          />
          <span className="font-sans text-xs text-ink-text-muted">至</span>
          <input
            type="date"
            value={range.endDate}
            min={range.startDate}
            onChange={(e) =>
              setRange((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className="border border-[var(--penjing-border-fine)] bg-paper px-2 py-1 font-sans text-xs text-ink-text outline-none focus:border-gold"
            aria-label="结束日期"
          />
        </div>
      )}
    </div>
  );

  const topBonsais = topBonsaisRaw?.byViews || [];
  const categoryDist = categoryDistRaw?.list || [];
  const viewsList = viewsTrend?.list || [];
  const favoritesList = favoritesTrend?.list || [];
  const userGrowthList = userGrowth?.list || [];
  const inquiryTrendList = inquiryStats?.trend.list || [];

  // 询价漏斗数据：使用设计系统配色
  const inquiryFunnel = inquiryStats
    ? [
        { label: '询价会话', value: inquiryStats.totalCount, color: 'bg-ink' },
        { label: '管理员回复', value: inquiryStats.adminRepliedCount, color: 'bg-ink-soft' },
        { label: '已处理', value: inquiryStats.processedCount, color: 'bg-gold' },
      ]
    : [];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow-label">运营总览</span>
          <h1 className="display-section mt-2 text-ink">数据看板</h1>
          <p className="body-base mt-2 text-ink-text-secondary">
            平台运营数据总览
          </p>
        </div>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TreePine}
          label="盆景总数"
          value={stats?.totalBonsais || 0}
        />
        <StatCard
          icon={Users}
          label="用户总数"
          value={stats?.totalUsers || 0}
          trend={
            stats?.todayNewUsers !== undefined
              ? { value: stats.todayNewUsers, label: '今日新增' }
              : undefined
          }
        />
        <StatCard
          icon={Eye}
          label="总浏览量"
          value={stats?.totalViews || 0}
          trend={
            stats?.todayViews !== undefined
              ? { value: stats.todayViews, label: '今日' }
              : undefined
          }
        />
        <StatCard
          icon={Heart}
          label="总收藏量"
          value={stats?.totalFavorites || 0}
        />
      </div>

      {/* 运营提醒：待处理询价 + 库存预警概览 */}
      {(stats?.pendingRooms || 0) > 0 ||
      (inventory?.lowStockCount || 0) > 0 ||
      (inventory?.outOfStockCount || 0) > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {(stats?.pendingRooms || 0) > 0 && (
            <Link
              href="/admin/chat"
              className="flex items-center gap-4 border border-[var(--penjing-border-gold)] bg-paper-warm p-5 transition-all duration-300 hover:border-gold hover:shadow-[var(--penjing-shadow-static)]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--penjing-border-gold)] bg-paper">
                <Clock className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-ink">
                  {stats?.pendingRooms} 个待回复询价
                </p>
                <p className="body-caption mt-0.5">点击前往处理</p>
              </div>
            </Link>
          )}
          {(inventory?.lowStockCount || 0) > 0 && (
            <Link
              href="/admin/bonsais"
              className="flex items-center gap-4 border border-[var(--penjing-border-gold)] bg-paper-warm p-5 transition-all duration-300 hover:border-gold hover:shadow-[var(--penjing-shadow-static)]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--penjing-border-gold)] bg-paper">
                <AlertTriangle className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-ink">
                  {inventory?.lowStockCount} 个低库存盆景
                </p>
                <p className="body-caption mt-0.5">库存 ≤ 2，需补货</p>
              </div>
            </Link>
          )}
          {(inventory?.outOfStockCount || 0) > 0 && (
            <Link
              href="/admin/bonsais"
              className="flex items-center gap-4 border border-state-error/30 bg-state-error/5 p-5 transition-all duration-300 hover:border-state-error hover:shadow-[var(--penjing-shadow-static)]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-state-error/30 bg-state-error/10">
                <PackageX className="h-5 w-5 text-state-error" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-ink">
                  {inventory?.outOfStockCount} 个盆景已售罄
                </p>
                <p className="body-caption mt-0.5">库存为 0，请及时处理</p>
              </div>
            </Link>
          )}
        </div>
      ) : null}

      {/* 趋势图：浏览量 + 收藏量 */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="浏览量趋势" action={timeRangePicker}>
          <ViewsTrendChart data={viewsList} />
        </ChartCard>

        <ChartCard title="收藏量趋势" action={timeRangePicker}>
          <FavoritesTrendChart data={favoritesList} />
        </ChartCard>
      </div>

      {/* 用户增长 + 询价趋势 */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="用户增长趋势" action={timeRangePicker}>
          <UserGrowthChart data={userGrowthList} />
        </ChartCard>

        <ChartCard title="询价量趋势" action={timeRangePicker}>
          <InquiryTrendChart data={inquiryTrendList} />
        </ChartCard>
      </div>

      {/* 排行 + 分类占比 */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="热门盆景 TOP10" className="lg:col-span-2">
          <TopBonsaisChart data={topBonsais} />
        </ChartCard>

        <ChartCard title="分类占比">
          <CategoryDistChart data={categoryDist} />
        </ChartCard>
      </div>

      {/* 询价转化漏斗 + 库存价值 */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 询价漏斗 */}
        <ChartCard title="询价转化漏斗">
          {inquiryStats ? (
            <div className="space-y-4">
              {inquiryFunnel.map((stage, i) => {
                const max = inquiryFunnel[0].value || 1;
                const widthPct = Math.max((stage.value / max) * 100, 8);
                const conversionFromPrev =
                  i > 0 && inquiryFunnel[i - 1].value > 0
                    ? ((stage.value / inquiryFunnel[i - 1].value) * 100).toFixed(1)
                    : null;

                return (
                  <div key={stage.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="body-caption text-ink-text-secondary">
                        {stage.label}
                      </span>
                      <span className="font-serif text-base text-ink">
                        {stage.value.toLocaleString('zh-CN')}
                        {conversionFromPrev && (
                          <span className="ml-2 font-sans text-xs text-ink-text-muted">
                            {conversionFromPrev}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-paper-aged">
                      <div
                        className={cn(
                          'h-full transition-all duration-700',
                          stage.color,
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* 漏斗底部指标 */}
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--penjing-border-hairline)] pt-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                  <div>
                    <p className="body-caption">回复率</p>
                    <p className="font-serif text-lg text-ink">
                      {inquiryStats.conversionRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                  <div>
                    <p className="body-caption">处理率</p>
                    <p className="font-serif text-lg text-ink">
                      {inquiryStats.processedRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ChartSkeletonLazy />
          )}
        </ChartCard>

        {/* 库存价值概览 */}
        <ChartCard title="库存价值概览">
          {inventory ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-2 border-gold pl-4">
                  <p className="eyebrow-label">库存总值</p>
                  <p className="mt-2 font-serif text-2xl text-ink">
                    ¥{formatPrice(inventory.totalStockValue)}
                  </p>
                </div>
                <div className="border-l-2 border-ink-soft pl-4">
                  <p className="eyebrow-label">库存总量</p>
                  <p className="mt-2 font-serif text-2xl text-ink">
                    {inventory.totalStockUnits.toLocaleString('zh-CN')}
                    <span className="ml-1 font-sans text-sm text-ink-text-secondary">
                      株
                    </span>
                  </p>
                </div>
                <div className="border-l-2 border-ink pl-4">
                  <p className="eyebrow-label">在售盆景</p>
                  <p className="mt-2 font-serif text-2xl text-ink">
                    {inventory.activeCount.toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="border-l-2 border-gold-deep pl-4">
                  <p className="eyebrow-label">精选盆景</p>
                  <p className="mt-2 font-serif text-2xl text-ink">
                    {inventory.featuredCount.toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              {/* 低库存列表 */}
              {inventory.lowStock.length > 0 && (
                <div>
                  <p className="eyebrow-label mb-3 text-gold-deep">
                    低库存提醒（≤2 株）
                  </p>
                  <div className="space-y-2">
                    {inventory.lowStock.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        href={`/admin/bonsais/${item.id}`}
                        className="flex items-center justify-between border border-[var(--penjing-border-fine)] px-3 py-2 transition-colors hover:border-gold hover:bg-paper"
                      >
                        <span className="font-sans text-sm text-ink">
                          {item.name}
                        </span>
                        <span className="font-sans text-xs text-gold-deep">
                          仅剩 {item.stock} 株
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ChartSkeletonLazy />
          )}
        </ChartCard>
      </div>

      {/* 最新询价 */}
      <div className="mt-6 border border-[var(--penjing-border-fine)] bg-paper-warm p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            <h3 className="display-card text-ink">最新询价</h3>
          </div>
          <Link
            href="/admin/chat"
            className="flex items-center gap-1 font-sans text-[11px] uppercase tracking-[0.3em] text-gold-deep transition-all hover:gap-2"
          >
            查看全部 <ArrowRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
        {recentRooms && recentRooms.length > 0 ? (
          <div className="divide-y divide-[var(--penjing-border-hairline)]">
            {recentRooms.slice(0, 5).map((room) => (
              <Link
                key={room.id}
                href="/admin/chat"
                className="flex items-center gap-4 py-4 transition-colors hover:text-gold-deep"
              >
                <MessageSquare className="h-5 w-5 text-gold" strokeWidth={1.5} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-ink">
                    {room.bonsai?.name || `会话 #${room.id}`}
                  </p>
                  <p className="body-caption mt-0.5">
                    {formatDateTime(room.createdAt)}
                  </p>
                </div>
                {room.status === 0 && (
                  <span className="border border-gold bg-gold/10 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-gold-deep">
                    待处理
                  </span>
                )}
                <span className="font-sans text-[11px] uppercase tracking-[0.3em] text-ink-text-muted">
                  查看
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center body-caption">暂无询价</p>
        )}
      </div>
    </div>
  );
}
