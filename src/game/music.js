// Musik: Zu jeder Welt läuft ein eigenes, live erzeugtes Stück (Web Audio, keine Dateien). Ein kleiner
// Sequenzer plant Noten voraus; Melodie und Begleitung entstehen fest aus Tonleiter, Akkordfolge und
// einem Startwert der Welt – dadurch klingt jede Welt immer gleich und wiedererkennbar. Wechselt die
// Welt, blendet das alte Stück aus und das neue ein. Lautstärke: musicVolume; Stumm schaltet alles ab.
import { getSettings, updateSettings, onSettingsChange } from '../settings.js';
import { audioContext, isMuted } from './sound.js';

// Tonleitern als Halbtöne über dem Grundton
const SC = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], harmonic: [0, 2, 3, 5, 7, 8, 11], hijaz: [0, 1, 4, 5, 7, 8, 10], hira: [0, 2, 3, 7, 8, 0 + 12, 14],
};
// bpm, Grundton (MIDI), Tonleiter, Akkordstufen (je Takt), Melodie-Instrument, Bass, Schlagwerk, Dichte, Pad
export const SONGS = {
  menu: { bpm: 76, root: 57, scale: 'major', chords: [0, 3, 5, 4], lead: 'bell', bass: 'soft', perc: null, density: 0.35, pad: true },
  default: { bpm: 72, root: 55, scale: 'major', chords: [0, 4, 5, 3], lead: 'bell', bass: 'soft', perc: null, density: 0.3, pad: true },
  beach: { bpm: 104, root: 60, scale: 'major', chords: [0, 4, 5, 3], lead: 'pluck', bass: 'pluck', perc: 'shaker', density: 0.55, pad: false },
  cherry: { bpm: 70, root: 62, scale: 'hira', chords: [0, 0, 3, 4], lead: 'koto', bass: 'soft', perc: null, density: 0.4, pad: true },
  jungle: { bpm: 98, root: 57, scale: 'dorian', chords: [0, 6, 3, 0], lead: 'marimba', bass: 'pluck', perc: 'conga', density: 0.6, pad: false },
  castle: { bpm: 80, root: 50, scale: 'harmonic', chords: [0, 5, 3, 4], lead: 'harpsi', bass: 'drone', perc: 'march', density: 0.45, pad: true },
  moor: { bpm: 58, root: 52, scale: 'minor', chords: [0, 5, 2, 6], lead: 'flute', bass: 'drone', perc: null, density: 0.22, pad: true },
  night: { bpm: 66, root: 64, scale: 'lydian', chords: [0, 1, 0, 4], lead: 'bell', bass: 'soft', perc: null, density: 0.34, pad: true },
  volcano: { bpm: 112, root: 45, scale: 'phrygian', chords: [0, 1, 0, 6], lead: 'square', bass: 'heavy', perc: 'forge', density: 0.42, pad: false },
  temple: { bpm: 88, root: 53, scale: 'hijaz', chords: [0, 1, 0, 6], lead: 'oud', bass: 'pluck', perc: 'conga', density: 0.48, pad: true },
  aurora: { bpm: 60, root: 62, scale: 'lydian', chords: [0, 4, 5, 1], lead: 'glass', bass: 'soft', perc: null, density: 0.26, pad: true },
  reef: { bpm: 76, root: 58, scale: 'dorian', chords: [0, 3, 6, 4], lead: 'glass', bass: 'soft', perc: 'bubble', density: 0.36, pad: true },
  shadow: { bpm: 54, root: 47, scale: 'phrygian', chords: [0, 1, 5, 0], lead: 'bell', bass: 'drone', perc: null, density: 0.18, pad: true },
};

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const seeded = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 13), 1274126177) + 12345 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }; };

// Instrumente: Wellenform, Ausklingen, Lautstärke, Oktave, Filter, Obertöne
const VOICES = {
  bell: { type: 'sine', dur: 1.6, vol: 0.13, oct: 12, over: [[3, 0.18]] },
  glass: { type: 'sine', dur: 2.2, vol: 0.1, oct: 12, over: [[2, 0.3], [4, 0.12]] },
  pluck: { type: 'triangle', dur: 0.45, vol: 0.2, oct: 0 },
  koto: { type: 'triangle', dur: 1.0, vol: 0.18, oct: 12, over: [[2, 0.25]] },
  marimba: { type: 'sine', dur: 0.4, vol: 0.22, oct: 0, over: [[4, 0.25]] },
  harpsi: { type: 'sawtooth', dur: 0.5, vol: 0.075, oct: 0, cut: 2400 },
  flute: { type: 'sine', dur: 1.5, vol: 0.13, oct: 12, soft: true, vib: true },
  square: { type: 'square', dur: 0.3, vol: 0.05, oct: 0, cut: 1500 },
  oud: { type: 'sawtooth', dur: 0.6, vol: 0.08, oct: 0, cut: 1400 },
};

