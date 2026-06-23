"""
generate_synthetic_v2.py — BERONG SMP synthetic telemetry
Telemetry contract v1.1 · 500 sessions · 60 student profiles
Behavioral archetypes: HIGH / MODERATE / LOW with per-student personality traits
"""
import csv, random, math, uuid, os
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import Counter
from typing import Optional

random.seed(2026)

CONTRACT_VERSION    = "1.1"
MOD_VERSION         = "1.0.0"
SCENARIO_DURATION_S = 120.0   # 2400 ticks / 20 ttz/s
MOVE_HZ             = 10      # samples per second

# ─── World constants (from CLAUDE.md) ────────────────────────────────────────
PLAYER_SPAWN = (35.5, -32.0, 88.5)
FIRE_HAZ     = (38.0, -32.0, 90.0)   # centre of spreading fire
SIM_POS      = (30,   -34,   83  )   # simulation origin
ALARM_POS    = (34.0, -31.5, 89.0)   # fire alarm switch
EXT_RACK     = (37.0, -32.0, 88.5)   # extinguisher rack
DOOR_POS     = (50.0, -32.0, 92.5)   # library exit door
MAIN_EXIT    = (52.0, -32.0, 94.5)   # main_exit zone (tuned F3)
ASSEMBLY_CTR = (53.0, -31.5, 73.0)   # assembly area centre

LIB_X = (31, 75)
LIB_Y = (-33, -29)
LIB_Z = (79, 110)

SAFE_HAZ_DIST = 5.0   # blocks; "in danger" threshold from contract §9

