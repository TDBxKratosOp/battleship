import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  Unsubscribe,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { GameMode, PlacedShip, PlayerData, RoomData, ShotRecord, ShotResult, ShipType } from '../game/fleet';

/**
 * Generates an ambiguous-character-free 6-character room code (e.g. 7X8K2M)
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Session storage helpers for refreshing recovery
export function saveLocalRoomSession(roomCode: string, uid: string, ships: PlacedShip[], salt?: string, hash?: string) {
  if (typeof window === 'undefined') return;
  const key = `battleship_session_${roomCode}`;
  sessionStorage.setItem(key, JSON.stringify({ uid, ships, salt, hash, timestamp: Date.now() }));
}

export function getLocalRoomSession(roomCode: string): { uid: string; ships: PlacedShip[]; salt?: string; hash?: string } | null {
  if (typeof window === 'undefined') return null;
  const key = `battleship_session_${roomCode}`;
  const data = sessionStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// In-Memory/BroadcastChannel Mock system for testing with 2 tabs without Firebase credentials
const mockBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('battleship_local_mesh') : null;

interface MockRoomStore {
  rooms: Record<string, RoomData>;
  players: Record<string, Record<string, PlayerData>>;
  shots: Record<string, ShotRecord[]>;
}

const mockStore: MockRoomStore = {
  rooms: {},
  players: {},
  shots: {},
};

// Sync mock store across local browser tabs
if (mockBroadcast) {
  mockBroadcast.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'SYNC_STORE') {
      Object.assign(mockStore.rooms, payload.rooms);
      Object.assign(mockStore.players, payload.players);
      Object.assign(mockStore.shots, payload.shots);
      notifyMockSubscribers();
    }
  };
}

const mockSubscribers = new Set<() => void>();
function notifyMockSubscribers() {
  mockSubscribers.forEach((cb) => cb());
  if (mockBroadcast) {
    mockBroadcast.postMessage({
      type: 'SYNC_STORE',
      payload: {
        rooms: mockStore.rooms,
        players: mockStore.players,
        shots: mockStore.shots,
      },
    });
  }
}

/**
 * Creates a new room in Firestore (or local mesh fallback).
 */
export async function createRoom(
  hostUid: string,
  nickname: string,
  mode: GameMode = 'classic'
): Promise<string> {
  const roomCode = generateRoomCode();
  const now = Date.now();

  const roomData: RoomData = {
    roomCode,
    status: 'waiting',
    mode,
    hostUid,
    turnNumber: 0,
    createdAt: now,
    updatedAt: now,
  };

  const playerData: PlayerData = {
    uid: hostUid,
    nickname: nickname.trim() || 'Host',
    ready: false,
    lastSeen: now,
  };

  if (!isFirebaseConfigured) {
    mockStore.rooms[roomCode] = roomData;
    mockStore.players[roomCode] = { [hostUid]: playerData };
    mockStore.shots[roomCode] = [];
    notifyMockSubscribers();
    return roomCode;
  }

  const roomRef = doc(db, 'rooms', roomCode);
  const playerRef = doc(db, 'rooms', roomCode, 'players', hostUid);

  const batch = writeBatch(db);
  batch.set(roomRef, roomData);
  batch.set(playerRef, playerData);
  await batch.commit();

  return roomCode;
}

/**
 * Joins an existing room. Handles rejoin/reconnect.
 */
export async function joinRoom(
  roomCode: string,
  uid: string,
  nickname: string
): Promise<{ success: boolean; error?: string }> {
  const code = roomCode.trim().toUpperCase();

  if (!isFirebaseConfigured) {
    const room = mockStore.rooms[code];
    if (!room) return { success: false, error: 'Room not found.' };

    const players = mockStore.players[code] || {};
    const playerKeys = Object.keys(players);

    // Reconnecting as existing player
    if (players[uid]) {
      players[uid].lastSeen = Date.now();
      notifyMockSubscribers();
      return { success: true };
    }

    if (playerKeys.length >= 2) {
      return { success: false, error: 'Room is already full.' };
    }

    // Join as guest
    room.guestUid = uid;
    room.status = 'placement';
    room.updatedAt = Date.now();

    players[uid] = {
      uid,
      nickname: nickname.trim() || 'Guest',
      ready: false,
      lastSeen: Date.now(),
    };
    mockStore.players[code] = players;
    notifyMockSubscribers();
    return { success: true };
  }

  const roomRef = doc(db, 'rooms', code);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    return { success: false, error: 'Room code does not exist.' };
  }

  const room = roomSnap.data() as RoomData;
  const playerRef = doc(db, 'rooms', code, 'players', uid);
  const playerSnap = await getDoc(playerRef);

  // If already in this room, simply update lastSeen (reconnect)
  if (playerSnap.exists()) {
    await updateDoc(playerRef, { lastSeen: Date.now() });
    return { success: true };
  }

  // Check player count
  const playersSnap = await getDocs(collection(db, 'rooms', code, 'players'));
  if (playersSnap.size >= 2) {
    return { success: false, error: 'Room is already full (2 players max).' };
  }

  const batch = writeBatch(db);
  batch.set(playerRef, {
    uid,
    nickname: nickname.trim() || 'Guest',
    ready: false,
    lastSeen: Date.now(),
  });

  batch.update(roomRef, {
    guestUid: uid,
    status: 'placement',
    updatedAt: Date.now(),
  });

  await batch.commit();
  return { success: true };
}

