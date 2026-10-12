import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlacedShip, RoomData, ShotRecord } from '../game/fleet';
import { AntiCheatVerificationResult } from '../game/hashing';
import { soundManager } from '../audio/AudioManager';
import {
  Trophy,
  Skull,
  RotateCcw,
  Home,
  ShieldCheck,
  ShieldAlert,
  Target,
  Crosshair,
  Flame,
} from 'lucide-react';

interface GameOverProps {
  room: RoomData;
  myUid: string;
  myShips: PlacedShip[];
  shots: ShotRecord[];
  auditResult: AntiCheatVerificationResult | null;
  onRematch: () => void;
  onHome: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  room,
  myUid,
  myShips,
  shots,
  auditResult,
  onRematch,
  onHome,
}) => {
  const isWinner = room.winnerUid === myUid;
  const isTimeoutWin = room.winReason === 'timeout';
  const isCheatWin = room.winReason === 'opponent_cheated';

  // Calculate combat stats
  const myShots = shots.filter((s) => s.by === myUid);
  const totalShotsFired = myShots.length;
  const hitsFired = myShots.filter((s) => s.result === 'hit' || s.result === 'sunk').length;
  const accuracy = totalShotsFired > 0 ? Math.round((hitsFired / totalShotsFired) * 100) : 0;
  const shipsLost = myShips.filter((s) => s.sunk).length;

  useEffect(() => {
    if (isWinner) {
      soundManager.play('victory');
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#10b981', '#38bdf8', '#fbbf24'],
        });
      } catch {}
    } else {
      soundManager.play('defeat');
    }
  }, [isWinner]);

  return (
    <div className="w-full max-w-lg mx-auto p-4 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
      {/* Banner */}
      <div
        className={`w-full glass-panel-glow rounded-3xl p-6 sm:p-8 text-center space-y-4 border ${
          isWinner
            ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(0,240,255,0.3)]'
            : 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
        }`}
      >
        <div className="flex justify-center">
          {isWinner ? (
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              <Skull className="w-8 h-8" />
            </div>
          )}
        </div>

        <div>
          <h2
            className={`text-3xl sm:text-4xl font-extrabold font-tactical tracking-wider ${
              isWinner ? 'text-cyan-200' : 'text-rose-300'
            }`}
          >
            {isWinner ? 'MISSION ACCOMPLISHED' : 'FLEET DESTROYED'}
          </h2>
          <p className="text-xs font-mono text-slate-300 mt-1">
            {isWinner
              ? isTimeoutWin
                ? 'Hostile fleet abandoned coordinates (30s disconnect timeout).'
                : isCheatWin
                ? 'Opponent cryptographic commitment failed. Win awarded.'
                : 'All enemy vessels neutralized in naval combat.'
              : 'Our fleet suffered catastrophic losses. Return to base.'}
          </p>
        </div>

        {/* Combat Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold text-slate-100">
              {accuracy}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">ACCURACY</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
              <Crosshair className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold text-slate-100">
              {totalShotsFired}
            </div>
            <div className="text-[10px] font-mono text-slate-400">SHOTS FIRED</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold text-slate-100">
              {shipsLost}/5
            </div>
            <div className="text-[10px] font-mono text-slate-400">SHIPS LOST</div>
          </div>
        </div>

        {/* Anti-Cheat Verification Card */}
        <div
          className={`p-3.5 rounded-2xl border text-left text-xs ${
            auditResult?.cheated
              ? 'bg-rose-950/70 border-rose-500/60 text-rose-200'
              : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 font-tactical font-bold mb-1">
            {auditResult?.cheated ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>ANTI-CHEAT AUDIT: FOUL PLAY DETECTED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ANTI-CHEAT AUDIT: CRYPTOGRAPHICALLY VERIFIED</span>
              </>
            )}
          </div>
          <p className="text-[11px] font-mono opacity-80 leading-relaxed">
            {auditResult?.cheated
              ? auditResult.reason || 'Opponent revealed board did not match initial SHA-256 commitment.'
              : 'Both fleets verified via SHA-256 commit-reveal protocol. Zero telemetry tampering detected.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => {
              soundManager.play('click');
              onRematch();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-tactical font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REMATCH IN SECTOR</span>
          </button>

          <button
            onClick={() => {
              soundManager.play('click');
              onHome();
            }}
            className="py-3 px-5 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-slate-500 text-slate-300 font-tactical font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>HQ MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
