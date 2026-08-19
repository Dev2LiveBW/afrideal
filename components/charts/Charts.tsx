'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { bwp, bwpCompact } from '@/lib/format';

/**
 * Chart set.
 *
 * One palette across every chart: gold is the primary series, forest is the
 * comparison, and the neutrals are warm. Grid lines are hairlines rather than
 * grey rules, and no chart carries a drop shadow or a gradient stroke.
 */

const AXIS = { fontSize: 11, fill: '#8A918B', fontFamily: 'var(--font-geist-mono)' };
const GRID = 'rgba(23, 26, 24, 0.08)';

function ChartTooltip({ active, payload, label, money = true }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded border border-hairline bg-surface-raised px-3 py-2 shadow-lift">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-[12.5px]">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: entry.color ?? entry.fill }}
          />
          <span className="text-body">{entry.name}</span>
          <span className="ml-auto font-mono font-medium tabular-nums text-ink">
            {money ? bwp(entry.value) : entry.value.toLocaleString('en-GB')}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── GMV trend ────────────────────────────────────────────────────────────────

export function GMVChart({ data }: { data: { date: string; gmv: number; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gmv-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4920A" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#D4920A" stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => bwpCompact(value).replace('BWP ', '')}
          width={54}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID }} />
        <Area
          type="monotone"
          dataKey="gmv"
          name="GMV"
          stroke="#D4920A"
          strokeWidth={2}
          fill="url(#gmv-fill)"
          dot={false}
          activeDot={{ r: 4, fill: '#D4920A', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Revenue mix ──────────────────────────────────────────────────────────────

const DONUT_COLOURS = ['#D4920A', '#1A5C2A', '#2a2a2a', '#8A918B'];

export function RevenueDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice, index) => (
              <Cell key={slice.name} fill={DONUT_COLOURS[index % DONUT_COLOURS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-[12px] text-body">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-x-0 top-[88px] text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Total</p>
        <p className="font-mono text-[17px] font-semibold tabular-nums text-ink">
          {bwpCompact(total)}
        </p>
      </div>
    </div>
  );
}

// ── Supplier performance bars ────────────────────────────────────────────────

export function SupplierScoreBar({
  data,
}: {
  data: { name: string; score: number; fulfilment: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...AXIS, fontFamily: 'var(--font-geist-sans)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip content={<ChartTooltip money={false} />} cursor={{ fill: 'rgba(23,26,24,0.03)' }} />
        <Bar dataKey="score" name="Reliability" fill="#D4920A" radius={[0, 4, 4, 0]} barSize={12} />
        <Bar dataKey="fulfilment" name="Fulfilment %" fill="#1A5C2A" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Revenue by stream ────────────────────────────────────────────────────────

export function RevenueBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => bwpCompact(value).replace('BWP ', '')}
          width={54}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(23,26,24,0.03)' }} />
        <Bar dataKey="value" name="Revenue" radius={[5, 5, 0, 0]} barSize={38}>
          {data.map((_, index) => (
            <Cell key={index} fill={DONUT_COLOURS[index % DONUT_COLOURS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Supplier performance radar ───────────────────────────────────────────────

export function PerformanceRadar({ data }: { data: { metric: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="metric" tick={{ ...AXIS, fontFamily: 'var(--font-geist-sans)', fontSize: 11.5 }} />
        <Radar
          name="Score"
          dataKey="value"
          stroke="#D4920A"
          strokeWidth={2}
          fill="#D4920A"
          fillOpacity={0.18}
        />
        <Tooltip content={<ChartTooltip money={false} />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Earnings sparkline-style area for the supplier and runner portals. */
export function EarningsChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="earn-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A5C2A" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#1A5C2A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => bwpCompact(value).replace('BWP ', '')}
          width={50}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID }} />
        <Area
          type="monotone"
          dataKey="value"
          name="Earnings"
          stroke="#1A5C2A"
          strokeWidth={2}
          fill="url(#earn-fill)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
