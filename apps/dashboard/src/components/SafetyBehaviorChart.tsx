import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import type { SafetyBehaviorStat } from '../lib/analytics';

interface SafetyBehaviorChartProps {
  stats: SafetyBehaviorStat[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
};

export default function SafetyBehaviorChart({ stats }: SafetyBehaviorChartProps) {
  const height = Math.max(160, stats.length * 34);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stats}
          layout="vertical"
          margin={{ top: 4, right: 28, left: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border-card)" />
          <XAxis type="number" domain={[0, 100]} tick={tickStyle} axisLine={{ stroke: 'var(--border-card)' }} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} width={120} />
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
              const { count } = item.payload as SafetyBehaviorStat;
              return [`${value}% · ${count} sessions`, 'Adoption'];
            }}
          />
          <Bar dataKey="pct" fill="#22c55e" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={16}>
            <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fill: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
