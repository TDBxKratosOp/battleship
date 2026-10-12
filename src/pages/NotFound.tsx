import React from 'react';
import { Home, Compass } from 'lucide-react';
import { soundManager } from '../audio/AudioManager';

interface NotFoundProps {
  onGoHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 text-center">
      <div className="glass-panel-glow rounded-3xl p-8 max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-300">
          <Compass className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold font-tactical text-cyan-200">
          CHARTED SECTOR NOT FOUND
        </h2>
        <p className="text-xs font-mono text-slate-400">
          Coordinates 404: Vessel has strayed into uncharted waters. Return to Naval Operations Command.
        </p>
        <button
          onClick={() => {
            soundManager.play('click');
            onGoHome();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-tactical font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
        >
          <Home className="w-4 h-4" />
          <span>RETURN TO HQ</span>
        </button>
      </div>
    </div>
  );
};
