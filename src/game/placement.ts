import { BOARD_SIZE, Coordinate, FLEET_CONFIG, Orientation, PlacedShip, ShipType } from './fleet';

/**
 * Returns all grid coordinates occupied by a ship given its position, size, and orientation.
 */
export function getShipCoordinates(
  x: number,
  y: number,
  size: number,
  orientation: Orientation
): Coordinate[] {
  const coords: Coordinate[] = [];
  for (let i = 0; i < size; i++) {
    coords.push({
      x: orientation === 'horizontal' ? x + i : x,
      y: orientation === 'vertical' ? y + i : y,
    });
  }
  return coords;
}

/**
 * Checks whether all coordinates lie strictly inside the 10x10 board boundaries.
 */
export function areCoordinatesInBounds(
  coords: Coordinate[],
  boardSize: number = BOARD_SIZE
): boolean {
  return coords.every(
    (c) => c.x >= 0 && c.x < boardSize && c.y >= 0 && c.y < boardSize
  );
}

/**
 * Checks if two coordinate lists have any overlapping grid cell.
 */
export function coordinatesOverlap(coordsA: Coordinate[], coordsB: Coordinate[]): boolean {
  return coordsA.some((a) => coordsB.some((b) => a.x === b.x && a.y === b.y));
}

/**
 * Validates if a proposed ship placement is valid:
 * 1. Must stay completely inside the board boundaries (cannot exceed or hang over the edge).
 * 2. Must not overlap any already placed ships (excluding itself if updating).
 */
export function isValidShipPlacement(
  candidate: { x: number; y: number; size: number; orientation: Orientation; id?: string },
  existingShips: PlacedShip[],
  boardSize: number = BOARD_SIZE
): boolean {
  const candidateCoords = getShipCoordinates(
    candidate.x,
    candidate.y,
    candidate.size,
    candidate.orientation
  );

  // 1. Boundary check
  if (!areCoordinatesInBounds(candidateCoords, boardSize)) {
    return false;
  }

  // 2. Overlap check against other ships
  for (const ship of existingShips) {
    if (candidate.id && ship.id === candidate.id) {
      continue; // Skip self comparison when repositioning
    }
    const otherCoords = getShipCoordinates(ship.x, ship.y, ship.size, ship.orientation);
    if (coordinatesOverlap(candidateCoords, otherCoords)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that an entire fleet is valid and complete:
 * - Exactly one of each ship type from FLEET_CONFIG
 * - All ships are in-bounds
 * - No ships overlap
 */
export function validateFleet(
  ships: PlacedShip[],
  boardSize: number = BOARD_SIZE
): { valid: boolean; reason?: string } {
  if (ships.length !== FLEET_CONFIG.length) {
    return {
      valid: false,
      reason: `Fleet must have ${FLEET_CONFIG.length} ships, but has ${ships.length}`,
    };
  }

  const seenTypes = new Set<ShipType>();
  const occupiedCells = new Set<string>();

  for (const ship of ships) {
    const config = FLEET_CONFIG.find((cfg) => cfg.type === ship.type);
    if (!config) {
      return { valid: false, reason: `Unknown ship type: ${ship.type}` };
    }
    if (ship.size !== config.size) {
      return {
        valid: false,
        reason: `Ship ${ship.type} must have size ${config.size}, but has ${ship.size}`,
      };
    }
    if (seenTypes.has(ship.type)) {
      return { valid: false, reason: `Duplicate ship type: ${ship.type}` };
    }
    seenTypes.add(ship.type);

    const coords = getShipCoordinates(ship.x, ship.y, ship.size, ship.orientation);
    if (!areCoordinatesInBounds(coords, boardSize)) {
      return {
        valid: false,
        reason: `Ship ${ship.type} exceeds board boundary at (${ship.x}, ${ship.y})`,
      };
    }

    for (const c of coords) {
      const key = `${c.x},${c.y}`;
      if (occupiedCells.has(key)) {
        return { valid: false, reason: `Overlap detected at cell (${c.x}, ${c.y})` };
      }
      occupiedCells.add(key);
    }
  }

  return { valid: true };
}

/**
 * Finds which ship occupies a given coordinate (if any).
 * Returns the ship and the index (0..size-1) of that segment on the ship.
 */
export function findShipAt(
  ships: PlacedShip[],
  x: number,
  y: number
): { ship: PlacedShip; segmentIndex: number } | null {
  for (const ship of ships) {
    const coords = getShipCoordinates(ship.x, ship.y, ship.size, ship.orientation);
    const segIdx = coords.findIndex((c) => c.x === x && c.y === y);
    if (segIdx !== -1) {
      return { ship, segmentIndex: segIdx };
    }
  }
  return null;
}
