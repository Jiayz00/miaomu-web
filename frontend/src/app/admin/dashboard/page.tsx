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
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-xs uppercase tracking-[0.2em]">图表加载中</span>
      </div>
    </div>
  );
}

// 数字动画卡片
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
    <div className="border border-text-muted/15 bg-surface p-6 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            {label}
          </p>
          <p ref={ref} className="mt-3 font-serif text-4xl text-primary">
            {display.toLocaleString('zh-CN')}
            {suffix && <span className="ml-1 text-base text-text-light">{suffix}</span>}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-2 flex items-center gap-1 text-xs',
                trend.value >= 0 ? 'text-primary-light' : 'text-red-600'
              )}
            >
              <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center bg-primary-dark/5">
          <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

// 图表卡片容器
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
    <div className={cn('border border-text-muted/15 bg-surface p-6', className)}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-serif text-xl text-primary">{title}</h3>
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
      <div className="flex gap-1 border border-text-muted/20">
        {[7, 30, 90].map((d) => (
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
            className={cn(
              'px-3 py-1 text-xs transition-colors',
              range.type === 'preset' && range.days === d
                ? 'bg-primary text-background'
                : 'text-text-light hover:text-primary'
            )}
          >
            {d} 天
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRange((prev) => ({ ...prev, type: 'custom' }))}
          className={cn(
            'px-3 py-1 text-xs transition-colors',
            range.type === 'custom'
              ? 'bg-primary text-background'
              : 'text-text-light hover:text-primary'
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
            className="border border-text-muted/20 bg-surface px-2 py-1 text-xs text-primary outline-none focus:border-accent"
            aria-label="开始日期"
          />
          <span className="text-xs text-text-muted">至</span>
          <input
            type="date"
            value={range.endDate}
            min={range.startDate}
            onChange={(e) =>
              setRange((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className="border border-text-muted/20 bg-surface px-2 py-1 text-xs text-primary outline-none focus:border-accent"
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

  // 询价漏斗数据
  const inquiryFunnel = inquiryStats
    ? [
        { label: '询价会话', value: inquiryStats.totalCount, color: 'bg-primary' },
        { label: '管理员回复', value: inquiryStats.adminRepliedCount, color: 'bg-primary-light' },
        { label: '已处理', value: inquiryStats.processedCount, color: 'bg-accent' },
      ]
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-primary">数据看板</h1>
        <p className="mt-1 text-sm text-text-muted">平台运营数据总览</p>
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
              className="flex items-center gap-4 border border-accent/30 bg-accent/5 p-5 transition-colors hover:bg-accent/10"
            >
              <div className="flex h-10 w-10 items-center justify-center bg-accent/20">
                <Clock className="h-5 w-5 text-accent-dark" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  {stats?.pendingRooms} 个待回复询价
                </p>
                <p className="text-xs text-text-muted">点击前往处理</p>
              </div>
            </Link>
          )}
          {(inventory?.lowStockCount || 0) > 0 && (
            <Link
              href="/admin/bonsais"
              className="flex items-center gap-4 border border-accent/30 bg-accent/5 p-5 transition-colors hover:bg-accent/10"
            >
              <div className="flex h-10 w-10 items-center justify-center bg-accent/20">
                <AlertTriangle className="h-5 w-5 text-accent-dark" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  {inventory?.lowStockCount} 个低库存盆景
                </p>
                <p className="text-xs text-text-muted">库存 ≤ 2，需补货</p>
              </div>
            </Link>
          )}
          {(inventory?.outOfStockCount || 0) > 0 && (
            <Link
              href="/admin/bonsais"
              className="flex items-center gap-4 border border-red-200 bg-red-50 p-5 transition-colors hover:bg-red-100"
            >
              <div className="flex h-10 w-10 items-center justify-center bg-red-100">
                <PackageX className="h-5 w-5 text-red-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  {inventory?.outOfStockCount} 个盆景已售罄
                </p>
                <p className="text-xs text-text-muted">库存为 0，请及时处理</p>
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
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-text-light">{stage.label}</span>
                      <span className="font-serif text-primary">
                        {stage.value.toLocaleString('zh-CN')}
                        {conversionFromPrev && (
                          <span className="ml-2 text-xs text-text-muted">
                            {conversionFromPrev}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-background">
                      <div
                        className={cn('h-full transition-all duration-700', stage.color)}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* 漏斗底部指标 */}
              <div className="grid grid-cols-2 gap-4 border-t border-text-muted/10 pt-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-text-muted">回复率</p>
                    <p className="font-serif text-lg text-primary">
                      {inquiryStats.conversionRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-text-muted">处理率</p>
                    <p className="font-serif text-lg text-primary">
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
                <div className="border-l-2 border-accent pl-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    库存总值
                  </p>
                  <p className="mt-2 font-serif text-2xl text-primary">
                    ¥{formatPrice(inventory.totalStockValue)}
                  </p>
                </div>
                <div className="border-l-2 border-primary-light pl-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    库存总量
                  </p>
                  <p className="mt-2 font-serif text-2xl text-primary">
                    {inventory.totalStockUnits.toLocaleString('zh-CN')}
                    <span className="ml-1 text-sm text-text-light">株</span>
                  </p>
                </div>
                <div className="border-l-2 border-primary pl-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    在售盆景
                  </p>
                  <p className="mt-2 font-serif text-2xl text-primary">
                    {inventory.activeCount.toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="border-l-2 border-accent-dark pl-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    精选盆景
                  </p>
                  <p className="mt-2 font-serif text-2xl text-primary">
                    {inventory.featuredCount.toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              {/* 低库存列表 */}
              {inventory.lowStock.length > 0 && (
                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-accent">
                    低库存提醒（≤2 株）
                  </p>
                  <div className="space-y-2">
                    {inventory.lowStock.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        href={`/admin/bonsais/${item.id}`}
                        className="flex items-center justify-between border border-text-muted/10 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent/5"
                      >
                        <span className="text-sm text-primary">{item.name}</span>
                        <span className="text-xs text-accent-dark">
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
      <div className="mt-6 border border-text-muted/15 bg-surface p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-xl text-primary">最新询价</h3>
          <Link
            href="/admin/chat"
            className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-accent hover:gap-2"
          >
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentRooms && recentRooms.length > 0 ? (
          <div className="divide-y divide-text-muted/10">
            {recentRooms.slice(0, 5).map((room) => (
              <Link
                key={room.id}
                href="/admin/chat"
                className="flex items-center gap-4 py-4 transition-colors hover:text-accent"
              >
                <MessageSquare className="h-5 w-5 text-accent" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-sm text-primary">
                    {room.bonsai?.name || `会话 #${room.id}`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDateTime(room.createdAt)}
                  </p>
                </div>
                {room.status === 0 && (
                  <span className="bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-dark">
                    待处理
                  </span>
                )}
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  查看
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-text-muted">暂无询价</p>
        )}
      </div>
    </div>
  );
}
