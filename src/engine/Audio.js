import { storage } from '../systems/Storage.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.isBgmPlaying = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.compressor = null;
    this.filterNode = null;
    this.coinStreak = 0;
    this.lastCoinTime = 0;
    this.currentBgmTheme = 'CITY';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        // Professional Dynamics Compressor to prevent clipping & overloading
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(25, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

        // Low-pass filter for transformation environments
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();

        this.sfxGain.connect(this.filterNode);
        this.bgmGain.connect(this.filterNode);
        this.filterNode.connect(this.masterGain);
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);

        this.setSoundEnabled(storage.isSoundEnabled());
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSoundEnabled(enabled) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
  }

  setUnderwaterFilter(enabled) {
    if (!this.ctx || !this.filterNode) return;
    const targetFreq = enabled ? 750 : 20000;
    this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
  }

  getPitchJitter(spread = 0.06) {
    return 1.0 + (Math.random() - 0.5) * spread * 2;
  }

  playJump() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const pitch = this.getPitchJitter(0.08);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(480 * pitch, now + 0.18);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playCoin() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const now = this.ctx.currentTime;
    if (now - this.lastCoinTime > 0.9) {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;
    this.coinStreak = (this.coinStreak + 1) % 8;

    // Major scale progression C5 to C6
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    const baseFreq = scale[this.coinStreak] * this.getPitchJitter(0.03);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  playEatCivilian() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitch = this.getPitchJitter(0.07);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240 * pitch, now);
    osc.frequency.linearRampToValueAtTime(80 * pitch, now + 0.14);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playCivilianScream() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitch = this.getPitchJitter(0.12);

    // Funny cartoon high-pitched panic screech
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(1040 * pitch, now + 0.08);
    osc.frequency.linearRampToValueAtTime(860 * pitch, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(360 * pitch, now + 0.25);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playPushMetal() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    this.playNoiseBurst(0.18, 0.28);
  }

  playHordeRoar() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playVehicleFlip() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const now = this.ctx.currentTime;
    // Heavy sub-bass boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
    this.playNoiseBurst(0.35, 0.4);
  }

  playExplosion() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1. Heavy Sub-bass Impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.55);

    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.55);

    // 2. Mid Punch Distortion
    const midOsc = this.ctx.createOscillator();
    const midGain = this.ctx.createGain();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(220, now);
    midOsc.frequency.exponentialRampToValueAtTime(36, now + 0.35);

    midGain.gain.setValueAtTime(0.4, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    midOsc.connect(midGain);
    midGain.connect(this.sfxGain);
    midOsc.start(now);
    midOsc.stop(now + 0.35);

    // 3. Heavy Low-pass Filtered Blast Wave Rumble
    this.playExplosionNoise(0.55, 0.45);
  }

  playExplosionNoise(duration, volume) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5 * Math.exp(-2.5 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  playLaser() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playSlash() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playPuddleSplash() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    this.playNoiseBurst(0.08, 0.15);
  }

  playTrampoline() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playFever() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50];

    chords.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });
  }

  playWarningAlarm() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playNoiseBurst(duration, volume) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  playBite() {
    this.playEatCivilian();
  }

  playTransform() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.45);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playWarningTick() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playScoreRoll() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 + Math.random() * 220, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playGameOver() {
    if (!this.ctx || !storage.isSoundEnabled()) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.6);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  setBgmTheme(theme) {
    let mappedTheme = 'CITY';
    if (theme === 'BEACH' || theme === 'SUNSET') {
      mappedTheme = 'BEACH';
    } else if (theme === 'DESERT' || theme === 'FOREST' || theme === 'SCI_FI') {
      mappedTheme = 'DESERT';
    } else {
      mappedTheme = 'CITY';
    }

    if (this.currentBgmTheme === mappedTheme) return;
    this.currentBgmTheme = mappedTheme;
  }

  getThemeTrack(theme) {
    if (theme === 'BEACH') {
      // Tropical Beach / Sunset Calypso Bounce
      return {
        tempo: 220,
        notes: [
          [261.63, 329.63], // C4 + E4
          [392.00, 523.25], // G4 + C5
          [293.66, 369.99], // D4 + F#4
          [440.00, 587.33], // A4 + D5
          [329.63, 392.00], // E4 + G4
          [523.25, 659.25], // C5 + E5
          [293.66, 440.00], // D4 + A4
          [261.63, 392.00]  // C4 + G4
        ],
        waveform: 'triangle',
        volume: 0.055,
        decay: 0.20
      };
    } else if (theme === 'DESERT') {
      // Mysterious Desert / Sci-Fi / Forest Ambient Drive
      return {
        tempo: 250,
        notes: [
          [110.00, 164.81], // A2 + E3
          [130.81, 196.00], // C3 + G3
          [146.83, 220.00], // D3 + A3
          [164.81, 246.94], // E3 + B3
          [146.83, 220.00], // D3 + A3
          [123.47, 185.00], // B2 + F#3
          [110.00, 220.00], // A2 + A3
          [98.00,  146.83]  // G2 + D3
        ],
        waveform: 'sawtooth',
        volume: 0.038,
        decay: 0.23
      };
    }

    // Default: Cyber City Upbeat Synthwave
    return {
      tempo: 200,
      notes: [
        [130.81, 261.63], // C3 + C4
        [196.00],         // G3
        [146.83, 293.66], // D3 + D4
        [220.00],         // A3
        [164.81, 329.63], // E3 + E4
        [246.94],         // B3
        [174.61, 349.23], // F3 + F4
        [261.63]          // C4
      ],
      waveform: 'square',
      volume: 0.032,
      decay: 0.18
    };
  }

  startBGM() {
    if (this.isBgmPlaying) return;
    this.init();
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    const playStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !storage.isSoundEnabled()) return;

      const track = this.getThemeTrack(this.currentBgmTheme);
      const notes = track.notes[this.bgmStep % track.notes.length];
      this.bgmStep++;
      const now = this.ctx.currentTime;

      notes.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = track.waveform;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(track.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.002, now + track.decay);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + track.decay);
      });

      // Rhythmic Percussion Pulse
      if (this.bgmStep % 2 === 0) {
        this.playNoiseBurst(0.03, 0.04);
      }

      if (this.isBgmPlaying) {
        this.bgmTimer = setTimeout(playStep, track.tempo);
      }
    };

    playStep();
  }

  startBgm() {
    this.startBGM();
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  stopBgm() {
    this.stopBGM();
  }
}

export const audio = new AudioManager();