let ctx = null, bus = null, echo = null;
let song = null, songId = null, songBus = null, timer = 0;
let nextTime = 0, step = 0, rnd = null, melody = [];
export const stats = { notes: 0 }; // für den Test: wie viele Noten geplant wurden

function targetGain() { return isMuted() ? 0 : (getSettings().musicVolume ?? 0.5) * 0.55; }

function ensure() {
  if (ctx) return true;
  ctx = audioContext();
  if (!ctx) return false;
  bus = ctx.createGain(); bus.gain.value = targetGain();
  // kleiner Hall: leises Echo gibt dem Pixel-Klang Raum
  echo = ctx.createDelay(1); echo.delayTime.value = 0.32;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const wet = ctx.createGain(); wet.gain.value = 0.3;
  echo.connect(fb).connect(echo); echo.connect(wet).connect(bus);
  bus.connect(ctx.destination);
  return true;
}

function note(m, t, v, gainMul = 1) {
  const a = ctx, f = midi(m + (v.oct || 0));
  const parts = [[1, 1], ...(v.over || [])];
  const out = a.createGain();
  const peak = v.vol * gainMul;
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(peak, t + (v.soft ? 0.12 : 0.008));
  out.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
  let last = out;
  if (v.cut) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = v.cut; out.connect(fl); last = fl; }
  last.connect(songBus); last.connect(echo);
  for (const [mul, amt] of parts) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = v.type; o.frequency.value = f * mul; g.gain.value = amt;
    if (v.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5; lg.gain.value = 4; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + v.dur); }
    o.connect(g).connect(out); o.start(t); o.stop(t + v.dur + 0.02);
  }
  stats.notes++;
}

function hit(t, { freq = 200, to = 60, dur = 0.12, vol = 0.2, noise = 0, band = 4000 } = {}) {
  const a = ctx;
  if (freq) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(songBus); o.start(t); o.stop(t + dur + 0.02);
  }
  if (noise) {
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = band; g.gain.value = noise;
    s.connect(f).connect(g).connect(songBus); s.start(t);
  }
}

function percussion(kind, s, t) {
  const q = s % 16;
  if (kind === 'shaker') { hit(t, { freq: 0, noise: q % 2 ? 0.035 : 0.06, dur: 0.05, band: 6000 }); if (q === 0 || q === 10) hit(t, { freq: 120, to: 60, dur: 0.14, vol: 0.14 }); }
  if (kind === 'conga') { if ([0, 3, 6, 10, 12].includes(q)) hit(t, { freq: q % 4 ? 300 : 190, to: 130, dur: 0.14, vol: 0.13 }); }
  if (kind === 'march') { if (q === 0 || q === 8) hit(t, { freq: 90, to: 50, dur: 0.22, vol: 0.2 }); if (q === 12 || q === 14) hit(t, { freq: 0, noise: 0.05, dur: 0.08, band: 1800 }); }
  if (kind === 'forge') { if (q === 0 || q === 6 || q === 8) hit(t, { freq: 80, to: 40, dur: 0.2, vol: 0.26 }); if (q === 4 || q === 12) hit(t, { freq: 1800, to: 1200, dur: 0.1, vol: 0.05, noise: 0.05, band: 3000 }); }
  if (kind === 'bubble') { if (rnd() < 0.22) { const f = 300 + rnd() * 500; hit(t, { freq: f, to: f * 2, dur: 0.09, vol: 0.05 }); } }
}

