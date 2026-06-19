// NOTICE: All data in this file is fictional mock data.
// The mod does not yet send data to this dashboard. This contract matches
// the target API design described in CLAUDE.md.
//
// Fields marked [REAL] exist in SimulationSession today.
// Fields marked [FUTURE] require new mod-side instrumentation.
// Fields marked [CLASSIFIER] are outputs of the Random Forest pipeline (not yet built).

export type DisasterType = 'FIRE' | 'EARTHQUAKE';
export type PrepLevel = 'HIGH' | 'MODERATE' | 'LOW';
export type EarthquakePhase =
  | 'DROP' | 'COVER' | 'HOLD_ON' | 'AFTERSHOCK'
  | 'EVACUATION' | 'EVACUATION_COMPLETE';

export interface LogEntry {
  ts: string;      // "MM:SS.ss"
  code: string;    // EVENT_CODE — uppercase, fixed width in display
  msg: string;     // human-readable description
}

export interface FeatureImportance {
  name: string;
  value: number;   // 0.0–1.0 Shapley-value-like weight [CLASSIFIER]
}

export interface Session {
  id: string;
  participantId: string;
  participantName: string;
  section: string;

  // [REAL] — from mod SimulationSession
  disasterType: DisasterType;
  startTime: string;
  endTime: string;
  durationSeconds: number;

  // [REAL] — FIRE only
  firesExtinguishedCount?: number;

  // [REAL] — EARTHQUAKE only
  magnitude?: number;
  aftershockCount?: number;
  aftershockMagnitudeScale?: number;
  finalEarthquakePhase?: EarthquakePhase;

  // [CLASSIFIER] — Random Forest output, not yet connected
  prepLevel: PrepLevel;
  prepScore: number;   // 0–100

  // [CLASSIFIER] — feature weights driving classification
  featureImportance: FeatureImportance[];

  // Event log — mix of [REAL] endpoints and [FUTURE] per-tick events.
  // See individual log entries; real mod fields noted inline.
  log: LogEntry[];

  resultText: string;   // plain-language classification explanation [CLASSIFIER]
}

// ── Participants ─────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  name: string;
  section: string;
  yearLevel: string;
}

export const participants: Participant[] = [
  { id: 'p001', name: 'Maria Santos',    section: 'BSED-A4', yearLevel: '4th Year' },
  { id: 'p002', name: 'Juan dela Cruz',  section: 'BSED-A4', yearLevel: '4th Year' },
  { id: 'p003', name: 'Ana Reyes',       section: 'BSED-B3', yearLevel: '3rd Year' },
  { id: 'p004', name: 'Carlo Bautista',  section: 'BSED-B4', yearLevel: '4th Year' },
  { id: 'p005', name: 'Rose Villanueva', section: 'BSED-A3', yearLevel: '3rd Year' },
  { id: 'p006', name: 'Miguel Fernandez',section: 'BSED-C4', yearLevel: '4th Year' },
  { id: 'p007', name: 'Lea Gonzalez',    section: 'BSED-C3', yearLevel: '3rd Year' },
  { id: 'p008', name: 'Paulo Ramos',     section: 'BSED-A4', yearLevel: '4th Year' },
];

// ── Sessions ─────────────────────────────────────────────────────────────

