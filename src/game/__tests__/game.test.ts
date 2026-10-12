import { describe, it, expect } from 'vitest';
import { FLEET_CONFIG, PlacedShip, ShotRecord } from '../fleet';
import {
  areCoordinatesInBounds,
  coordinatesOverlap,
  getShipCoordinates,
  isValidShipPlacement,
  validateFleet,
  findShipAt,
} from '../placement';
import { generateRandomFleet } from '../randomizer';
import { resolveIncomingShot, areAllShipsSunk, getShotsPerTurn } from '../rules';
import {
  generateSalt,
  normalizeBoard,
  computeBoardHash,
  verifyBoardCommitment,
  verifyOpponentFairPlay,
} from '../hashing';

describe('Battleship Placement Engine', () => {
  it('generates correct coordinates for horizontal and vertical ships', () => {
    const horizCoords = getShipCoordinates(2, 3, 4, 'horizontal');
    expect(horizCoords).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ]);

    const vertCoords = getShipCoordinates(5, 1, 3, 'vertical');
    expect(vertCoords).toEqual([
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ]);
  });

  it('validates boundary conditions correctly', () => {
    // Inside bounds
    expect(areCoordinatesInBounds([{ x: 0, y: 0 }, { x: 9, y: 9 }])).toBe(true);
    // Negative bounds
    expect(areCoordinatesInBounds([{ x: -1, y: 0 }])).toBe(false);
    expect(areCoordinatesInBounds([{ x: 0, y: -1 }])).toBe(false);
    // Past edge
    expect(areCoordinatesInBounds([{ x: 10, y: 5 }])).toBe(false);
    expect(areCoordinatesInBounds([{ x: 5, y: 10 }])).toBe(false);
  });

  it('detects coordinate overlaps', () => {
    const coordsA = [{ x: 1, y: 1 }, { x: 2, y: 1 }];
    const coordsB = [{ x: 2, y: 1 }, { x: 3, y: 1 }];
    const coordsC = [{ x: 4, y: 4 }, { x: 5, y: 4 }];

    expect(coordinatesOverlap(coordsA, coordsB)).toBe(true);
    expect(coordinatesOverlap(coordsA, coordsC)).toBe(false);
  });

  it('validates ship placement avoiding collisions and bounds breaches', () => {
    const existing: PlacedShip[] = [
      {
        id: 'carrier-1',
        type: 'carrier',
        name: 'Carrier',
        size: 5,
        x: 0,
        y: 0,
        orientation: 'horizontal',
        hitIndices: [],
        sunk: false,
      },
    ];

    // Collides with existing carrier at (2, 0)
    expect(
      isValidShipPlacement(
        { x: 2, y: 0, size: 3, orientation: 'vertical' },
        existing
      )
    ).toBe(false);

    // Completely clear at (0, 1) vertical
    expect(
      isValidShipPlacement(
        { x: 0, y: 1, size: 3, orientation: 'vertical' },
        existing
      )
    ).toBe(true);

    // Overhangs right edge (starts at 7, size 4 => 7, 8, 9, 10)
    expect(
      isValidShipPlacement(
        { x: 7, y: 5, size: 4, orientation: 'horizontal' },
        existing
      )
    ).toBe(false);
  });

  it('finds ship segment index at coordinate', () => {
    const ships: PlacedShip[] = [
      {
        id: 'dest-1',
        type: 'destroyer',
        name: 'Destroyer',
        size: 2,
        x: 4,
        y: 4,
        orientation: 'horizontal',
        hitIndices: [],
        sunk: false,
      },
    ];

    expect(findShipAt(ships, 4, 4)).toEqual({ ship: ships[0], segmentIndex: 0 });
    expect(findShipAt(ships, 5, 4)).toEqual({ ship: ships[0], segmentIndex: 1 });
    expect(findShipAt(ships, 6, 4)).toBeNull();
  });

  it('generates a valid, non-overlapping random fleet of 5 ships', () => {
    const fleet = generateRandomFleet();
    expect(fleet).toHaveLength(FLEET_CONFIG.length);

    const validation = validateFleet(fleet);
    expect(validation.valid).toBe(true);
  });
});

describe('Battleship Combat & Rules Engine', () => {
  const sampleFleet: PlacedShip[] = [
    {
      id: 'sub-1',
      type: 'submarine',
      name: 'Submarine',
      size: 3,
      x: 1,
      y: 1,
      orientation: 'horizontal', // (1,1), (2,1), (3,1)
      hitIndices: [],
      sunk: false,
    },
    {
      id: 'dest-1',
      type: 'destroyer',
      name: 'Destroyer',
      size: 2,
      x: 5,
      y: 5,
      orientation: 'vertical', // (5,5), (5,6)
      hitIndices: [],
      sunk: false,
    },
  ];

  it('resolves misses correctly', () => {
    const res = resolveIncomingShot({ x: 0, y: 0 }, sampleFleet);
    expect(res.result).toBe('miss');
    expect(res.allSunk).toBe(false);
  });

  it('resolves hits and partial damage without sinking', () => {
    const res = resolveIncomingShot({ x: 1, y: 1 }, sampleFleet);
    expect(res.result).toBe('hit');
    expect(res.hitShipType).toBe('submarine');
    expect(res.allSunk).toBe(false);

    const updatedSub = res.updatedShips.find((s) => s.id === 'sub-1')!;
    expect(updatedSub.hitIndices).toContain(0);
    expect(updatedSub.sunk).toBe(false);
  });

  it('resolves ship sinking when all segments are destroyed', () => {
    // Hit segment 0
    let state = resolveIncomingShot({ x: 5, y: 5 }, sampleFleet);
    expect(state.result).toBe('hit');

    // Hit segment 1 (final segment of Destroyer)
    state = resolveIncomingShot({ x: 5, y: 6 }, state.updatedShips);
    expect(state.result).toBe('sunk');
    expect(state.sunkShip).toBe('destroyer');
    expect(state.sunkShipName).toBe('Destroyer');
    expect(state.allSunk).toBe(false); // Submarine is still alive
  });

  it('detects when all ships are sunk', () => {
    const fleet: PlacedShip[] = [
      {
        id: 'dest',
        type: 'destroyer',
        name: 'Destroyer',
        size: 2,
        x: 0,
        y: 0,
        orientation: 'horizontal',
        hitIndices: [0],
        sunk: false,
      },
    ];

    const finalShot = resolveIncomingShot({ x: 1, y: 0 }, fleet);
    expect(finalShot.result).toBe('sunk');
    expect(finalShot.allSunk).toBe(true);
    expect(areAllShipsSunk(finalShot.updatedShips)).toBe(true);
  });

  it('returns proper shot counts for Classic vs Salvo modes', () => {
    expect(getShotsPerTurn('classic')).toBe(1);
    expect(getShotsPerTurn('salvo')).toBe(3);
  });
});

