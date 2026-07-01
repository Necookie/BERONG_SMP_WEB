import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import type { ScenarioStat } from '../lib/analytics';

interface ScenarioComparisonChartProps {
  stats: ScenarioStat[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

function colorFor(type: string): string {
  return type.includes('FIRE') ? 'var(--color-fire)' : 'var(--color-earthquake)';
}

export default function ScenarioComparisonChart({ stats }: ScenarioComparisonChartProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-card)" />
          <XAxis dataKey="type" tick={tickStyle} axisLine={{ stroke: 'var(--border-card)' }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} />
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
            formatter={(value: number, name: string, item: any) => {
              if (name === 'avgScore') {
                const { count, passRate } = item.payload as ScenarioStat;
                return [`${value}% avg · ${passRate}% pass · ${count} sessions`, 'Score'];
              }
              return [value, name];
            }}
          />
          <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {stats.map(s => (
              <Cell key={s.type} fill={colorFor(s.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
