// Übergänge zwischen Räumen: Jede Welt hat einen eigenen Pixel-Vorhang, der aus ihr selbst besteht
// (Meereswelle, Blütensturm, Lianen, Burggitter, Nebelbank, Lava, Tempeltore, Frost, Blasen …).
// Nächster Raum: Vorhang zu, Raum wechselt, Vorhang auf. Neue Welt: Vorhang der alten Welt, dahinter
// das Panorama der neuen Welt mit ihrem Namen, dann ihr Vorhang. Tippen überspringt das Panorama.
// Der Raum wechselt immer unsichtbar hinter dem geschlossenen Vorhang.
import { prefersReducedMotion } from '../settings.js';
import { mountTitleArt } from './titleArt.js';
import { play } from '../game/sound.js';

const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => k * k * (3 - 2 * k);

/** Flüssigkeit von unten (Meer, Lava): gewellte Kante, Farbbänder, Schaum/Kruste. */
function rising(g, W, H, k, t, bands, edge, edge2) {
  const level = H * 1.14 - k * H * 1.3;
  for (let x = 0; x < W; x++) {
    const y = level + Math.sin(x / 16 + t / 280) * 5 + Math.sin(x / 6 - t / 190) * 2;
    for (let b = 0; b < bands.length; b++) { const by = y + b * 9; if (by < H) R(g, x, by, 1, H - by, bands[b]); }
    R(g, x, y - 2, 1, 2, edge);
    if (hash(x, 3) > 0.7) R(g, x, y - 3, 1, 1, edge2);
  }
}

/** Zellen, die in einer Reihenfolge erscheinen (order 0..1): Grundlage für Blüten, Frost, Tinte. */
function cells(g, W, H, k, size, order, paint) {
  for (let y = 0; y < H; y += size) for (let x = 0; x < W; x += size) {
    if (k * 1.04 >= order(x, y)) paint(x, y);
  }
}

/** Zwei Torflügel, die sich in der Mitte treffen. */
function doors(g, W, H, k, wood, dark, light, trim) {
  const w = Math.ceil(k * (W / 2 + 1));
  for (const [x0, side] of [[0, 1], [W - w, -1]]) {
    R(g, x0, 0, w, H, wood);
    for (let y = 8; y < H; y += 9) { R(g, x0, y, w, 1, dark); for (let x = (y % 2 ? 0 : 7); x < w; x += 15) R(g, x0 + x, y - 8, 1, 8, dark); }
    const ex = side > 0 ? x0 + w - 4 : x0;
    R(g, ex, 0, 4, H, trim); R(g, side > 0 ? ex - 1 : ex + 4, 0, 1, H, light);
  }
}

