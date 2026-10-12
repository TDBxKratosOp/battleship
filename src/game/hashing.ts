import { FLEET_CONFIG, Orientation, PlacedShip, ShipType, ShotRecord } from './fleet';
import { findShipAt, validateFleet } from './placement';

export interface NormalizedShip {
  type: ShipType;
  size: number;
  x: number;
  y: number;
  orientation: Orientation;
}

/**
 * Generates a cryptographically strong random salt.
 */
export function generateSalt(byteLength: number = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback for non-browser environments
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Normalizes a placed fleet into a canonical, deterministic array sorted by ship type.
 * Strips out transient fields like hits, sunk flags, or generated IDs.
 */
export function normalizeBoard(ships: PlacedShip[]): NormalizedShip[] {
  return [...ships]
    .map((s) => ({
      type: s.type,
      size: s.size,
      x: s.x,
      y: s.y,
      orientation: s.orientation,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

/**
 * Computes SHA-256 of the normalized board JSON concatenated with the salt.
 * Uses Web Crypto API (supported in all modern browsers and Node 18+).
 */
export async function computeBoardHash(
  ships: PlacedShip[],
  salt: string
): Promise<string> {
  const canonicalJson = JSON.stringify(normalizeBoard(ships));
  const payload = `${canonicalJson}:${salt}`;

  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && cryptoObj.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Web Crypto API not available for SHA-256 hashing');
}

/**
 * Verifies that the revealed board and salt produce the exact committed hash.
 */
export async function verifyBoardCommitment(
  revealedShips: PlacedShip[],
  salt: string,
  committedHash: string
): Promise<boolean> {
  if (!committedHash || !salt || !revealedShips) return false;
  const recomputed = await computeBoardHash(revealedShips, salt);
  return recomputed.toLowerCase() === committedHash.toLowerCase();
}

export interface AntiCheatVerificationResult {
  valid: boolean;
  cheated: boolean;
  reason?: string;
}

/**
 * Verifies the integrity of an opponent's revealed board against:
 * 1. Fleet validity (correct 5 ships, 10x10 bounds, no overlaps)
 * 2. SHA-256 cryptographic commitment match
 * 3. Combat history consistency (ensuring every shot result reported by defender was 100% honest)
 */
export async function verifyOpponentFairPlay(
  revealedShips: PlacedShip[],
  salt: string,
  committedHash: string,
  shotsFiredAtOpponent: ShotRecord[]
): Promise<AntiCheatVerificationResult> {
  // 1. Validate fleet structure
  const fleetCheck = validateFleet(revealedShips);
  if (!fleetCheck.valid) {
    return {
      valid: false,
      cheated: true,
      reason: `Opponent fleet is invalid: ${fleetCheck.reason}`,
    };
  }

  // 2. Verify SHA-256 Hash
  const hashMatches = await verifyBoardCommitment(revealedShips, salt, committedHash);
  if (!hashMatches) {
    return {
      valid: false,
      cheated: true,
      reason: 'Opponent revealed board does not match their pre-game cryptographic commitment hash.',
    };
  }

  // 3. Simulate and audit all shots against the revealed board
  // Track virtual damage on the revealed ships
  const hitIndicesByShip = new Map<ShipType, Set<number>>();
  for (const ship of revealedShips) {
    hitIndicesByShip.set(ship.type, new Set());
  }

  // Sort shots by creation time or turn number to replay chronologically
  const sortedShots = [...shotsFiredAtOpponent].sort((a, b) => a.turnNumber - b.turnNumber || a.createdAt - b.createdAt);

  for (const shot of sortedShots) {
    const match = findShipAt(revealedShips, shot.x, shot.y);

    if (!match) {
      // Must be a miss
      if (shot.result !== 'miss') {
        return {
          valid: false,
          cheated: true,
          reason: `Shot at (${shot.x}, ${shot.y}) hit water, but was reported as ${shot.result}.`,
        };
      }
    } else {
      // Must be a hit or sunk
      if (shot.result === 'miss') {
        return {
          valid: false,
          cheated: true,
          reason: `Shot at (${shot.x}, ${shot.y}) hit opponent's ${match.ship.name}, but opponent falsely reported 'miss'.`,
        };
      }

      const hits = hitIndicesByShip.get(match.ship.type)!;
      hits.add(match.segmentIndex);

      const shipConfig = FLEET_CONFIG.find((f) => f.type === match.ship.type)!;
      const isNowSunk = hits.size >= shipConfig.size;

      if (isNowSunk && shot.result !== 'sunk') {
        return {
          valid: false,
          cheated: true,
          reason: `Ship ${match.ship.name} was fully hit, but opponent reported ${shot.result} instead of 'sunk'.`,
        };
      }

      if (!isNowSunk && shot.result === 'sunk') {
        return {
          valid: false,
          cheated: true,
          reason: `Opponent reported ${match.ship.name} sunk prematurely before all segments were hit.`,
        };
      }
    }
  }

  return {
    valid: true,
    cheated: false,
  };
}
