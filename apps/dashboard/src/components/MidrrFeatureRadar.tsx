import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CohortAverage {
  sprayAccuracy: number;
  pathEfficiencyRatio: number;
  hazardAvoidanceRatio: number;
  resourceUtilization: number;
  situationalAwareness: number;
  sampleSize: number;
}

interface MidrrFeatureRadarProps {
  // 0-1 ratio-type features only — the ones with a shared, comparable scale.
  sprayAccuracy: number;
  pathEfficiencyRatio: number;
  hazardAvoidanceRatio: number;
  resourceUtilization: number;
  situationalAwareness: number;
  // Optional scenario-cohort average, plotted as a second overlaid trace so
  // this session's profile can be read in context instead of isolation.
  cohort?: CohortAverage | null;
}

const tickStyle = {
  fill: 'var(--text-muted)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
};

const SERIES_LABEL: Record<string, string> = {
  value: 'This session',
  cohortValue: 'Scenario average',
};

export default function MidrrFeatureRadar({
  sprayAccuracy,
  pathEfficiencyRatio,
  hazardAvoidanceRatio,
  resourceUtilization,
  situationalAwareness,
  cohort,
}: MidrrFeatureRadarProps) {
  const hasCohort = !!cohort && cohort.sampleSize > 0;
  const data = [
    { label: 'Spray acc.', value: Math.round(sprayAccuracy * 100), cohortValue: hasCohort ? Math.round(cohort!.sprayAccuracy * 100) : undefined },
    { label: 'Path eff.', value: Math.round(pathEfficiencyRatio * 100), cohortValue: hasCohort ? Math.round(cohort!.pathEfficiencyRatio * 100) : undefined },
    { label: 'Hazard avoid.', value: Math.round(hazardAvoidanceRatio * 100), cohortValue: hasCohort ? Math.round(cohort!.hazardAvoidanceRatio * 100) : undefined },
    { label: 'Resource use', value: Math.round(resourceUtilization * 100), cohortValue: hasCohort ? Math.round(cohort!.resourceUtilization * 100) : undefined },
    { label: 'Situational aw.', value: Math.round(situationalAwareness * 100), cohortValue: hasCohort ? Math.round(cohort!.situationalAwareness * 100) : undefined },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: hasCohort ? '270px' : '230px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="56%" margin={{ top: 16, right: 24, bottom: hasCohort ? 4 : 16, left: 24 }}>
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
            formatter={(value: number, name: string) => [`${value}%`, SERIES_LABEL[name] ?? name]}
          />
          {hasCohort && (
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(name: string) => (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-muted)' }}>
                  {name === 'value' ? 'This session' : `Scenario avg (n=${cohort!.sampleSize})`}
                </span>
              )}
            />
          )}
          {hasCohort && (
            <Radar
              dataKey="cohortValue"
              stroke="var(--text-muted)"
              fill="var(--text-muted)"
              fillOpacity={0.08}
              strokeDasharray="4 3"
              isAnimationActive={false}
            />
          )}
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
