import React from 'react';
import { BOARD_SIZE, Coordinate, PlacedShip, ShotRecord } from '../game/fleet';
import { Cell } from './Cell';
import { findShipAt } from '../game/placement';

export interface BoardProps {
  title?: string;
  subtitle?: string;
  ships?: PlacedShip[];
  shots?: ShotRecord[];
  previewCoords?: Coordinate[];
  isPreviewValid?: boolean;
  selectedCoord?: Coordinate | null;
  interactive?: boolean;
  cellSize?: 'sm' | 'md' | 'lg';
  onCellClick?: (x: number, y: number) => void;
  onCellHover?: (x: number, y: number) => void;
}

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const Board: React.FC<BoardProps> = ({
  title,
  subtitle,
  ships = [],
  shots = [],
  previewCoords = [],
  isPreviewValid = true,
  selectedCoord,
  interactive = false,
  cellSize = 'md',
  onCellClick,
  onCellHover,
}) => {
  // Map shots by "x,y" coordinate for O(1) lookup
  const shotsMap = React.useMemo(() => {
    const map = new Map<string, ShotRecord>();
    for (const shot of shots) {
      map.set(`${shot.x},${shot.y}`, shot);
    }
    return map;
  }, [shots]);

  // Set of preview cell keys
  const previewSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of previewCoords) {
      set.add(`${c.x},${c.y}`);
    }
    return set;
  }, [previewCoords]);

  return (
    <div className="flex flex-col items-center select-none">
      {/* Optional Board Title */}
      {title && (
        <div className="w-full flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h3 className="font-tactical font-bold text-sm tracking-widest text-cyan-200 uppercase">
              {title}
            </h3>
          </div>
          {subtitle && (
            <span className="text-[11px] font-mono text-slate-400">{subtitle}</span>
          )}
        </div>
      )}

      {/* Grid wrapper */}
      <div className="p-2 sm:p-3 rounded-2xl glass-panel relative overflow-hidden">
        {/* Subtle decorative grid corners */}
        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-400/50" />
        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-400/50" />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-400/50" />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-400/50" />

        {/* Column Headers (A-J) */}
        <div className="flex items-center">
          {/* Spacer for row header column */}
          <div className={`${cellSize === 'sm' ? 'w-5' : 'w-6 sm:w-8'} text-center`} />
          <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
            {COL_LETTERS.map((letter) => (
              <div
                key={letter}
                className={`${
                  cellSize === 'sm' ? 'w-7' : 'w-9 sm:w-11'
                } text-center font-mono text-[10px] sm:text-xs font-semibold text-cyan-400/80`}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Board Rows (1-10) */}
        <div className="flex flex-col gap-1 sm:gap-1.5 mt-1">
          {Array.from({ length: BOARD_SIZE }).map((_, y) => (
            <div key={y} className="flex items-center">
              {/* Row Header Label */}
              <div
                className={`${
                  cellSize === 'sm' ? 'w-5 text-[10px]' : 'w-6 sm:w-8 text-xs'
                } font-mono font-semibold text-cyan-400/80 text-center shrink-0`}
              >
                {y + 1}
              </div>

              {/* 10 Cells in Row */}
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                {Array.from({ length: BOARD_SIZE }).map((_, x) => {
                  const key = `${x},${y}`;
                  const shot = shotsMap.get(key);
                  const shipMatch = findShipAt(ships, x, y);
                  const isPreview = previewSet.has(key);
                  const isSelected = selectedCoord?.x === x && selectedCoord?.y === y;

                  return (
                    <Cell
                      key={key}
                      x={x}
                      y={y}
                      hasShip={Boolean(shipMatch)}
                      shipType={shipMatch?.ship.type}
                      isSunk={shipMatch?.ship.sunk}
                      shotResult={shot?.result}
                      isPreview={isPreview}
                      isPreviewValid={isPreviewValid}
                      isSelected={isSelected}
                      isInteractable={interactive}
                      size={cellSize}
                      onClick={onCellClick}
                      onPointerEnter={onCellHover}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
