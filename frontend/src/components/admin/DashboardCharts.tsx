// 数据看板图表组件
// 独立拆分以便 next/dynamic 懒加载，避免 recharts 进入主 bundle
//
// 性能：recharts 体积约 400KB（gzip ~120KB），懒加载后首屏不再加载
// 视觉：自定义 Tooltip 与配色，与盆景"墨绿+金色"设计系统一致

'use client';

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
  AreaChart,
  Area,
} from 'recharts';
import { CHART_COLORS, CHART_PALETTE } from '@/lib/constants';
import type {
  ChartPoint,
  TopBonsai,
  CategoryDistribution,
} from '@/lib/types';

// Tooltip 自定义样式：墨色背景 + 金色边线 + 纸色文字
const tooltipStyle = {
  backgroundColor: CHART_COLORS.primary,
  border: `1px solid ${CHART_COLORS.accent}`,
  borderRadius: 0,
  color: CHART_COLORS.background,
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px -4px rgba(26, 58, 46, 0.4)',
} as const;

// 通用坐标轴样式
const axisTickStyle = {
  fontSize: 11,
  fill: CHART_COLORS.muted,
  fontFamily: 'var(--penjing-font-sans)',
} as const;

const cartesianGridStroke = `${CHART_COLORS.muted}20`;
const axisLineStroke = `${CHART_COLORS.muted}30`;

// 浏览量趋势
export function ViewsTrendChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cartesianGridStroke} />
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: axisLineStroke }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="count"
          name="浏览量"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.accent }}
          activeDot={{ r: 5, fill: CHART_COLORS.accentLight }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 收藏量趋势
export function FavoritesTrendChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cartesianGridStroke} />
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: axisLineStroke }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="count"
          name="收藏量"
          stroke={CHART_COLORS.accent}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.primary }}
          activeDot={{ r: 5, fill: CHART_COLORS.primaryLight }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 用户增长趋势（面积图，体现增长态势）
export function UserGrowthChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primaryLight} stopOpacity={0.4} />
            <stop offset="95%" stopColor={CHART_COLORS.primaryLight} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={cartesianGridStroke} />
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: axisLineStroke }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="新增用户"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#userGrowthGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 询价量趋势
export function InquiryTrendChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cartesianGridStroke} />
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: axisLineStroke }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: `${CHART_COLORS.muted}10` }} />
        <Bar
          dataKey="count"
          name="询价数"
          fill={CHART_COLORS.accent}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 热门盆景 TOP10（横向条形图）
export function TopBonsaisChart({ data }: { data: TopBonsai[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={cartesianGridStroke} horizontal={false} />
        <XAxis
          type="number"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: `${CHART_COLORS.muted}10` }} />
        <Bar dataKey="viewCount" name="浏览量" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i < 3 ? CHART_COLORS.accent : CHART_COLORS.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 分类占比（环形图）
export function CategoryDistChart({ data }: { data: CategoryDistribution[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={45}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{
            fontSize: 11,
            fontFamily: 'var(--penjing-font-sans)',
            color: CHART_COLORS.muted,
          }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 图表懒加载占位
export function ChartSkeleton() {
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
