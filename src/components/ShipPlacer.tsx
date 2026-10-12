import React, { useState, useEffect } from 'react';
import {
  FLEET_CONFIG,
  Orientation,
  PlacedShip,
  ShipConfig,
  ShipType,
} from '../game/fleet';
import {
  getShipCoordinates,
  isValidShipPlacement,
  validateFleet,
  findShipAt,
} from '../game/placement';
import { generateRandomFleet } from '../game/randomizer';
import { computeBoardHash } from '../game/hashing';
import { Board } from './Board';
import { soundManager } from '../audio/AudioManager';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  RotateCcw,
  Shuffle,
  Trash2,
  CheckCircle,
  Timer,
  Ship,
  Check,
} from 'lucide-react';

interface ShipPlacerProps {
  roomCode: string;
  onReadyCommitted: (ships: PlacedShip[], salt: string, hash: string) => Promise<void>;
}

export const ShipPlacer: React.FC<ShipPlacerProps> = ({
  roomCode,
  onReadyCommitted,
}) => {
  const {
    myShips,
    setMyShips,
    mySalt,
    addToast,
  } = useGameStore();

  const { triggerHaptic } = useSettingsStore();

  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [selectedShipType, setSelectedShipType] = useState<ShipType | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // 60-second placement timer
  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto-randomize and ready on timeout if not ready
      if (myShips.length < FLEET_CONFIG.length) {
        const autoFleet = generateRandomFleet();
        setMyShips(autoFleet);
        handleCommitReady(autoFleet);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 10 && prev > 1) {
          soundManager.play('tick');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, myShips]);

  // Determine unplaced ships
  const placedShipTypes = new Set(myShips.map((s) => s.type));
  const unplacedShips = FLEET_CONFIG.filter((s) => !placedShipTypes.has(s.type));

  // Automatically select the first unplaced ship if none selected
  useEffect(() => {
    if (!selectedShipType && unplacedShips.length > 0) {
      setSelectedShipType(unplacedShips[0].type);
    }
  }, [selectedShipType, unplacedShips]);

  const activeShipConfig: ShipConfig | undefined = FLEET_CONFIG.find(
    (s) => s.type === selectedShipType
  );

  // Calculate preview coordinates when hovering over grid
  const previewCoords = React.useMemo(() => {
    if (!hoverCoord || !activeShipConfig) return [];
    return getShipCoordinates(
      hoverCoord.x,
      hoverCoord.y,
      activeShipConfig.size,
      orientation
    );
  }, [hoverCoord, activeShipConfig, orientation]);

  const isPreviewValid = React.useMemo(() => {
    if (!hoverCoord || !activeShipConfig) return false;
    return isValidShipPlacement(
      {
        x: hoverCoord.x,
        y: hoverCoord.y,
        size: activeShipConfig.size,
        orientation,
      },
      myShips
    );
  }, [hoverCoord, activeShipConfig, orientation, myShips]);

  // Handle cell click on the board
  const handleCellClick = (x: number, y: number) => {
    const existingAtCell = findShipAt(myShips, x, y);

    // If tapping an already placed ship: pick it up or rotate it
    if (existingAtCell) {
      const clickedShip = existingAtCell.ship;
      // Try rotating existing ship in place
      const newOrientation: Orientation =
        clickedShip.orientation === 'horizontal' ? 'vertical' : 'horizontal';
      const canRotate = isValidShipPlacement(
        {
          id: clickedShip.id,
          x: clickedShip.x,
          y: clickedShip.y,
          size: clickedShip.size,
          orientation: newOrientation,
        },
        myShips
      );

      if (canRotate) {
        soundManager.play('rotate');
        triggerHaptic(30);
        setMyShips(
          myShips.map((s) =>
            s.id === clickedShip.id ? { ...s, orientation: newOrientation } : s
          )
        );
      } else {
        // If cannot rotate, remove it back to tray for repositioning
        soundManager.play('place');
        setMyShips(myShips.filter((s) => s.id !== clickedShip.id));
        setSelectedShipType(clickedShip.type);
        setOrientation(clickedShip.orientation);
      }
      return;
    }

    // Otherwise placing selected ship from tray
    if (!activeShipConfig || !isPreviewValid) {
      soundManager.play('click');
      return;
    }

    const newShip: PlacedShip = {
      id: `${activeShipConfig.type}-${Date.now()}`,
      type: activeShipConfig.type,
      name: activeShipConfig.name,
      size: activeShipConfig.size,
      x,
      y,
      orientation,
      hitIndices: [],
      sunk: false,
    };

    soundManager.play('place');
    triggerHaptic(40);

    const updated = [...myShips, newShip];
    setMyShips(updated);

    // Select next unplaced ship
    const remaining = FLEET_CONFIG.filter(
      (s) => !updated.some((p) => p.type === s.type)
    );
    if (remaining.length > 0) {
      setSelectedShipType(remaining[0].type);
    } else {
      setSelectedShipType(null);
    }
  };

  const handleRotateToggle = () => {
    soundManager.play('rotate');
    setOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  };

  const handleRandomize = () => {
    soundManager.play('place');
    triggerHaptic([30, 40]);
    const fleet = generateRandomFleet();
    setMyShips(fleet);
    setSelectedShipType(null);
    addToast('Fleet deployed randomly!', 'info', 2000);
  };

  const handleClear = () => {
    soundManager.play('click');
    setMyShips([]);
    setSelectedShipType(FLEET_CONFIG[0].type);
  };

  const isFleetComplete = validateFleet(myShips).valid;

  const handleCommitReady = async (fleetToCommit = myShips) => {
    if (!validateFleet(fleetToCommit).valid || isCommitting) return;

    try {
      setIsCommitting(true);
      soundManager.play('ready');
      triggerHaptic([50, 50, 100]);

      // Compute SHA-256 cryptographic commitment hash
      const hash = await computeBoardHash(fleetToCommit, mySalt);
      await onReadyCommitted(fleetToCommit, mySalt, hash);
      addToast('Commitment sealed & transmitted! Awaiting opponent...', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error committing fleet.', 'error');
      setIsCommitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-5 p-2 sm:p-4">
      {/* Top Status & 60s Placement Timer */}
      <div className="w-full flex items-center justify-between glass-panel rounded-2xl px-4 py-3 border border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <Ship className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-tactical font-bold text-sm sm:text-base text-cyan-200">
              TACTICAL FLEET DEPLOYMENT
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              SECTOR: {roomCode} // Tap grid to position vessels
            </p>
          </div>
        </div>

        {/* 60s Countdown Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold border ${
            timeLeft <= 10
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
              : 'bg-slate-900 border-cyan-500/40 text-cyan-300'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Main Work Area: Interactive Board + Ship Tray */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-6">
        {/* Placement Board */}
        <div className="shrink-0">
          <Board
            title="TACTICAL FORMATION GRID"
            subtitle={`${myShips.length}/${FLEET_CONFIG.length} Ships Placed`}
            ships={myShips}
            previewCoords={previewCoords}
            isPreviewValid={isPreviewValid}
            interactive={true}
            cellSize="md"
            onCellClick={handleCellClick}
            onCellHover={(x, y) => setHoverCoord({ x, y })}
          />
        </div>

        {/* Control Controls & Fleet Selector */}
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Action Toolbars */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleRotateToggle}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 text-xs font-tactical font-semibold tracking-wider transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>{orientation === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'}</span>
            </button>

            <button
              onClick={handleRandomize}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 text-xs font-tactical font-semibold tracking-wider transition active:scale-95"
            >
              <Shuffle className="w-4 h-4 text-cyan-400" />
              <span>RANDOMIZE</span>
            </button>

            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900/80 border border-rose-500/40 hover:border-rose-400 text-rose-300 text-xs font-tactical font-semibold tracking-wider transition active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>CLEAR</span>
            </button>
          </div>

          {/* Ships Tray */}
          <div className="glass-panel rounded-2xl p-4 space-y-2 border border-cyan-500/20">
            <div className="text-xs font-tactical font-bold text-slate-300 tracking-wider mb-2">
              VESSEL SELECTOR
            </div>
            <div className="space-y-2">
              {FLEET_CONFIG.map((config) => {
                const isPlaced = placedShipTypes.has(config.type);
                const isSelected = selectedShipType === config.type;

                return (
                  <button
                    key={config.type}
                    onClick={() => {
                      soundManager.play('click');
                      setSelectedShipType(config.type);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition text-left ${
                      isSelected
                        ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                        : isPlaced
                        ? 'bg-slate-950/50 border-slate-800 opacity-60'
                        : 'bg-slate-900/60 border-slate-700/60 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isPlaced ? 'bg-emerald-400' : isSelected ? 'bg-cyan-400' : 'bg-slate-500'
                        }`}
                      />
                      <span className="font-tactical text-xs font-semibold text-slate-200">
                        {config.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Visual segment representation */}
                      <div className="flex gap-1">
                        {Array.from({ length: config.size }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3.5 h-3 rounded-[2px] ${
                              isPlaced
                                ? 'bg-emerald-500/50 border border-emerald-400/60'
                                : isSelected
                                ? 'bg-cyan-400/80 border border-cyan-300'
                                : 'bg-slate-700 border border-slate-600'
                            }`}
                          />
                        ))}
                      </div>

                      {isPlaced && (
                        <Check className="w-4 h-4 text-emerald-400 ml-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commit & Ready CTA */}
          <button
            onClick={() => handleCommitReady()}
            disabled={!isFleetComplete || isCommitting}
            className={`w-full py-3.5 px-4 rounded-2xl font-tactical font-bold text-sm tracking-widest flex items-center justify-center gap-2.5 transition shadow-lg ${
              isFleetComplete && !isCommitting
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-[0.98]'
                : 'bg-slate-800/80 text-slate-500 border border-slate-700/40 cursor-not-allowed'
            }`}
          >
            {isCommitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                SEALING COMMITMENT...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                LOCK FORMATION & READY
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