# ─── Helpers ─────────────────────────────────────────────────────────────────
def dist3(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def lerp(a, b, t):
    return a + (b - a) * t

def ease(t):
    return t * t * (3 - 2 * t)   # smoothstep for natural movement

# ─── Hazard distance models ───────────────────────────────────────────────────
def fire_haz_dist(pos, t):
    """Fire spreads outward ~0.15 blocks/s."""
    spread = min(t * 0.15, 10.0)
    return round(max(0.3, dist3(pos, FIRE_HAZ) - spread), 2)

def quake_haz_dist(pos, epicenter, mag, t):
    """Distance-attenuated, phase-scaled earthquake hazard."""
    phase_scale = 0.45 if t < 10 else (1.0 if t < 55 else 0.38)
    base = dist3(pos, epicenter)
    adjusted = base / (1.0 + mag * 0.10) * phase_scale
    return round(max(0.3, adjusted), 2)

# ─── Student personality model ────────────────────────────────────────────────
FILIPINO_NAMES = [
    "Reyes, Maria",        "Santos, Juan",         "De la Cruz, Ana",
    "Bautista, Carlo",     "Garcia, Liza",         "Torres, Miguel",
    "Flores, Elena",       "Mendoza, Rico",        "Rivera, Grace",
    "Castillo, Dennis",    "Aquino, Patricia",     "Villanueva, Mark",
    "Cruz, Jennifer",      "Ramos, Joseph",        "Gonzales, Cherry",
    "Lopez, Kevin",        "Hernandez, Rosa",      "Dela Cruz, Anton",
    "Pascual, Nida",       "Manalo, Ryan",         "Domingo, Diana",
    "Soriano, Jerry",      "Aguilar, Gina",        "Navarro, Ronnie",
    "Reyes, Leo",          "Sison, Belle",         "Yap, Alvin",
    "Uy, Carmen",          "Tan, Arnold",          "Lim, Cristina",
    "Ong, Dino",           "Santiago, Faye",       "Molina, Gerry",
    "Valdez, Hannah",      "Salazar, Ivan",        "De Leon, Jessica",
    "Ocampo, Karl",        "Maglalang, Lorna",     "Buenaventura, Marco",
    "Tolentino, Nora",     "Paglinawan, Oscar",    "Quiambao, Peachy",
    "Samson, Rachel",      "Tabayoyong, Sam",      "Umali, Tess",
    "Vergara, Uriel",      "Wenceslao, Vida",      "Yuson, Xander",
    "Zapanta, Yvonne",     "Alcantara, Zack",      "Borromeo, Alice",
    "Cortes, Ben",         "Dela Pena, Cynthia",   "Evangelista, Dan",
    "Florendo, Elaine",    "Glorioso, Felix",      "Herrera, Gloria",
    "Ibañez, Hector",      "Jimenez, Iris",        "Katigbak, Joel",
    "Lacson, Karen",
]

@dataclass
class Student:
    pid: str
    name: str
    archetype: str    # HIGH / MODERATE / LOW
    reaction_s: float # seconds before first purposeful action
    panic: float      # 0–1; drives lateral noise + freeze micro-pauses
    adherence: float  # 0–1; probability of following correct PASS/RACE steps
    speed: float      # travel speed multiplier (1.0 = normal)


def make_students(n: int = 60) -> list:
    # 35% HIGH · 45% MODERATE · 20% LOW
    archetypes = ["HIGH"] * 21 + ["MODERATE"] * 27 + ["LOW"] * 12
    random.shuffle(archetypes)

    students = []
    for i, arch in enumerate(archetypes[:n]):
        if arch == "HIGH":
            react = random.uniform(0.8,  6.0)
            panic = random.uniform(0.00, 0.22)
            adher = random.uniform(0.72, 1.00)
            speed = random.uniform(1.25, 2.00)
        elif arch == "MODERATE":
            react = random.uniform(5.0, 24.0)
            panic = random.uniform(0.18, 0.58)
            adher = random.uniform(0.28, 0.70)
            speed = random.uniform(0.80, 1.45)
        else:  # LOW
            react = random.uniform(14.0, 52.0)
            panic = random.uniform(0.52, 1.00)
            adher = random.uniform(0.00, 0.28)
            speed = random.uniform(0.45, 1.00)

        students.append(Student(
            pid      = f"stu_{i+1:04d}",
            name     = FILIPINO_NAMES[i % len(FILIPINO_NAMES)],
            archetype= arch,
            reaction_s=react,
            panic    = panic,
            adherence= adher,
            speed    = speed,
        ))
    return students

# ─── Movement generator ───────────────────────────────────────────────────────
def gen_moves(waypoints, duration_s, haz_fn, panic=0.0):
    """
    Generates 10 Hz move rows (one per 0.1 s) along waypoints.
    panic scales lateral jitter and adds micro-freeze pauses.
    """
    rows = []
    n = len(waypoints)
    steps = int(duration_s * MOVE_HZ)

    if n <= 1:
        pos0 = waypoints[0] if waypoints else PLAYER_SPAWN
        for i in range(steps):
            t = round(i * 0.1, 2)
            jitter = 0.25 + panic * 2.0
            pos = (
                clamp(pos0[0] + random.gauss(0, jitter), LIB_X[0], LIB_X[1]),
                clamp(pos0[1] + random.gauss(0, 0.04),  LIB_Y[0], LIB_Y[1]),
                clamp(pos0[2] + random.gauss(0, jitter), LIB_Z[0]-5, LIB_Z[1]+8),
            )
            rows.append((t, pos, haz_fn(pos, t)))
        return rows

    seg = duration_s / (n - 1)

    for i in range(steps):
        t = round(i * 0.1, 2)

        # Panic micro-freeze: student stops briefly (adds to panic proxy signal)
        if panic > 0.35 and random.random() < panic * 0.015 and rows:
            rows.append((t, rows[-1][1], rows[-1][2]))
            continue

        si = min(int(t / seg), n - 2)
        st = clamp((t - si * seg) / seg, 0.0, 1.0)
        st = ease(st)

        s = waypoints[si]
        e = waypoints[min(si + 1, n - 1)]
        x = lerp(s[0], e[0], st)
        y = lerp(s[1], e[1], st)
        z = lerp(s[2], e[2], st)

        jitter = 0.10 + panic * 2.2
        x += random.gauss(0, jitter)
        y += random.gauss(0, 0.04)
        z += random.gauss(0, jitter)

        pos = (
            clamp(x, LIB_X[0], LIB_X[1]),
            clamp(y, LIB_Y[0], LIB_Y[1]),
            clamp(z, LIB_Z[0] - 5, LIB_Z[1] + 8),
        )
        rows.append((t, pos, haz_fn(pos, t)))

    return rows

# ─── Row builder ─────────────────────────────────────────────────────────────
def mk_row(pid, sid, scenario, t, etype, pos, hd, target="", npc=None):
    return dict(
        player_id           = pid,
        session_id          = sid,
        scenario_type       = scenario,
        timestamp           = round(t, 2),
        event_type          = etype,
        x                   = round(pos[0], 3),
        y                   = round(pos[1], 3),
        z                   = round(pos[2], 3),
        hazard_distance     = hd,
        interaction_target  = target or "",
        nearby_player_count = npc if npc is not None else "",
    )

# ─── Scoring ──────────────────────────────────────────────────────────────────
def score_fire(alarm, ext_count, door, exit_used, assembly, evac_s):
    """BFP rubric-weighted score 0–100 for fire drills."""
    s = 0
    if alarm:                      s += 15   # COMMUNICATE step (F2)
    if   ext_count >= 5:           s += 20
    elif ext_count >= 3:           s += 15
    elif ext_count >= 1:           s +=  8   # attempted extinguish (F3)
    if door:                       s += 10   # exit route awareness
    if exit_used:                  s += 15   # main exit reached
    if assembly:                   s += 30   # assembly area (highest weight, F4)
    if assembly and evac_s is not None:
        bonus = max(0.0, 10.0 - (evac_s - 20.0) * 0.15)
        s += round(bonus)
    return min(100, s)

def score_quake(door, exit_used, assembly, evac_s):
    """BFP rubric-weighted score 0–100 for earthquake drills."""
    s = 0
    if door:                       s += 15
    if exit_used:                  s += 20
    if assembly:                   s += 50   # primary success signal (E4)
    if assembly and evac_s is not None:
        bonus = max(0.0, 15.0 - (evac_s - 15.0) * 0.20)
        s += round(bonus)
    return min(100, s)

# ─── FIRE session ─────────────────────────────────────────────────────────────
def fire_session(stu: Student, sid: str, t0: datetime):
    D    = SCENARIO_DURATION_S
    arch = stu.archetype

    # Per-run variation on the student's base reaction time
    reaction = max(0.4, stu.reaction_s + random.gauss(0, stu.reaction_s * 0.20))

    alarm_t  = None
    ext_list = []   # list of (time_s, nearby_player_count)
    door_t   = None
    exit_t   = None
    asm_t    = None

    if arch == "HIGH":
        # Follows PASS + RACE: alarm → N extinguisher uses → door → exit → assembly
        if stu.adherence > 0.65:
            alarm_t = round(reaction + random.uniform(0.5, 3.0), 2)

        n_ext = random.randint(2, 5) if stu.adherence > 0.80 else random.randint(1, 3)
        t_ext = (alarm_t if alarm_t else reaction) + random.uniform(1.5, 7.0)
        for _ in range(n_ext):
            if t_ext < D * 0.55:
                # academic setting: mostly solo station, occasionally 1-2 nearby
                nearby = random.choices([0, 1, 2], weights=[70, 22, 8])[0]
                ext_list.append((round(t_ext, 2), nearby))
                t_ext += random.uniform(3.0, 8.5)

        base = ext_list[-1][0] if ext_list else reaction
        door_t = round(base + random.uniform(1.5, 6.0), 2)
        exit_t = round(door_t + random.uniform(2.0, 8.0), 2)
        asm_t  = round(exit_t + random.uniform(4.5, 18.0), 2)
        if asm_t >= D:
            asm_t = None
        end_reason = "assembly_reached" if asm_t else "timeout"

    elif arch == "MODERATE":
        if random.random() < 0.22:
            alarm_t = round(reaction + random.uniform(2, 8), 2)

        n_ext = random.randint(0, 2)
        if n_ext:
            t_ext = reaction + random.uniform(10, 32)
            for _ in range(n_ext):
                if t_ext < D * 0.70:
                    ext_list.append((round(t_ext, 2), 0))
                    t_ext += random.uniform(6, 14)

        if random.random() < 0.72:
            base = ext_list[-1][0] if ext_list else reaction
            door_t = round(base + random.uniform(8, 36), 2)
            if door_t >= D:
                door_t = None

        if door_t and random.random() < 0.68:
            exit_t = round(door_t + random.uniform(4, 14), 2)
            if exit_t >= D:
                exit_t = None

        if exit_t and random.random() < 0.60:
            asm_t = round(exit_t + random.uniform(8, 30), 2)
            if asm_t >= D:
                asm_t = None

        end_reason = "assembly_reached" if asm_t else "timeout"

    else:  # LOW — mostly confused, minimal action
        # 40% chance of walking toward fire first (panic/curiosity)
        toward_fire = random.random() < 0.40

        n_ext = 1 if random.random() < 0.35 else 0
        if n_ext:
            t_ext = reaction + random.uniform(30, 75)
            if t_ext < D * 0.80:
                ext_list.append((round(t_ext, 2), 0))

        if random.random() < 0.28:
            door_t = round(reaction + random.uniform(50, 95), 2)
            if door_t >= D:
                door_t = None

        if door_t and random.random() < 0.30:
            exit_t = round(door_t + random.uniform(5, 18), 2)
            if exit_t >= D:
                exit_t = None

        asm_t = None
        end_reason = "timeout"
        _ = toward_fire   # used in waypoints below

    fires_ext = len(ext_list) + random.randint(0, 2 if arch == "HIGH" else 1)

    # Build event list
    def ev(t, etype, pos, target=None, npc=None):
        return dict(t=t, etype=etype, pos=pos,
                    haz=fire_haz_dist(pos, t), target=target, npc=npc)

    evts = [ev(0.0, "session_start", PLAYER_SPAWN)]

    if alarm_t:
        p = (ALARM_POS[0]+random.gauss(0,0.3), ALARM_POS[1], ALARM_POS[2]+random.gauss(0,0.3))
        evts.append(ev(alarm_t, "fire_alarm_activate", p, "fire_alarm_switch"))

    for et, nearby in ext_list:
        p = (EXT_RACK[0]+random.gauss(0,1.2), EXT_RACK[1], EXT_RACK[2]+random.gauss(0,1.2))
        evts.append(ev(et, "extinguisher_use", p, "fire_block", nearby))

    if door_t:
        p = (DOOR_POS[0]+random.gauss(0,0.4), DOOR_POS[1], DOOR_POS[2]+random.gauss(0,0.4))
        evts.append(ev(door_t, "door_open", p, "oak_door"))

    if exit_t:
        p = (MAIN_EXIT[0]+random.gauss(0,0.3), MAIN_EXIT[1], MAIN_EXIT[2]+random.gauss(0,0.3))
        evts.append(ev(exit_t, "emergency_exit", p))

    if asm_t:
        p = (ASSEMBLY_CTR[0]+random.gauss(0,2.5), ASSEMBLY_CTR[1], ASSEMBLY_CTR[2]+random.gauss(0,2.5))
        evts.append(ev(asm_t, "assembly_area_reached", p))

    end_t = round(min((asm_t or D) + random.uniform(0.05, 0.3), D), 2)
    evts.append(ev(end_t, "session_end", evts[-1]["pos"]))
    evts.sort(key=lambda e: e["t"])

    # Waypoints — LOW students may initially walk toward fire
    wps = [PLAYER_SPAWN]
    if arch == "LOW" and random.random() < 0.40:
        wps.append((FIRE_HAZ[0]+random.uniform(-2,3), PLAYER_SPAWN[1], FIRE_HAZ[2]+random.uniform(-2,3)))
        wps.append(PLAYER_SPAWN)   # backs away
    if alarm_t:
        wps.append(ALARM_POS)
    for et, _ in ext_list:
        wps.append(EXT_RACK)
    if door_t:
        wps.append(DOOR_POS)
    if exit_t:
        wps.append(MAIN_EXIT)
    if asm_t:
        wps.append(ASSEMBLY_CTR)
    else:
        for _ in range(random.randint(2, 5)):
            wps.append((
                random.uniform(LIB_X[0]+2, LIB_X[1]-2),
                -32.0,
                random.uniform(LIB_Z[0]+2, LIB_Z[1]-2),
            ))

    moves = gen_moves(wps, D, lambda pos, t: fire_haz_dist(pos, t), panic=stu.panic)

    rows = []
    for t, pos, hd in moves:
        rows.append(mk_row(stu.pid, sid, "fire", t, "move", pos, hd))
    for e in evts:
        rows.append(mk_row(stu.pid, sid, "fire", e["t"], e["etype"],
                           e["pos"], e["haz"], e.get("target", ""), e.get("npc")))
    rows.sort(key=lambda r: r["timestamp"])

    sim_score = score_fire(alarm_t is not None, fires_ext, door_t is not None,
                           exit_t is not None, asm_t is not None, asm_t)
    passed    = 1 if sim_score >= 60 else 0

    meta = dict(
        session_id=sid, player_id=stu.pid, scenario_type="fire",
        started_at=t0.isoformat()+"Z",
        ended_at=(t0 + timedelta(seconds=D)).isoformat()+"Z",
        duration_ticks=2400, end_reason=end_reason,
        fires_extinguished_count=fires_ext,
        magnitude="", aftershock_count="", aftershock_magnitude_scale="",
        final_earthquake_phase="",
        contract_version=CONTRACT_VERSION, mod_version=MOD_VERSION,
        simulation_score=sim_score, passed=passed, prep_level=arch,
    )
    return rows, meta

# ─── EARTHQUAKE session ───────────────────────────────────────────────────────
def quake_session(stu: Student, sid: str, t0: datetime):
    D    = SCENARIO_DURATION_S
    arch = stu.archetype

    mag     = round(random.uniform(4.5, 9.0), 1)
    ashocks = random.randint(2, 4)
    ascale  = round(random.uniform(0.22, 0.88), 2)
    epic = (
        float(SIM_POS[0]) + random.uniform(3, 9),
        float(SIM_POS[1]),
        float(SIM_POS[2]) + random.uniform(3, 9),
    )

    def qhaz(pos, t): return quake_haz_dist(pos, epic, mag, t)

    reaction = max(0.4, stu.reaction_s + random.gauss(0, stu.reaction_s * 0.20))

    door_t = exit_t = asm_t = None
    final_phase = "PEAK"

    if arch == "HIGH":
        # DROP → COVER → HOLD → evacuate: some shelter first
        shelter = random.uniform(3, 10) if random.random() < 0.65 else 0
        door_t  = round(reaction + shelter + random.uniform(1, 7), 2)
        exit_t  = round(door_t + random.uniform(2.5, 10), 2)
        asm_t   = round(exit_t + random.uniform(4.5, 18), 2)
        if asm_t >= D:
            asm_t = None
        final_phase = "AFTERSHOCK"
        end_reason  = "assembly_reached" if asm_t else "timeout"

    elif arch == "MODERATE":
        if random.random() < 0.72:
            door_t = round(reaction + random.uniform(10, 42), 2)
            if door_t >= D:
                door_t = None

        if door_t and random.random() < 0.65:
            exit_t = round(door_t + random.uniform(5, 20), 2)
            if exit_t >= D:
                exit_t = None

        if exit_t and random.random() < 0.58:
            asm_t = round(exit_t + random.uniform(8, 30), 2)
            if asm_t >= D:
                asm_t = None

        end_reason = "assembly_reached" if asm_t else "timeout"

    else:  # LOW
        toward_epic = random.random() < 0.48   # walks toward epicenter (panic)
        _ = toward_epic

        if random.random() < 0.28:
            door_t = round(reaction + random.uniform(42, 92), 2)
            if door_t >= D:
                door_t = None

        if door_t and random.random() < 0.22:
            exit_t = round(door_t + random.uniform(6, 22), 2)
            if exit_t >= D:
                exit_t = None

        asm_t      = None
        end_reason = "timeout"

    def ev(t, etype, pos, target=None):
        return dict(t=t, etype=etype, pos=pos, haz=qhaz(pos, t), target=target, npc=None)

    evts = [ev(0.0, "session_start", PLAYER_SPAWN)]

    if door_t:
        p = (DOOR_POS[0]+random.gauss(0,0.4), DOOR_POS[1], DOOR_POS[2]+random.gauss(0,0.4))
        evts.append(ev(door_t, "door_open", p, "oak_door"))

    if exit_t:
        p = (MAIN_EXIT[0]+random.gauss(0,0.3), MAIN_EXIT[1], MAIN_EXIT[2]+random.gauss(0,0.3))
        evts.append(ev(exit_t, "emergency_exit", p))

    if asm_t:
        p = (ASSEMBLY_CTR[0]+random.gauss(0,2.5), ASSEMBLY_CTR[1], ASSEMBLY_CTR[2]+random.gauss(0,2.5))
        evts.append(ev(asm_t, "assembly_area_reached", p))

    end_t = round(min((asm_t or D) + random.uniform(0.05, 0.3), D), 2)
    evts.append(ev(end_t, "session_end", evts[-1]["pos"]))
    evts.sort(key=lambda e: e["t"])

    wps = [PLAYER_SPAWN]
    if arch == "LOW" and random.random() < 0.48:
        # Initially walks toward epicenter
        wps.append((epic[0]+random.uniform(-2,3), PLAYER_SPAWN[1], epic[2]+random.uniform(-2,3)))
        wps.append(PLAYER_SPAWN)
    if door_t:
        wps.append(DOOR_POS)
    if exit_t:
        wps.append(MAIN_EXIT)
    if asm_t:
        wps.append(ASSEMBLY_CTR)
    else:
        for _ in range(random.randint(2, 5)):
            wps.append((
                random.uniform(LIB_X[0]+2, LIB_X[1]-2),
                -32.0,
                random.uniform(LIB_Z[0]+2, LIB_Z[1]-2),
            ))

    moves = gen_moves(wps, D, qhaz, panic=stu.panic)

    rows = []
    for t, pos, hd in moves:
        rows.append(mk_row(stu.pid, sid, "earthquake", t, "move", pos, hd))
    for e in evts:
        rows.append(mk_row(stu.pid, sid, "earthquake", e["t"], e["etype"],
                           e["pos"], e["haz"], e.get("target", ""), e.get("npc")))
    rows.sort(key=lambda r: r["timestamp"])

    sim_score = score_quake(door_t is not None, exit_t is not None, asm_t is not None, asm_t)
    passed    = 1 if sim_score >= 60 else 0

    meta = dict(
        session_id=sid, player_id=stu.pid, scenario_type="earthquake",
        started_at=t0.isoformat()+"Z",
        ended_at=(t0 + timedelta(seconds=D)).isoformat()+"Z",
        duration_ticks=2400, end_reason=end_reason,
        fires_extinguished_count="",
        magnitude=mag, aftershock_count=ashocks, aftershock_magnitude_scale=ascale,
        final_earthquake_phase=final_phase,
        contract_version=CONTRACT_VERSION, mod_version=MOD_VERSION,
        simulation_score=sim_score, passed=passed, prep_level=arch,
    )
    return rows, meta

# ─── Timestamp schedule ───────────────────────────────────────────────────────
def make_timestamps(total: int, n_days: int = 10) -> list:
    """Spread sessions across n_days school days (08:00–16:00)."""
    base = datetime(2026, 6, 10, 8, 0, 0)
    slots = []
    per_day = total // n_days
    extra   = total - per_day * n_days

    for d in range(n_days):
        day_start = base + timedelta(days=d)
        n_today   = per_day + (1 if d < extra else 0)
        interval  = 8 * 60 / max(n_today, 1)   # evenly across 8-hour day
        for s in range(n_today):
            jitter = random.uniform(-1.5, 1.5)
            slots.append(day_start + timedelta(minutes=s * interval + jitter))

    random.shuffle(slots)
    return slots[:total]

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    TOTAL   = 250
    N_FIRE  = 150
    N_QUAKE = 100
    N_DAYS  = 10

    out = os.path.join(os.path.dirname(__file__), "apps", "dashboard", "public", "synthetic")
    os.makedirs(out, exist_ok=True)

    students = make_students(60)
    by_arch  = {arch: [s for s in students if s.archetype == arch]
                for arch in ("HIGH", "MODERATE", "LOW")}

    def pick(arch): return random.choice(by_arch[arch])

    def rand_arch():
        r = random.random()
        return "HIGH" if r < 0.35 else ("MODERATE" if r < 0.80 else "LOW")

    configs = [("fire",       rand_arch(), pick(rand_arch())) for _ in range(N_FIRE)] + \
              [("earthquake", rand_arch(), pick(rand_arch())) for _ in range(N_QUAKE)]
    random.shuffle(configs)

    timestamps = make_timestamps(TOTAL, N_DAYS)

    all_events   = []
    all_sessions = []

    LOG_FIELDS = [
        "player_id", "session_id", "scenario_type", "timestamp", "event_type",
        "x", "y", "z", "hazard_distance", "interaction_target", "nearby_player_count",
    ]
    SES_FIELDS = [
        "session_id", "player_id", "scenario_type",
        "started_at", "ended_at", "duration_ticks", "end_reason",
        "fires_extinguished_count", "magnitude", "aftershock_count",
        "aftershock_magnitude_scale", "final_earthquake_phase",
        "contract_version", "mod_version",
        "simulation_score", "passed", "prep_level",
    ]

    for i, ((scenario, arch, stu), t0) in enumerate(zip(configs, timestamps)):
        sid = f"sess_{uuid.uuid4().hex[:8]}"
        print(f"[{i+1:03d}/{TOTAL}] {scenario:10s} {arch:8s} {stu.pid}  {sid}")

        if scenario == "fire":
            evts, meta = fire_session(stu, sid, t0)
        else:
            evts, meta = quake_session(stu, sid, t0)

        all_events.extend(evts)
        all_sessions.append(meta)

    all_sessions.sort(key=lambda m: m["started_at"])

    logs_path = os.path.join(out, "gameplay_logs_synthetic_20260601.csv")
    with open(logs_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=LOG_FIELDS)
        w.writeheader()
        w.writerows(all_events)

    sess_path = os.path.join(out, "sessions_synthetic_20260601.csv")
    with open(sess_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SES_FIELDS)
        w.writeheader()
        w.writerows(all_sessions)

    # ── Summary stats ──────────────────────────────────────────────────────────
    arch_c  = Counter(m["prep_level"]     for m in all_sessions)
    scen_c  = Counter(m["scenario_type"]  for m in all_sessions)
    end_c   = Counter(m["end_reason"]     for m in all_sessions)
    pass_r  = sum(m["passed"]             for m in all_sessions) / len(all_sessions) * 100
    avg_sc  = sum(m["simulation_score"]   for m in all_sessions) / len(all_sessions)
    fire_e  = [m for m in all_sessions if m["scenario_type"] == "fire"]
    q_e     = [m for m in all_sessions if m["scenario_type"] == "earthquake"]

    log_size_mb = os.path.getsize(logs_path) / 1_048_576
    ses_size_kb = os.path.getsize(sess_path) / 1024

    sep = "=" * 56
    print(f"\n{sep}")
    print(f"  BERONG SMP Synthetic Dataset v2")
    print(f"{'-'*56}")
    print(f"  Sessions   : {len(all_sessions)} total")
    print(f"  Scenario   : fire={scen_c['fire']}  earthquake={scen_c['earthquake']}")
    print(f"  Prep level : HIGH={arch_c['HIGH']}  MODERATE={arch_c['MODERATE']}  LOW={arch_c['LOW']}")
    print(f"  End reason : assembly={end_c['assembly_reached']}  timeout={end_c['timeout']}")
    print(f"  Pass rate  : {pass_r:.1f}%")
    print(f"  Avg score  : {avg_sc:.1f}")
    print(f"  Fire avg   : {sum(m['simulation_score'] for m in fire_e)/len(fire_e):.1f}")
    print(f"  Quake avg  : {sum(m['simulation_score'] for m in q_e)/len(q_e):.1f}")
    print(f"  Log rows   : {len(all_events):,}")
    print(f"  Files      : {log_size_mb:.1f} MB  /  {ses_size_kb:.0f} KB")
    print(f"  Output     : {out}")
    print(sep)

if __name__ == "__main__":
    main()
