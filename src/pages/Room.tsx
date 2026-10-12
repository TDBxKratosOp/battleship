import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Coordinate,
  PlacedShip,
  PlayerData,
  RoomData,
  ShotRecord,
} from '../game/fleet';
import { resolveIncomingShot, getShotsPerTurn } from '../game/rules';
import { verifyOpponentFairPlay, AntiCheatVerificationResult } from '../game/hashing';
import {
  subscribeToRoom,
  subscribeToPlayers,
  subscribeToShots,
  commitPlayerReady,
  submitShot,
  resolveShotByDefender,
  revealBoardAndSalt,
  claimDisconnectWin,
  claimCheatWin,
  requestRematch,
  saveLocalRoomSession,
  getLocalRoomSession,
} from '../firebase/roomService';
import {
  startPresenceHeartbeat,
  stopPresenceHeartbeat,
  isPlayerDisconnected,
  getSecondsUntilClaimable,
} from '../firebase/presence';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { soundManager } from '../audio/AudioManager';
import { Board } from '../components/Board';
import { TurnBanner } from '../components/TurnBanner';
import { ShotLog } from '../components/ShotLog';
import { ShipPlacer } from '../components/ShipPlacer';
import { Lobby } from '../components/Lobby';
import { GameOver } from '../components/GameOver';
import { ShieldAlert, AlertTriangle, Radio } from 'lucide-react';

interface RoomProps {
  roomCode: string;
  onLeaveRoom: () => void;
}

