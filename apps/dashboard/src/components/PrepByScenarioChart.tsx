import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PrepByScenario } from '../lib/analytics';

interface PrepByScenarioChartProps {
  stats: PrepByScenario[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

export default function PrepByScenarioChart({ stats }: PrepByScenarioChartProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-card)" />
          <XAxis dataKey="type" tick={tickStyle} axisLine={{ stroke: 'var(--border-card)' }} tickLine={false} />
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
          />
          <Bar dataKey="high" name="High" stackId="lvl" fill="#22c55e" isAnimationActive={false} />
          <Bar dataKey="moderate" name="Moderate" stackId="lvl" fill="#f59e0b" isAnimationActive={false} />
          <Bar dataKey="low" name="Low" stackId="lvl" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
