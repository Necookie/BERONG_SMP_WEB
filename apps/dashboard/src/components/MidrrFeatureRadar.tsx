import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface MidrrFeatureRadarProps {
  // 0-1 ratio-type features only — the ones with a shared, comparable scale.
  sprayAccuracy: number;
  pathEfficiencyRatio: number;
  hazardAvoidanceRatio: number;
  resourceUtilization: number;
  situationalAwareness: number;
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

export default function MidrrFeatureRadar({
  sprayAccuracy,
  pathEfficiencyRatio,
  hazardAvoidanceRatio,
  resourceUtilization,
  situationalAwareness,
}: MidrrFeatureRadarProps) {
  const data = [
    { label: 'Spray acc.', value: Math.round(sprayAccuracy * 100) },
    { label: 'Path eff.', value: Math.round(pathEfficiencyRatio * 100) },
    { label: 'Hazard avoid.', value: Math.round(hazardAvoidanceRatio * 100) },
    { label: 'Resource use', value: Math.round(resourceUtilization * 100) },
    { label: 'Situational aw.', value: Math.round(situationalAwareness * 100) },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '230px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="58%" margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
          <PolarGrid stroke="var(--border-card)" />
          <PolarAngleAxis dataKey="label" tick={tickStyle} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
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
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={(value: number) => [`${value}%`, 'Score']}
          />
          <Radar
            dataKey="value"
            stroke="var(--text-brand)"
            fill="var(--text-brand)"
            fillOpacity={0.22}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
