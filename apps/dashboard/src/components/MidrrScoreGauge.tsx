import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MidrrScoreGaugeProps {
  score: number; // 0-100
  tier: 'HIGH' | 'MODERATE' | 'LOW';
}

const TIER_COLOR: Record<MidrrScoreGaugeProps['tier'], string> = {
  HIGH: '#22c55e',
  MODERATE: '#f59e0b',
  LOW: '#ef4444',
};

export default function MidrrScoreGauge({ score, tier }: MidrrScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = TIER_COLOR[tier];
  const data = [
    { name: 'score', value: clamped },
    { name: 'rest', value: 100 - clamped },
  ];

  return (
    <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius="78%"
            outerRadius="100%"
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="var(--border-table)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {Math.round(clamped)}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: '2px' }}>
          / 100
        </span>
      </div>
    </div>
  );
}
