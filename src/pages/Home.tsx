import React, { useState } from 'react';
import { GameMode } from '../game/fleet';
import { createRoom, joinRoom } from '../firebase/roomService';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../audio/AudioManager';
import {
  Anchor,
  Shield,
  Zap,
  ArrowRight,
  Crosshair,
  Radio,
  Users,
} from 'lucide-react';

interface HomeProps {
  onEnterRoom: (roomCode: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onEnterRoom }) => {
  const { uid, nickname, setNickname, addToast } = useGameStore();

  const [callsign, setCallsign] = useState(nickname || 'Commander');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    soundManager.play('click');
    setNickname(callsign);

    try {
      setIsSubmitting(true);
      const code = await createRoom(uid, callsign, selectedMode);
      addToast(`Tactical sector established: ${code}`, 'success');
      onEnterRoom(code);
    } catch (err: unknown) {
      console.error(err);
      addToast('Failed to create room. Check connection.', 'error');
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      addToast('Enter a valid 6-character room code.', 'warning');
      return;
    }

    soundManager.play('click');
    setNickname(callsign);

    try {
      setIsSubmitting(true);
      const res = await joinRoom(cleanCode, uid, callsign);
      if (res.success) {
        addToast(`Infiltrating sector ${cleanCode}...`, 'success');
        onEnterRoom(cleanCode);
      } else {
        addToast(res.error || 'Failed to join sector.', 'error');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      console.error(err);
      addToast('Error connecting to sector.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 overflow-hidden bg-tactical-grid">
      {/* Decorative Radar Sweep Centerpiece in Background */}
      <div className="absolute w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full border border-cyan-500/10 pointer-events-none flex items-center justify-center">
        <div className="absolute w-3/4 h-3/4 rounded-full border border-cyan-500/10" />
        <div className="absolute w-1/2 h-1/2 rounded-full border border-cyan-500/15" />
        <div className="absolute w-1/4 h-1/4 rounded-full border border-cyan-500/20" />
        {/* Radar crosshairs */}
        <div className="absolute w-full h-[1px] bg-cyan-500/15" />
        <div className="absolute h-full w-[1px] bg-cyan-500/15" />
        {/* Sweeping Beam */}
        <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none">
          <div className="w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br from-cyan-400/20 via-transparent to-transparent rounded-tl-full" />
        </div>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-md glass-panel-glow rounded-3xl p-6 sm:p-8 shadow-2xl border border-cyan-500/30">
        {/* Title */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono tracking-widest uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            OPERATIONS HQ
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-tactical tracking-wider text-slate-100 flex items-center justify-center gap-2.5">
            BATTLESHIP
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Real-time peer-to-peer naval warfare with cryptographic anti-cheat
          </p>
        </div>

        {/* Commander Callsign Input */}
        <div className="mb-6 space-y-1.5">
          <label
            htmlFor="callsign-input"
            className="block text-xs font-tactical font-bold text-slate-300 tracking-wider"
          >
            COMMANDER CALLSIGN
          </label>
          <div className="relative">
            <input
              id="callsign-input"
              type="text"
              maxLength={16}
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              placeholder="e.g. Admiral Nimitz"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm font-medium text-slate-100 placeholder:text-slate-600 transition"
            />
            <Anchor className="w-4 h-4 text-cyan-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Tab Switcher: Create vs Join */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/60 border border-cyan-500/20 mb-6">
          <button
            type="button"
            onClick={() => {
              soundManager.play('click');
              setActiveTab('create');
            }}
            className={`py-2 text-xs font-tactical font-bold tracking-wider rounded-lg transition ${
              activeTab === 'create'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CREATE SECTOR
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.play('click');
              setActiveTab('join');
            }}
            className={`py-2 text-xs font-tactical font-bold tracking-wider rounded-lg transition ${
              activeTab === 'join'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INFILTRATE CODE
          </button>
        </div>

        {/* Tab 1: Create Sector */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-tactical font-bold text-slate-300 tracking-wider">
                ENGAGEMENT PROTOCOL
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play('click');
                    setSelectedMode('classic');
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedMode === 'classic'
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-tactical font-bold text-cyan-300">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    CLASSIC
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    1 Shot / Turn
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.play('click');
                    setSelectedMode('salvo');
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedMode === 'salvo'
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-tactical font-bold text-amber-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    SALVO
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    3 Shots / Turn
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-tactical font-bold text-sm tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>INITIALIZING SECTOR...</span>
              ) : (
                <>
                  <span>CREATE MATCH</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Tab 2: Join Sector */
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="sector-code"
                className="block text-xs font-tactical font-bold text-slate-300 tracking-wider"
              >
                6-CHARACTER SECTOR CODE
              </label>
              <input
                id="sector-code"
                type="text"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. 7X8K2M"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-base font-mono font-bold tracking-widest text-center text-cyan-300 placeholder:text-slate-600 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || roomCodeInput.length !== 6}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-tactical font-bold text-sm tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>JOINING SECTOR...</span>
              ) : (
                <>
                  <span>JOIN MATCH</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Feature Badges */}
        <div className="mt-6 pt-5 border-t border-cyan-500/20 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Commit-Reveal Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Multiplayer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
