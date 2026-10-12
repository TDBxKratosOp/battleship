import React from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { Volume2, VolumeX, Music, Smartphone, ShieldCheck, X } from 'lucide-react';
import { soundManager } from '../audio/AudioManager';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useGameStore();
  const {
    soundEnabled,
    musicEnabled,
    sfxVolume,
    musicVolume,
    vibrationEnabled,
    setSoundEnabled,
    setMusicEnabled,
    setSfxVolume,
    setMusicVolume,
    setVibrationEnabled,
    triggerHaptic,
  } = useSettingsStore();

  if (!isSettingsOpen) return null;

  const handleClose = () => {
    soundManager.play('click');
    setIsSettingsOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-md glass-panel-glow rounded-2xl p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 id="settings-title" className="text-lg font-bold font-tactical tracking-wider text-cyan-300">
              OPERATIONS CONFIG
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Sound Effects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="sound-toggle" className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                Sound Effects
              </label>
              <input
                id="sound-toggle"
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  setSoundEnabled(e.target.checked);
                  if (e.target.checked) soundManager.play('click');
                }}
                className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
              />
            </div>
            {soundEnabled && (
              <div className="flex items-center gap-3 pl-7">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  aria-label="Sound effects volume"
                />
                <span className="text-xs font-mono text-cyan-400 w-9 text-right">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Music */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="music-toggle" className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                <Music className={`w-4 h-4 ${musicEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                Sonar & Ambient Drone
              </label>
              <input
                id="music-toggle"
                type="checkbox"
                checked={musicEnabled}
                onChange={(e) => {
                  setMusicEnabled(e.target.checked);
                  soundManager.play('click');
                }}
                className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
              />
            </div>
            {musicEnabled && (
              <div className="flex items-center gap-3 pl-7">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  aria-label="Ambient music volume"
                />
                <span className="text-xs font-mono text-cyan-400 w-9 text-right">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Haptic Vibration */}
          <div className="flex items-center justify-between">
            <label htmlFor="vibration-toggle" className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
              <Smartphone className={`w-4 h-4 ${vibrationEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
              Haptic Feedback (Mobile)
            </label>
            <input
              id="vibration-toggle"
              type="checkbox"
              checked={vibrationEnabled}
              onChange={(e) => {
                setVibrationEnabled(e.target.checked);
                if (e.target.checked) triggerHaptic();
              }}
              className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
            />
          </div>

          {/* Anti-cheat Protocol Badge */}
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold font-tactical">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              PEER COMMIT-REVEAL PROTOCOL
            </div>
            <p className="text-slate-400 leading-relaxed">
              Your fleet coordinates are sealed with a local random SHA-256 cryptographic salt. Opponent clients only receive hit/miss telemetry, preventing memory inspection. At match conclusion, hashes and logs are verified.
            </p>
          </div>
        </div>

        <div className="pt-3">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-tactical font-semibold tracking-wider transition active:scale-[0.98]"
          >
            CONFIRM SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
