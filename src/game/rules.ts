import { Coordinate, GameMode, PlacedShip, ShipType, ShotResult } from './fleet';
import { findShipAt } from './placement';

export interface ShotResolution {
  result: ShotResult;
  hitShipType?: ShipType;
  hitShipName?: string;
  sunkShip?: ShipType;
  sunkShipName?: string;
  allSunk: boolean;
  updatedShips: PlacedShip[];
}

/**
 * Checks if every ship in the fleet is completely sunk.
 */
export function areAllShipsSunk(ships: PlacedShip[]): boolean {
  if (ships.length === 0) return false;
  return ships.every((s) => s.sunk);
}

/**
 * Calculates remaining living ships in the fleet.
 */
export function getRemainingShipCount(ships: PlacedShip[]): number {
  return ships.filter((s) => !s.sunk).length;
}

/**
 * Resolves an incoming shot against the defender's fleet.
 * This runs on the DEFENDING client to maintain commit-reveal privacy.
 */
export function resolveIncomingShot(
  target: Coordinate,
  defenderShips: PlacedShip[]
): ShotResolution {
  const match = findShipAt(defenderShips, target.x, target.y);

  if (!match) {
    return {
      result: 'miss',
      allSunk: areAllShipsSunk(defenderShips),
      updatedShips: defenderShips,
    };
  }

  const { ship, segmentIndex } = match;

  // Clone ships to maintain immutability
  const updatedShips = defenderShips.map((s) => {
    if (s.id !== ship.id) return s;

    const hitIndices = s.hitIndices.includes(segmentIndex)
      ? s.hitIndices
      : [...s.hitIndices, segmentIndex];

    const isNowSunk = hitIndices.length >= s.size;

    return {
      ...s,
      hitIndices,
      sunk: isNowSunk,
    };
  });

  const updatedTargetShip = updatedShips.find((s) => s.id === ship.id)!;
  const isSunk = updatedTargetShip.sunk;
  const allSunk = areAllShipsSunk(updatedShips);

  if (isSunk) {
    return {
      result: 'sunk',
      hitShipType: ship.type,
      hitShipName: ship.name,
      sunkShip: ship.type,
      sunkShipName: ship.name,
      allSunk,
      updatedShips,
    };
  }

  return {
    result: 'hit',
    hitShipType: ship.type,
    hitShipName: ship.name,
    allSunk: false,
    updatedShips,
  };
}

/**
 * Returns how many shots a player is entitled to per volley in the given game mode.
 * Classic: 1 shot per turn
 * Salvo: 3 shots per turn
 */
export function getShotsPerTurn(mode: GameMode): number {
  switch (mode) {
    case 'salvo':
      return 3;
    case 'classic':
    default:
      return 1;
  }
}
