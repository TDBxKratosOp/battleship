import { create } from 'zustand';
import {
  Orientation,
  PlacedShip,
  PlayerData,
  RoomData,
  ShipType,
  ShotRecord,
} from '../game/fleet';
import { AntiCheatVerificationResult, generateSalt } from '../game/hashing';
import { getSavedNickname, saveNickname } from '../firebase/auth';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface GameState {
  uid: string;
  nickname: string;
  roomCode: string | null;
  roomData: RoomData | null;
  players: Record<string, PlayerData>;
  shots: ShotRecord[];

  // Local secret placement state
  myShips: PlacedShip[];
  mySalt: string;
  myBoardHash: string | null;

  // Placement screen controls
  selectedShipType: ShipType | null;
  placementOrientation: Orientation;

  // Anti-cheat verification state
  opponentAudit: AntiCheatVerificationResult | null;

  // UI notifications & modals
  toasts: ToastNotification[];
  isSettingsOpen: boolean;

  // Actions
  setUid: (uid: string) => void;
  setNickname: (nickname: string) => void;
  setRoomCode: (code: string | null) => void;
  setRoomData: (data: RoomData | null) => void;
  setPlayers: (players: Record<string, PlayerData>) => void;
  setShots: (shots: ShotRecord[]) => void;
  setMyShips: (ships: PlacedShip[]) => void;
  setMySalt: (salt: string) => void;
  setMyBoardHash: (hash: string | null) => void;
  setSelectedShipType: (type: ShipType | null) => void;
  togglePlacementOrientation: () => void;
  setOpponentAudit: (audit: AntiCheatVerificationResult | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  removeToast: (id: string) => void;
  resetLocalBoard: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  uid: '',
  nickname: getSavedNickname(),
  roomCode: null,
  roomData: null,
  players: {},
  shots: [],

  myShips: [],
  mySalt: generateSalt(),
  myBoardHash: null,

  selectedShipType: null,
  placementOrientation: 'horizontal',

  opponentAudit: null,

  toasts: [],
  isSettingsOpen: false,

  setUid: (uid) => set({ uid }),

  setNickname: (name) => {
    saveNickname(name);
    set({ nickname: name });
  },

  setRoomCode: (roomCode) => set({ roomCode }),
  setRoomData: (roomData) => set({ roomData }),
  setPlayers: (players) => set({ players }),
  setShots: (shots) => set({ shots }),
  setMyShips: (myShips) => set({ myShips }),
  setMySalt: (mySalt) => set({ mySalt }),
  setMyBoardHash: (myBoardHash) => set({ myBoardHash }),
  setSelectedShipType: (selectedShipType) => set({ selectedShipType }),

  togglePlacementOrientation: () => {
    set((state) => ({
      placementOrientation:
        state.placementOrientation === 'horizontal' ? 'vertical' : 'horizontal',
    }));
  },

  setOpponentAudit: (opponentAudit) => set({ opponentAudit }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  addToast: (message, type = 'info', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  resetLocalBoard: () => {
    set({
      myShips: [],
      mySalt: generateSalt(),
      myBoardHash: null,
      selectedShipType: null,
      opponentAudit: null,
    });
  },
}));