export const Room: React.FC<RoomProps> = ({ roomCode, onLeaveRoom }) => {
  const {
    uid,
    nickname,
    myShips,
    setMyShips,
    mySalt,
    myBoardHash,
    setMyBoardHash,
    addToast,
    resetLocalBoard,
  } = useGameStore();

  const { triggerHaptic } = useSettingsStore();

  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [shots, setShots] = useState<ShotRecord[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Coordinate | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [auditResult, setAuditResult] = useState<AntiCheatVerificationResult | null>(null);
  const [opponentTimeoutSeconds, setOpponentTimeoutSeconds] = useState<number>(30);

  // Check and restore local session if recovering from refresh
  useEffect(() => {
    const session = getLocalRoomSession(roomCode);
    if (session && session.ships && session.ships.length > 0) {
      if (myShips.length === 0) {
        setMyShips(session.ships);
        if (session.hash) setMyBoardHash(session.hash);
      }
    }
  }, [roomCode]);

  // Real-time Firestore Subscriptions & Presence Heartbeat
  useEffect(() => {
    startPresenceHeartbeat(roomCode, uid);

    const unsubRoom = subscribeToRoom(roomCode, (data) => {
      setRoom(data);
    });

    const unsubPlayers = subscribeToPlayers(roomCode, (data) => {
      setPlayers(data);
    });

    const unsubShots = subscribeToShots(roomCode, (data) => {
      setShots(data);
    });

    return () => {
      stopPresenceHeartbeat();
      unsubRoom();
      unsubPlayers();
      unsubShots();
    };
  }, [roomCode, uid]);

  // Identify opponent player
  const opponent = useMemo(() => {
    return Object.values(players).find((p) => p.uid !== uid);
  }, [players, uid]);

  // Check presence and disconnect status every second
  useEffect(() => {
    if (!opponent?.lastSeen) return;

    const interval = setInterval(() => {
      const remaining = getSecondsUntilClaimable(opponent.lastSeen);
      setOpponentTimeoutSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [opponent?.lastSeen]);

  // Turn computations
  const isMyTurn = room?.turnUid === uid;
  const shotsThisTurn = useMemo(() => {
    if (!room || !isMyTurn) return 0;
    return shots.filter((s) => s.by === uid && s.turnNumber === room.turnNumber).length;
  }, [shots, uid, isMyTurn, room]);

  const maxShotsThisTurn = room ? getShotsPerTurn(room.mode) : 1;
  const shotsRemainingThisTurn = Math.max(0, maxShotsThisTurn - shotsThisTurn);

  // Turn timer countdown
  useEffect(() => {
    if (room?.status !== 'playing' || !isMyTurn) {
      setTurnTimeLeft(30);
      return;
    }

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [room?.status, isMyTurn, room?.turnNumber]);

  // Play "Your turn" alert when it becomes my turn
  useEffect(() => {
    if (isMyTurn && room?.status === 'playing') {
      soundManager.play('turn_ping');
    }
  }, [isMyTurn, room?.status, room?.turnNumber]);

  // Map of shots already fired at enemy
  const shotsAtEnemy = useMemo(() => {
    return shots.filter((s) => s.by === uid);
  }, [shots, uid]);

  const takenEnemyCoords = useMemo(() => {
    const set = new Set<string>();
    shotsAtEnemy.forEach((s) => set.add(`${s.x},${s.y}`));
    return set;
  }, [shotsAtEnemy]);

  // Map of shots fired at me
  const shotsAtMe = useMemo(() => {
    return shots.filter((s) => s.by !== uid);
  }, [shots, uid]);

  // DEFENDING CLIENT: Resolve incoming pending shots against private board
  useEffect(() => {
    if (room?.status !== 'playing' || myShips.length === 0) return;

    const pendingShotsAtMe = shots.filter(
      (s) => s.by !== uid && (s.result as string) === 'pending'
    );

    if (pendingShotsAtMe.length === 0) return;

    // Resolve the first pending shot
    const incoming = pendingShotsAtMe[0];
    const resolution = resolveIncomingShot({ x: incoming.x, y: incoming.y }, myShips);

    // Update local damage on my fleet
    setMyShips(resolution.updatedShips);
    saveLocalRoomSession(roomCode, uid, resolution.updatedShips, mySalt, myBoardHash || undefined);

    if (resolution.result === 'hit') {
      soundManager.play('hit');
      triggerHaptic([60, 40, 80]);
      addToast(`Hostile strike hit your ${resolution.hitShipName}!`, 'error');
    } else if (resolution.result === 'sunk') {
      soundManager.play('sunk');
      triggerHaptic([80, 50, 120]);
      addToast(`Hostile fire sunk your ${resolution.sunkShipName}!`, 'error');
    } else {
      soundManager.play('miss');
    }

    // Determine next turn
    const isGameOver = resolution.allSunk;
    const winnerUid = isGameOver ? incoming.by : undefined;
    const nextTurnUid = incoming.by; // Switch to shooter after resolution or keep in salvo

    resolveShotByDefender(
      roomCode,
      incoming.id,
      resolution.result,
      resolution.sunkShip,
      nextTurnUid,
      isGameOver,
      winnerUid
    ).catch(console.error);
  }, [shots, room?.status, myShips, uid, roomCode, mySalt, myBoardHash]);

  // Reveal Board on Game Over & Anti-Cheat Audit
  useEffect(() => {
    if (room?.status !== 'finished') return;

    // 1. Reveal my board and salt
    const myPlayer = players[uid];
    if (myPlayer && !myPlayer.revealedBoard && myShips.length > 0) {
      revealBoardAndSalt(roomCode, uid, myShips, mySalt).catch(console.error);
    }

    // 2. Audit opponent when opponent reveals their board
    if (opponent && opponent.revealedBoard && opponent.salt && opponent.boardHash && !auditResult) {
      verifyOpponentFairPlay(
        opponent.revealedBoard,
        opponent.salt,
        opponent.boardHash,
        shotsAtEnemy
      ).then((audit) => {
        setAuditResult(audit);
        if (audit.cheated) {
          addToast('Anti-cheat triggered: Opponent committed foul play!', 'error');
          claimCheatWin(roomCode, uid, opponent.uid).catch(console.error);
        }
      });
    }
  }, [room?.status, players, opponent, myShips, mySalt, shotsAtEnemy, auditResult, roomCode, uid]);

  // Handle firing a shot
  const handleFireAtEnemy = useCallback(
    async (x: number, y: number) => {
      if (!isMyTurn || isFiring || room?.status !== 'playing') return;

      const key = `${x},${y}`;
      if (takenEnemyCoords.has(key)) {
        addToast('Coordinates already targeted, Commander.', 'warning', 1500);
        return;
      }

      try {
        setIsFiring(true);
        soundManager.play('fire');
        triggerHaptic(50);
        setSelectedTarget(null);

        await submitShot(roomCode, uid, x, y, room.turnNumber);
      } catch (err) {
        console.error(err);
        addToast('Weapons malfunction. Try again.', 'error');
      } finally {
        setIsFiring(false);
      }
    },
    [isMyTurn, isFiring, room?.status, takenEnemyCoords, roomCode, uid, room?.turnNumber]
  );

  // Auto-fire random cell on timeout
  const handleTurnTimeout = useCallback(() => {
    if (!isMyTurn || isFiring) return;

    const available: Coordinate[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (!takenEnemyCoords.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      addToast(`Timeout! Auto-targeting ${String.fromCharCode(65 + pick.x)}${pick.y + 1}`, 'warning');
      handleFireAtEnemy(pick.x, pick.y);
    }
  }, [isMyTurn, isFiring, takenEnemyCoords, handleFireAtEnemy]);

  // Handle ship placement ready commit
  const handleCommitFleet = async (
    placedShips: PlacedShip[],
    salt: string,
    hash: string
  ) => {
    saveLocalRoomSession(roomCode, uid, placedShips, salt, hash);
    setMyShips(placedShips);
    setMyBoardHash(hash);
    await commitPlayerReady(roomCode, uid, hash);
  };

  // Handle rematch
  const handleRematch = async () => {
    resetLocalBoard();
    setAuditResult(null);
    await requestRematch(roomCode);
    addToast('Sector reset. Reposition fleet!', 'info');
  };

  // Loading state
  if (!room) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4">
        <div className="glass-panel-glow rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
          <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
          <div className="font-tactical font-bold text-lg text-cyan-200">
            CONNECTING TO TACTICAL SECTOR [{roomCode}]
          </div>
          <p className="text-xs font-mono text-slate-400">
            Establishing encrypted peer session...
          </p>
        </div>
      </div>
    );
  }

  // Opponent Disconnect Alert Banner
  const isOpponentOffline = isPlayerDisconnected(opponent?.lastSeen);

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center p-2 sm:p-4 safe-bottom">
      {/* Disconnect Warning Banner */}
      {isOpponentOffline && room.status === 'playing' && (
        <div className="w-full max-w-xl mb-3 p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/60 shadow-lg flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Opponent Presence Lost.</span>{' '}
              {opponentTimeoutSeconds > 0
                ? `Victory claimable in ${opponentTimeoutSeconds}s...`
                : 'Opponent timed out!'}
            </div>
          </div>
          {opponentTimeoutSeconds <= 0 && (
            <button
              onClick={() => claimDisconnectWin(roomCode, uid)}
              className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tactical font-bold text-xs tracking-wider transition active:scale-95 shrink-0"
            >
              CLAIM VICTORY
            </button>
          )}
        </div>
      )}

      {/* PHASE 1: Waiting Lobby */}
      {room.status === 'waiting' && (
        <Lobby room={room} players={players} myUid={uid} />
      )}

      {/* PHASE 2: Fleet Placement */}
      {room.status === 'placement' && (
        <>
          {players[uid]?.ready ? (
            <div className="w-full max-w-md my-auto glass-panel-glow rounded-3xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-300">
                <Radio className="w-8 h-8 animate-pulse text-cyan-400" />
              </div>
              <h3 className="font-tactical font-bold text-lg text-cyan-200">
                FLEET DEPLOYED & COMMITTED
              </h3>
              <p className="text-xs font-mono text-slate-400">
                SHA-256 seal broadcast to room. Awaiting opponent formation lock...
              </p>
            </div>
          ) : (
            <ShipPlacer roomCode={roomCode} onReadyCommitted={handleCommitFleet} />
          )}
        </>
      )}

      {/* PHASE 3: Active Battle */}
      {room.status === 'playing' && (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-3">
          {/* Turn Banner with 30s Auto-fire Timer */}
          <TurnBanner
            isMyTurn={isMyTurn}
            mode={room.mode}
            shotsRemainingThisTurn={shotsRemainingThisTurn}
            timeRemaining={turnTimeLeft}
            onTimeExpired={handleTurnTimeout}
          />

          {/* Grids Layout: Mobile Small Fleet on Top, Targeting Below; Desktop Side-by-Side */}
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 my-2">
            {/* Friendly Ocean Grid (My Fleet) */}
            <div className="order-2 lg:order-1 flex flex-col items-center">
              <Board
                title="ALLIED SQUADRON (YOUR DEFENSE)"
                subtitle="Local secret fleet formation"
                ships={myShips}
                shots={shotsAtMe}
                interactive={false}
                cellSize="sm"
              />
            </div>

            {/* Hostile Radar Grid (Targeting / Firing Area) */}
            <div className="order-1 lg:order-2 flex flex-col items-center">
              <Board
                title="HOSTILE SECTOR (RADAR TARGETING)"
                subtitle={
                  isMyTurn
                    ? 'Select cell coordinates and fire'
                    : 'Targeting locked during enemy turn'
                }
                shots={shotsAtEnemy}
                selectedCoord={selectedTarget}
                interactive={isMyTurn && !isFiring}
                cellSize="md"
                onCellClick={(x, y) => {
                  if (!isMyTurn || isFiring) return;
                  handleFireAtEnemy(x, y);
                }}
              />
            </div>
          </div>

          {/* Combat Telemetry Log */}
          <div className="w-full max-w-2xl mt-2">
            <ShotLog
              shots={shots}
              myUid={uid}
              opponentNickname={opponent?.nickname || 'Opponent'}
              myNickname={nickname}
            />
          </div>
        </div>
      )}

      {/* PHASE 4: Match Conclusion & Game Over */}
      {room.status === 'finished' && (
        <GameOver
          room={room}
          myUid={uid}
          myShips={myShips}
          shots={shots}
          auditResult={auditResult}
          onRematch={handleRematch}
          onHome={onLeaveRoom}
        />
      )}
    </div>
  );
};
