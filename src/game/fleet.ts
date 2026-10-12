export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export type Orientation = 'horizontal' | 'vertical';

export interface ShipConfig {
  type: ShipType;
  name: string;
  size: number;
}

export const FLEET_CONFIG: readonly ShipConfig[] = [
  { type: 'carrier', name: 'Carrier', size: 5 },
  { type: 'battleship', name: 'Battleship', size: 4 },
  { type: 'cruiser', name: 'Cruiser', size: 3 },
  { type: 'submarine', name: 'Submarine', size: 3 },
  { type: 'destroyer', name: 'Destroyer', size: 2 },
] as const;

export const BOARD_SIZE = 10;
export const TOTAL_SHIP_CELLS = FLEET_CONFIG.reduce((sum, s) => sum + s.size, 0); // 17

export interface Coordinate {
  x: number; // 0 to 9 (Columns A-J)
  y: number; // 0 to 9 (Rows 1-10)
}

export interface PlacedShip {
  id: string;
  type: ShipType;
  name: string;
  size: number;
  x: number;
  y: number;
  orientation: Orientation;
  hitIndices: number[]; // relative indices 0..(size-1)
  sunk: boolean;
}

export type ShotResult = 'miss' | 'hit' | 'sunk';

export interface ShotRecord {
  id: string;
  by: string; // shooter UID
  x: number;
  y: number;
  result: ShotResult;
  sunkShip?: ShipType;
  turnNumber: number;
  createdAt: number;
}

export type GameMode = 'classic' | 'salvo';

export type RoomStatus = 'waiting' | 'placement' | 'playing' | 'finished';

export interface PlayerData {
  uid: string;
  nickname: string;
  ready: boolean;
  boardHash?: string;
  lastSeen: number;
  revealedBoard?: PlacedShip[];
  salt?: string;
  cheater?: boolean;
}

export interface RoomData {
  roomCode: string;
  status: RoomStatus;
  mode: GameMode;
  hostUid: string;
  guestUid?: string;
  turnUid?: string;
  turnNumber: number;
  winnerUid?: string;
  winReason?: 'all_sunk' | 'timeout' | 'opponent_cheated';
  createdAt: number;
  updatedAt: number;
}
