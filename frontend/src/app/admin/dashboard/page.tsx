// 数据看板：指标卡片 + 趋势图 + 排行 + 分类占比 + 最新询价

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TreePine,
  Users,
  Eye,
  Heart,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CHART_COLORS, CHART_PALETTE } from '@/lib/constants';
import { animateValue, formatDateTime, cn } from '@/lib/utils';
import type {
  DashboardStats,
  ChartPoint,
  TopBonsai,
  CategoryDistribution,
  ChatRoom,
} from '@/lib/types';

// 数字动画卡片
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof TreePine;
  label: string;
  value: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animateValue(0, value, 1500, (v) => setDisplay(v));
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

// Tooltip 自定义样式
const tooltipStyle = {
  backgroundColor: CHART_COLORS.primary,
  border: 'none',
  borderRadius: 0,
  color: '#faf8f5',
  fontSize: '12px',
};

export default function DashboardPage() {
  const [days, setDays] = useState(7);

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

  // 浏览量趋势
  const { data: viewsData } = useQuery<ChartPoint[]>({
    queryKey: ['admin-views', days],
    queryFn: async () => {
      const res = await api.get<{ data: ChartPoint[] }>(
        `/admin/analytics/views?days=${days}`
      );
      return res.data;
    },
  });

  // 收藏量趋势
  const { data: favoritesData } = useQuery<ChartPoint[]>({
    queryKey: ['admin-favorites-trend', days],
    queryFn: async () => {
      const res = await api.get<{ data: ChartPoint[] }>(
        `/admin/analytics/favorites?days=${days}`
      );
      return res.data;
    },
  });

  // 热门盆景
  const { data: topBonsais } = useQuery<TopBonsai[]>({
    queryKey: ['admin-top-bonsais'],
    queryFn: async () => {
      const res = await api.get<{ data: TopBonsai[] }>(
        '/admin/analytics/top-bonsais'
      );
      return res.data;
    },
  });

  // 分类分布
  const { data: categoryDist } = useQuery<CategoryDistribution[]>({
    queryKey: ['admin-category-dist'],
    queryFn: async () => {
      const res = await api.get<{ data: CategoryDistribution[] }>(
        '/admin/analytics/category-distribution'
      );
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

  const daysToggle = (
    <div className="flex gap-1 border border-text-muted/20">
      {[7, 30].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => setDays(d)}
          className={cn(
            'px-3 py-1 text-xs transition-colors',
            days === d
              ? 'bg-primary text-background'
              : 'text-text-light hover:text-primary'
          )}
        >
          {d} 天
        </button>
      ))}
    </div>
  );

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
        />
        <StatCard
          icon={Eye}
          label="总浏览量"
          value={stats?.totalViews || 0}
        />
        <StatCard
          icon={Heart}
          label="总收藏量"
          value={stats?.totalFavorites || 0}
        />
      </div>

      {/* 趋势图 */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="浏览量趋势" action={daysToggle}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={viewsData || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted + '20'} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.muted + '30' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                name="浏览量"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.accent }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="收藏量趋势" action={daysToggle}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={favoritesData || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted + '20'} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.muted + '30' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                name="收藏量"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.primary }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 排行 + 分类占比 */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="热门盆景 TOP10" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={topBonsais || []}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted + '20'} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CHART_COLORS.muted + '10' }} />
              <Bar dataKey="viewCount" name="浏览量" radius={[0, 2, 2, 0]}>
                {(topBonsais || []).map((_, i) => (
                  <Cell key={i} fill={i < 3 ? CHART_COLORS.accent : CHART_COLORS.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="分类占比">
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={categoryDist || []}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={2}
              >
                {(categoryDist || []).map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
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