/**
 * Submits player's cryptographic commitment on Ready.
 */
export async function commitPlayerReady(
  roomCode: string,
  uid: string,
  boardHash: string
): Promise<void> {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const room = mockStore.rooms[code];
    const players = mockStore.players[code];
    if (room && players && players[uid]) {
      players[uid].ready = true;
      players[uid].boardHash = boardHash;

      // Check if both players ready
      const allReady = Object.values(players).length === 2 && Object.values(players).every((p) => p.ready);
      if (allReady) {
        room.status = 'playing';
        room.turnUid = room.hostUid;
        room.turnNumber = 1;
        room.updatedAt = Date.now();
      }
      notifyMockSubscribers();
    }
    return;
  }

  const playerRef = doc(db, 'rooms', code, 'players', uid);
  await updateDoc(playerRef, {
    ready: true,
    boardHash,
    lastSeen: Date.now(),
  });

  // Check if both players ready
  const playersSnap = await getDocs(collection(db, 'rooms', code, 'players'));
  const players = playersSnap.docs.map((d) => d.data() as PlayerData);

  if (players.length === 2 && players.every((p) => p.ready)) {
    const roomRef = doc(db, 'rooms', code);
    const roomSnap = await getDoc(roomRef);
    const room = roomSnap.data() as RoomData;
    await updateDoc(roomRef, {
      status: 'playing',
      turnUid: room.hostUid,
      turnNumber: 1,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Submits a new shot into the room's shots collection.
 */
export async function submitShot(
  roomCode: string,
  byUid: string,
  x: number,
  y: number,
  turnNumber: number
): Promise<string> {
  const code = roomCode.toUpperCase();
  const shotId = `shot_${Date.now()}_${x}_${y}`;

  const shotRecord: ShotRecord = {
    id: shotId,
    by: byUid,
    x,
    y,
    result: 'pending' as unknown as ShotResult, // Will be resolved by defender
    turnNumber,
    createdAt: Date.now(),
  };

  if (!isFirebaseConfigured) {
    if (!mockStore.shots[code]) mockStore.shots[code] = [];
    mockStore.shots[code].push(shotRecord);
    notifyMockSubscribers();
    return shotId;
  }

  const shotRef = doc(db, 'rooms', code, 'shots', shotId);
  await setDoc(shotRef, shotRecord);
  return shotId;
}

/**
 * Called by the DEFENDING player to record hit/miss/sunk and advance turn or end game.
 */
export async function resolveShotByDefender(
  roomCode: string,
  shotId: string,
  result: ShotResult,
  sunkShip: ShipType | undefined,
  nextTurnUid: string,
  isGameOver: boolean,
  winnerUid?: string
): Promise<void> {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const shots = mockStore.shots[code] || [];
    const shot = shots.find((s) => s.id === shotId);
    if (shot) {
      shot.result = result;
      if (sunkShip) shot.sunkShip = sunkShip;
    }
    const room = mockStore.rooms[code];
    if (room) {
      if (isGameOver && winnerUid) {
        room.status = 'finished';
        room.winnerUid = winnerUid;
        room.winReason = 'all_sunk';
      } else {
        room.turnUid = nextTurnUid;
        room.turnNumber += 1;
      }
      room.updatedAt = Date.now();
    }
    notifyMockSubscribers();
    return;
  }

  const batch = writeBatch(db);
  const shotRef = doc(db, 'rooms', code, 'shots', shotId);
  batch.update(shotRef, {
    result,
    ...(sunkShip ? { sunkShip } : {}),
  });

  const roomRef = doc(db, 'rooms', code);
  if (isGameOver && winnerUid) {
    batch.update(roomRef, {
      status: 'finished',
      winnerUid,
      winReason: 'all_sunk',
      updatedAt: Date.now(),
    });
  } else {
    batch.update(roomRef, {
      turnUid: nextTurnUid,
      updatedAt: Date.now(),
    });
  }

  await batch.commit();
}

/**
 * Reveals the player's board and salt when game completes for anti-cheat verification.
 */
export async function revealBoardAndSalt(
  roomCode: string,
  uid: string,
  ships: PlacedShip[],
  salt: string
): Promise<void> {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const players = mockStore.players[code];
    if (players && players[uid]) {
      players[uid].revealedBoard = ships;
      players[uid].salt = salt;
      notifyMockSubscribers();
    }
    return;
  }

  const playerRef = doc(db, 'rooms', code, 'players', uid);
  await updateDoc(playerRef, {
    revealedBoard: ships,
    salt,
  });
}

/**
 * Claims win if opponent was disconnected for 30+ seconds.
 */
export async function claimDisconnectWin(roomCode: string, winnerUid: string): Promise<void> {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const room = mockStore.rooms[code];
    if (room) {
      room.status = 'finished';
      room.winnerUid = winnerUid;
      room.winReason = 'timeout';
      room.updatedAt = Date.now();
      notifyMockSubscribers();
    }
    return;
  }

  const roomRef = doc(db, 'rooms', code);
  await updateDoc(roomRef, {
    status: 'finished',
    winnerUid,
    winReason: 'timeout',
    updatedAt: Date.now(),
  });
}

