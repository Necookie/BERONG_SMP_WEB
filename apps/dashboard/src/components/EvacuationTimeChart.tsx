import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { EvacBucket } from '../lib/analytics';

interface EvacuationTimeChartProps {
  buckets: EvacBucket[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

export default function EvacuationTimeChart({ buckets }: EvacuationTimeChartProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-card)" />
          <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: 'var(--border-card)' }} tickLine={false} />
          <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
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
            formatter={(value: number) => [`${value} sessions`, '']}
          />
          <Bar dataKey="count" fill="var(--color-fire)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
