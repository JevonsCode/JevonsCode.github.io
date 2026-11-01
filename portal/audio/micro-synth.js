// Procedural WebAudio Swiss micro-synthesizer (zero external audio assets).

const SCALE_HZ = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
const STORAGE_KEY = 'ydys.sound.v1';

class MicroSynth {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
    this.lastHoverAt = 0;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(STORAGE_KEY, this.enabled ? 'on' : 'off');
    if (this.enabled) {
      this.ensureContext();
      this.playNote(659.25, 0.09, 'sine', 0.05);
      setTimeout(() => this.playNote(880, 0.14, 'triangle', 0.05), 55);
    }
    return this.enabled;
  }

  playNote(freq, duration = 0.12, type = 'sine', peak = 0.045, delaySec = 0) {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playHover(index = 0) {
    const now = performance.now();
    if (now - this.lastHoverAt < 42) return;
    this.lastHoverAt = now;
    const freq = SCALE_HZ[Math.abs(index) % SCALE_HZ.length];
    this.playNote(freq, 0.075, 'sine', 0.028);
    this.playNote(freq * 2, 0.035, 'triangle', 0.009);
  }

  playClick() {
    this.playNote(1240, 0.032, 'triangle', 0.035);
    this.playNote(620, 0.045, 'sine', 0.025, 0.012);
  }

  playBounce(speed = 8, combo = 0) {
    const note = SCALE_HZ[combo % SCALE_HZ.length] * (speed > 14 ? 1.5 : 1);
    const vol = Math.min(0.07, 0.02 + speed * 0.0025);
    this.playNote(note, 0.16, 'triangle', vol);
    this.playNote(note * 1.5, 0.11, 'sine', vol * 0.45, 0.015);
  }

  playDingDong() {
    this.playNote(739.99, 0.34, 'sine', 0.07, 0);
    this.playNote(1479.98, 0.18, 'triangle', 0.025, 0);
    this.playNote(587.33, 0.55, 'sine', 0.075, 0.22);
    this.playNote(1174.66, 0.28, 'triangle', 0.025, 0.22);
  }

  playEclipse() {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playUnlock() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((hz, i) => {
      this.playNote(hz, 0.18, 'triangle', 0.045, i * 0.055);
    });
  }

  playOverdrive() {
    const notes = [293.66, 440, 587.33, 880, 1174.66];
    notes.forEach((hz, i) => {
      this.playNote(hz, 0.24, 'sawtooth', 0.028, i * 0.045);
    });
  }
}

export const synth = new MicroSynth();
