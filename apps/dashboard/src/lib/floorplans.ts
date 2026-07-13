export interface Room {
  name: string;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  floor: 'ground' | 'upper' | 'both';
}

export interface BuildingBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  svgWidth: number;
  svgHeight: number;
  padX: number;
  padZ: number;
}

export function worldToSvg(
  wx: number,
  wz: number,
  bounds: BuildingBounds,
): [number, number] {
  const { xMin, xMax, zMin, zMax, svgWidth, svgHeight, padX, padZ } = bounds;
  const innerW = svgWidth - 2 * padX;
  const innerH = svgHeight - 2 * padZ;
  const x = padX + ((wx - xMin) / (xMax - xMin)) * innerW;
  const y = padZ + ((wz - zMin) / (zMax - zMin)) * innerH;
  return [x, y];
}

// ── Library (FIRE / EARTHQUAKE) ───────────────────────────────────────────
// SIM_POS = (30, -34, 83). Assembly zone at z 64–82 sits north of the building.
export const LIBRARY_BOUNDS: BuildingBounds = {
  xMin: 28, xMax: 58,
  zMin: 61, zMax: 114,
  svgWidth: 400,
  svgHeight: 540,
  padX: 28,
  padZ: 28,
};

// Ground floor rooms (world absolute coords = SIM_POS + SimRoom offset)
export const LIBRARY_ROOMS: Room[] = [
  { name: 'Computer Lab', xMin: 30, xMax: 42, zMin: 83, zMax: 93,  floor: 'ground' },
  { name: 'Main Hall',    xMin: 30, xMax: 50, zMin: 93, zMax: 108, floor: 'ground' },
  { name: 'Entrance',    xMin: 34, xMax: 40, zMin: 105, zMax: 111, floor: 'ground' },
  { name: 'Stairwell',   xMin: 48, xMax: 52, zMin: 88,  zMax: 95,  floor: 'both'   },
];

export const LIBRARY_OUTER = { xMin: 30, xMax: 52, zMin: 83, zMax: 111 };
export const ASSEMBLY_ZONE  = { xMin: 30, xMax: 76, zMin: 64, zMax: 82  };

// ── CCS Admin Building (CCS_FIRE / CCS_EARTHQUAKE) ───────────────────────
// CCS_POS = (76, -34, 4). Building footprint X:76–136, Z:4–72 (two floors).
// Assembly zone outside south wall: Z:73–90 (immediately beyond Z=72).
// SVG extends to zMax:93 so the assembly zone is fully visible.
export const CCS_BOUNDS: BuildingBounds = {
  xMin: 74, xMax: 138,
  zMin: 2,  zMax: 93,
  svgWidth: 480,
  svgHeight: 740,
  padX: 20,
  padZ: 20,
};

// Whole-building outline rect used as the background for each floor panel.
export const CCS_OUTER = { xMin: 76, xMax: 136, zMin: 4, zMax: 72 };

// Assembly zone outside the south face of the CCS building.
// PLACEHOLDER coords — verify in-game with F3 (see docs/f3_tuning_todo.md).
export const CCS_ASSEMBLY_ZONE = { xMin: 76, xMax: 136, zMin: 73, zMax: 90 };

