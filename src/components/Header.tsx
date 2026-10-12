import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { soundManager } from '../audio/AudioManager';
import { Volume2, VolumeX, Settings, Anchor, Copy, Check } from 'lucide-react';

interface HeaderProps {
  onBackToHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBackToHome }) => {
  const { roomCode, setIsSettingsOpen, addToast } = useGameStore();
  const { soundEnabled, setSoundEnabled } = useSettingsStore();
  const [copied, setCopied] = React.useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) soundManager.play('click');
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      soundManager.play('click');
      addToast(`Room code ${roomCode} copied to clipboard!`, 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(`Room code: ${roomCode}`, 'info');
    }
  };

  return (
    <header className="w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 safe-top">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={onBackToHome}
          className={`flex items-center gap-2.5 ${
            onBackToHome ? 'cursor-pointer hover:opacity-80 transition' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="font-tactical font-bold text-sm tracking-widest text-cyan-300 flex items-center gap-1.5">
              BATTLESHIP
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                P2P-PRO
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 tracking-wider">
              TACTICAL NAVAL COMMAND
            </div>
          </div>
        </div>

        {/* Room Code Badge (if active) */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400/60 transition group active:scale-95"
              title="Copy room code"
            >
              <span className="text-[11px] font-mono text-slate-400">SECTOR:</span>
              <span className="text-sm font-mono font-bold tracking-widest text-cyan-300 group-hover:text-cyan-200">
                {roomCode}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Quick Mute */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border transition ${
              soundEnabled
                ? 'bg-slate-900/80 border-cyan-500/30 text-cyan-400 hover:bg-slate-800'
                : 'bg-slate-900/50 border-slate-700/50 text-slate-500 hover:text-slate-400'
            }`}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => {
              soundManager.play('click');
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/30 text-slate-300 hover:text-white hover:border-cyan-400/50 transition active:scale-95"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
