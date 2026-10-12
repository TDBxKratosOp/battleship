import React from 'react';
import { PlayerData, RoomData } from '../game/fleet';
import { soundManager } from '../audio/AudioManager';
import { useGameStore } from '../store/gameStore';
import { Copy, Share2, Users, Check, Clock, Shield } from 'lucide-react';

interface LobbyProps {
  room: RoomData;
  players: Record<string, PlayerData>;
  myUid: string;
}

export const Lobby: React.FC<LobbyProps> = ({ room, players, myUid }) => {
  const { addToast } = useGameStore();
  const [copied, setCopied] = React.useState(false);

  const playerList = Object.values(players);
  const host = playerList.find((p) => p.uid === room.hostUid);
  const guest = playerList.find((p) => p.uid !== room.hostUid);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      soundManager.play('click');
      addToast(`Room code ${room.roomCode} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(`Room code: ${room.roomCode}`, 'info');
    }
  };

  const handleNativeShare = async () => {
    soundManager.play('click');
    const shareData = {
      title: 'Battleship Tactical Command',
      text: `Join my naval battle in Battleship! Room Code: ${room.roomCode}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 flex flex-col items-center gap-6">
      {/* Sector Code Display Card */}
      <div className="w-full glass-panel-glow rounded-3xl p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-xs font-tactical font-semibold tracking-widest text-cyan-400">
          <Shield className="w-4 h-4" />
          <span>SECTOR RENDEZVOUS CODE</span>
        </div>

        <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-widest text-cyan-200 drop-shadow-[0_0_16px_rgba(0,240,255,0.4)]">
          {room.roomCode}
        </div>

        <p className="text-xs font-mono text-slate-400 max-w-xs mx-auto">
          Transmit this 6-character code or link to your opponent to initiate engagement.
        </p>

        {/* Share buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 font-tactical text-xs font-semibold tracking-wider transition active:scale-95 shadow-md"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>COPY CODE</span>
              </>
            )}
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/60 hover:bg-cyan-500/30 text-cyan-200 font-tactical text-xs font-semibold tracking-wider transition active:scale-95 shadow-md"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>SHARE INVITE</span>
          </button>
        </div>
      </div>

      {/* Roster & Presence */}
      <div className="w-full glass-panel rounded-2xl p-5 space-y-4 border border-cyan-500/20">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2 text-xs font-tactical font-bold text-slate-200">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>OPERATIONAL ROSTER</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
            MODE: {room.mode}
          </span>
        </div>

        <div className="space-y-3">
          {/* Host Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <div>
                <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  {host?.nickname || 'Commander 1'}
                  {host?.uid === myUid && (
                    <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-1 rounded">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-400">HOST COMMAND</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400">CONNECTED</span>
            </div>
          </div>

          {/* Guest Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  guest ? 'bg-amber-400' : 'bg-slate-600'
                }`}
              />
              <div>
                <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  {guest ? guest.nickname : 'Awaiting Challenger...'}
                  {guest?.uid === myUid && (
                    <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-1 rounded">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-400">OPPOSING FORCE</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              {guest ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">CONNECTED</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                  <span className="text-slate-500">PENDING</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
