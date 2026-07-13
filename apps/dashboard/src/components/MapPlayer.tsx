import { useState, useEffect, useRef, useMemo } from 'react';
import {
  LIBRARY_BOUNDS, LIBRARY_ROOMS, LIBRARY_OUTER, ASSEMBLY_ZONE,
  CCS_BOUNDS, CCS_OUTER, CCS_ROOMS, CCS_ASSEMBLY_ZONE, CCS_FLOOR_Y_BOUNDARY,
  NEW_SIM2_BOUNDS, NEW_SIM2_ROOMS, NEW_SIM2_OUTER_GROUND, NEW_SIM2_OUTER_UPPER,
  NEW_SIM2_ASSEMBLY_ZONE, NEW_SIM2_FLOOR_Y_BOUNDARY,
  worldToSvg,
  type BuildingBounds,
  type Room,
} from '../lib/floorplans';

// ── Types ─────────────────────────────────────────────────────────────────

interface CsvRow {
  timestamp: number;
  event_type: string;
  x: number;
  y: number;
  z: number;
  interaction_target: string;
  hazardDistance: number;
  hitFire: boolean;
}

// One row per real fire block igniting or being put out — session.fire_log_csv,
// a dedicated log kept separate from move_tick rows (see TelemetryCsvWriter.writeFireLogRow
// in the mod repo). Header: session_id,timestamp,x,y,z,event
interface FireRow {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  event: 'ignite' | 'extinguish';
}

interface Props {
  moveCsv: string | null;
  fireLogCsv?: string | null;
  simulationType: string | null;
}

// telemetry_contract.md v1.2 §4: "in danger" = hazard_distance < this (blocks).
const SAFE_HAZARD_DISTANCE = 5.0;

// ── CSV parser ────────────────────────────────────────────────────────────
// Header (contract v1.2): player_id,session_id,scenario_type,timestamp,event_type,
// x,y,z,hazard_distance,interaction_target,nearby_player_count,hit_fire,extinguisher_class,phase

function parseCsv(csv: string): CsvRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const rows: CsvRow[] = [];
  let lastX = 0, lastY = 0, lastZ = 0;
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const ts = parseFloat(parts[3]);
    if (isNaN(ts)) continue;
    const rx = parseFloat(parts[5]);
    const ry = parseFloat(parts[6]);
    const rz = parseFloat(parts[7]);
    // Carry forward last known position for action events that log no coords
    const x = isNaN(rx) ? lastX : rx;
    const y = isNaN(ry) ? lastY : ry;
    const z = isNaN(rz) ? lastZ : rz;
    if (!isNaN(rx)) { lastX = rx; lastY = ry; lastZ = rz; }
    rows.push({
      timestamp: ts,
      event_type: parts[4] ?? '',
      x, y, z,
      interaction_target: parts[9] ?? '',
      hazardDistance: parseFloat(parts[8]),
      hitFire: parts[11] === '1' || parts[11] === 'true',
    });
  }
  return rows;
}

// ── Fire log parser ──────────────────────────────────────────────────────
// Header: session_id,timestamp,x,y,z,event

function parseFireLog(csv: string): FireRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const rows: FireRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const ts = parseFloat(parts[1]);
    const x = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);
    const z = parseInt(parts[4], 10);
    if (isNaN(ts) || isNaN(x) || isNaN(y) || isNaN(z)) continue;
    const event = parts[5]?.trim();
    if (event !== 'ignite' && event !== 'extinguish') continue;
    rows.push({ timestamp: ts, x, y, z, event });
  }
  // Rows are written in tick order already, but sort defensively — the active-fire
  // computation below assumes chronological order.
  rows.sort((a, b) => a.timestamp - b.timestamp);
  return rows;
}

/** Which (x,y,z) fire blocks are still burning as of `currentTs`, replaying every row in order. */
function activeFiresAt(fireRows: FireRow[], currentTs: number): { x: number; y: number; z: number }[] {
  const active = new Map<string, { x: number; y: number; z: number }>();
  for (const r of fireRows) {
    if (r.timestamp > currentTs) break;
    const key = `${r.x},${r.y},${r.z}`;
    if (r.event === 'ignite') active.set(key, { x: r.x, y: r.y, z: r.z });
    else active.delete(key);
  }
  return [...active.values()];
}

// ── Event marker colours ──────────────────────────────────────────────────

