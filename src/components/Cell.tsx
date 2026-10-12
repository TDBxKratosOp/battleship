import React from 'react';
import { ShotResult } from '../game/fleet';

export interface CellProps {
  x: number;
  y: number;
  hasShip?: boolean;
  shipType?: string;
  isSunk?: boolean;
  shotResult?: ShotResult;
  isPreview?: boolean;
  isPreviewValid?: boolean;
  isInteractable?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (x: number, y: number) => void;
  onPointerEnter?: (x: number, y: number) => void;
}

export const Cell: React.FC<CellProps> = ({
  x,
  y,
  hasShip = false,
  isSunk = false,
  shotResult,
  isPreview = false,
  isPreviewValid = true,
  isInteractable = false,
  isSelected = false,
  size = 'md',
  onClick,
  onPointerEnter,
}) => {
  const colLetter = String.fromCharCode(65 + x);
  const rowNumber = y + 1;
  const coordLabel = `${colLetter}${rowNumber}`;

  // Sizing variants ensuring min 44px touch targets on primary interactive grids
  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 sm:w-11 sm:h-11 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] text-xs',
    lg: 'w-10 h-10 sm:w-12 sm:h-12 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] text-sm',
  };

  let content: React.ReactNode = null;
  let bgClass = 'bg-slate-900/60 border-slate-800/80';

  if (shotResult === 'hit') {
    bgClass = isSunk
      ? 'bg-rose-950 border-rose-600/80 shadow-[inset_0_0_12px_rgba(244,63,94,0.4)]'
      : 'bg-red-950/90 border-red-500/80 shadow-[inset_0_0_10px_rgba(239,68,68,0.4)]';
    content = (
      <span
        className="font-bold text-red-400 font-mono text-base sm:text-lg flex items-center justify-center animate-shake leading-none"
        aria-hidden="true"
      >
        ✕
      </span>
    );
  } else if (shotResult === 'miss') {
    bgClass = 'bg-slate-900/90 border-slate-700/60';
    content = (
      <div className="relative flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400/80 block" aria-hidden="true" />
        <span className="absolute w-6 h-6 rounded-full border border-cyan-400/40 animate-ripple pointer-events-none" />
      </div>
    );
  } else if (hasShip) {
    bgClass = 'bg-cyan-950/80 border-cyan-400/70 shadow-[inset_0_0_8px_rgba(0,240,255,0.25)]';
    content = (
      <div className="w-2 h-2 rounded-sm bg-cyan-400/60 shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
    );
  }

  // Placement Preview Styling
  if (isPreview) {
    if (isPreviewValid) {
      bgClass = 'bg-emerald-900/80 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    } else {
      bgClass = 'bg-rose-900/80 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
    }
  }

  // Crosshair selection on enemy grid
  if (isSelected && !shotResult) {
    bgClass = 'bg-cyan-900/70 border-cyan-300 ring-2 ring-cyan-400 shadow-[0_0_14px_rgba(0,240,255,0.6)] animate-pulse';
  }

  const ariaDescription = `Cell ${coordLabel}, ${
    shotResult ? `Shot ${shotResult}` : hasShip ? 'Allied vessel' : 'Water'
  }`;

  return (
    <button
      type="button"
      aria-label={ariaDescription}
      disabled={!isInteractable && !onClick}
      onClick={() => onClick?.(x, y)}
      onPointerEnter={() => onPointerEnter?.(x, y)}
      className={`relative flex items-center justify-center border transition-all duration-150 select-none rounded-[4px] ${
        sizeClasses[size]
      } ${bgClass} ${
        isInteractable && !shotResult
          ? 'cursor-crosshair hover:border-cyan-300 hover:bg-slate-800/80 hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] active:scale-95'
          : ''
      }`}
    >
      {content}
    </button>
  );
};
