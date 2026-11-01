// Musik: Zu jeder Welt läuft ein eigener Ohrwurm, live erzeugt (Web Audio, keine Dateien). Die Stücke
// folgen dem, was Ohrwürmer gemeinsam haben: ein kurzer, handgeschriebener Hook über 4 Takte (Frage und
// Antwort, kleiner Tonumfang, immer gleicher Rhythmus), eine feste Folge aus 4 Akkorden, durchgehender
// Beat (Kick, Snare/Clap, Hi-Hats), Keyboard-Akkorde, die zum Kick „pumpen“, und ein Bass auf den
// Grundtönen. Aufbau: kurzer Auftakt → Hook → Break → Hook mit Oktave → Groove → wieder von vorn.
// Alle Melodien sind eigene Kompositionen. Lautstärke: musicVolume; Stumm schaltet alles ab.
import { getSettings, onSettingsChange } from '../settings.js';
import { audioContext, isMuted } from './sound.js';

// Tonleitern als Halbtöne über dem Grundton
const SC = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], harmonic: [0, 2, 3, 5, 7, 8, 11], hijaz: [0, 1, 4, 5, 7, 8, 10],
};

// Beats: je 16 Schritte. k Kick, s Snare, c Clap, h geschlossene Hat, o offene Hat, t Trommel
const BEATS = {
  four: { k: 'x...x...x...x...', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.' },
  tropic: { k: 'x...x...x...x...', c: '...x..x....x..x.', h: 'x.x.x.x.x.x.x.x.' },
  lofi: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  pop: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  march: { k: 'x...x...x...x...', s: '....x.x.....x.xx', h: 'x...x...x...x...' },
  conga: { k: 'x.....x...x.....', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', t: '..x..x....x.x...' },
  trap: { k: 'x.........x.....', s: '........x.......', h: 'x.xxx.x.x.xxx.xx' },
  drive: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
};

// Lieder: Tempo, Grundton (MIDI), Tonleiter, 4 Akkorde (Halbtöne + m/M), Beat, Keyboard-Muster, Bass-Muster,
// Melodie-Instrument und der Hook: 4 Takte à 16 Schritte. 1–9 = Tonleiterstufe, a/b = höher, z/y = tiefer.
export const SONGS = {
  // Bosskampf: langsam, tief, Halbtonreibung über schwerem Puls
  boss: { bpm: 72, root: 38, scale: 'harmonic', chords: ['0m', '1M', '0m', '6M'], beat: 'march', keys: 'pad', bassP: 'x..x..x...x..x..', lead: 'harpsi',
    hook: ['1...2...1...z...', '1...2...5...4...', '1...2...1...z...', '5.4.2.1.z.......'] },
  menu: { bpm: 96, root: 57, scale: 'major', chords: ['0M', '7M', '9m', '5M'], beat: 'pop', keys: 'stab', bassP: 'x.....x.x.......', lead: 'bell',
    hook: ['5...3.5.6...5...', '2...z.2.3...2...', '3...1.3.6...5.3.', '4.4.3.2.1.......'] },
  default: { bpm: 90, root: 55, scale: 'major', chords: ['0M', '9m', '5M', '7M'], beat: 'lofi', keys: 'pump', bassP: 'x.......x.......', lead: 'bell',
    hook: ['3.5.8...7.5.3...', '3.5.6...5.3.1...', '4.6.8...7.6.4...', '5.5.6.7.8.......'] },
  beach: { bpm: 118, root: 60, scale: 'major', chords: ['0M', '7M', '9m', '5M'], beat: 'tropic', keys: 'stab', bassP: 'x..x..x.x..x..x.', lead: 'pluck',
    hook: ['5.5.6.5.3...1...', '2.2.3.2.z...5...', '6.6.8.6.3...1...', '4.4.6.4.3.2.1...'] },
  cherry: { bpm: 84, root: 62, scale: 'minor', chords: ['0m', '8M', '3M', '10M'], beat: 'lofi', keys: 'pump', bassP: 'x.....x...x.....', lead: 'koto', swing: 0.14,
    hook: ['8.5.4.5.3...1...', '8.5.4.5.7...5...', '3.5.8.7.5...4...', '3.4.5.3.1.......'] },
  jungle: { bpm: 108, root: 57, scale: 'dorian', chords: ['0m', '5M', '0m', '10M'], beat: 'conga', keys: 'arp', bassP: 'x..x..x...x..x..', lead: 'marimba',
    hook: ['1.3.5.3.6.5.3...', '4.3.1.3.2.1.z...', '1.3.5.3.6.5.8...', '7.5.4.5.1.......'] },
  castle: { bpm: 100, root: 50, scale: 'harmonic', chords: ['0m', '8M', '5m', '7M'], beat: 'march', keys: 'pump', bassP: 'x.x.x.x.x.x.x.x.', lead: 'harpsi',
    hook: ['1.1.3.5.8...7.6.', '6.6.8.6.5...3...', '4.4.6.8.6...5.4.', '7.7.5.7.1.......'] },
  moor: { bpm: 76, root: 52, scale: 'minor', chords: ['0m', '8M', '3M', '10M'], beat: 'lofi', keys: 'pad', bassP: 'x.......x.....x.', lead: 'flute', swing: 0.1,
    hook: ['5...4.3.4...1...', '5...4.3.2...z...', '3...4.5.8...7.5.', '4...3.2.1.......'] },
  night: { bpm: 92, root: 64, scale: 'lydian', chords: ['0M', '2M', '9m', '7M'], beat: 'pop', keys: 'arp', bassP: 'x.....x.x.......', lead: 'bell',
    hook: ['3.5.7.8.7.5.3...', '2.4.6.8.7...5...', '3.5.7.8.a.8.7...', '5.6.5.3.2.1.....'] },
  volcano: { bpm: 128, root: 45, scale: 'phrygian', chords: ['0m', '1M', '0m', '10m'], beat: 'drive', keys: 'stab', bassP: 'x.xx.xx.x.xx.xx.', lead: 'saw',
    hook: ['1.1.2.1...5.4.3.', '2.2.3.2...6.5.4.', '1.1.2.1...8.7.5.', '4.3.2.1.1.......'] },
  temple: { bpm: 102, root: 53, scale: 'hijaz', chords: ['0M', '1M', '10m', '0M'], beat: 'conga', keys: 'pump', bassP: 'x..x..x.x..x....', lead: 'oud',
    hook: ['1.2.3.2.1...5...', '6.5.4.3.2...1...', '5.6.5.4.3...2...', '3.2.1.z.1.......'] },
  aurora: { bpm: 88, root: 62, scale: 'lydian', chords: ['0M', '2M', '7M', '9m'], beat: 'pop', keys: 'arp', bassP: 'x.......x.......', lead: 'glass',
    hook: ['8...7.5.3...5...', '6...5.4.2...4...', '8...7.5.a...8...', '7.6.5.3.1.......'] },
  reef: { bpm: 100, root: 58, scale: 'dorian', chords: ['0m', '5M', '3M', '10M'], beat: 'pop', keys: 'stab', bassP: 'x..x.x..x..x.xx.', lead: 'glass',
    hook: ['5.3.5.6.5...3...', '4.2.4.5.4...2...', '3.1.3.4.5...8...', '7.5.4.2.1.......'] },
  shadow: { bpm: 74, root: 47, scale: 'phrygian', chords: ['0m', '1M', '8M', '7M'], beat: 'trap', keys: 'pad', bassP: 'x.........x..x..', lead: 'bell',
    hook: ['1...3...2...1...', '5...4...2...1...', '8...7...5...3...', '2...3...2.1.....'] },
};

// Aufbau eines Durchlaufs (je Eintrag 4 Takte): was gerade spielt
const FORM = [
  { lead: false, drums: 'light', keys: true, bass: true },
  { lead: true, drums: 'full', keys: true, bass: true },
  { lead: true, drums: 'full', keys: true, bass: true },
  { lead: 'soft', drums: 'none', keys: true, bass: false }, // Break: nur Keyboard und Hook
  { lead: true, drums: 'full', keys: true, bass: true, octave: true },
  { lead: true, drums: 'full', keys: true, bass: true, octave: true },
  { lead: false, drums: 'full', keys: true, bass: true },
];

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Instrumente der Melodie
const VOICES = {
  bell: { type: 'sine', dur: 0.9, vol: 0.16, oct: 12, over: [[3, 0.2]] },
  glass: { type: 'sine', dur: 1.1, vol: 0.13, oct: 12, over: [[2, 0.3], [4, 0.12]] },
  pluck: { type: 'triangle', dur: 0.32, vol: 0.24, oct: 12 },
  koto: { type: 'triangle', dur: 0.7, vol: 0.2, oct: 12, over: [[2, 0.25]] },
  marimba: { type: 'sine', dur: 0.3, vol: 0.27, oct: 12, over: [[4, 0.25]] },
  harpsi: { type: 'sawtooth', dur: 0.4, vol: 0.09, oct: 12, cut: 3000 },
  flute: { type: 'sine', dur: 0.7, vol: 0.17, oct: 12, soft: true, vib: true },
  saw: { type: 'sawtooth', dur: 0.26, vol: 0.09, oct: 12, cut: 2200 },
  oud: { type: 'sawtooth', dur: 0.45, vol: 0.1, oct: 12, cut: 1800 },
};

let ctx = null, bus = null, echo = null, noiseBuf = null;
let song = null, songId = null, songBus = null, keysBus = null, timer = 0;
let nextTime = 0, step = 0;
export const stats = { notes: 0, hits: 0 }; // für den Test: was geplant wurde

function targetGain() { return isMuted() ? 0 : (getSettings().musicVolume ?? 0.5) * 0.5; }

function ensure() {
  if (ctx) return true;
  ctx = audioContext();
  if (!ctx) return false;
  // Begrenzer gegen Übersteuern (viele Stimmen gleichzeitig, kleine Handy-Lautsprecher)
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.16;
  // Gedämpft: Tiefpass nimmt die Höhen weg, die Musik klingt wie aus dem Nebenraum und drängt sich nicht vor
  const muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass'; muffle.frequency.value = 1500; muffle.Q.value = 0.4;
  bus = ctx.createGain(); bus.gain.value = targetGain();
  bus.connect(muffle).connect(comp).connect(ctx.destination);
  echo = ctx.createDelay(1);
  const fb = ctx.createGain(); fb.gain.value = 0.26;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  echo.connect(fb).connect(echo); echo.connect(wet).connect(bus);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

function tone(f, t, v, dest, gainMul = 1) {
  const a = ctx, out = a.createGain(), peak = v.vol * gainMul;
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(peak, t + (v.soft ? 0.05 : 0.006));
  out.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
  let last = out;
  if (v.cut) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = v.cut; out.connect(fl); last = fl; }
  last.connect(dest);
  if (v.echo) last.connect(echo);
  for (const [mul, amt] of [[1, 1], ...(v.over || [])]) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = v.type; o.frequency.value = f * mul; g.gain.value = amt;
    if (v.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5.5; lg.gain.value = 5; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + v.dur); }
    o.connect(g).connect(out); o.start(t); o.stop(t + v.dur + 0.02);
  }
  stats.notes++;
}

