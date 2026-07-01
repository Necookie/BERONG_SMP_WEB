import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PrepChartProps {
  high: number;
  moderate: number;
  low: number;
}

const COLORS: Record<string, string> = {
  High: '#22c55e',
  Moderate: '#f59e0b',
  Low: '#ef4444',
};

export default function PrepChart({ high, moderate, low }: PrepChartProps) {
  const total = high + moderate + low;
  const data = [
    { name: 'High', value: high },
    { name: 'Moderate', value: moderate },
    { name: 'Low', value: low },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '140px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="75%"
            outerRadius="100%"
            paddingAngle={total ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-card)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: 'var(--text-primary)',
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number, name: string) => {
              const pct = total ? Math.round((value / total) * 100) : 0;
              return [`${value} (${pct}%)`, name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