describe('Anti-Cheat Commit-Reveal Hashing Engine', () => {
  it('generates reproducible SHA-256 hashes for normalized fleets', async () => {
    const fleet = generateRandomFleet();
    const salt = generateSalt();

    const hash1 = await computeBoardHash(fleet, salt);
    const hash2 = await computeBoardHash(fleet, salt);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    // Altering salt changes hash
    const differentHash = await computeBoardHash(fleet, generateSalt());
    expect(differentHash).not.toBe(hash1);
  });

  it('normalizes fleet order so runtime mutations do not alter hash', async () => {
    const fleet = generateRandomFleet();
    const salt = generateSalt();
    const initialHash = await computeBoardHash(fleet, salt);

    // Simulate hits and sunken status during play
    const mutatedFleet: PlacedShip[] = fleet.map((s, idx) => ({
      ...s,
      hitIndices: [0],
      sunk: idx === 0,
    }));

    // Reverse order
    mutatedFleet.reverse();

    const verified = await verifyBoardCommitment(mutatedFleet, salt, initialHash);
    expect(verified).toBe(true);
  });

  it('successfully verifies fair play in an honest game', async () => {
    const fleet: PlacedShip[] = [
      { id: 'c', type: 'carrier', name: 'Carrier', size: 5, x: 0, y: 0, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 'b', type: 'battleship', name: 'Battleship', size: 4, x: 0, y: 1, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 'cr', type: 'cruiser', name: 'Cruiser', size: 3, x: 0, y: 2, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 's', type: 'submarine', name: 'Submarine', size: 3, x: 0, y: 3, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 'd', type: 'destroyer', name: 'Destroyer', size: 2, x: 0, y: 4, orientation: 'horizontal', hitIndices: [], sunk: false },
    ];
    const salt = generateSalt();
    const hash = await computeBoardHash(fleet, salt);

    const shotsFired: ShotRecord[] = [
      { id: '1', by: 'attacker', x: 9, y: 9, result: 'miss', turnNumber: 1, createdAt: 100 },
      { id: '2', by: 'attacker', x: 0, y: 4, result: 'hit', turnNumber: 2, createdAt: 200 },
      { id: '3', by: 'attacker', x: 1, y: 4, result: 'sunk', sunkShip: 'destroyer', turnNumber: 3, createdAt: 300 },
    ];

    const audit = await verifyOpponentFairPlay(fleet, salt, hash, shotsFired);
    expect(audit.valid).toBe(true);
    expect(audit.cheated).toBe(false);
  });

  it('detects cheat when opponent falsely reports a hit as a miss', async () => {
    const fleet: PlacedShip[] = [
      { id: 'c', type: 'carrier', name: 'Carrier', size: 5, x: 0, y: 0, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 'b', type: 'battleship', name: 'Battleship', size: 4, x: 0, y: 1, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 'cr', type: 'cruiser', name: 'Cruiser', size: 3, x: 0, y: 2, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 's', type: 'submarine', name: 'Submarine', size: 3, x: 0, y: 3, orientation: 'horizontal', hitIndices: [], sunk: false },
      { id: 'd', type: 'destroyer', name: 'Destroyer', size: 2, x: 0, y: 4, orientation: 'horizontal', hitIndices: [], sunk: false },
    ];
    const salt = generateSalt();
    const hash = await computeBoardHash(fleet, salt);

    // Shot at (0, 0) hit Carrier, but defender dishonestly called it a miss!
    const shotsFired: ShotRecord[] = [
      { id: '1', by: 'attacker', x: 0, y: 0, result: 'miss', turnNumber: 1, createdAt: 100 },
    ];

    const audit = await verifyOpponentFairPlay(fleet, salt, hash, shotsFired);
    expect(audit.valid).toBe(false);
    expect(audit.cheated).toBe(true);
    expect(audit.reason).toContain("falsely reported 'miss'");
  });

  it('detects cheat when opponent tampers with committed hash', async () => {
    const fleet = generateRandomFleet();
    const salt = generateSalt();
    const tamperedHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const audit = await verifyOpponentFairPlay(fleet, salt, tamperedHash, []);
    expect(audit.valid).toBe(false);
    expect(audit.cheated).toBe(true);
    expect(audit.reason).toContain('cryptographic commitment');
  });
});
