import React from 'react';
import { GameMode } from '../game/fleet';
import { soundManager } from '../audio/AudioManager';
import { Crosshair, ShieldAlert, Timer } from 'lucide-react';

interface TurnBannerProps {
  isMyTurn: boolean;
  mode: GameMode;
  shotsRemainingThisTurn: number;
  timeRemaining: number; // 0 to 30
  maxTurnTime?: number;
  onTimeExpired: () => void;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  isMyTurn,
  mode,
  shotsRemainingThisTurn,
  timeRemaining,
  maxTurnTime = 30,
  onTimeExpired,
}) => {
  const percent = Math.max(0, Math.min(100, (timeRemaining / maxTurnTime) * 100));
  const isUrgent = timeRemaining <= 10;

  React.useEffect(() => {
    if (isMyTurn && isUrgent && timeRemaining > 0) {
      soundManager.play('tick');
    }
    if (isMyTurn && timeRemaining === 0) {
      onTimeExpired();
    }
  }, [timeRemaining, isMyTurn, isUrgent, onTimeExpired]);

  return (
    <div className="w-full max-w-xl mx-auto my-2">
      <div
        className={`p-3 sm:p-4 rounded-2xl glass-panel transition-all duration-300 relative overflow-hidden border ${
          isMyTurn
            ? isUrgent
              ? 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'border-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
            : 'border-slate-700/60 opacity-90'
        }`}
      >
        {/* Animated Progress Bar along the top */}
        {isMyTurn && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 linear ${
                isUrgent ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Turn status indicator */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full animate-ping ${
                isMyTurn ? (isUrgent ? 'bg-amber-400' : 'bg-cyan-400') : 'bg-slate-500'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-tactical font-bold text-sm sm:text-base tracking-wider">
                  {isMyTurn ? (
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <Crosshair className="w-4 h-4 text-cyan-400" />
                      YOUR TURN // WEAPONS FREE
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-slate-500" />
                      OPPONENT'S TURN // INCOMING
                    </span>
                  )}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {isMyTurn
                  ? mode === 'salvo'
                    ? `Salvo Mode: ${shotsRemainingThisTurn} shot${shotsRemainingThisTurn > 1 ? 's' : ''} remaining`
                    : 'Target enemy coordinates on radar'
                  : 'Awaiting enemy coordinates'}
              </p>
            </div>
          </div>

          {/* Turn Timer Badge */}
          {isMyTurn && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                isUrgent
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
                  : 'bg-slate-900/80 border-cyan-500/40 text-cyan-300'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{timeRemaining}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
