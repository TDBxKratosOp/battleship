import { doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

export const DISCONNECT_TIMEOUT_MS = 30000; // 30 seconds

let heartbeatTimer: number | null = null;

/**
 * Periodically updates the player's lastSeen timestamp in Firestore.
 */
export function startPresenceHeartbeat(roomCode: string, uid: string): void {
  stopPresenceHeartbeat();

  const updateHeartbeat = async () => {
    if (!isFirebaseConfigured || !roomCode || !uid) return;
    try {
      const playerRef = doc(db, 'rooms', roomCode, 'players', uid);
      await updateDoc(playerRef, {
        lastSeen: Date.now(),
      });
    } catch {
      // Ignore background transient network hiccups
    }
  };

  // Immediate update
  updateHeartbeat();
  // Every 6 seconds
  heartbeatTimer = window.setInterval(updateHeartbeat, 6000);
}

export function stopPresenceHeartbeat(): void {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Checks if a player has missed heartbeats past the 30-second threshold.
 */
export function isPlayerDisconnected(lastSeen?: number): boolean {
  if (!lastSeen) return false;
  return Date.now() - lastSeen > DISCONNECT_TIMEOUT_MS;
}

/**
 * Returns seconds remaining until the opponent's disconnect win can be claimed.
 */
export function getSecondsUntilClaimable(lastSeen?: number): number {
  if (!lastSeen) return 30;
  const elapsed = Date.now() - lastSeen;
  const remaining = Math.max(0, Math.ceil((DISCONNECT_TIMEOUT_MS - elapsed) / 1000));
  return remaining;
}