function schedule() {
  if (!song || !ctx) return;
  // Hintergrund/gesperrt: nichts vorausplanen, sonst stapeln sich Noten
  if (ctx.state !== 'running') { nextTime = ctx.currentTime + 0.1; return; }
  const scale = SC[song.scale], len = 60 / song.bpm / 4;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.4) {
    const s = step, bar = Math.floor(s / 16), q = s % 16;
    const deg = song.chords[bar % song.chords.length];
    const sc = (d) => { const n = scale.length; return scale[((d % n) + n) % n] + 12 * Math.floor(d / n); };
    const tone = (d) => song.root + sc(deg + d);
    // Bass
    if (song.bass === 'drone' && q === 0) note(tone(0) - 12, nextTime, { type: 'triangle', dur: len * 16, vol: 0.13, soft: true, cut: 500 });
    if (song.bass === 'soft' && (q === 0 || q === 8)) note(tone(0) - 12, nextTime, { type: 'sine', dur: len * 7, vol: 0.15 });
    if (song.bass === 'pluck' && [0, 6, 8, 14].includes(q)) note(tone(q === 6 || q === 14 ? 4 : 0) - 12, nextTime, { type: 'triangle', dur: 0.32, vol: 0.2 });
    if (song.bass === 'heavy' && [0, 3, 6, 8, 11, 14].includes(q)) note(tone(0) - 24, nextTime, { type: 'square', dur: 0.2, vol: 0.09, cut: 420 });
    // Flächenklang: Akkord am Taktanfang
    if (song.pad && q === 0) for (const d of [0, 2, 4]) note(tone(d), nextTime, { type: 'sine', dur: len * 16, vol: 0.035, soft: true });
    // Melodie: feste 32-Schritte-Figur, zweite Hälfte der Form variiert
    const mel = melody[(s + (bar % 8 >= 4 ? 16 : 0)) % melody.length];
    if (mel != null) note(tone(mel), nextTime, VOICES[song.lead] || VOICES.bell);
    if (song.perc) percussion(song.perc, s, nextTime);
    nextTime += len * (q % 2 && song.bpm > 95 ? 0.94 : q % 2 ? 1 : song.bpm > 95 ? 1.06 : 1); // leichter Swing
    step++;
  }
}

/** Stück einer Welt starten (startet nicht neu, wenn es schon läuft). */
export function setMusic(id) {
  const key = SONGS[id] ? id : 'default';
  songId = key;
  if (!ctx && !ensure()) return;
  if (song === SONGS[key] && timer) return;
  // altes Stück ausblenden
  const old = songBus;
  if (old) { old.gain.setTargetAtTime(0, ctx.currentTime, 0.35); setTimeout(() => old.disconnect(), 2500); }
  song = SONGS[key]; step = 0; nextTime = ctx.currentTime + 0.15;
  rnd = seeded(key);
  // Melodie: Schrittweise durch die Tonleiter, an betonten Stellen häufiger, Pausen je Dichte
  melody = []; let pos = 2;
  for (let i = 0; i < 48; i++) {
    const strong = i % 4 === 0;
    if (rnd() < song.density * (strong ? 1.5 : i % 2 ? 0.5 : 1)) { pos = Math.max(-2, Math.min(9, pos + Math.round((rnd() - 0.5) * 5))); melody.push(pos); } else melody.push(null);
  }
  songBus = ctx.createGain(); songBus.gain.value = 0.0001;
  songBus.gain.setTargetAtTime(1, ctx.currentTime + 0.1, 0.5);
  songBus.connect(bus);
  clearInterval(timer);
  timer = setInterval(schedule, 120);
  schedule();
}

export function stopMusic() {
  clearInterval(timer); timer = 0; song = null; songId = null;
  if (songBus && ctx) { const b = songBus; b.gain.setTargetAtTime(0, ctx.currentTime, 0.25); setTimeout(() => b.disconnect(), 1500); songBus = null; }
}

export const musicOn = () => (getSettings().musicVolume ?? 0.5) > 0;
export function toggleMusic() { updateSettings({ musicVolume: musicOn() ? 0 : 0.5 }); return musicOn(); }
export const currentSong = () => songId;

// Lautstärke folgt den Einstellungen; Browser erlauben Ton erst nach der ersten Berührung
onSettingsChange(() => { if (bus) bus.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.08); });
const wake = () => { const id = songId; if (id && (!ctx || !timer)) { song = null; setMusic(id); } if (ctx?.state === 'suspended' && !document.hidden) ctx.resume(); };
addEventListener('pointerdown', wake); addEventListener('keydown', wake);
// Handy gesperrt oder App gewechselt: Musik pausieren
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
