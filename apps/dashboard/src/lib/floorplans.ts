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
// CCS_POS = (76, -34, 4). 60 × 68 block footprint; two floors.
export const CCS_BOUNDS: BuildingBounds = {
  xMin: 74, xMax: 138,
  zMin: 2,  zMax: 74,
  svgWidth: 280,
  svgHeight: 360,
  padX: 16,
  padZ: 16,
};

export const CCS_ROOMS: Room[] = [
  { name: 'Ground Floor', xMin: 76, xMax: 136, zMin: 4, zMax: 72, floor: 'ground' },
  { name: 'Upper Floor',  xMin: 76, xMax: 136, zMin: 4, zMax: 72, floor: 'upper'  },
];

// world Y boundary: y ≤ this → ground floor; y > this → upper floor
// CCS_POS.y = -34, ground floor height offset = 8, so boundary = -34 + 8 = -26
export const CCS_FLOOR_Y_BOUNDARY = -26;