function noiseHit(t, { dur, vol, type = 'bandpass', freq, q = 1 }) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(songBus);
  s.start(t, Math.random() * 0.8, dur + 0.02);
  stats.hits++;
}

function sweep(t, from, to, dur, vol, type = 'sine') {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(songBus); o.start(t); o.stop(t + dur + 0.02);
  stats.hits++;
}

const kick = (t) => {
  sweep(t, 165, 44, 0.2, 0.62);
  noiseHit(t, { dur: 0.012, vol: 0.14, freq: 3500 }); // Klick: macht den Kick auf Handy-Lautsprechern hörbar
  // Pumpen: Keyboard duckt sich unter den Kick
  keysBus.gain.cancelScheduledValues(t);
  keysBus.gain.setValueAtTime(0.42, t);
  keysBus.gain.linearRampToValueAtTime(1, t + 0.17);
};
const snare = (t) => { sweep(t, 230, 150, 0.1, 0.2, 'triangle'); noiseHit(t, { dur: 0.16, vol: 0.3, freq: 2200, q: 0.7 }); };
const clap = (t) => { for (const d of [0, 0.012, 0.024]) noiseHit(t + d, { dur: 0.1, vol: 0.2, freq: 1700, q: 1.2 }); };
const hatC = (t, v = 0.075) => noiseHit(t, { dur: 0.035, vol: v, type: 'highpass', freq: 8000 });
const hatO = (t) => noiseHit(t, { dur: 0.16, vol: 0.07, type: 'highpass', freq: 7000 });
const tom = (t) => sweep(t, 300, 150, 0.13, 0.2);