/**
 * Awards win to honest player if opponent cheated.
 */
export async function claimCheatWin(roomCode: string, winnerUid: string, cheaterUid: string): Promise<void> {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const room = mockStore.rooms[code];
    const players = mockStore.players[code];
    if (room) {
      room.status = 'finished';
      room.winnerUid = winnerUid;
      room.winReason = 'opponent_cheated';
      room.updatedAt = Date.now();
    }
    if (players && players[cheaterUid]) {
      players[cheaterUid].cheater = true;
    }
    notifyMockSubscribers();
    return;
  }

  const batch = writeBatch(db);
  const roomRef = doc(db, 'rooms', code);
  const cheaterRef = doc(db, 'rooms', code, 'players', cheaterUid);

  batch.update(roomRef, {
    status: 'finished',
    winnerUid,
    winReason: 'opponent_cheated',
    updatedAt: Date.now(),
  });
  batch.update(cheaterRef, { cheater: true });

  await batch.commit();
}

/**
 * Requests rematch: resets room and player readiness.
 */
export async function requestRematch(roomCode: string): Promise<void> {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const room = mockStore.rooms[code];
    const players = mockStore.players[code];
    if (room && players) {
      room.status = 'placement';
      delete room.winnerUid;
      delete room.winReason;
      room.turnNumber = 0;
      room.updatedAt = Date.now();

      Object.values(players).forEach((p) => {
        p.ready = false;
        delete p.boardHash;
        delete p.revealedBoard;
        delete p.salt;
        delete p.cheater;
      });

      mockStore.shots[code] = [];
      notifyMockSubscribers();
    }
    return;
  }

  const roomRef = doc(db, 'rooms', code);
  const playersSnap = await getDocs(collection(db, 'rooms', code, 'players'));
  const shotsSnap = await getDocs(collection(db, 'rooms', code, 'shots'));

  const batch = writeBatch(db);
  batch.update(roomRef, {
    status: 'placement',
    winnerUid: null,
    winReason: null,
    turnNumber: 0,
    updatedAt: Date.now(),
  });

  playersSnap.docs.forEach((d) => {
    batch.update(d.ref, {
      ready: false,
      boardHash: null,
      revealedBoard: null,
      salt: null,
      cheater: false,
    });
  });

  shotsSnap.docs.forEach((s) => {
    batch.delete(s.ref);
  });

  await batch.commit();
}

/**
 * Subscribes to real-time room updates.
 */
export function subscribeToRoom(roomCode: string, callback: (room: RoomData | null) => void): Unsubscribe {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const notify = () => {
      callback(mockStore.rooms[code] || null);
    };
    mockSubscribers.add(notify);
    notify();
    return () => mockSubscribers.delete(notify);
  }

  const roomRef = doc(db, 'rooms', code);
  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RoomData);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribes to real-time player updates in the room.
 */
export function subscribeToPlayers(
  roomCode: string,
  callback: (players: Record<string, PlayerData>) => void
): Unsubscribe {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const notify = () => {
      callback(mockStore.players[code] || {});
    };
    mockSubscribers.add(notify);
    notify();
    return () => mockSubscribers.delete(notify);
  }

  const playersRef = collection(db, 'rooms', code, 'players');
  return onSnapshot(playersRef, (snapshot) => {
    const map: Record<string, PlayerData> = {};
    snapshot.forEach((doc) => {
      map[doc.id] = doc.data() as PlayerData;
    });
    callback(map);
  });
}

/**
 * Subscribes to real-time shots log in the room.
 */
export function subscribeToShots(
  roomCode: string,
  callback: (shots: ShotRecord[]) => void
): Unsubscribe {
  const code = roomCode.toUpperCase();

  if (!isFirebaseConfigured) {
    const notify = () => {
      const list = mockStore.shots[code] || [];
      callback([...list].sort((a, b) => a.createdAt - b.createdAt));
    };
    mockSubscribers.add(notify);
    notify();
    return () => mockSubscribers.delete(notify);
  }

  const shotsRef = collection(db, 'rooms', code, 'shots');
  const shotsQuery = query(shotsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(shotsQuery, (snapshot) => {
    const list: ShotRecord[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as ShotRecord);
    });
    callback(list);
  });
}
