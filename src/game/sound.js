// Klang-System: alle Geräusche werden live mit der Web-Audio-API synthetisiert (keine Dateien).
// Lautstärke kommt aus den Einstellungen (sfxVolume, 0 = stumm). Der Audio-Kontext startet erst
// nach der ersten Nutzeraktion (Browser-Regel).
import { getSettings, updateSettings } from '../settings.js';

let ctx = null;
let master = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  master.gain.value = getSettings().sfxVolume ?? 0.7;
  return ctx;
}

export const isMuted = () => (getSettings().sfxVolume ?? 0.7) <= 0;
export function toggleMute() {
  const v = getSettings().sfxVolume ?? 0.7;
  updateSettings({ sfxVolume: v > 0 ? 0 : 0.7, lastVolume: v > 0 ? v : undefined });
  if (!isMuted()) play('ui');
  return isMuted();
}

/** Ein Ton: Oszillator mit Hüllkurve, optional Tonhöhen-Gleiten. */
function tone(freq, { type = 'sine', dur = 0.12, vol = 0.25, to = null, delay = 0, attack = 0.005 } = {}) {
  const a = audio();
  if (!a || isMuted()) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Rauschen (für Rutschen und Schieben), gefiltert. */
function noise({ dur = 0.15, vol = 0.15, freq = 800, q = 1, delay = 0 } = {}) {
  const a = audio();
  if (!a || isMuted()) return;
  const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// Tonhöhe je Farbe (Rot tief, Grün Mitte, Blau hoch) – Mischfarben spielen einen Akkord.
const COLOR_NOTES = { 1: 523.25, 2: 659.25, 4: 783.99 };

export function play(name, arg) {
  switch (name) {
    case 'step': tone(180 + Math.random() * 30, { type: 'triangle', dur: 0.06, vol: 0.08 }); break;
    case 'bump': tone(110, { type: 'square', dur: 0.08, vol: 0.06, to: 80 }); break;
    case 'push': noise({ dur: 0.12, vol: 0.18, freq: 300, q: 2 }); tone(140, { type: 'triangle', dur: 0.1, vol: 0.12, to: 100 }); break;
    case 'slide': noise({ dur: 0.35, vol: 0.12, freq: 2200, q: 0.7 }); break;
    case 'rotate': tone(880, { type: 'square', dur: 0.05, vol: 0.06 }); tone(1320, { type: 'sine', dur: 0.08, vol: 0.08, delay: 0.04 }); break;
    case 'undo': tone(600, { type: 'sine', dur: 0.1, vol: 0.08, to: 300 }); break;
    case 'target': {
      const notes = [1, 2, 4].filter((c) => arg & c).map((c) => COLOR_NOTES[c]);
      notes.forEach((f, i) => { tone(f, { type: 'sine', dur: 0.5, vol: 0.14, delay: i * 0.03 }); tone(f * 2, { type: 'sine', dur: 0.3, vol: 0.05, delay: i * 0.03 }); });
      break;
    }
    case 'door': tone(220, { type: 'sawtooth', dur: 0.35, vol: 0.06, to: 660 }); noise({ dur: 0.3, vol: 0.06, freq: 1200 }); break;
    case 'doorclose': tone(500, { type: 'sawtooth', dur: 0.25, vol: 0.05, to: 160 }); break;
    case 'plate': tone(330, { type: 'triangle', dur: 0.12, vol: 0.12 }); tone(495, { type: 'triangle', dur: 0.12, vol: 0.1, delay: 0.06 }); break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.35, vol: 0.16, delay: i * 0.11 }));
      tone(1567.98, { type: 'sine', dur: 0.9, vol: 0.12, delay: 0.46 });
      break;
    case 'chapter':
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.4, vol: 0.14, delay: i * 0.09 }));
      break;
    case 'dock': tone(1200, { type: 'sine', dur: 0.05, vol: 0.05 }); tone(1800, { type: 'sine', dur: 0.06, vol: 0.04, delay: 0.035 }); break;
    case 'dissolve': noise({ dur: 0.45, vol: 0.12, freq: 3000, q: 0.6 }); tone(900, { type: 'sine', dur: 0.4, vol: 0.08, to: 2400 }); break;
    case 'caught': tone(220, { type: 'sawtooth', dur: 0.5, vol: 0.12, to: 70 }); tone(233, { type: 'square', dur: 0.4, vol: 0.06, to: 60, delay: 0.05 }); break;
    case 'ui': tone(700, { type: 'sine', dur: 0.06, vol: 0.07 }); break;
    case 'swipe': noise({ dur: 0.18, vol: 0.08, freq: 1500, q: 0.8 }); tone(500, { type: 'sine', dur: 0.12, vol: 0.05, to: 900 }); break;
    case 'play': [262, 392, 523.25].forEach((f, i) => tone(f, { type: 'square', dur: 0.12, vol: 0.06, delay: i * 0.06 })); break;
    default: break;
  }
}