export const CURTAINS = {
  // Meereswelle mit Schaumkrone
  beach(g, W, H, k, t) { rising(g, W, H, k, t, ['#4ac0d8', '#2aa4c4', '#1888ac', '#106c92'], '#ffffff', '#bff8ff'); },
  // Blütensturm: Blütenblätter wehen diagonal über das Bild und decken es zu
  cherry(g, W, H, k, t) {
    const pal = ['#f2a7c8', '#ffd6e7', '#d97aa5', '#ff9cc8', '#c9708f'];
    cells(g, W, H, k, 4, (x, y) => (x / W + y / H) / 2 * 0.62 + hash(x, y) * 0.38, (x, y) => {
      R(g, x, y, 4, 4, pal[Math.floor(hash(x, y, 2) * 5)]);
      if (hash(x, y, 3) > 0.8) R(g, x + 1, y + 1, 2, 1, '#fff0f6');
    });
  },
  // Lianen und Blätter wachsen von oben herab
  jungle(g, W, H, k, t) {
    if (k > 0.97) R(g, 0, 0, W, H, '#174a18'); // geschlossen: keine Lücken zwischen den Lianen
    for (let x = 0; x < W; x += 5) {
      const delay = hash(x, 1) * 0.3, len = ease(clamp((k - delay) / 0.7)) * H * 1.08;
      const sway = Math.round(Math.sin(t / 700 + x / 9) * 1.5);
      R(g, x + sway, 0, 6, len, hash(x, 2) > 0.5 ? '#1d5a1c' : '#174a18');
      R(g, x + 2 + sway, 0, 1, len, '#2f7a2a');
      for (let y = 6 + Math.floor(hash(x, 3) * 8); y < len; y += 11) { R(g, x - 2 + sway, y, 4, 2, '#3f9a3a'); R(g, x + 4 + sway, y + 5, 4, 2, '#4fb845'); if (hash(x, y) > 0.9) R(g, x + sway, y + 2, 2, 2, '#ffd166'); }
      R(g, x - 1 + sway, len - 3, 8, 4, '#5ab845');
    }
  },
  // Das Burggitter rasselt herab
  castle(g, W, H, k, t) {
    const b = ease(k), bottom = b * (H + 14);
    R(g, 0, 0, W, bottom - 6, '#141418');
    for (let y = (bottom % 22) - 22; y < bottom - 4; y += 22) { R(g, 0, y, W, 4, '#3e3a4a'); R(g, 0, y, W, 1, '#6e6a7c'); }
    for (let x = 4; x < W; x += 16) {
      R(g, x, 0, 6, bottom, '#45434e'); R(g, x, 0, 2, bottom, '#7a7884'); R(g, x + 5, 0, 1, bottom, '#26242e');
      R(g, x + 1, bottom, 4, 3, '#45434e'); R(g, x + 2, bottom + 3, 2, 3, '#7a7884');
    }
  },
  // Nebelbank rollt von beiden Seiten zusammen
  moor(g, W, H, k, t) {
    const pal = ['#7c8474', '#6e786a', '#8a907e', '#606c60'];
    for (let y = 0; y < H; y += 3) {
      const wob = Math.sin(y / 17 + t / 700) * 16 + Math.sin(y / 7 - t / 500) * 7;
      const reach = ease(k) * (W * 0.62) + wob * (k < 1 ? 1 : 0) + (k >= 1 ? W : 0);
      R(g, 0, y, reach, 3, pal[(Math.floor(y / 3) + Math.floor(t / 400)) % 4]);
      R(g, W - reach, y, reach, 3, pal[(Math.floor(y / 3) + 2) % 4]);
    }
  },
  // Nacht steigt auf: Tannen-Silhouetten wachsen, darüber Sterne
  night(g, W, H, k, t) {
    const b = ease(k);
    const layer = (rise, col, sp, off) => { for (let x = 0; x < W; x++) { const saw = Math.abs(((x + off) % sp) - sp / 2) * 1.5; const y = H + 26 - rise * (H + 52) + saw; R(g, x, y, 1, H - y, col); } };
    layer(b, '#14224a', 26, 7);
    layer(clamp(b * 1.2 - 0.2) , '#0a1430', 18, 0);
    if (b > 0.2) for (let i = 0; i < 50; i++) { const x = hash(i, 1) * W, y = H - hash(i, 2) * b * H; if (Math.sin(t / 300 + i) > 0) R(g, x, y, 1, 1, '#fff6d8'); }
  },
  // Lava steigt mit glühender Kruste
  volcano(g, W, H, k, t) {
    rising(g, W, H, k, t, ['#ffcf4a', '#ff9a2a', '#ff6a1a', '#d44a10', '#8a2a08'], '#2a1416', '#ff6a1a');
    for (let i = 0; i < 26; i++) { const ph = (t / 900 + hash(i, 5)) % 1, x = hash(i, 6) * W, y = H * (1.1 - k * 1.2) - ph * 40; if (y > 0) R(g, x, y, 1, 1, ph < 0.5 ? '#ffcf4a' : '#ff6a1a'); }
  },
  // Schwere Tempeltore schließen sich
  temple(g, W, H, k) { doors(g, W, H, ease(k), '#c9a066', '#9c7a4a', '#e0bb80', '#ffd166'); },
  // Frost wächst von den Rändern zur Mitte
  aurora(g, W, H, k) {
    const m = Math.min(W, H) / 2;
    cells(g, W, H, k, 3, (x, y) => (1 - Math.min(Math.min(x, W - x, y * 1.2, (H - y) * 1.2) / m, 1)) * -0.72 + 0.72 + hash(x, y) * 0.28, (x, y) => {
      const s = hash(x, y, 4);
      R(g, x, y, 3, 3, s > 0.8 ? '#ffffff' : s > 0.45 ? '#dceaf8' : '#a8c8e4');
    });
  },
  // Blasen steigen auf und schließen das Bild
  reef(g, W, H, k, t) {
    if (k > 0.55) { g.globalAlpha = clamp((k - 0.55) / 0.4); R(g, 0, 0, W, H, '#0e4e6a'); g.globalAlpha = 1; }
    const maxR = Math.max(W, H) * 0.14;
    for (let i = 0; i < 60; i++) {
      const r = ease(clamp(k * 1.4 - hash(i, 1) * 0.4)) * maxR * (0.5 + hash(i, 2));
      if (r < 1) continue;
      const cx = hash(i, 3) * W + Math.sin(t / 500 + i) * 3, cy = hash(i, 4) * H * 1.2 - k * H * 0.2;
      g.fillStyle = i % 3 ? '#1e7690' : '#2a8aa0'; g.beginPath(); g.arc(Math.round(cx), Math.round(cy), Math.round(r), 0, 7); g.fill();
      R(g, cx - r * 0.4, cy - r * 0.5, Math.max(1, r * 0.25), Math.max(1, r * 0.15), '#bff8ff');
    }
  },
  // Schatten-Tinte breitet sich von der Mitte aus
  shadow(g, W, H, k) {
    const max = Math.hypot(W, H) / 2;
    cells(g, W, H, k, 3, (x, y) => Math.hypot(x - W / 2, y - H / 2) / max * 0.78 + hash(x, y) * 0.22, (x, y) => R(g, x, y, 3, 3, hash(x, y, 5) > 0.93 ? '#7a3fc0' : hash(x, y, 6) > 0.5 ? '#0e0818' : '#1a1030'));
  },
  // Holztore (Lehrzimmer)
  default(g, W, H, k) { doors(g, W, H, ease(k), '#6b4426', '#3a2414', '#9b6a3e', '#c9963f'); },
};

