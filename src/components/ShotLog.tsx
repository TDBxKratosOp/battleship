import React from 'react';
import { ShotRecord } from '../game/fleet';
import { Radio } from 'lucide-react';

interface ShotLogProps {
  shots: ShotRecord[];
  myUid: string;
  opponentNickname?: string;
  myNickname?: string;
}

export const ShotLog: React.FC<ShotLogProps> = ({
  shots,
  myUid,
  opponentNickname = 'Enemy',
  myNickname = 'You',
}) => {
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new shot arrives
  React.useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [shots]);

  const recentShots = [...shots].slice(-15);

  return (
    <div className="w-full glass-panel rounded-2xl p-3 sm:p-4 text-xs font-mono">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 text-cyan-300 font-semibold font-tactical">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>COMBAT TELEMETRY</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          TOTAL SHOTS: {shots.length}
        </span>
      </div>

      <div
        ref={logContainerRef}
        className="max-h-28 sm:max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-900/50"
      >
        {recentShots.length === 0 ? (
          <div className="text-slate-500 italic py-2 text-center">
            No engagements logged yet. Weapons loaded and awaiting orders.
          </div>
        ) : (
          recentShots.map((shot) => {
            const isMe = shot.by === myUid;
            const actor = isMe ? myNickname : opponentNickname;
            const col = String.fromCharCode(65 + shot.x);
            const row = shot.y + 1;
            const coord = `${col}${row}`;

            let resultBadge = null;
            if (shot.result === 'hit') {
              resultBadge = (
                <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/40">
                  DIRECT HIT
                </span>
              );
            } else if (shot.result === 'sunk') {
              resultBadge = (
                <span className="text-rose-300 font-bold bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/60 animate-pulse">
                  {shot.sunkShip ? `${shot.sunkShip.toUpperCase()} SUNK!` : 'VESSEL SUNK!'}
                </span>
              );
            } else {
              resultBadge = (
                <span className="text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                  MISS
                </span>
              );
            }

            return (
              <div
                key={shot.id}
                className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-800/40 text-[11px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={isMe ? 'text-cyan-300 font-semibold' : 'text-amber-400 font-semibold'}>
                    [{actor}]
                  </span>
                  <span className="text-slate-300">Target {coord}</span>
                </div>
                <div className="shrink-0">{resultBadge}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
