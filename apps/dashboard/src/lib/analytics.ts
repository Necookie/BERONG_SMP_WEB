import { extractRubricSignals, type AnalyticsSession } from './queries';

const SCENARIO_ORDER = ['FIRE', 'EARTHQUAKE', 'CCS_FIRE', 'CCS_EARTHQUAKE'] as const;

export interface ScoreTrendPoint {
  date: string;
  avgScore: number;
  count: number;
}

// One point per calendar day a session started on, sorted chronologically.
export function buildScoreTrend(sessions: AnalyticsSession[]): ScoreTrendPoint[] {
  const byDate = new Map<string, { total: number; count: number }>();
  for (const s of sessions) {
    const date = s.start_time ? s.start_time.slice(0, 10) : 'unknown';
    const entry = byDate.get(date) ?? { total: 0, count: 0 };
    entry.total += s.simulation_score;
    entry.count += 1;
    byDate.set(date, entry);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, count }]) => ({
      date,
      avgScore: count ? Math.round(total / count) : 0,
      count,
    }));
}

export interface ScenarioStat {
  type: string;
  count: number;
  avgScore: number;
  passRate: number;
}

// Average score + pass rate per simulation type, in a fixed display order.
export function buildScenarioBreakdown(sessions: AnalyticsSession[]): ScenarioStat[] {
  const grouped = new Map<string, { total: number; count: number; passed: number }>();
  for (const s of sessions) {
    const type = s.simulation_type ?? 'UNKNOWN';
    const entry = grouped.get(type) ?? { total: 0, count: 0, passed: 0 };
    entry.total += s.simulation_score;
    entry.count += 1;
    entry.passed += s.passed ? 1 : 0;
    grouped.set(type, entry);
  }
  return SCENARIO_ORDER.filter(t => grouped.has(t)).map(type => {
    const { total, count, passed } = grouped.get(type)!;
    return {
      type,
      count,
      avgScore: count ? Math.round(total / count) : 0,
      passRate: count ? Math.round((passed / count) * 100) : 0,
    };
  });
}

export interface PrepByScenario {
  type: string;
  high: number;
  moderate: number;
  low: number;
}

// HIGH/MODERATE/LOW counts per simulation type, for a stacked bar chart.
export function buildPrepByScenario(sessions: AnalyticsSession[]): PrepByScenario[] {
  const grouped = new Map<string, { high: number; moderate: number; low: number }>();
  for (const s of sessions) {
    const type = s.simulation_type ?? 'UNKNOWN';
    const entry = grouped.get(type) ?? { high: 0, moderate: 0, low: 0 };
    const level = s.prep_level ?? (s.simulation_score >= 75 ? 'HIGH' : s.simulation_score >= 40 ? 'MODERATE' : 'LOW');
    if (level === 'HIGH') entry.high++;
    else if (level === 'MODERATE') entry.moderate++;
    else entry.low++;
    grouped.set(type, entry);
  }
  return SCENARIO_ORDER.filter(t => grouped.has(t)).map(type => ({ type, ...grouped.get(type)! }));
}

export interface SectionStat {
  section: string;
  avgScore: number;
  count: number;
  passRate: number;
}

// Average score per section, sorted best-first.
export function buildSectionPerformance(sessions: AnalyticsSession[]): SectionStat[] {
  const grouped = new Map<string, { total: number; count: number; passed: number }>();
  for (const s of sessions) {
    const section = s.section ?? 'Unassigned';
    const entry = grouped.get(section) ?? { total: 0, count: 0, passed: 0 };
    entry.total += s.simulation_score;
    entry.count += 1;
    entry.passed += s.passed ? 1 : 0;
    grouped.set(section, entry);
  }
  return Array.from(grouped.entries())
    .map(([section, { total, count, passed }]) => ({
      section,
      avgScore: count ? Math.round(total / count) : 0,
      count,
      passRate: count ? Math.round((passed / count) * 100) : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

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