export const sessions: Session[] = [
  {
    id: 'SES-001',
    participantId: 'p001',
    participantName: 'Maria Santos',
    section: 'BSED-A4',
    disasterType: 'FIRE',
    startTime: '2026-06-12T09:41:00',
    endTime:   '2026-06-12T09:45:30',
    durationSeconds: 270, // [REAL]
    firesExtinguishedCount: 2, // [REAL]
    prepLevel: 'HIGH',   // [CLASSIFIER]
    prepScore: 82,       // [CLASSIFIER]
    resultText:
      'P.A.S.S. technique completed in correct sequence with no step omissions. ' +
      'Responded to secondary electrical fire without hesitation. ' +
      'Fire extinguisher handling was appropriate throughout.',
    featureImportance: [ // [CLASSIFIER] all values below
      { name: 'time_to_first_response', value: 0.34 },
      { name: 'pass_completion_rate',   value: 0.28 },
      { name: 'fires_extinguished',     value: 0.21 },
      { name: 'session_efficiency',     value: 0.17 },
    ],
    log: [
      // [REAL] session-level events use real SimulationSession fields.
      // [FUTURE] per-tick events require new mod instrumentation.
      { ts: '00:00.00', code: 'SESSION_INIT',     msg: 'participant=santos_m · session=SES-001 · uuid=a4f2-9c81' }, // [REAL]
      { ts: '00:02.14', code: 'SCENARIO_START',   msg: 'FIRE · kitchen grease fire spawned' },                     // [FUTURE] event type; disasterType is [REAL]
      { ts: '00:15.32', code: 'PLAYER_APPROACH',  msg: 'distance_to_extinguisher=4.2m' },                          // [FUTURE]
      { ts: '00:28.01', code: 'ITEM_PICKUP',      msg: 'fire_extinguisher acquired' },                             // [FUTURE]
      { ts: '00:42.00', code: 'TUTORIAL_ENTER',   msg: 'P.A.S.S. tutorial mode active' },                          // [FUTURE]
      { ts: '01:15.44', code: 'PASS_PULL',        msg: 'pin extracted ✓' },                                        // [FUTURE]
      { ts: '01:33.87', code: 'PASS_AIM',         msg: 'nozzle aimed at fire base ✓' },                            // [FUTURE]
      { ts: '01:52.21', code: 'PASS_SQUEEZE',     msg: 'agent released ✓' },                                       // [FUTURE]
      { ts: '02:10.55', code: 'PASS_SWEEP',       msg: 'lateral sweep motion confirmed ✓' },                       // [FUTURE]
      { ts: '02:45.11', code: 'TARGET_OUT',       msg: 'kitchen_fire suppressed [firesExtinguished=1]' },          // count is [REAL]
      { ts: '03:20.33', code: 'FIRE_SPAWNED',     msg: 'electrical_fire · server_room' },                          // [FUTURE]
      { ts: '03:48.77', code: 'PLAYER_APPROACH',  msg: 'repositioned to secondary fire · 3.1m' },                  // [FUTURE]
      { ts: '04:02.90', code: 'TARGET_OUT',       msg: 'server_room_fire suppressed [firesExtinguished=2]' },      // count is [REAL]
      { ts: '04:30.00', code: 'SESSION_END',      msg: 'COMPLETE · firesExtinguished=2 · duration=270s' },         // [REAL]
    ],
  },
  {
    id: 'SES-002',
    participantId: 'p002',
    participantName: 'Juan dela Cruz',
    section: 'BSED-A4',
    disasterType: 'FIRE',
    startTime: '2026-06-12T10:05:00',
    endTime:   '2026-06-12T10:10:15',
    durationSeconds: 315, // [REAL]
    firesExtinguishedCount: 1, // [REAL]
    prepLevel: 'MODERATE', // [CLASSIFIER]
    prepScore: 64,
    resultText:
      'P.A.S.S. technique partially completed — squeeze and sweep steps were delayed by 18 and 22 seconds respectively. ' +
      'Extinguished primary fire but did not respond to secondary fire within session time.',
    featureImportance: [
      { name: 'pass_completion_rate',   value: 0.31 },
      { name: 'time_to_first_response', value: 0.29 },
      { name: 'fires_extinguished',     value: 0.24 },
      { name: 'session_efficiency',     value: 0.16 },
    ],
    log: [
      { ts: '00:00.00', code: 'SESSION_INIT',    msg: 'participant=delacruz_j · session=SES-002 · uuid=b7e3-2d14' },
      { ts: '00:02.08', code: 'SCENARIO_START',  msg: 'FIRE · office paper fire spawned' },
      { ts: '00:22.44', code: 'PLAYER_APPROACH', msg: 'distance_to_extinguisher=6.8m' },
      { ts: '00:41.19', code: 'ITEM_PICKUP',     msg: 'fire_extinguisher acquired' },
      { ts: '01:00.00', code: 'TUTORIAL_ENTER',  msg: 'P.A.S.S. tutorial mode active' },
      { ts: '01:44.22', code: 'PASS_PULL',       msg: 'pin extracted ✓' },
      { ts: '02:05.11', code: 'PASS_AIM',        msg: 'nozzle aimed — partially off-base' },
      { ts: '02:47.33', code: 'PASS_SQUEEZE',    msg: 'agent released — delayed 18s' },
      { ts: '03:31.09', code: 'PASS_SWEEP',      msg: 'sweep incomplete — timeout at 22s' },
      { ts: '04:15.00', code: 'TARGET_OUT',      msg: 'office_fire suppressed [firesExtinguished=1]' },
      { ts: '05:15.00', code: 'SESSION_END',     msg: 'COMPLETE · firesExtinguished=1 · duration=315s' },
    ],
  },
  {
    id: 'SES-003',
    participantId: 'p003',
    participantName: 'Ana Reyes',
    section: 'BSED-B3',
    disasterType: 'EARTHQUAKE',
    startTime: '2026-06-13T09:15:00',
    endTime:   '2026-06-13T09:19:45',
    durationSeconds: 285, // [REAL]
    magnitude: 6.2,             // [REAL]
    aftershockCount: 1,         // [REAL]
    aftershockMagnitudeScale: 4.1, // [REAL]
    finalEarthquakePhase: 'EVACUATION_COMPLETE', // [REAL]
    prepLevel: 'HIGH',   // [CLASSIFIER]
    prepScore: 88,
    resultText:
      'All three phases of Drop, Cover, and Hold On performed correctly within expected response windows. ' +
      'Adapted to aftershock condition without leaving cover. ' +
      'Evacuation route initiated within 45 seconds of mainshock end.',
    featureImportance: [
      { name: 'phase_completion_rate',  value: 0.36 },
      { name: 'response_latency',       value: 0.27 },
      { name: 'aftershock_adaptation',  value: 0.22 },
      { name: 'evacuation_efficiency',  value: 0.15 },
    ],
    log: [
      // All per-phase and per-action events are [FUTURE] instrumentation.
      // Session-level fields (magnitude, aftershockCount, finalEarthquakePhase, duration) are [REAL].
      { ts: '00:00.00', code: 'SESSION_INIT',     msg: 'participant=reyes_a · session=SES-003 · uuid=c9d1-4e27' }, // [REAL]
      { ts: '00:02.05', code: 'SCENARIO_START',   msg: 'EARTHQUAKE · M6.2 · LSPU Science Building' },             // magnitude [REAL]
      { ts: '00:18.00', code: 'PHASE_TRIGGER',    msg: 'phase=DROP initiated' },                                   // [FUTURE]
      { ts: '00:31.44', code: 'ACTION_DROP',      msg: 'player performed DROP · latency=13.4s' },                  // [FUTURE]
      { ts: '00:52.00', code: 'PHASE_TRIGGER',    msg: 'phase=COVER initiated' },                                  // [FUTURE]
      { ts: '01:05.77', code: 'ACTION_COVER',     msg: 'player took cover under desk · latency=13.8s' },           // [FUTURE]
      { ts: '01:28.00', code: 'PHASE_TRIGGER',    msg: 'phase=HOLD_ON initiated' },                                // [FUTURE]
      { ts: '01:45.22', code: 'ACTION_HOLD',      msg: 'hold-on position maintained' },                            // [FUTURE]
      { ts: '02:15.00', code: 'AFTERSHOCK',       msg: 'M4.1 · aftershockCount=1' },                              // [REAL]: aftershockCount, magnitudeScale
      { ts: '02:38.88', code: 'ACTION_RESECURE',  msg: 'player re-secured cover position' },                       // [FUTURE]
      { ts: '03:00.00', code: 'MAINSHOCK_END',    msg: 'shaking subsided · phase=HOLD_ON complete' },              // phase [REAL]
      { ts: '03:45.00', code: 'PHASE_TRIGGER',    msg: 'phase=EVACUATION initiated' },                             // [REAL]: EarthquakePhase
      { ts: '04:12.66', code: 'ACTION_EVACUATE',  msg: 'evacuation route selected · stairwell B' },                // [FUTURE]
      { ts: '04:45.00', code: 'SESSION_END',      msg: 'COMPLETE · phase=EVACUATION_COMPLETE · duration=285s' },   // [REAL]
    ],
  },
  {
    id: 'SES-004',
    participantId: 'p004',
    participantName: 'Carlo Bautista',
    section: 'BSED-B4',
    disasterType: 'FIRE',
    startTime: '2026-06-14T10:30:00',
    endTime:   '2026-06-14T10:37:20',
    durationSeconds: 440, // [REAL]
    firesExtinguishedCount: 0, // [REAL]
    prepLevel: 'LOW',    // [CLASSIFIER]
    prepScore: 38,
    resultText:
      'P.A.S.S. technique was incomplete — sweep phase not reached. ' +
      'Extended time to first response (41 seconds) and failure to suppress any fires. ' +
      'Retake recommended.',
    featureImportance: [
      { name: 'pass_completion_rate',   value: 0.40 },
      { name: 'time_to_first_response', value: 0.31 },
      { name: 'fires_extinguished',     value: 0.17 },
      { name: 'session_efficiency',     value: 0.12 },
    ],
    log: [
      { ts: '00:00.00', code: 'SESSION_INIT',   msg: 'participant=bautista_c · session=SES-004 · uuid=d2f0-7a38' },
      { ts: '00:02.10', code: 'SCENARIO_START', msg: 'FIRE · laboratory chemical fire spawned' },
      { ts: '00:41.05', code: 'ITEM_PICKUP',    msg: 'fire_extinguisher acquired [delayed]' },
      { ts: '01:22.00', code: 'TUTORIAL_ENTER', msg: 'P.A.S.S. tutorial mode active' },
      { ts: '02:15.44', code: 'PASS_PULL',      msg: 'pin extracted ✓ — slow' },
      { ts: '03:10.11', code: 'PASS_AIM',       msg: 'nozzle aimed — incorrect angle' },
      { ts: '04:05.33', code: 'PASS_SQUEEZE',   msg: 'agent released — minimal pressure' },
      { ts: '07:20.00', code: 'SESSION_END',    msg: 'TIMEOUT · firesExtinguished=0 · duration=440s' },
    ],
  },
  {
    id: 'SES-005',
    participantId: 'p005',
    participantName: 'Rose Villanueva',
    section: 'BSED-A3',
    disasterType: 'EARTHQUAKE',
    startTime: '2026-06-15T14:00:00',
    endTime:   '2026-06-15T14:05:50',
    durationSeconds: 350, // [REAL]
    magnitude: 5.8,
    aftershockCount: 2,
    aftershockMagnitudeScale: 3.9,
    finalEarthquakePhase: 'EVACUATION',
    prepLevel: 'MODERATE', // [CLASSIFIER]
    prepScore: 71,
    resultText:
      'Drop and cover phases executed correctly. Hold-on phase was cut short — participant moved prematurely. ' +
      'Handled first aftershock adequately but position was compromised during second.',
    featureImportance: [
      { name: 'phase_completion_rate',  value: 0.33 },
      { name: 'aftershock_adaptation',  value: 0.30 },
      { name: 'response_latency',       value: 0.24 },
      { name: 'evacuation_efficiency',  value: 0.13 },
    ],
    log: [
      { ts: '00:00.00', code: 'SESSION_INIT',    msg: 'participant=villanueva_r · session=SES-005 · uuid=e5c2-0b49' },
      { ts: '00:02.11', code: 'SCENARIO_START',  msg: 'EARTHQUAKE · M5.8 · LSPU Library Building' },
      { ts: '00:20.00', code: 'PHASE_TRIGGER',   msg: 'phase=DROP initiated' },
      { ts: '00:38.55', code: 'ACTION_DROP',      msg: 'player performed DROP · latency=18.6s' },
      { ts: '00:58.00', code: 'PHASE_TRIGGER',   msg: 'phase=COVER initiated' },
      { ts: '01:12.44', code: 'ACTION_COVER',    msg: 'player took cover · latency=14.4s' },
      { ts: '01:40.00', code: 'PHASE_TRIGGER',   msg: 'phase=HOLD_ON initiated' },
      { ts: '02:10.00', code: 'ACTION_PREMOVE',  msg: 'player left cover prematurely [HOLD_ON incomplete]' },
      { ts: '02:30.00', code: 'AFTERSHOCK',      msg: 'M3.9 · aftershockCount=1 — player repositioned' },
      { ts: '03:05.00', code: 'AFTERSHOCK',      msg: 'M3.9 · aftershockCount=2 — cover compromised' },
      { ts: '03:30.00', code: 'MAINSHOCK_END',   msg: 'shaking subsided' },
      { ts: '04:15.00', code: 'PHASE_TRIGGER',   msg: 'phase=EVACUATION initiated' },
      { ts: '05:50.00', code: 'SESSION_END',     msg: 'COMPLETE · phase=EVACUATION · duration=350s' },
    ],
  },
  {
    id: 'SES-006',
    participantId: 'p006',
    participantName: 'Miguel Fernandez',
    section: 'BSED-C4',
    disasterType: 'FIRE',
    startTime: '2026-06-17T09:00:00',
    endTime:   '2026-06-17T09:03:55',
    durationSeconds: 235, // [REAL]
    firesExtinguishedCount: 2, // [REAL]
    prepLevel: 'MODERATE', // [CLASSIFIER]
    prepScore: 63,
    resultText:
      'Both fires suppressed within session time. P.A.S.S. aim step was imprecise but self-corrected. ' +
      'Strong result on fires extinguished but technique consistency was below threshold for HIGH.',
    featureImportance: [
      { name: 'pass_completion_rate',   value: 0.35 },
      { name: 'fires_extinguished',     value: 0.30 },
      { name: 'time_to_first_response', value: 0.22 },
      { name: 'session_efficiency',     value: 0.13 },
    ],
    log: [
      { ts: '00:00.00', code: 'SESSION_INIT',   msg: 'participant=fernandez_m · session=SES-006 · uuid=f1a4-3c50' },
      { ts: '00:02.00', code: 'SCENARIO_START', msg: 'FIRE · cafeteria grease fire spawned' },
      { ts: '00:18.44', code: 'ITEM_PICKUP',    msg: 'fire_extinguisher acquired' },
      { ts: '00:35.00', code: 'PASS_PULL',      msg: 'pin extracted ✓' },
      { ts: '00:52.11', code: 'PASS_AIM',       msg: 'nozzle aimed — slight misalignment corrected' },
      { ts: '01:10.00', code: 'PASS_SQUEEZE',   msg: 'agent released ✓' },
      { ts: '01:28.33', code: 'PASS_SWEEP',     msg: 'sweep incomplete — partial' },
      { ts: '01:55.00', code: 'TARGET_OUT',     msg: 'cafeteria_fire suppressed [firesExtinguished=1]' },
      { ts: '02:30.00', code: 'FIRE_SPAWNED',   msg: 'trash_fire · exit corridor' },
      { ts: '02:55.22', code: 'TARGET_OUT',     msg: 'corridor_fire suppressed [firesExtinguished=2]' },
      { ts: '03:55.00', code: 'SESSION_END',    msg: 'COMPLETE · firesExtinguished=2 · duration=235s' },
    ],
  },
  {
    id: 'SES-007',
    participantId: 'p007',
    participantName: 'Lea Gonzalez',
    section: 'BSED-C3',
    disasterType: 'EARTHQUAKE',
    startTime: '2026-06-18T13:45:00',
    endTime:   '2026-06-18T13:53:10',
    durationSeconds: 490, // [REAL]
    magnitude: 6.5,
    aftershockCount: 3,
    aftershockMagnitudeScale: 5.1,
    finalEarthquakePhase: 'HOLD_ON',
    prepLevel: 'LOW', // [CLASSIFIER]
    prepScore: 41,
    resultText:
      'Drop and cover phases were delayed. ' +
      'Did not maintain hold-on position through mainshock; left cover during all three aftershock events. ' +
      'Did not reach evacuation phase. Retake recommended.',
    featureImportance: [
      { name: 'phase_completion_rate',  value: 0.42 },
      { name: 'aftershock_adaptation',  value: 0.30 },
      { name: 'response_latency',       value: 0.18 },
      { name: 'evacuation_efficiency',  value: 0.10 },
    ],
    log: [
      { ts: '00:00.00', code: 'SESSION_INIT',    msg: 'participant=gonzalez_l · session=SES-007 · uuid=a8b5-6d61' },
      { ts: '00:02.15', code: 'SCENARIO_START',  msg: 'EARTHQUAKE · M6.5 · LSPU Gymnasium' },
      { ts: '00:38.00', code: 'PHASE_TRIGGER',   msg: 'phase=DROP initiated [delayed]' },
      { ts: '01:05.33', code: 'ACTION_DROP',     msg: 'player performed DROP · latency=27.3s' },
      { ts: '01:30.00', code: 'PHASE_TRIGGER',   msg: 'phase=COVER initiated' },
      { ts: '02:01.44', code: 'ACTION_COVER',    msg: 'player took cover · latency=31.4s' },
      { ts: '02:30.00', code: 'PHASE_TRIGGER',   msg: 'phase=HOLD_ON initiated' },
      { ts: '03:10.00', code: 'ACTION_PREMOVE',  msg: 'player left cover prematurely' },
      { ts: '03:45.00', code: 'AFTERSHOCK',      msg: 'M5.1 · aftershockCount=1 — no cover taken' },
      { ts: '05:00.00', code: 'AFTERSHOCK',      msg: 'M4.8 · aftershockCount=2 — no cover taken' },
      { ts: '06:20.00', code: 'AFTERSHOCK',      msg: 'M4.2 · aftershockCount=3 — no cover taken' },
      { ts: '08:10.00', code: 'SESSION_END',     msg: 'TIMEOUT · phase=HOLD_ON · duration=490s' },
    ],
  },
  {
    id: 'SES-008',
    participantId: 'p008',
    participantName: 'Paulo Ramos',
    section: 'BSED-A4',
    disasterType: 'EARTHQUAKE',
    startTime: '2026-06-19T08:30:00',
    endTime:   '2026-06-19T08:34:15',
    durationSeconds: 255, // [REAL]
    magnitude: 5.5,
    aftershockCount: 1,
    aftershockMagnitudeScale: 3.6,
    finalEarthquakePhase: 'EVACUATION_COMPLETE',
    prepLevel: 'HIGH', // [CLASSIFIER]
    prepScore: 91,
    resultText:
      'All phases completed with minimal response latency. ' +
      'Maintained cover through mainshock and aftershock without premature movement. ' +
      'Fastest evacuation initiation in current cohort.',
    featureImportance: [
      { name: 'phase_completion_rate',  value: 0.38 },
      { name: 'response_latency',       value: 0.28 },
      { name: 'aftershock_adaptation',  value: 0.20 },
      { name: 'evacuation_efficiency',  value: 0.14 },
    ],
    log: [
      { ts: '00:00.00', code: 'SESSION_INIT',    msg: 'participant=ramos_p · session=SES-008 · uuid=b3c6-8e72' },
      { ts: '00:02.00', code: 'SCENARIO_START',  msg: 'EARTHQUAKE · M5.5 · LSPU Admin Building' },
      { ts: '00:15.00', code: 'PHASE_TRIGGER',   msg: 'phase=DROP initiated' },
      { ts: '00:23.11', code: 'ACTION_DROP',     msg: 'player performed DROP · latency=8.1s' },
      { ts: '00:45.00', code: 'PHASE_TRIGGER',   msg: 'phase=COVER initiated' },
      { ts: '00:54.88', code: 'ACTION_COVER',    msg: 'player took cover · latency=9.9s' },
      { ts: '01:15.00', code: 'PHASE_TRIGGER',   msg: 'phase=HOLD_ON initiated' },
      { ts: '01:30.44', code: 'ACTION_HOLD',     msg: 'hold-on position maintained' },
      { ts: '01:55.00', code: 'AFTERSHOCK',      msg: 'M3.6 · aftershockCount=1 — cover maintained ✓' },
      { ts: '02:30.00', code: 'MAINSHOCK_END',   msg: 'shaking subsided · phase=HOLD_ON complete' },
      { ts: '02:55.00', code: 'PHASE_TRIGGER',   msg: 'phase=EVACUATION initiated' },
      { ts: '03:33.77', code: 'ACTION_EVACUATE', msg: 'evacuation route selected · main exit' },
      { ts: '04:15.00', code: 'SESSION_END',     msg: 'COMPLETE · phase=EVACUATION_COMPLETE · duration=255s' },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

export function getSession(id: string): Session | undefined {
  return sessions.find(s => s.id === id);
}

export function getRecentSessions(n = 5): Session[] {
  return [...sessions].reverse().slice(0, n);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getTierCounts(): { high: number; moderate: number; low: number; total: number } {
  const high     = sessions.filter(s => s.prepLevel === 'HIGH').length;
  const moderate = sessions.filter(s => s.prepLevel === 'MODERATE').length;
  const low      = sessions.filter(s => s.prepLevel === 'LOW').length;
  return { high, moderate, low, total: sessions.length };
}

export function getAvgScore(): number {
  const sum = sessions.reduce((acc, s) => acc + s.prepScore, 0);
  return Math.round((sum / sessions.length) * 10) / 10;
}

export function getScenarioSplit(): { fire: number; eq: number } {
  const fire = sessions.filter(s => s.disasterType === 'FIRE').length;
  const eq   = sessions.filter(s => s.disasterType === 'EARTHQUAKE').length;
  return { fire, eq };
}

export function getSessionsThisWeek(): number {
  // Week of 2026-06-15 through 2026-06-19
  return sessions.filter(s => s.startTime >= '2026-06-15').length;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ── Roster helpers ────────────────────────────────────────────────────────

export interface ParticipantStats {
  participant: Participant;
  sessionCount: number;
  avgScore: number;
  bestLevel: PrepLevel;
  latestLevel: PrepLevel | null;
  latestDate: string | null;
  sessions: Session[];
  tierCounts: { high: number; moderate: number; low: number };
}

export function getParticipantStats(): ParticipantStats[] {
  return participants.map(p => {
    const pSessions = sessions.filter(s => s.participantId === p.id);
    const sorted = [...pSessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const avgScore = pSessions.length
      ? Math.round(pSessions.reduce((acc, s) => acc + s.prepScore, 0) / pSessions.length)
      : 0;
    const levels: PrepLevel[] = ['HIGH', 'MODERATE', 'LOW'];
    const bestLevel = levels.find(l => pSessions.some(s => s.prepLevel === l)) ?? 'LOW';
    const latestLevel = sorted[0]?.prepLevel ?? null;
    const latestDate  = sorted[0]?.startTime ?? null;
    const tierCounts = {
      high:     pSessions.filter(s => s.prepLevel === 'HIGH').length,
      moderate: pSessions.filter(s => s.prepLevel === 'MODERATE').length,
      low:      pSessions.filter(s => s.prepLevel === 'LOW').length,
    };
    return { participant: p, sessionCount: pSessions.length, avgScore, bestLevel, latestLevel, latestDate, sessions: sorted, tierCounts };
  });
}
