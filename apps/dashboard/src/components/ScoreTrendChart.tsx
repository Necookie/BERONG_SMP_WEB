import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ScoreTrendPoint } from '../lib/analytics';

interface ScoreTrendChartProps {
  points: ScoreTrendPoint[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

function formatDateLabel(iso: string): string {
  if (iso === 'unknown') return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function ScoreTrendChart({ points }: ScoreTrendChartProps) {
  const data = points.map(p => ({ ...p, label: formatDateLabel(p.date) }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '220px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-card)" />
          <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: 'var(--border-card)' }} tickLine={false} />
          <YAxis yAxisId="count" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            yAxisId="score"
            orientation="right"
            domain={[0, 100]}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
          />
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
            formatter={(value: number, name: string) =>
              name === 'avgScore' ? [`${value}%`, 'Avg score'] : [value, 'Sessions']
            }
          />
          <Bar yAxisId="count" dataKey="count" fill="var(--border-card)" radius={[3, 3, 0, 0]} isAnimationActive={false} barSize={16} />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="avgScore"
            stroke="var(--text-brand)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--text-brand)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
