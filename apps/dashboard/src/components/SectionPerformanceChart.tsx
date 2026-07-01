import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SectionStat } from '../lib/analytics';

interface SectionPerformanceChartProps {
  stats: SectionStat[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
};

export default function SectionPerformanceChart({ stats }: SectionPerformanceChartProps) {
  const height = Math.max(160, stats.length * 34);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stats}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border-card)" />
          <XAxis type="number" domain={[0, 100]} tick={tickStyle} axisLine={{ stroke: 'var(--border-card)' }} tickLine={false} />
          <YAxis type="category" dataKey="section" tick={tickStyle} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            cursor={{ fill: 'var(--bg-table-hover)' }}
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-card)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: 'var(--text-primary)',
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={(value: number, _name: string, item: any) => {
              const { count, passRate } = item.payload as SectionStat;
              return [`${value}% avg · ${passRate}% pass · ${count} sessions`, 'Score'];
            }}
          />
          <Bar dataKey="avgScore" fill="var(--text-brand)" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