const EVENT_META: Record<string, { color: string; label: string }> = {
  fire_alarm_activate:  { color: '#ef4444', label: 'Fire alarm' },
  door_open:            { color: '#6b8cff', label: 'Door opened' },
  extinguisher_use:     { color: '#f5c842', label: 'Extinguisher' },
  pin_pull:             { color: '#fbbf24', label: 'Pin pulled' },
  ext_spray:            { color: '#f97316', label: 'Extinguisher spray' },
  hazard_neutralize:    { color: '#14b8a6', label: 'Hazard put out' },
  assembly_area_reached:{ color: '#22c55e', label: 'Assembly zone' },
  emergency_exit:       { color: '#42d9d4', label: 'Emergency exit' },
  duck_cover_hold:      { color: '#a855f7', label: 'Duck, cover & hold' },
  session_start:        { color: '#ffffff', label: 'Start' },
  session_end:          { color: '#ffffff', label: 'End' },
};

const ACTION_TYPES = new Set(Object.keys(EVENT_META).filter(k => k !== 'session_start' && k !== 'session_end'));

// ── Event marker SVG element ──────────────────────────────────────────────

function EventMarker({ x, y, type, hit }: { x: number; y: number; type: string; hit?: boolean }) {
  const meta = EVENT_META[type];
  if (!meta) return null;
  const c = meta.color;
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
      <title>{meta.label}{type === 'ext_spray' ? (hit ? ' (hit)' : ' (missed)') : ''}</title>
      {type === 'fire_alarm_activate'   && <circle r={5}   fill={c} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} />}
      {type === 'door_open'             && <rect x={-4} y={-4} width={8} height={8} fill={c} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} />}
      {type === 'extinguisher_use'      && <polygon points="0,-5 5,0 0,5 -5,0" fill={c} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} />}
      {/* Pin ring — the PASS-technique "pull the pin" step */}
      {type === 'pin_pull'              && (
        <>
          <circle r={3.5} fill="none" stroke={c} strokeWidth={1.8} />
          <circle r={1}   fill={c} />
        </>
      )}
      {/* Spray diamond — filled when it actually hit an active hazard, hollow on a miss */}
      {type === 'ext_spray'             && (
        <polygon points="0,-5 5,0 0,5 -5,0"
          fill={hit ? c : 'none'} fillOpacity={0.9}
          stroke={c} strokeWidth={hit ? 0.5 : 1.5} />
      )}
      {/* Bullseye — a hazard was successfully neutralized here */}
      {type === 'hazard_neutralize'     && (
        <>
          <circle r={5}   fill="none" stroke={c} strokeWidth={1.5} />
          <circle r={2}   fill={c} />
        </>
      )}
      {type === 'assembly_area_reached' && <polygon points="0,-6 1.4,-2 6,-2 2.5,1 3.5,6 0,3.5 -3.5,6 -2.5,1 -6,-2 -1.4,-2" fill={c} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} />}
      {type === 'emergency_exit'        && <polygon points="0,-5 -4,3 4,3" fill={c} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} />}
      {type === 'duck_cover_hold'       && <polygon points="0,-6 4,-4 4,1 0,6 -4,1 -4,-4" fill={c} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} />}
      {(type === 'session_start' || type === 'session_end') && (
        <circle r={4} fill="transparent" stroke={c} strokeWidth={1.5} />
      )}
    </g>
  );
}

// ── Hazard-proximity "danger trail" ────────────────────────────────────────
// Small dots along the visible path wherever the player was within
// SAFE_HAZARD_DISTANCE of an active hazard — the "how close did they get to
// the fire" picture that a plain movement line can't show on its own.

function DangerTrail({ rows, bounds }: { rows: CsvRow[]; bounds: BuildingBounds }) {
  return (
    <>
      {rows.map((r, i) => {
        const [x, y] = worldToSvg(r.x, r.z, bounds);
        const intensity = Math.max(0, Math.min(1, 1 - r.hazardDistance / SAFE_HAZARD_DISTANCE));
        return (
          <circle key={i} cx={x} cy={y} r={2.2} fill="#ff3b3b"
            fillOpacity={0.12 + intensity * 0.5} />
        );
      })}
    </>
  );
}

function isNearHazard(r: CsvRow): boolean {
  return !isNaN(r.hazardDistance) && r.hazardDistance >= 0 && r.hazardDistance < SAFE_HAZARD_DISTANCE;
}

// ── Animated flame marker — "actual moving fire", not a static dot ────────
// Deterministic per-position pseudo-random phase (a coordinate hash, not Math.random())
// so a flame's flicker is stable across re-renders but two nearby flames don't flicker
// in lockstep. Pure SVG SMIL animation (<animateTransform>/<animate>) — runs on the
// browser's own timeline, no per-frame React re-render cost.

