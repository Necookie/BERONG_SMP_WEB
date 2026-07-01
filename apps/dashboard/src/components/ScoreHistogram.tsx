import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

interface ScoreHistogramProps {
  scores: number[];
}

const LABELS = [
  '0-10', '11-20', '21-30', '31-40', '41-50',
  '51-60', '61-70', '71-80', '81-90', '91-100',
];

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

export default function ScoreHistogram({ scores }: ScoreHistogramProps) {
  // Bucket scores into 10 groups: 0-10, 11-20, ..., 91-100
  const buckets = Array(10).fill(0);
  scores.forEach(s => {
    const idx = Math.min(9, Math.floor(s / 10));
    buckets[idx]++;
  });

  const data = LABELS.map((label, i) => ({ label, count: buckets[i] }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-card)" />
          <XAxis
            dataKey="label"
            tick={tickStyle}
            axisLine={{ stroke: 'var(--border-card)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
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
            formatter={(value: number) => [`${value} sessions`, '']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map(entry => (
              <Cell key={entry.label} fill="var(--text-brand)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
