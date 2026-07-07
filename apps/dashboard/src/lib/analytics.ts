import { extractRubricSignals, type AnalyticsSession } from './queries';

export interface SafetyBehaviorStat {
  label: string;
  pct: number;
  count: number;
}

// Cohort-wide adoption rate of each rubric-tracked safety action, derived from event_log.
export function buildSafetyBehavior(sessions: AnalyticsSession[]): SafetyBehaviorStat[] {
  const total = sessions.length;
  let alarm = 0, ext = 0, door = 0, assembly = 0, exit = 0;
  for (const s of sessions) {
    const sig = extractRubricSignals(s.event_log);
    if (sig.alarmActivated) alarm++;
    if (sig.extHits > 0) ext++;
    if (sig.doorOpens > 0) door++;
    if (sig.assemblyReached) assembly++;
    if (sig.exitUsed) exit++;
  }
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return [
    { label: 'Alarm activated', pct: pct(alarm), count: alarm },
    { label: 'Extinguisher used', pct: pct(ext), count: ext },
    { label: 'Door opened', pct: pct(door), count: door },
    { label: 'Assembly reached', pct: pct(assembly), count: assembly },
    { label: 'Exit used', pct: pct(exit), count: exit },
  ];
}

export interface EvacBucket {
  label: string;
  count: number;
}

const EVAC_BUCKETS = [
  { max: 30, label: '0-30s' },
  { max: 60, label: '31-60s' },
  { max: 90, label: '61-90s' },
  { max: 120, label: '91-120s' },
  { max: 180, label: '121-180s' },
  { max: Infinity, label: '180s+' },
];

// Distribution of time-to-assembly-point across sessions that reached it.
export function buildEvacuationTimeBuckets(sessions: AnalyticsSession[]): EvacBucket[] {
  const counts = new Array(EVAC_BUCKETS.length).fill(0);
  for (const s of sessions) {
    const sig = extractRubricSignals(s.event_log);
    if (sig.evacuationTimeSec == null) continue;
    const idx = EVAC_BUCKETS.findIndex(b => sig.evacuationTimeSec! <= b.max);
    counts[idx === -1 ? EVAC_BUCKETS.length - 1 : idx]++;
  }
  return EVAC_BUCKETS.map((b, i) => ({ label: b.label, count: counts[i] }));
}