let active = false;

/** Wechselt mit Vorhang zu href. worldChange zeigt dazwischen das Panorama der neuen Welt. */
export function transitionTo(href, { from = 'default', to = from, worldChange = false, label = '', title = '', kicker = '' } = {}) {
  if (active) return;
  if (prefersReducedMotion()) { location.hash = href; return; }
  active = true;
  const wrap = document.createElement('div');
  wrap.className = 'curtain';
  wrap.innerHTML = `<canvas class="curtain-world" hidden></canvas><canvas class="curtain-c"></canvas>
    <div class="curtain-title" hidden><small></small><b></b></div><div class="curtain-label" hidden></div>`;
  document.body.appendChild(wrap);
  const c = wrap.querySelector('.curtain-c'), world = wrap.querySelector('.curtain-world');
  const tEl = wrap.querySelector('.curtain-title'), lEl = wrap.querySelector('.curtain-label');
  tEl.querySelector('small').textContent = kicker; tEl.querySelector('b').textContent = title; lEl.textContent = label;
  const px = Math.max(3, Math.round(Math.min(innerWidth, innerHeight) / 130));
  const W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px);
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  let art = null, skip = false;
  wrap.addEventListener('pointerdown', () => { skip = true; });

  // Ablauf als Stufen: [Dauer, Vorhang, k von, k bis, beim Start]
  const nav = () => { location.hash = href; };
  const stages = worldChange ? [
    { ms: 700, style: from, a: 0, b: 1 },
    { ms: 120, style: from, a: 1, b: 1, enter() { nav(); world.hidden = false; art = mountTitleArt(world, to); } },
    { ms: 520, style: from, a: 1, b: 0, enter() { tEl.hidden = false; play('swipe'); } },
    { ms: 1500, style: from, a: 0, b: 0, canSkip: true },
    { ms: 560, style: to, a: 0, b: 1, enter() { tEl.classList.add('out'); play('swipe'); } },
    { ms: 700, style: to, a: 1, b: 0, enter() { tEl.hidden = true; art?.stop(); art = null; world.hidden = true; } },
  ] : [
    { ms: 460, style: to, a: 0, b: 1 },
    { ms: 240, style: to, a: 1, b: 1, enter() { nav(); if (label) lEl.hidden = false; } },
    { ms: 540, style: to, a: 1, b: 0, enter() { lEl.classList.add('out'); } },
  ];
  play('swipe');
  let i = 0, t0 = performance.now();
  stages[0].enter?.();
  function frame(now) {
    let s = stages[i];
    if (now - t0 >= s.ms || (skip && s.canSkip)) {
      skip = false; i++; t0 = now;
      if (i >= stages.length) { wrap.remove(); active = false; return; }
      s = stages[i]; s.enter?.();
    }
    const p = clamp((now - t0) / s.ms), k = s.a + (s.b - s.a) * p;
    g.clearRect(0, 0, W, H);
    // beim Öffnen läuft derselbe Vorhang rückwärts
    if (k > 0.001) (CURTAINS[s.style] || CURTAINS.default)(g, W, H, k, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
