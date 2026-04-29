// Tiny WebAudio sound effects — no assets needed, totally cute & lightweight.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  duration?: number;
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
}

function tone({ freq, type = "sine", duration = 0.18, gain = 0.18, attack = 0.005, release = 0.12, detune = 0 }: ToneOpts, when = 0) {
  const ac = getCtx();
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (detune) osc.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration + release);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + release + 0.02);
}

function slide(fromFreq: number, toFreq: number, duration = 0.25, gain = 0.18, type: OscillatorType = "sine", when = 0) {
  const ac = getCtx();
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), t + duration);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.06);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.1);
}

// Cute "pop" for taps
export const sfxPop = () => {
  slide(620, 880, 0.09, 0.16, "triangle");
};

// Sparkle — magical chime for spin / search
export const sfxSparkle = () => {
  tone({ freq: 988, type: "triangle", duration: 0.08, gain: 0.14 }, 0);
  tone({ freq: 1318, type: "triangle", duration: 0.1, gain: 0.12 }, 0.06);
  tone({ freq: 1760, type: "sine", duration: 0.14, gain: 0.1 }, 0.13);
};

// Save — happy two-tone "ding"
export const sfxSave = () => {
  tone({ freq: 783, type: "triangle", duration: 0.12, gain: 0.16 }, 0);
  tone({ freq: 1174, type: "triangle", duration: 0.18, gain: 0.16 }, 0.08);
};

// Camera shutter — quick clack
export const sfxShutter = () => {
  const ac = getCtx();
  if (!ac || muted) return;
  const t = ac.currentTime;
  // noise burst
  const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = 0.2;
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1500;
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.06);
};

// Tab switch — soft blip
export const sfxBlip = () => {
  tone({ freq: 540, type: "sine", duration: 0.06, gain: 0.1 });
};

// Error / oops — gentle low blip (kid friendly, not scary)
export const sfxOops = () => {
  slide(420, 280, 0.18, 0.14, "triangle");
};