// Named rooms — absolute world coords, verified with F3.
// 1st floor: floor Y=-32, ceiling Y=-29. 2nd floor: floor Y=-25, ceiling Y=-22.
export const CCS_ROOMS: Room[] = [
  // 1st floor
  { name: 'Room 105',      xMin:  94, xMax:  99, zMin:  6, zMax: 11, floor: 'ground' },
  { name: 'Room 106',      xMin: 101, xMax: 105, zMin:  6, zMax: 11, floor: 'ground' },
  { name: 'Room 107',      xMin: 107, xMax: 112, zMin:  6, zMax: 11, floor: 'ground' },
  { name: "Dean's Office", xMin: 114, xMax: 119, zMin:  6, zMax: 11, floor: 'ground' },
  { name: 'Faculty Room',  xMin: 121, xMax: 126, zMin:  6, zMax: 11, floor: 'ground' },
  { name: 'ICTS',          xMin: 130, xMax: 136, zMin: 17, zMax: 26, floor: 'ground' },
  { name: 'ICTS 2',        xMin: 131, xMax: 136, zMin: 28, zMax: 31, floor: 'ground' },
  // 2nd floor
  { name: 'CCS Mini Library', xMin:  94, xMax:  99, zMin:  6, zMax: 11, floor: 'upper' },
  { name: 'Room 202',         xMin: 101, xMax: 105, zMin:  6, zMax: 11, floor: 'upper' },
  { name: 'Room 203',         xMin: 107, xMax: 112, zMin:  6, zMax: 11, floor: 'upper' },
  { name: 'Room 204',         xMin: 114, xMax: 119, zMin:  6, zMax: 11, floor: 'upper' },
  { name: 'Room 205',         xMin: 121, xMax: 126, zMin:  6, zMax: 11, floor: 'upper' },
  { name: 'TESOL',            xMin: 130, xMax: 136, zMin: 17, zMax: 22, floor: 'upper' },
  { name: 'Computer Lab',     xMin: 130, xMax: 136, zMin: 24, zMax: 31, floor: 'upper' },
  { name: 'MacLab',           xMin: 130, xMax: 136, zMin: 33, zMax: 39, floor: 'upper' },
  { name: 'Room 207',         xMin: 132, xMax: 136, zMin: 41, zMax: 49, floor: 'upper' },
];

// world Y boundary: y ≤ this → ground floor; y > this → upper floor
// CCS_POS.y = -34, ground floor height offset = 8, so boundary = -34 + 8 = -26
export const CCS_FLOOR_Y_BOUNDARY = -26;

// ── New Sim Building 2.0 (NEW_SIM_BUILDING2_FIRE) ─────────────────────────
// NEW_SIM_BUILDING2_POS = (-182, -34, 358). 34 named rooms across 2 floors,
// surveyed via //copyroom in the mod repo — see docs/new_sim_building2_rooms.md
// there for the source table these coords were transcribed from.
//
// Bounds widened 2026-07-14 to include the real (F3-verified) assembly zone,
// which sits well outside the building to the west — X -164..-148, per the
// mod repo's AssemblyZone.NEW_SIM2_ZONE. Previously this box only covered the
// building footprint itself.
export const NEW_SIM2_BOUNDS: BuildingBounds = {
  xMin: -170, xMax: -77,
  zMin: 430,  zMax: 546,
  svgWidth: 650,
  svgHeight: 800,
  padX: 24,
  padZ: 24,
};

// The two floors don't share one footprint here (unlike CCS): the 1st floor's
// Lobby/General CR extend to X=-118, with no matching 2nd-floor rooms that far
// west, so each floor gets its own outline rect.
export const NEW_SIM2_OUTER_GROUND = { xMin: -118, xMax: -81, zMin: 434, zMax: 542 };
export const NEW_SIM2_OUTER_UPPER  = { xMin: -105, xMax: -81, zMin: 434, zMax: 542 };

// Assembly zone — F3/WorldEdit-verified via //copyroom (2026-07-14): real open
// ground west of the building itself, not a room inside it (superseding the
// earlier "Lobby room" approximation). Ground-floor-only, same as before.
export const NEW_SIM2_ASSEMBLY_ZONE = { xMin: -164, xMax: -148, zMin: 466, zMax: 512 };

// world Y boundary: y ≤ this → ground floor; y > this → upper floor.
// 1st floor tops out at Y=-24 (ceiling); 2nd floor's floor starts at Y=-23.
export const NEW_SIM2_FLOOR_Y_BOUNDARY = -24;

