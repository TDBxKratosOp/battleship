import { playSynthesizedSound, SoundEffectName } from './sounds';

class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private isMuted: boolean = false;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.4;
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;

  private isUnlocked: boolean = false;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private sonarTimer: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
    this.setupGestureListeners();
  }

  private setupGestureListeners() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
    window.addEventListener('touchstart', unlockHandler, { once: true });
  }

  public async unlock(): Promise<void> {
    if (this.isUnlocked && this.ctx?.state === 'running') return;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        // @ts-expect-error webkitAudioContext support for older iOS Safari
        window.webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(
        this.musicEnabled ? this.musicVolume : 0,
        this.ctx.currentTime
      );
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume error:', err);
      }
    }

    this.isUnlocked = true;

    if (this.musicEnabled && !this.isMuted) {
      this.startAmbientSoundtrack();
    }
  }

  public play(name: SoundEffectName) {
    if (!this.sfxEnabled || this.isMuted) return;

    if (!this.ctx || this.ctx.state !== 'running') {
      this.unlock().then(() => {
        if (this.ctx && this.sfxGain) {
          playSynthesizedSound(this.ctx, this.sfxGain, name);
        }
      });
      return;
    }

    if (this.sfxGain) {
      playSynthesizedSound(this.ctx, this.sfxGain, name);
    }
  }

  /**
   * Starts procedural ambient naval drone + sonar ping loop
   */
  private startAmbientSoundtrack() {
    if (!this.ctx || !this.musicGain) return;
    this.stopAmbientSoundtrack();

    const now = this.ctx.currentTime;

    // 1. Deep Submarine Hull Drone (55Hz and 110Hz sine waves with slow chorus)
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc2 = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.12, now);

    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.setValueAtTime(55, now);

    this.ambientOsc2.type = 'sine';
    this.ambientOsc2.frequency.setValueAtTime(55.4, now); // slight detune creates gentle pulsing

    this.ambientOsc1.connect(droneGain);
    this.ambientOsc2.connect(droneGain);
    droneGain.connect(this.musicGain);

    this.ambientOsc1.start(now);
    this.ambientOsc2.start(now);

    // 2. Periodic distant Sonar Ping every 8 seconds
    const scheduleSonarPing = () => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || this.isMuted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(940, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 2.6);
    };

    // First ping after 2 seconds, then recurring
    window.setTimeout(scheduleSonarPing, 2000);
    this.sonarTimer = window.setInterval(scheduleSonarPing, 8000);
  }

  private stopAmbientSoundtrack() {
    if (this.ambientOsc1) {
      try {
        this.ambientOsc1.stop();
        this.ambientOsc1.disconnect();
      } catch {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try {
        this.ambientOsc2.stop();
        this.ambientOsc2.disconnect();
      } catch {}
      this.ambientOsc2 = null;
    }
    if (this.sonarTimer !== null) {
      clearInterval(this.sonarTimer);
      this.sonarTimer = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    if (!muted && this.musicEnabled && this.isUnlocked) {
      this.startAmbientSoundtrack();
    } else if (muted) {
      this.stopAmbientSoundtrack();
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx && this.sfxEnabled) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx && this.musicEnabled) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        enabled ? this.sfxVolume : 0,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        enabled ? this.musicVolume : 0,
        this.ctx.currentTime,
        0.05
      );
    }
    if (enabled && !this.isMuted && this.isUnlocked) {
      this.startAmbientSoundtrack();
    } else {
      this.stopAmbientSoundtrack();
    }
  }

  public getStatus() {
    return {
      muted: this.isMuted,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
      sfxEnabled: this.sfxEnabled,
      musicEnabled: this.musicEnabled,
    };
  }
}

export const soundManager = new AudioManager();
