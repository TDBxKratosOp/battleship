import { create } from 'zustand';
import { soundManager } from '../audio/AudioManager';

interface SettingsState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  vibrationEnabled: boolean;

  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxVolume: (vol: number) => void;
  setMusicVolume: (vol: number) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  triggerHaptic: (pattern?: number | number[]) => void;
}

const SETTINGS_STORAGE_KEY = 'battleship_user_settings_v1';

function loadInitialSettings() {
  const defaults = {
    soundEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.8,
    musicVolume: 0.35,
    vibrationEnabled: true,
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

const initial = loadInitialSettings();

// Sync initial audio values to audio manager
soundManager.setSfxEnabled(initial.soundEnabled);
soundManager.setMusicEnabled(initial.musicEnabled);
soundManager.setSfxVolume(initial.sfxVolume);
soundManager.setMusicVolume(initial.musicVolume);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: initial.soundEnabled,
  musicEnabled: initial.musicEnabled,
  sfxVolume: initial.sfxVolume,
  musicVolume: initial.musicVolume,
  vibrationEnabled: initial.vibrationEnabled,

  setSoundEnabled: (enabled) => {
    soundManager.setSfxEnabled(enabled);
    set({ soundEnabled: enabled });
    saveToStorage(get());
  },

  setMusicEnabled: (enabled) => {
    soundManager.setMusicEnabled(enabled);
    set({ musicEnabled: enabled });
    saveToStorage(get());
  },

  setSfxVolume: (vol) => {
    soundManager.setSfxVolume(vol);
    set({ sfxVolume: vol });
    saveToStorage(get());
  },

  setMusicVolume: (vol) => {
    soundManager.setMusicVolume(vol);
    set({ musicVolume: vol });
    saveToStorage(get());
  },

  setVibrationEnabled: (enabled) => {
    set({ vibrationEnabled: enabled });
    saveToStorage(get());
  },

  triggerHaptic: (pattern = [40, 30, 60]) => {
    if (typeof window === 'undefined' || !get().vibrationEnabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe ignore
      }
    }
  },
}));

function saveToStorage(state: SettingsState) {
  if (typeof window === 'undefined') return;
  const toSave = {
    soundEnabled: state.soundEnabled,
    musicEnabled: state.musicEnabled,
    sfxVolume: state.sfxVolume,
    musicVolume: state.musicVolume,
    vibrationEnabled: state.vibrationEnabled,
  };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
}