function chordNotes(ch, root) {
  const off = parseInt(ch, 10), m = ch.endsWith('m');
  return { bass: root + off, notes: [root + off, root + off + (m ? 3 : 4), root + off + 7] };
}

function degree(c, sc) {
  const d = c === 'z' ? -1 : c === 'y' ? -2 : c === 'a' ? 9 : c === 'b' ? 10 : parseInt(c, 10) - 1;
  const n = sc.length;
  return sc[((d % n) + n) % n] + 12 * Math.floor(d / n);
}

function schedule() {
  if (!song || !ctx) return;
  // Hintergrund/gesperrt: nichts vorausplanen, sonst stapeln sich Noten
  if (ctx.state !== 'running') { nextTime = ctx.currentTime + 0.1; return; }
  const scale = SC[song.scale], len = 60 / song.bpm / 4, beat = BEATS[song.beat];
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.4) {
    const bar = Math.floor(step / 16), q = step % 16;
    const part = FORM[Math.floor(bar / 4) % FORM.length];
    const inHook = bar % 4;
    const swingAt = q % 2 && song.swing ? len * song.swing : 0;
    const t = nextTime + swingAt;
    const ch = chordNotes(song.chords[inHook], song.root);
    // Beat
    if (part.drums !== 'none') {
      if (beat.k?.[q] === 'x') kick(t);
      if (part.drums === 'full') {
        if (beat.s?.[q] === 'x') snare(t);
        if (beat.c?.[q] === 'x') clap(t);
        if (beat.o?.[q] === 'x') hatO(t);
        if (beat.t?.[q] === 'x') tom(t);
      }
      if (beat.h?.[q] === 'x') hatC(t, q % 4 === 0 ? 0.085 : 0.055);
    }
    // Bass
    if (part.bass && song.bassP[q] === 'x') {
      tone(midi(ch.bass - 12), t, { type: 'triangle', dur: len * 2.4, vol: 0.34 }, songBus);
      tone(midi(ch.bass), t, { type: 'sawtooth', dur: len * 1.6, vol: 0.05, cut: 700 }, songBus); // Oberton: hörbar auf kleinen Lautsprechern
    }
    // Keyboard
    if (part.keys) {
      const ep = { type: 'triangle', dur: len * 2.2, vol: 0.07, over: [[2, 0.3]], echo: false };
      if (song.keys === 'stab' && q % 4 === 2) ch.notes.forEach((n) => tone(midi(n + 12), t, ep, keysBus));
      if (song.keys === 'pump' && q % 2 === 0) ch.notes.forEach((n) => tone(midi(n + 12), t, { ...ep, dur: len * 1.7, vol: 0.055 }, keysBus));
      if (song.keys === 'pad' && q === 0) ch.notes.forEach((n) => tone(midi(n + 12), t, { type: 'triangle', dur: len * 16, vol: 0.06, soft: true, cut: 1400 }, keysBus));
      if (song.keys === 'arp' && q % 2 === 0) { const seq = [0, 1, 2, 1]; tone(midi(ch.notes[seq[(q / 2) % 4]] + 12 + (q % 8 === 6 ? 12 : 0)), t, { type: 'triangle', dur: len * 2.5, vol: 0.11, echo: true }, keysBus); }
    }
    // Hook
    const c = song.hook[inHook][q];
    if (part.lead && c !== '.') {
      const v = VOICES[song.lead] || VOICES.bell, m = song.root + degree(c, scale) + (v.oct || 0);
      const mul = part.lead === 'soft' ? 0.65 : 1;
      tone(midi(m), t, { ...v, echo: true }, songBus, mul);
      if (part.octave) tone(midi(m + 12), t, { ...v, echo: false, over: undefined }, songBus, 0.4);
    }
    nextTime += len;
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
  if (old) { old.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => old.disconnect(), 2500); }
  song = SONGS[key]; step = 0; nextTime = ctx.currentTime + 0.15;
  songBus = ctx.createGain(); songBus.gain.value = 0.0001;
  songBus.gain.setTargetAtTime(1, ctx.currentTime + 0.05, 0.25);
  songBus.connect(bus);
  keysBus = ctx.createGain(); keysBus.connect(songBus);
  echo.delayTime.value = Math.min(0.9, (60 / song.bpm) * 0.75); // Echo im Takt
  clearInterval(timer);
  timer = setInterval(schedule, 120);
  schedule();
}

export function stopMusic() {
  clearInterval(timer); timer = 0; song = null; songId = null;
  if (songBus && ctx) { const b = songBus; b.gain.setTargetAtTime(0, ctx.currentTime, 0.25); setTimeout(() => b.disconnect(), 1500); songBus = null; }
}

export const currentSong = () => songId;

// Lautstärke folgt den Einstellungen; Browser erlauben Ton erst nach der ersten Berührung
onSettingsChange(() => { if (bus) bus.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.08); });
const wake = () => { const id = songId; if (id && (!ctx || !timer)) { song = null; setMusic(id); } if (ctx?.state === 'suspended' && !document.hidden) ctx.resume(); };
addEventListener('pointerdown', wake); addEventListener('keydown', wake);
// Handy gesperrt oder App gewechselt: Musik pausieren
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