// Named rooms — absolute world coords, transcribed from the mod repo's
// //copyroom survey (docs/new_sim_building2_rooms.md).
export const NEW_SIM2_ROOMS: Room[] = [
  // 1st floor (ground)
  { name: 'Cafeteria',          xMin: -105, xMax: -81,  zMin: 434, zMax: 444, floor: 'ground' },
  { name: 'Room 101',           xMin:  -89, xMax: -81,  zMin: 446, zMax: 456, floor: 'ground' },
  { name: 'Under Maintenance',  xMin: -105, xMax: -97,  zMin: 446, zMax: 456, floor: 'ground' },
  { name: 'Room 102',           xMin:  -89, xMax: -81,  zMin: 458, zMax: 468, floor: 'ground' },
  { name: 'Room 103',           xMin: -105, xMax: -97,  zMin: 458, zMax: 468, floor: 'ground' },
  { name: 'Main Hallway',       xMin:  -95, xMax: -91,  zMin: 446, zMax: 530, floor: 'ground' },
  { name: 'Lobby',              xMin: -118, xMax: -81,  zMin: 482, zMax: 498, floor: 'ground' },
  { name: 'Room 104',           xMin:  -89, xMax: -81,  zMin: 496, zMax: 506, floor: 'ground' },
  { name: 'Kitchen Lobby',      xMin: -105, xMax: -97,  zMin: 508, zMax: 524, floor: 'ground' },
  { name: 'Room 105',           xMin:  -89, xMax: -81,  zMin: 508, zMax: 518, floor: 'ground' },
  { name: 'Room 106',           xMin:  -89, xMax: -81,  zMin: 520, zMax: 530, floor: 'ground' },
  { name: "Principal's Office", xMin: -105, xMax: -97,  zMin: 526, zMax: 530, floor: 'ground' },
  { name: 'Badminton Court',    xMin: -105, xMax: -81,  zMin: 532, zMax: 542, floor: 'ground' },
  { name: 'General CR',         xMin: -118, xMax: -106, zMin: 472, zMax: 476, floor: 'ground' },
  // 2nd floor (upper)
  { name: 'Room 201',           xMin:  -88, xMax: -81,  zMin: 446, zMax: 453, floor: 'upper' },
  { name: 'Male CR',            xMin: -100, xMax: -93,  zMin: 446, zMax: 453, floor: 'upper' },
  { name: 'Female CR',          xMin: -100, xMax: -93,  zMin: 455, zMax: 462, floor: 'upper' },
  { name: 'Conference Room',    xMin:  -88, xMax: -81,  zMin: 455, zMax: 471, floor: 'upper' },
  { name: 'Room 202',           xMin: -100, xMax: -93,  zMin: 464, zMax: 471, floor: 'upper' },
  { name: 'Room 203',           xMin:  -88, xMax: -81,  zMin: 473, zMax: 480, floor: 'upper' },
  { name: 'Lecture Hall',       xMin:  -88, xMax: -81,  zMin: 482, zMax: 498, floor: 'upper' },
  { name: 'ComLab 201',         xMin: -100, xMax: -93,  zMin: 473, zMax: 489, floor: 'upper' },
  { name: 'Room 204',           xMin: -100, xMax: -93,  zMin: 491, zMax: 498, floor: 'upper' },
  { name: 'Room 205',           xMin: -100, xMax: -93,  zMin: 500, zMax: 507, floor: 'upper' },
  { name: 'Room 206',           xMin:  -88, xMax: -81,  zMin: 500, zMax: 507, floor: 'upper' },
  { name: 'Room 207',           xMin:  -88, xMax: -81,  zMin: 509, zMax: 516, floor: 'upper' },
  { name: 'Clinic',             xMin:  -88, xMax: -81,  zMin: 518, zMax: 525, floor: 'upper' },
  { name: 'Study Lobby',        xMin: -100, xMax: -93,  zMin: 509, zMax: 525, floor: 'upper' },
  { name: 'Faculty Room',       xMin:  -88, xMax: -81,  zMin: 527, zMax: 534, floor: 'upper' },
  { name: 'Research Lab',       xMin: -100, xMax: -93,  zMin: 527, zMax: 534, floor: 'upper' },
  { name: 'Library',            xMin: -101, xMax: -81,  zMin: 536, zMax: 542, floor: 'upper' },
  { name: 'Basketball Court',   xMin: -105, xMax: -81,  zMin: 434, zMax: 444, floor: 'upper' },
  { name: 'Hallway 1',          xMin: -105, xMax: -102, zMin: 445, zMax: 542, floor: 'upper' },
  { name: 'Hallway 2',          xMin:  -91, xMax: -90,  zMin: 445, zMax: 535, floor: 'upper' },
];