function flickerSeed(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s); // fractional part, in [0, 1)
}

function FlameMarker({ x, y }: { x: number; y: number }) {
  const seed = flickerSeed(x, y);
  const dur = (0.45 + seed * 0.5).toFixed(2);
  const delay = (seed * 0.4).toFixed(2);
  const size = 0.85 + seed * 0.3; // slight per-tile size variance
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${size.toFixed(2)})`}>
      {/* Heat glow — static, just a soft radial wash */}
      <circle r={9} fill="#ff8c42" fillOpacity={0.1} />
      <circle r={5.5} fill="#ff6a1a" fillOpacity={0.12} />
      {/* Flickering flame body */}
      <g>
        <animateTransform attributeName="transform" type="scale"
          values="0.88;1.2;0.95;1.12;0.88" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
        <path d="M0,4.6 C-2.7,2 -2.9,-1.3 -0.6,-4 C-0.2,-2.3 0.6,-2.7 0.4,-4.4 C2.7,-2 3.1,1.7 0,4.6 Z"
          fill="#ff5a1f" fillOpacity={0.92} stroke="#c23f0f" strokeWidth={0.3} />
        <animateTransform attributeName="transform" type="rotate"
          values="-4;4;-4" dur={`${(Number(dur) * 1.7).toFixed(2)}s`} begin={`${delay}s`} repeatCount="indefinite" additive="sum" />
      </g>
      {/* Hot inner core, flickers slightly out of phase with the body */}
      <g>
        <animate attributeName="opacity" values="0.8;1;0.85;1;0.8" dur={`${(Number(dur) * 0.8).toFixed(2)}s`}
          begin={`${(Number(delay) + 0.15).toFixed(2)}s`} repeatCount="indefinite" />
        <path d="M0,2.6 C-1.3,1 -1.3,-0.8 0,-2.5 C0.9,-1 1.2,0.8 0,2.6 Z" fill="#ffd23f" />
      </g>
    </g>
  );
}

/** All currently-active fire markers for one panel, already filtered/positioned by the caller. */
function FireLayer({ fires, bounds }: { fires: { x: number; y: number; z: number }[]; bounds: BuildingBounds }) {
  return (
    <>
      {fires.map(f => {
        const [sx, sy] = worldToSvg(f.x, f.z, bounds);
        return <FlameMarker key={`${f.x},${f.y},${f.z}`} x={sx} y={sy} />;
      })}
    </>
  );
}

// ── Shared polyline builder ───────────────────────────────────────────────

function buildPoints(rows: CsvRow[], bounds: BuildingBounds): string {
  if (rows.length === 0) return '';
  return rows
    .map(r => {
      const [sx, sy] = worldToSvg(r.x, r.z, bounds);
      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');
}

// ── Library floor plan SVG ────────────────────────────────────────────────

interface LibraryPanelProps {
  rows: CsvRow[];
  fireRows: FireRow[];
  frame: number;
}

function LibraryPanel({ rows, fireRows, frame }: LibraryPanelProps) {
  const bounds = LIBRARY_BOUNDS;

  const currentTs = rows[frame]?.timestamp ?? 0;

  const activeFires = useMemo(() => activeFiresAt(fireRows, currentTs), [fireRows, currentTs]);

  const allMovePts = useMemo(
    () => buildPoints(rows.filter(r => r.event_type === 'move_tick'), bounds),
    [rows],
  );

  const visibleMovePts = useMemo(
    () => buildPoints(
      rows.filter(r => r.event_type === 'move_tick' && r.timestamp <= currentTs),
      bounds,
    ),
    [rows, currentTs],
  );

  const visibleEvents = useMemo(
    () => rows.filter(r => ACTION_TYPES.has(r.event_type) && r.timestamp <= currentTs),
    [rows, currentTs],
  );

  const dangerRows = useMemo(
    () => rows.filter(r => r.event_type === 'move_tick' && r.timestamp <= currentTs && isNearHazard(r)),
    [rows, currentTs],
  );

  const cur = rows[frame];
  const [dotX, dotZ] = cur ? worldToSvg(cur.x, cur.z, bounds) : [-99, -99];

  // Assembly zone rect
  const [az1x, az1z] = worldToSvg(ASSEMBLY_ZONE.xMin, ASSEMBLY_ZONE.zMin, bounds);
  const [az2x, az2z] = worldToSvg(ASSEMBLY_ZONE.xMax, ASSEMBLY_ZONE.zMax, bounds);

  // Building outer rect
  const [bx1, bz1] = worldToSvg(LIBRARY_OUTER.xMin, LIBRARY_OUTER.zMin, bounds);
  const [bx2, bz2] = worldToSvg(LIBRARY_OUTER.xMax, LIBRARY_OUTER.zMax, bounds);

  return (
    <svg
      viewBox={`0 0 ${bounds.svgWidth} ${bounds.svgHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: 'var(--bg-log-panel)', display: 'block', width: '100%', maxHeight: '70vh' }}
    >
      {/* Assembly zone */}
      <rect
        x={az1x} y={az1z} width={az2x - az1x} height={az2z - az1z}
        fill="rgba(34,197,94,0.06)"
        stroke="#22c55e"
        strokeWidth={1}
        strokeDasharray="5 3"
      />
      <text
        x={(az1x + az2x) / 2}
        y={az1z + (az2z - az1z) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={8}
        fill="#22c55e"
        fillOpacity={0.55}
        fontFamily="JetBrains Mono, monospace"
      >
        Assembly Zone
      </text>

      {/* Building outline */}
      <rect
        x={bx1} y={bz1} width={bx2 - bx1} height={bz2 - bz1}
        fill="rgba(128,128,128,0.04)"
        stroke="var(--border-card)"
        strokeWidth={1.5}
      />

      {/* Room subdivisions */}
      {LIBRARY_ROOMS.map(room => {
        const [rx1, rz1] = worldToSvg(room.xMin, room.zMin, bounds);
        const [rx2, rz2] = worldToSvg(room.xMax, room.zMax, bounds);
        return (
          <g key={room.name}>
            <rect
              x={rx1} y={rz1} width={rx2 - rx1} height={rz2 - rz1}
              fill="rgba(128,128,128,0.03)"
              stroke="var(--text-muted)"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
            <text
              x={(rx1 + rx2) / 2}
              y={(rz1 + rz2) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7}
              fill="var(--text-muted)"
              fillOpacity={0.55}
              fontFamily="JetBrains Mono, monospace"
            >
              {room.name}
            </text>
          </g>
        );
      })}

      {/* Full ghost path */}
      {allMovePts && (
        <polyline
          points={allMovePts}
          fill="none"
          stroke="var(--text-muted)"
          strokeOpacity={0.3}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Hazard-proximity danger trail — how close/how long near fire */}
      <DangerTrail rows={dangerRows} bounds={bounds} />

      {/* Visible orange path */}
      {visibleMovePts && (
        <polyline
          points={visibleMovePts}
          fill="none"
          stroke="#ff8c42"
          strokeWidth={2}
          strokeOpacity={0.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Event markers */}
      {visibleEvents.map((evt, i) => {
        const [ex, ez] = worldToSvg(evt.x, evt.z, bounds);
        return <EventMarker key={i} x={ex} y={ez} type={evt.event_type} hit={evt.hitFire} />;
      })}

      {/* Session start/end markers */}
      {rows[0] && (() => {
        const [sx, sz] = worldToSvg(rows[0].x, rows[0].z, bounds);
        return <EventMarker x={sx} y={sz} type="session_start" />;
      })()}

      {/* Active fire — animated, replays ignite/extinguish over the timeline */}
      <FireLayer fires={activeFires} bounds={bounds} />

      {/* Player dot */}
      {cur && (
        <circle cx={dotX} cy={dotZ} r={5} fill="#ff8c42" stroke="#fff" strokeWidth={1} />
      )}

      {/* Compass */}
      <text x={bounds.padX} y={bounds.padZ - 10} fontSize={8} fill="var(--text-muted)" fillOpacity={0.5} fontFamily="JetBrains Mono, monospace">
        N ↑
      </text>
    </svg>
  );
}

// ── Room label: auto-rotate + multi-line for small rooms (CCS + New Sim 2) ─

function RoomLabel({
  name, rx1, rz1, rx2, rz2,
}: { name: string; rx1: number; rz1: number; rx2: number; rz2: number }) {
  const w  = rx2 - rx1;
  const h  = rz2 - rz1;
  const cx = (rx1 + rx2) / 2;
  const cy = (rz1 + rz2) / 2;

  // Rotate text -90° when room is taller than wide so text runs along the longer axis
  const shouldRotate = h > w;
  // Space (px) available along the text direction after a small margin
  const textSpan = (shouldRotate ? h : w) - 4;

  const CHAR_W = 0.6; // JetBrains Mono width-per-em ratio
  const BASE   = 6;   // default font size

  const fits = (sz: number, str: string) => str.length * sz * CHAR_W <= textSpan;

  let lines: string[];
  let fontSize: number;

  if (fits(BASE, name)) {
    lines    = [name];
    fontSize = BASE;
  } else if (name.includes(' ')) {
    // Split at the word boundary nearest the middle
    const words = name.split(' ');
    const mid   = Math.ceil(words.length / 2);
    const a     = words.slice(0, mid).join(' ');
    const b     = words.slice(mid).join(' ');
    lines    = [a, b];
    fontSize = fits(BASE, a) && fits(BASE, b) ? BASE : 5;
  } else {
    lines    = [name];
    fontSize = Math.max(4, Math.floor(textSpan / (name.length * CHAR_W)));
  }

  const lineH = fontSize + 2;

  return (
    <text
      textAnchor="middle"
      fontFamily="JetBrains Mono, monospace"
      fill="var(--text-muted)"
      fillOpacity={0.75}
      transform={shouldRotate ? `rotate(-90, ${cx}, ${cy})` : undefined}
    >
      {lines.map((line, i) => {
        const offset = (i - (lines.length - 1) / 2) * lineH;
        return (
          <tspan key={i} x={cx} y={cy + offset + fontSize * 0.35} fontSize={fontSize}>
            {line}
          </tspan>
        );
      })}
    </text>
  );
}

// ── Two-floor building panel SVG (CCS Admin Building, New Sim Building 2.0) ─
// Generalized from the original CCS-only panel once a second two-floor
// building (New Sim Building 2.0) needed the exact same ground/upper split,
// room-label auto-rotate, and assembly-zone overlay logic.

interface TwoFloorRect { xMin: number; xMax: number; zMin: number; zMax: number; }

interface TwoFloorPanelProps {
  rows: CsvRow[];
  fireRows: FireRow[];
  frame: number;
  floor: 'ground' | 'upper';
  label: string;
  bounds: BuildingBounds;
  rooms: Room[];
  outer: TwoFloorRect;
  /** Some buildings' assembly zone only makes sense on one floor (e.g. New Sim
   *  Building 2.0's is ground-level, outside the building) — pass null to skip
   *  drawing it on a given floor. */
  assemblyZone: TwoFloorRect | null;
  floorYBoundary: number;
}

function TwoFloorPanel({ rows, fireRows, frame, floor, label, bounds, rooms, outer, assemblyZone, floorYBoundary }: TwoFloorPanelProps) {
  const isOnThisFloor = (r: CsvRow) =>
    floor === 'ground' ? r.y <= floorYBoundary : r.y > floorYBoundary;
  const fireIsOnThisFloor = (r: FireRow) =>
    floor === 'ground' ? r.y <= floorYBoundary : r.y > floorYBoundary;

  const currentTs = rows[frame]?.timestamp ?? 0;

  const activeFires = useMemo(
    () => activeFiresAt(fireRows.filter(fireIsOnThisFloor), currentTs),
    [fireRows, currentTs, floor],
  );

  const allMovePts = useMemo(
    () => buildPoints(
      rows.filter(r => r.event_type === 'move_tick' && isOnThisFloor(r)),
      bounds,
    ),
    [rows, floor],
  );

  const visibleMovePts = useMemo(
    () => buildPoints(
      rows.filter(r => r.event_type === 'move_tick' && r.timestamp <= currentTs && isOnThisFloor(r)),
      bounds,
    ),
    [rows, currentTs, floor],
  );

  const visibleEvents = useMemo(
    () => rows.filter(r =>
      ACTION_TYPES.has(r.event_type) &&
      r.timestamp <= currentTs &&
      isOnThisFloor(r),
    ),
    [rows, currentTs, floor],
  );

  const dangerRows = useMemo(
    () => rows.filter(r =>
      r.event_type === 'move_tick' &&
      r.timestamp <= currentTs &&
      isOnThisFloor(r) &&
      isNearHazard(r),
    ),
    [rows, currentTs, floor],
  );

  const cur = rows[frame];
  const playerHere = cur ? isOnThisFloor(cur) : false;
  const [dotX, dotZ] = cur && playerHere ? worldToSvg(cur.x, cur.z, bounds) : [-99, -99];

  const floorRooms = rooms.filter(r => r.floor === floor);
  const [ox1, oz1] = worldToSvg(outer.xMin, outer.zMin, bounds);
  const [ox2, oz2] = worldToSvg(outer.xMax, outer.zMax, bounds);
  const assemblyRect = assemblyZone && {
    p1: worldToSvg(assemblyZone.xMin, assemblyZone.zMin, bounds),
    p2: worldToSvg(assemblyZone.xMax, assemblyZone.zMax, bounds),
  };

  // Which named room is the player currently standing in?
  const currentRoom = (cur && playerHere)
    ? floorRooms.find(r =>
        cur.x >= r.xMin && cur.x <= r.xMax &&
        cur.z >= r.zMin && cur.z <= r.zMax,
      ) ?? null
    : null;

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Floor label */}
      <div style={{
        padding: '5px 12px',
        fontSize: '9px',
        fontFamily: "'JetBrains Mono', monospace",
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-card)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {label}
        {playerHere && (
          <span style={{ color: '#ff8c42', fontSize: '8px' }}>● here</span>
        )}
        {currentRoom && (
          <span style={{ color: 'var(--text-muted)', fontSize: '8px', marginLeft: '4px' }}>
            — {currentRoom.name}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${bounds.svgWidth} ${bounds.svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: 'var(--bg-log-panel)', display: 'block', width: '100%', maxHeight: '65vh' }}
      >
        {/* Assembly zone (only drawn on the floor it actually applies to) */}
        {assemblyRect && (() => {
          const [caz1x, caz1z] = assemblyRect.p1;
          const [caz2x, caz2z] = assemblyRect.p2;
          return (
            <>
              <rect
                x={caz1x} y={caz1z} width={caz2x - caz1x} height={caz2z - caz1z}
                fill="rgba(34,197,94,0.08)"
                stroke="#22c55e"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={(caz1x + caz2x) / 2} y={caz1z + 10}
                textAnchor="middle"
                fontSize={7}
                fill="#22c55e"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >ASSEMBLY ZONE</text>
            </>
          );
        })()}

        {/* Building outline */}
        <rect
          x={ox1} y={oz1} width={ox2 - ox1} height={oz2 - oz1}
          fill="rgba(128,128,128,0.04)"
          stroke="var(--border-card)"
          strokeWidth={1.5}
        />

        {/* Named room subdivisions */}
        {floorRooms.map(room => {
          const [rx1, rz1] = worldToSvg(room.xMin, room.zMin, bounds);
          const [rx2, rz2] = worldToSvg(room.xMax, room.zMax, bounds);
          const active = room === currentRoom;
          return (
            <g key={room.name}>
              <rect
                x={rx1} y={rz1} width={rx2 - rx1} height={rz2 - rz1}
                fill={active ? 'rgba(255,140,66,0.13)' : 'rgba(128,128,128,0.03)'}
                stroke={active ? '#ff8c42' : 'var(--text-muted)'}
                strokeOpacity={active ? 0.6 : 0.2}
                strokeWidth={active ? 1.2 : 0.8}
              />
              <RoomLabel name={room.name} rx1={rx1} rz1={rz1} rx2={rx2} rz2={rz2} />
            </g>
          );
        })}

        {/* Full ghost path */}
        {allMovePts && (
          <polyline
            points={allMovePts}
            fill="none"
            stroke="var(--text-muted)"
            strokeOpacity={0.3}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hazard-proximity danger trail — how close/how long near fire */}
        <DangerTrail rows={dangerRows} bounds={bounds} />

        {/* Visible orange path */}
        {visibleMovePts && (
          <polyline
            points={visibleMovePts}
            fill="none"
            stroke="#ff8c42"
            strokeWidth={2}
            strokeOpacity={0.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Event markers */}
        {visibleEvents.map((evt, i) => {
          const [ex, ez] = worldToSvg(evt.x, evt.z, bounds);
          return <EventMarker key={i} x={ex} y={ez} type={evt.event_type} hit={evt.hitFire} />;
        })}

        {/* Active fire — animated, replays ignite/extinguish over the timeline */}
        <FireLayer fires={activeFires} bounds={bounds} />

        {/* Player dot */}
        {playerHere && (
          <circle cx={dotX} cy={dotZ} r={5} fill="#ff8c42" stroke="#fff" strokeWidth={1} />
        )}

        {/* Y range label */}
        <text
          x={bounds.padX}
          y={bounds.svgHeight - 8}
          fontSize={7}
          fill="var(--text-muted)"
          fillOpacity={0.5}
          fontFamily="JetBrains Mono, monospace"
        >
          {floor === 'ground' ? `Y ≤ ${floorYBoundary} (ground)` : `Y > ${floorYBoundary} (upper)`}
        </text>

        {/* Compass */}
        <text x={bounds.padX} y={bounds.padZ - 6} fontSize={8} fill="var(--text-muted)" fillOpacity={0.5} fontFamily="JetBrains Mono, monospace">
          N ↑
        </text>
      </svg>
    </div>
  );
}

// ── Main MapPlayer component ──────────────────────────────────────────────

export function MapPlayer({ moveCsv, fireLogCsv, simulationType }: Props) {
  const rows = useMemo(() => (moveCsv ? parseCsv(moveCsv) : []), [moveCsv]);
  const fireRows = useMemo(() => (fireLogCsv ? parseFireLog(fireLogCsv) : []), [fireLogCsv]);

  const [frame, setFrame]       = useState(() => Math.max(0, rows.length - 1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed]       = useState(2);

  const rafRef      = useRef<number>(0);
  const lastTRef    = useRef<number>(0);
  const frameF      = useRef<number>(Math.max(0, rows.length - 1)); // fractional frame for smooth advance
  const speedRef    = useRef(speed);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const totalRows    = rows.length;
  const startTs      = rows[0]?.timestamp ?? 0;
  const endTs        = rows[totalRows - 1]?.timestamp ?? 0;
  const totalDuration = endTs - startTs;
  const elapsed      = (rows[frame]?.timestamp ?? startTs) - startTs;

  const isCCS = simulationType === 'CCS_FIRE' || simulationType === 'CCS_EARTHQUAKE';
  const isNewSim2 = simulationType === 'NEW_SIM_BUILDING2_FIRE';

  // Shared config for whichever two-floor building applies (null for the single-floor Library).
  const twoFloorConfig = isCCS
    ? {
        bounds: CCS_BOUNDS, rooms: CCS_ROOMS,
        outerByFloor: { ground: CCS_OUTER, upper: CCS_OUTER },
        assemblyZoneByFloor: { ground: CCS_ASSEMBLY_ZONE, upper: CCS_ASSEMBLY_ZONE },
        floorYBoundary: CCS_FLOOR_Y_BOUNDARY,
      }
    : isNewSim2
    ? {
        bounds: NEW_SIM2_BOUNDS, rooms: NEW_SIM2_ROOMS,
        outerByFloor: { ground: NEW_SIM2_OUTER_GROUND, upper: NEW_SIM2_OUTER_UPPER },
        // New Sim Building 2.0's assembly zone (the Lobby) is a ground-floor-only room —
        // don't draw it on the upper-floor panel.
        assemblyZoneByFloor: { ground: NEW_SIM2_ASSEMBLY_ZONE, upper: null },
        floorYBoundary: NEW_SIM2_FLOOR_Y_BOUNDARY,
      }
    : null;

  // Floor tab state for narrow viewports
  const [activeFloor, setActiveFloor] = useState<'ground' | 'upper'>('upper');
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );
  useEffect(() => {
    const handler = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const useTabLayout = viewportW < 960;

  // Animation loop via a ref so closure always reads current speed/totalRows
  const animRef = useRef<(t: number) => void>();
  animRef.current = (time: number) => {
    if (lastTRef.current === 0) lastTRef.current = time;
    const dt = (time - lastTRef.current) / 1000;
    lastTRef.current = time;

    frameF.current = Math.min(frameF.current + dt * speedRef.current * 10, totalRows - 1);
    const next = Math.floor(frameF.current);
    setFrame(next);

    if (frameF.current < totalRows - 1) {
      rafRef.current = requestAnimationFrame(t => animRef.current!(t));
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      lastTRef.current = 0;
      rafRef.current = requestAnimationFrame(t => animRef.current!(t));
      return () => cancelAnimationFrame(rafRef.current);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (frame >= totalRows - 1) {
      frameF.current = 0;
      setFrame(0);
    }
    setIsPlaying(p => !p);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const next  = Math.round(ratio * (totalRows - 1));
    frameF.current = next;
    setFrame(next);
    setIsPlaying(false);
  };

  if (rows.length === 0) {
    return (
      <div style={{
        padding: '20px 16px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}>
        No movement data available for this session.
      </div>
    );
  }

  const progressPct = totalRows > 1 ? (frame / (totalRows - 1)) * 100 : 0;

  return (
    <div>
      {/* ── Map canvas ── */}
      <div style={{ display: 'flex', width: '100%', minHeight: 0 }}>
        {twoFloorConfig ? (
          useTabLayout ? (
            /* Narrow: tab switcher, one panel at a time */
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-card)',
                background: 'var(--bg-sidebar)',
              }}>
                {(['ground', 'upper'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFloor(f)}
                    style={{
                      padding: '6px 18px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeFloor === f ? '2px solid #ff8c42' : '2px solid transparent',
                      color: activeFloor === f ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9px',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                    }}
                  >
                    {f === 'ground' ? 'Ground Floor' : 'Upper Floor'}
                  </button>
                ))}
              </div>
              <TwoFloorPanel rows={rows} fireRows={fireRows} frame={frame} floor={activeFloor}
                label={activeFloor === 'ground' ? 'Ground Floor' : 'Upper Floor'}
                bounds={twoFloorConfig.bounds} rooms={twoFloorConfig.rooms}
                outer={twoFloorConfig.outerByFloor[activeFloor]}
                assemblyZone={twoFloorConfig.assemblyZoneByFloor[activeFloor]}
                floorYBoundary={twoFloorConfig.floorYBoundary} />
            </div>
          ) : (
            /* Wide: side by side */
            <>
              <TwoFloorPanel rows={rows} fireRows={fireRows} frame={frame} floor="ground" label="Ground Floor"
                bounds={twoFloorConfig.bounds} rooms={twoFloorConfig.rooms}
                outer={twoFloorConfig.outerByFloor.ground}
                assemblyZone={twoFloorConfig.assemblyZoneByFloor.ground}
                floorYBoundary={twoFloorConfig.floorYBoundary} />
              <div style={{ width: '1px', background: 'var(--border-card)', flexShrink: 0 }} />
              <TwoFloorPanel rows={rows} fireRows={fireRows} frame={frame} floor="upper" label="Upper Floor"
                bounds={twoFloorConfig.bounds} rooms={twoFloorConfig.rooms}
                outer={twoFloorConfig.outerByFloor.upper}
                assemblyZone={twoFloorConfig.assemblyZoneByFloor.upper}
                floorYBoundary={twoFloorConfig.floorYBoundary} />
            </>
          )
        ) : (
          <LibraryPanel rows={rows} fireRows={fireRows} frame={frame} />
        )}
      </div>

      {/* ── Timeline ── */}
      <div style={{
        padding: '10px 16px 8px',
        borderTop: '1px solid var(--border-card)',
        background: 'var(--bg-sidebar)',
      }}>
        {/* Scrub bar */}
        <div
          onClick={handleScrub}
          style={{
            height: '4px',
            background: 'var(--border-card)',
            borderRadius: '2px',
            cursor: 'pointer',
            marginBottom: '10px',
            position: 'relative',
          }}
        >
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: '#ff8c42',
            borderRadius: '2px',
          }} />
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Play / Pause / Restart */}
          <button
            onClick={handlePlayPause}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-card)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '3px 10px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              minWidth: '36px',
              textAlign: 'center',
            }}
          >
            {isPlaying ? '⏸' : frame >= totalRows - 1 ? '↺' : '▶'}
          </button>

          {/* Speed buttons */}
          {([1, 2, 5, 10] as const).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                background: speed === s ? 'rgba(255,140,66,0.12)' : 'transparent',
                border: `1px solid ${speed === s ? '#ff8c42' : 'var(--border-card)'}`,
                borderRadius: '4px',
                color: speed === s ? '#ff8c42' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '3px 8px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
              }}
            >
              {s}×
            </button>
          ))}

          {/* Time display */}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: 'var(--text-muted)',
            marginLeft: 'auto',
          }}>
            +{elapsed.toFixed(1)}s&nbsp;/&nbsp;{totalDuration.toFixed(1)}s
          </span>

          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: 'var(--text-muted)',
          }}>
            {frame + 1}/{totalRows}
          </span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: '6px 16px 8px',
        borderTop: '1px solid var(--border-card)',
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
        background: 'var(--bg-sidebar)',
      }}>
        {Object.entries(EVENT_META)
          .filter(([k]) => !['session_start', 'session_end'].includes(k))
          .map(([type, meta]) => (
            <span
              key={type}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{
                width: '7px',
                height: '7px',
                background: meta.color,
                borderRadius: '50%',
                flexShrink: 0,
                opacity: 0.85,
              }} />
              {meta.label}
            </span>
          ))}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            width: '20px',
            height: '2px',
            background: '#ff8c42',
            opacity: 0.75,
            flexShrink: 0,
          }} />
          Player path
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            width: '20px',
            height: '2px',
            background: 'rgba(255,255,255,0.2)',
            flexShrink: 0,
          }} />
          Full route
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            background: '#ff3b3b',
            borderRadius: '50%',
            flexShrink: 0,
            opacity: 0.6,
          }} />
          Near fire (&lt;{SAFE_HAZARD_DISTANCE}m)
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#ff5a1f',
            borderRadius: '50%',
            flexShrink: 0,
            opacity: 0.9,
          }} />
          Active fire
        </span>
      </div>
    </div>
  );
}
