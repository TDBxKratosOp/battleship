import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

const NICKNAME_KEY = 'battleship_player_nickname';
const MOCK_UID_KEY = 'battleship_mock_uid';

export function getSavedNickname(): string {
  if (typeof window === 'undefined') return 'Commander';
  return localStorage.getItem(NICKNAME_KEY) || 'Commander';
}

export function saveNickname(name: string): void {
  if (typeof window === 'undefined') return;
  const clean = name.trim().slice(0, 16) || 'Commander';
  localStorage.setItem(NICKNAME_KEY, clean);
}

export function getMockUid(): string {
  if (typeof window === 'undefined') return 'mock-user-1';
  let uid = localStorage.getItem(MOCK_UID_KEY);
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(MOCK_UID_KEY, uid);
  }
  return uid;
}

/**
 * Ensures the client has an active anonymous Firebase session,
 * or provides a simulated user session if Firebase is not yet configured.
 */
export async function ensureAnonymousAuth(): Promise<{ uid: string; isAnonymous: boolean }> {
  if (!isFirebaseConfigured) {
    return { uid: getMockUid(), isAnonymous: true };
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        unsubscribe();
        if (user) {
          resolve({ uid: user.uid, isAnonymous: user.isAnonymous });
        } else {
          try {
            const credential = await signInAnonymously(auth);
            resolve({ uid: credential.user.uid, isAnonymous: true });
          } catch (error) {
            console.error('Anonymous auth error:', error);
            reject(error);
          }
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}
