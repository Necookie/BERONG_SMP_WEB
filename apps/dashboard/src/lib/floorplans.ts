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
