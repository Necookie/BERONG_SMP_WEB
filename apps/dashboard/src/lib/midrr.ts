import type { LiveSession } from './queries';

const DEFAULT_BASE_URL = 'https://midrr-api.onrender.com';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Reads MIDRR_API_URL the same way db.ts reads TURSO_URL: `cloudflare:workers`
 * env is only populated during request context in @astrojs/cloudflare v13, so
 * the import must stay dynamic (a static top-level import would capture an
 * empty value at init time).
 */
export async function getMidrrBaseUrl(): Promise<string> {
  try {
    const { env: cfEnv } = await import('cloudflare:workers');
    const url = (cfEnv as Record<string, string>)?.MIDRR_API_URL;
    if (url) return url;
  } catch {}
  const url = import.meta.env.MIDRR_API_URL as string | undefined;
  return url || DEFAULT_BASE_URL;
}

export interface MidrrFeatureWeight {
  feature: string;
  weight: number; // signed SHAP value for this student
}

export interface MidrrPrediction {
  prepLevel: 'HIGH' | 'MODERATE' | 'LOW';
  prepScore: number;
  featureImportance: MidrrFeatureWeight[];
  resultText: string;
  /** The 9 engineered feature values actually sent to /predict (null-coalesced). */
  features: Record<string, number>;
}

export class MidrrApiError extends Error {
  constructor(message: string, public status?: number, public detail?: unknown) {
    super(message);
    this.name = 'MidrrApiError';
  }
}

interface RawEventLogEntry {
  type: string;
  tOffsetMs: number;
  data: Record<string, unknown>;
}

interface MidrrWireEvent {
  timestamp: number;
  event_type: string;
  x?: number;
  y?: number;
  z?: number;
  hazard_distance?: number;
  [extra: string]: unknown;
}

/**
 * Maps this repo's Turso event_log vocabulary (SIM_START, PLAYER_TICK,
 * EXT_PIN_PULL, ...) to the MiDRR API's wire vocabulary documented in
 * telemetry_contract.md §4 (ML repo). This mapping is a best-effort port from
 * WEB_INTEGRATION_GUIDE.md — confirm the exact target event_type strings
 * against {BASE_URL}/docs before trusting it against a non-demo model.
 */
function mapEventType(tursoType: string): string | null {
  switch (tursoType) {
    case 'SIM_START': return 'session_start';
    case 'SIM_END': return 'session_end';
    case 'PLAYER_TICK': return 'move';
    case 'EXT_PIN_PULL': return 'pin_pull';
    case 'EXT_SPRAY': return 'ext_spray';
    case 'extinguisher_use': return 'ext_spray';
    case 'fire_alarm_activate': return 'fire_alarm_activate';
    case 'door_open': return 'door_open';
    case 'assembly_area_reached': return 'assembly_area_reached';
    case 'emergency_exit': return 'emergency_exit';
    case 'FIRE_SPREAD': return null; // environment event, not a player action
    default: return null;
  }
}

function mapEventLogToMidrr(eventLogJson: string): MidrrWireEvent[] {
  const events = JSON.parse(eventLogJson) as RawEventLogEntry[];
  const mapped: MidrrWireEvent[] = [];

  for (const e of events) {
    const eventType = mapEventType(e.type);
    if (!eventType) continue;

    const data = e.data ?? {};
    const wireEvent: MidrrWireEvent = {
      ...data,
      timestamp: e.tOffsetMs / 1000,
      event_type: eventType,
    };

    // extinguisher_use (CO2) uses hit_target; ext_spray (ABC) uses hit_fire —
    // normalize both to hit_fire for the API's single ext_spray event_type.
    if (e.type === 'extinguisher_use') {
      wireEvent.hit_fire = data.hit_target;
      wireEvent.extinguisher_class = 'CO2';
    } else if (e.type === 'EXT_SPRAY') {
      wireEvent.extinguisher_class = 'ABC';
    }

    if (e.type === 'PLAYER_TICK' && typeof data.nearest_fire_dist === 'number') {
      wireEvent.hazard_distance = data.nearest_fire_dist;
    }

    mapped.push(wireEvent);
  }

  return mapped;
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new MidrrApiError('MiDRR API timed out — the free-tier service may be cold-starting. Try again in a few seconds.');
    }
    throw new MidrrApiError(`Failed to reach MiDRR API: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let detail: unknown;
    try { detail = await res.json(); } catch { detail = await res.text().catch(() => undefined); }
    if (res.status === 503) {
      throw new MidrrApiError('MiDRR model not loaded on the server yet.', 503, detail);
    }
    if (res.status === 422) {
      throw new MidrrApiError('MiDRR API rejected the request payload (validation error).', 422, detail);
    }
    throw new MidrrApiError(`MiDRR API returned ${res.status}`, res.status, detail);
  }
  return res.json();
}

export async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const body = await fetchJson(`${baseUrl}/health`, { method: 'GET' }) as { status?: string };
    return body?.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Runs the two-step MiDRR flow for one finished session:
 *   1. Replay the stored event_log to POST /session/{id}/events so the API
 *      computes the 9 engineered features server-side. All 9 keys are always
 *      present in the response with zero-event defaults (e.g. spray_accuracy
 *      is 0.0 with no sprays), EXCEPT `path_efficiency_ratio` and
 *      `situational_awareness` — these come back JSON `null` whenever
 *      `is_complete` is false (session never reached the assembly area), since
 *      the API can't compute path-efficiency-to-assembly or the
 *      completion-dependent composite without a reached endpoint. Confirmed
 *      empirically across all 21 synthetic sessions: nulls appear on exactly
 *      the incomplete ones. Coalesced to 0 below (worst-case: didn't
 *      demonstrate the behavior) so /predict doesn't 422 on these.
 *   2. Feed those features to POST /predict for the tier + score + signed
 *      SHAP feature importance + adaptive feedback text.
 *   3. DELETE /session/{id} to release the API's in-memory event buffer.
 */
export async function runPrediction(baseUrl: string, session: LiveSession): Promise<MidrrPrediction> {
  if (!session.event_log) {
    throw new MidrrApiError('This session has no event_log to replay.');
  }

  const scenarioType = (session.simulation_type ?? 'fire').toLowerCase();
  const playerId = session.station_account;
  const sessionId = String(session.id);
  const events = mapEventLogToMidrr(session.event_log);

  const snapshot = await fetchJson(`${baseUrl}/session/${sessionId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract_version: '1.2',
      session_id: sessionId,
      player_id: playerId,
      scenario_type: scenarioType,
      events,
    }),
  }) as { features: Record<string, number | null> };

  const features: Record<string, number> = {};
  for (const [key, value] of Object.entries(snapshot.features)) {
    features[key] = value ?? 0;
  }

  try {
    const prediction = await fetchJson(`${baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId,
        scenario_type: scenarioType,
        ...features,
      }),
    }) as Omit<MidrrPrediction, 'features'>;

    return { ...prediction, features };
  } finally {
    // Best-effort cleanup of the API's in-memory session buffer.
    await fetch(`${baseUrl}/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  }
}
