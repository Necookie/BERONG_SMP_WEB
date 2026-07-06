import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts';

interface MidrrShapChartProps {
  weights: { feature: string; weight: number }[];
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
};

export default function MidrrShapChart({ weights }: MidrrShapChartProps) {
  // Sorted by |weight| descending, largest driver on top.
  const data = [...weights].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  const maxAbs = data.reduce((m, f) => Math.max(m, Math.abs(f.weight)), 0) || 1;
  const height = Math.max(180, data.length * 32);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border-card)" />
          <XAxis
            type="number"
            domain={[-maxAbs * 1.15, maxAbs * 1.15]}
            tick={tickStyle}
            axisLine={{ stroke: 'var(--border-card)' }}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(2)}
            tickCount={5}
          />
          <YAxis type="category" dataKey="feature" tick={tickStyle} axisLine={false} tickLine={false} width={150} />
          <ReferenceLine x={0} stroke="var(--text-muted)" />
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
            formatter={(value: number) => [
              `${value >= 0 ? '+' : ''}${value.toFixed(3)} (${value >= 0 ? 'weakness' : 'strength'})`,
              'SHAP weight',
            ]}
          />
          <Bar dataKey="weight" radius={2} isAnimationActive={false} barSize={14}>
            {data.map(f => (
              <Cell key={f.feature} fill={f.weight >= 0 ? 'var(--text-danger)' : 'var(--text-success)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
