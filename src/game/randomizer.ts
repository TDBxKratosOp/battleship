import { BOARD_SIZE, FLEET_CONFIG, Orientation, PlacedShip } from './fleet';
import { isValidShipPlacement } from './placement';

/**
 * Randomizes placement for all 5 ships on the 10x10 board.
 * Guarantees a fully valid, non-overlapping placement.
 */
export function generateRandomFleet(boardSize: number = BOARD_SIZE): PlacedShip[] {
  const maxAttempts = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const placed: PlacedShip[] = [];
    let success = true;

    for (const config of FLEET_CONFIG) {
      let shipPlaced = false;
      const shipTries = 100;

      for (let t = 0; t < shipTries; t++) {
        const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const maxX = orientation === 'horizontal' ? boardSize - config.size : boardSize - 1;
        const maxY = orientation === 'vertical' ? boardSize - config.size : boardSize - 1;

        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));

        const candidate = {
          id: `${config.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: config.type,
          name: config.name,
          size: config.size,
          x,
          y,
          orientation,
          hitIndices: [],
          sunk: false,
        };

        if (isValidShipPlacement(candidate, placed, boardSize)) {
          placed.push(candidate);
          shipPlaced = true;
          break;
        }
      }

      if (!shipPlaced) {
        success = false;
        break; // Retry entire fleet generation
      }
    }

    if (success && placed.length === FLEET_CONFIG.length) {
      return placed;
    }
  }

  // Fallback deterministic placement if randomness fails (mathematically impossible on 10x10 with 5 ships, but safe)
  return [
    { id: 'carrier-fb', type: 'carrier', name: 'Carrier', size: 5, x: 0, y: 0, orientation: 'horizontal', hitIndices: [], sunk: false },
    { id: 'battleship-fb', type: 'battleship', name: 'Battleship', size: 4, x: 0, y: 2, orientation: 'horizontal', hitIndices: [], sunk: false },
    { id: 'cruiser-fb', type: 'cruiser', name: 'Cruiser', size: 3, x: 0, y: 4, orientation: 'horizontal', hitIndices: [], sunk: false },
    { id: 'submarine-fb', type: 'submarine', name: 'Submarine', size: 3, x: 0, y: 6, orientation: 'horizontal', hitIndices: [], sunk: false },
    { id: 'destroyer-fb', type: 'destroyer', name: 'Destroyer', size: 2, x: 0, y: 8, orientation: 'horizontal', hitIndices: [], sunk: false },
  ];
}
