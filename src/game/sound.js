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

/** Gemeinsamer Audio-Kontext (auch für die Musik). */
export const audioContext = () => audio();

// Stumm-Knopf (Musik und Effekte); die Lautstärken selbst bleiben dabei erhalten
if (getSettings().sfxVolume === 0 && getSettings().muted === undefined) updateSettings({ muted: true, sfxVolume: 0.7 }); // alter Stumm-Zustand
export const isMuted = () => !!getSettings().muted;
const silent = () => isMuted() || (getSettings().sfxVolume ?? 0.7) <= 0;
export function toggleMute() {
  updateSettings({ muted: !isMuted() });
  if (!isMuted()) play('ui');
  return isMuted();
}

/** Ein Ton: Oszillator mit Hüllkurve, optional Tonhöhen-Gleiten. */
function tone(freq, { type = 'sine', dur = 0.12, vol = 0.25, to = null, delay = 0, attack = 0.005 } = {}) {
  const a = audio();
  if (!a || silent()) return;
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
  if (!a || silent()) return;
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

/** Boss-Geräusche: charge = dunkles Aufladen, shot = Schuss, slam = Einschlag, roar = Brüllen. */
export function bossSound(kind) {
  if (silent()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime, S = { charge: [70, 160, 0.5, 'sawtooth', 0.22], shot: [520, 120, 0.2, 'square', 0.16], slam: [120, 32, 0.4, 'square', 0.38], roar: [190, 55, 0.9, 'sawtooth', 0.34] }[kind];
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o.type = o2.type = S[3];
  o.frequency.setValueAtTime(S[0], t); o.frequency.exponentialRampToValueAtTime(S[1], t + S[2]);
  o2.frequency.setValueAtTime(S[0] * 1.06, t); o2.frequency.exponentialRampToValueAtTime(S[1] * 1.06, t + S[2]);
  g.gain.setValueAtTime(S[4], t); g.gain.exponentialRampToValueAtTime(0.0001, t + S[2]);
  o.connect(g); o2.connect(g); g.connect(master);
  o.start(t); o2.start(t); o.stop(t + S[2]); o2.stop(t + S[2]);
}

/** Schrei für den Jumpscare: verstimmte Sägezähne fallen ab, darüber Rauschen. */
export function scream(sec = 1.3) {
  if (silent()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
  out.gain.setValueAtTime(0.5, t + sec * 0.6);
  out.gain.exponentialRampToValueAtTime(0.0001, t + sec);
  out.connect(master);
  for (const f of [620, 655, 930, 1390]) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.34, t + sec);
    const g = c.createGain(); g.gain.value = 0.16;
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + sec);
  }
  const rumble = c.createOscillator(); // tiefes Grollen spürt man mehr, als man es hört
  rumble.type = 'square'; rumble.frequency.value = 48;
  const rg = c.createGain(); rg.gain.value = 0.3;
  rumble.connect(rg); rg.connect(out); rumble.start(t); rumble.stop(t + sec);
  const noise = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = noise;
  const g = c.createGain(); g.gain.value = 0.22;
  src.connect(g); g.connect(out);
  src.start(t);
}

export function play(name, arg) {
  switch (name) {
    case 'step': tone(180 + Math.random() * 30, { type: 'triangle', dur: 0.06, vol: 0.08 }); break;
    case 'bump': tone(110, { type: 'square', dur: 0.08, vol: 0.06, to: 80 }); break;
    case 'push': noise({ dur: 0.12, vol: 0.18, freq: 300, q: 2 }); tone(140, { type: 'triangle', dur: 0.1, vol: 0.12, to: 100 }); break;
    case 'slide': noise({ dur: 0.35, vol: 0.12, freq: 2200, q: 0.7 }); break;
    case 'rotate': tone(880, { type: 'square', dur: 0.05, vol: 0.06 }); tone(1320, { type: 'sine', dur: 0.08, vol: 0.08, delay: 0.04 }); break;
    case 'undo': tone(600, { type: 'sine', dur: 0.1, vol: 0.08, to: 300 }); break;
    case 'lamp': { // tiefer warmer Ton, jede Lampe eine Stufe höher
      const f = 130.8 * [1, 1.125, 1.26, 1.5, 1.68, 2, 2.25][Math.min(6, arg || 0)];
      tone(f, { type: 'triangle', dur: 0.55, vol: 0.2 }); tone(f / 2, { type: 'sine', dur: 0.6, vol: 0.12 });
      break;
    }
    case 'target': {
      const notes = [1, 2, 4].filter((c) => arg & c).map((c) => COLOR_NOTES[c]);
      notes.forEach((f, i) => { tone(f, { type: 'sine', dur: 0.5, vol: 0.14, delay: i * 0.03 }); tone(f * 2, { type: 'sine', dur: 0.3, vol: 0.05, delay: i * 0.03 }); });
      break;
    }
    case 'door': tone(220, { type: 'sawtooth', dur: 0.35, vol: 0.06, to: 660 }); noise({ dur: 0.3, vol: 0.06, freq: 1200 }); break;
    // Ausgangstür öffnet sich: Riegel klackt, Holz knarrt in Schüben, warmer Akkord
    case 'exitopen':
      noise({ dur: 0.05, vol: 0.2, freq: 1800, q: 3 }); tone(160, { type: 'square', dur: 0.05, vol: 0.09, to: 90 });
      [0.1, 0.2, 0.31, 0.45].forEach((d, i) => { tone(150 + i * 28, { type: 'sawtooth', dur: 0.1, vol: 0.035, to: 230 + i * 34, delay: d }); noise({ dur: 0.09, vol: 0.05, freq: 900 + i * 250, q: 5, delay: d }); });
      noise({ dur: 0.1, vol: 0.12, freq: 240, q: 1.5, delay: 0.62 });
      [392, 493.88, 587.33].forEach((f, i) => tone(f, { type: 'sine', dur: 0.9, vol: 0.09, delay: 0.42 + i * 0.07 }));
      break;
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
