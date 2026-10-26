// Pixel-Art-Renderer für das Escape-Room-Abenteuer: 16 Pixel pro Feld, Schrägsicht (Wände mit
// Oberseite und Vorderkante), Dielen-/Stein-/Sandböden je Welt, Kisten- und Objekt-Sprites und ein
// Lichtsystem wie bei Minecraft-Shadern: Der Raum ist abgedunkelt, Lichtquellen, Strahlen und
// erfüllte Ziele werfen farbiges, weiches Licht – in groben Blöcken (Lichtkarte in 1/4 Auflösung).
// Gezeichnet wird in einen kleinen Puffer, der ohne Glättung hochskaliert wird.
import { COLOR_INFO, DIRS } from './engine.js';
import { getSkin } from './skins.js';
import { hat as currentHat } from './inventory.js';
import { MARGIN, makeDecor, DecorSteps, drawFlames, drawGlows, drawShafts, drawMotes, shadeMargin } from './roomDecor.js';

export const T = 16; // Pixel pro Feld
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (f < 0 ? v * f : (255 - v) * f)))); return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`; };
const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return hex.length === 4 ? [((n >> 8) & 15) / 15, ((n >> 4) & 15) / 15, (n & 15) / 15] : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const COMP = { 1: '#ff4d6d', 2: '#3ddc97', 4: '#4da3ff' };

const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// Farbpaletten je Welt: Boden (hell/mittel/dunkel), Wandoberseite, Wandfront, Fugen, Leiste,
// Bodenmuster und Dunkelheit (wie dunkel der Raum ohne Licht ist).
export const PIXEL_THEMES = {
  default: { floor: ['#6b4a32', '#5a3d29', '#43301f'], top: '#8a6a4f', face: '#5b4030', dark: '#2e1f15', trim: '#a8835f', pattern: 'planks', dark01: 0.62, ambient: '#0c0814' },
  beach:   { floor: ['#d9b37a', '#c79f64', '#a9824c'], top: '#e8c999', face: '#b98a52', dark: '#7a5531', trim: '#f6e3bd', pattern: 'sand', dark01: 0.25, ambient: '#1a1430' },
  cherry:  { floor: ['#7a5233', '#69462b', '#4f3420'], top: '#a5785a', face: '#6e4a35', dark: '#3c261b', trim: '#f2b7cf', pattern: 'planks', dark01: 0.45, ambient: '#1c0e1e' },
  jungle:  { floor: ['#3e5a2c', '#324b23', '#243818'], top: '#6b7d55', face: '#455438', dark: '#232d1b', trim: '#8fd16a', pattern: 'moss', dark01: 0.55, ambient: '#06140a' },
  night:   { floor: ['#2a3b3a', '#223231', '#172423'], top: '#4f5a4a', face: '#333d31', dark: '#161c16', trim: '#9ad1ff', pattern: 'moss', dark01: 0.78, ambient: '#02060e' },
  volcano: { floor: ['#3a3236', '#2d2629', '#1d181a'], top: '#55494e', face: '#352c30', dark: '#151012', trim: '#ff6a1a', pattern: 'stone', dark01: 0.7, ambient: '#100302' },
  temple:  { floor: ['#9c7a4a', '#87683d', '#6a5130'], top: '#c9a066', face: '#8f6a3b', dark: '#523a1e', trim: '#ffd166', pattern: 'stone', dark01: 0.5, ambient: '#120a04' },
  aurora:  { floor: ['#5f7c9a', '#516b86', '#3f566e'], top: '#e8f2ff', face: '#7d93ac', dark: '#4a5d73', trim: '#4fffb0', pattern: 'ice', dark01: 0.55, ambient: '#020a1e' },
  reef:    { floor: ['#1f6f86', '#185d71', '#114a5a'], top: '#5a6d8a', face: '#3a4a66', dark: '#1d2840', trim: '#ff7a8f', pattern: 'water', dark01: 0.5, ambient: '#021428' },
  castle:  { floor: ['#4a4650', '#3e3a44', '#2c2a32'], top: '#6a6674', face: '#45414e', dark: '#24222a', trim: '#c9963f', pattern: 'stone', dark01: 0.68, ambient: '#08060c' },
  shadow:  { floor: ['#3a3048', '#2f273b', '#211b2a'], top: '#5c5070', face: '#3d3450', dark: '#1d1726', trim: '#b46bff', pattern: 'stone', dark01: 0.8, ambient: '#05020c' },
  moor:    { floor: ['#4a4a32', '#3e3f2a', '#2c2e1e'], top: '#6a6a4a', face: '#4a4a34', dark: '#22241a', trim: '#c8d68a', pattern: 'moss', dark01: 0.66, ambient: '#060a06' },
};

export class PixelRenderer {
  constructor(level) {
    this.level = level;
    // Raum + Rand für Außenwelt und hohe Rückwand; gezeichnet wird in Raumkoordinaten (verschoben um ox/oy)
    this.ox = MARGIN.x * T; this.oy = MARGIN.top * T;
    this.canvas = document.createElement('canvas');
    this.canvas.width = (level.w + 2 * MARGIN.x) * T; this.canvas.height = (level.h + MARGIN.top + MARGIN.bottom) * T;
    this.ctx = this.canvas.getContext('2d');
    /** Bildausschnitt, der auf den Bildschirm passen soll: Raum samt Rückwand (2 Felder). */
    this.view = { x: this.ox, y: this.oy - 2 * T, w: level.w * T, h: (level.h + 2) * T };
    // Lichtkarte in 1/4 Auflösung → grobe, „blockige“ Lichtstufen wie bei Minecraft-Shadern
    this.light = document.createElement('canvas');
    this.light.width = Math.ceil(this.canvas.width / 4); this.light.height = Math.ceil(this.canvas.height / 4);
    this.lctx = this.light.getContext('2d');
    this.static = null; // vorgezeichnete Wände/Böden
  }

  r(x, y, w, h, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- statische Ebene: Boden und Wände (einmal je Welt) ----------
  buildStatic(theme, exit) {
    const { level } = this;
    const themeId = Object.keys(PIXEL_THEMES).find((k) => PIXEL_THEMES[k] === theme) || 'default';
    const { cfg, out } = makeDecor(level, themeId);
    const c = document.createElement('canvas');
    c.width = this.canvas.width; c.height = this.canvas.height;
    const save = this.ctx; this.ctx = c.getContext('2d');
    this.ctx.translate(this.ox, this.oy);
    DecorSteps.outside(this, level, cfg, out);
    for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
      const cell = level.cells[y * level.w + x];
      if (cell.type === 'wall') continue;
      this.floorTile(x, y, theme);
    }
    DecorSteps.rug(this, level, cfg, out);
    DecorSteps.scatter(this, level, cfg, out);
    DecorSteps.backWall(this, level, theme, cfg, exit, out);
    for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
      const i = y * level.w + x;
      if (level.cells[i].type !== 'wall') continue;
      const backFace = y === 0 && x > 0 && x < level.w - 1 && level.cells[level.w + x].type !== 'wall';
      if (backFace) continue; // gehört zur hohen Rückwand
      const furn = out.furn.get(i);
      if (furn) { this.floorTile(x, y, theme); DecorSteps.furniture(this, level, x, y, furn, out); continue; }
      this.wallTile(x, y, theme);
      if ((x === 0 || x === level.w - 1) && y > 0 && y < level.h - 1) DecorSteps.sideCandle(this, level, x, y, out);
    }
    DecorSteps.outsideProps(this, level, cfg, out);
    this.ctx = save;
    this.static = c;
    this.decor = out;
  }

  floorTile(x, y, th) {
    const px = x * T, py = y * T;
    const [a, b, d] = th.floor;
    this.r(px, py, T, T, a);
    if (th.pattern === 'planks') {
      for (let k = 0; k < 3; k++) {
        const yy = py + k * 5 + 5;
        this.r(px, yy, T, 1, d);
        const off = Math.floor(hash(x, y, k) * 12) + 2;
        this.r(px + off, yy - 5, 1, 5, d);
        if (hash(x, y, k + 9) > 0.7) this.r(px + Math.floor(hash(x, k, y) * 13) + 1, yy - 3, 2, 1, b);
      }
    } else if (th.pattern === 'stone') {
      this.r(px, py + 7, T, 1, d); this.r(px + 7, py, 1, 7, d); this.r(px + (hash(x, y) > 0.5 ? 3 : 11), py + 8, 1, 8, d);
      if (hash(x, y, 2) > 0.6) this.r(px + 2 + Math.floor(hash(x, y, 3) * 10), py + 2 + Math.floor(hash(x, y, 4) * 10), 2, 1, b);
    } else if (th.pattern === 'sand') {
      for (let k = 0; k < 7; k++) this.r(px + Math.floor(hash(x, y, k) * 15), py + Math.floor(hash(y, x, k) * 15), 1, 1, k % 2 ? b : d);
    } else if (th.pattern === 'moss') {
      for (let k = 0; k < 5; k++) this.r(px + Math.floor(hash(x, y, k) * 14), py + Math.floor(hash(y, x, k) * 14), 2, 1, k % 2 ? b : d);
      if (hash(x, y, 7) > 0.75) { this.r(px + 5, py + 9, 1, 3, '#5fa83d'); this.r(px + 4, py + 9, 3, 1, '#7bc95a'); }
    } else if (th.pattern === 'ice') {
      this.r(px + 2, py + 3, 4, 1, b); this.r(px + 9, py + 10, 5, 1, b); this.r(px + 1, py + 15, T, 1, d);
    } else if (th.pattern === 'water') {
      this.r(px, py + 15, T, 1, d);
      for (let k = 0; k < 3; k++) this.r(px + Math.floor(hash(x, y, k) * 12), py + 3 + k * 4, 4, 1, b);
    }
    // weiche Kante unter Wänden (Schatten der Wandfront)
    const up = y > 0 && this.level.cells[(y - 1) * this.level.w + x].type === 'wall';
    if (up) { this.ctx.fillStyle = 'rgba(0,0,0,0.28)'; this.ctx.fillRect(px, py, T, 3); }
  }

  wallTile(x, y, th) {
    const { level } = this;
    const px = x * T, py = y * T;
    const below = y + 1 < level.h ? level.cells[(y + 1) * level.w + x].type : 'wall';
    const faceH = below === 'wall' ? 0 : 7;
    // Oberseite
    this.r(px, py, T, T - faceH, th.top);
    this.r(px, py, T, 1, th.trim);
    const left = x > 0 && level.cells[y * level.w + x - 1].type !== 'wall';
    const right = x + 1 < level.w && level.cells[y * level.w + x + 1].type !== 'wall';
    const above = y > 0 && level.cells[(y - 1) * level.w + x].type !== 'wall';
    if (left) this.r(px, py, 1, T - faceH, th.dark);
    if (right) this.r(px + T - 1, py, 1, T - faceH, th.dark);
    if (above) this.r(px, py, T, 2, th.trim);
    if (hash(x, y, 11) > 0.6) this.r(px + 3 + Math.floor(hash(x, y, 12) * 8), py + 3, 3, 1, th.face);
    // Vorderkante (Schrägsicht) mit Ziegelfugen
    if (faceH) {
      const fy = py + T - faceH;
      this.r(px, fy, T, faceH, th.face);
      this.r(px, fy, T, 1, th.dark);
      this.r(px, fy + 3, T, 1, th.dark);
      this.r(px + (x % 2 ? 4 : 10), fy + 1, 1, 2, th.dark);
      this.r(px + (x % 2 ? 11 : 3), fy + 4, 1, 3, th.dark);
      this.r(px, py + T - 1, T, 1, 'rgba(0,0,0,0.35)');
      // Deko an der Wand: Regal, Bild oder Fackelhalter
      const deco = hash(x, y, 5);
      if (deco > 0.86) { this.r(px + 4, fy + 1, 8, 2, '#3b2a1c'); this.r(px + 5, fy, 2, 1, '#c94f4f'); this.r(px + 9, fy, 2, 1, '#4fa3c9'); }
      else if (deco > 0.76) { this.r(px + 5, py + T - faceH - 6, 6, 5, '#2a1d14'); this.r(px + 6, py + T - faceH - 5, 4, 3, th.trim); }
    }
  }

  // ---------- Sprites ----------
  crate(px, py, inner) {
    this.r(px + 1, py + 2, 14, 13, '#3a2416');
    this.r(px + 2, py + 2, 12, 11, '#9b6a3e');
    this.r(px + 2, py + 2, 12, 1, '#c99766');
    this.r(px + 2, py + 12, 12, 1, '#6b4426');
    this.r(px + 2, py + 2, 1, 11, '#6b4426'); this.r(px + 13, py + 2, 1, 11, '#6b4426');
    if (inner) inner(); else { this.r(px + 3, py + 7, 10, 1, '#6b4426'); this.r(px + 7, py + 3, 1, 9, '#6b4426'); }
    this.r(px + 1, py + 15, 14, 1, 'rgba(0,0,0,0.4)');
  }

  diag(px, py, orient, color, dashed = false) {
    for (let k = 0; k < 9; k++) {
      if (dashed && k % 3 === 2) continue;
      const x = px + 3 + k, y = orient === '/' ? py + 11 - k : py + 3 + k;
      this.r(x, y, 2, 1, color);
    }
  }

  glyph(cx, cy, comp, color) {
    const c = color || COMP[comp];
    if (comp === 1) { this.r(cx, cy - 1, 1, 1, c); this.r(cx - 1, cy, 3, 1, c); this.r(cx - 2, cy + 1, 5, 1, c); }
    else if (comp === 2) { this.r(cx - 1, cy - 1, 3, 3, c); this.r(cx - 2, cy, 5, 1, c); this.r(cx, cy - 2, 1, 5, c); }
    else { this.r(cx - 2, cy - 2, 4, 4, c); }
  }
  glyphs(cx, cy, mask, color) {
    const comps = [1, 2, 4].filter((c) => mask & c);
    comps.forEach((c, i) => this.glyph(cx + (i - (comps.length - 1) / 2) * 6, cy, c, color));
  }

  block(b, t) {
    const px = b.x * T, py = b.y * T;
    const sq = b.squash ? Math.round(b.squash * 6) : 0;
    const shift = sq ? DIRS[b.squashDir] : [0, 0];
    const X = px + shift[0] * sq, Y = py + shift[1] * sq;
    if (b.kind === 'stone') {
      this.r(X + 2, Y + 4, 12, 11, '#4b4f5e'); this.r(X + 3, Y + 3, 10, 2, '#7a7f92'); this.r(X + 4, Y + 6, 3, 2, '#8a90a6'); this.r(X + 2, Y + 14, 12, 1, '#25272f');
      return;
    }
    if (b.kind === 'mirror') return this.crate(X, Y, () => { this.r(X + 3, Y + 3, 10, 9, '#2b3550'); this.diag(X, Y, b.orient, '#e8f0ff'); this.diag(X, Y + 1, b.orient, '#8fa2c8'); });
    if (b.kind === 'splitter') return this.crate(X, Y, () => { this.r(X + 3, Y + 3, 10, 9, '#123a44'); this.diag(X, Y, b.orient, '#9ff6ff', true); });
    if (b.kind === 'prism') return this.crate(X, Y, () => { this.r(X + 7, Y + 3, 2, 1, '#ffffff'); this.r(X + 6, Y + 5, 4, 1, '#ff4d6d'); this.r(X + 5, Y + 7, 6, 1, '#ffd166'); this.r(X + 4, Y + 9, 8, 1, '#3ddc97'); this.r(X + 3, Y + 11, 10, 1, '#4da3ff'); });
    if (b.kind === 'filter') return this.crate(X, Y, () => { this.r(X + 3, Y + 3, 10, 9, COLOR_INFO[b.pass]?.hex || '#fff'); this.ctx.globalAlpha = 0.5; this.r(X + 4, Y + 4, 3, 7, '#ffffff'); this.ctx.globalAlpha = 1; this.glyphs(X + 8, Y + 8, b.pass, '#ffffff'); });
    if (b.kind === 'shifter') return this.crate(X, Y, () => { const ph = Math.floor(t / 300) % 3; [1, 2, 4].forEach((c, i) => this.glyph(X + 5 + ((i + ph) % 3) * 3, Y + 6 + (i % 2) * 3, c)); });
    if (b.kind === 'lamp') return this.crate(X, Y, () => { const hex = COLOR_INFO[b.color]?.hex; this.r(X + 5, Y + 4, 6, 7, '#2a1d14'); this.r(X + 6, Y + 5, 4, 5, hex); this.r(X + 7, Y + 6, 2, 2, '#ffffff'); const [dx, dy] = DIRS[b.dir]; this.r(X + 7 + dx * 5, Y + 7 + dy * 5, 2, 2, hex); });
    this.crate(X, Y);
  }

  // Lichtquelle als alte Laterne: Messingdach, Glas mit flackernder Flamme in der Lichtfarbe,
  // ein kleiner Trieb zeigt, in welche Richtung die Ranke wächst.
  emitter(x, y, c, t = 0) {
    const px = x * T, py = y * T, hex = COLOR_INFO[c.color]?.hex || '#fff';
    this.r(px + 7, py, 2, 2, '#3a2a14');                         // Aufhängung
    this.r(px + 4, py + 2, 8, 2, '#b8893a'); this.r(px + 5, py + 1, 6, 1, '#d9a94e'); // Dach
    this.r(px + 4, py + 4, 8, 8, '#3a2a14');                      // Rahmen
    this.r(px + 5, py + 4, 6, 7, shade(hex, -0.55));             // Glas
    const fl = Math.floor(t / 140) % 3;
    this.r(px + 7, py + 6 + (fl === 1 ? 1 : 0), 2, 4 - (fl === 1 ? 1 : 0), hex); // Flamme
    this.r(px + 7, py + 8, 2, 2, '#fff6b0');
    this.r(px + 4, py + 12, 8, 2, '#b8893a');                     // Boden
    const [dx, dy] = DIRS[c.dir];                                 // Trieb in Wuchsrichtung
    this.r(px + 7 + dx * 6, py + 8 + dy * 6, 2, 2, '#5fae4a');
  }

  // Ziel = Blumentopf: geschlossene Knospe (zeigt die gewünschte Farbe als Formsymbol am Topf);
  // richtiges Licht → Blüte öffnet sich in der Farbe; falsches Licht → Blüte welkt (hängt, grau-rot).
  target(x, y, c, info, t) {
    const px = x * T, py = y * T, hex = COLOR_INFO[c.need]?.hex || '#fff';
    const ok = info?.ok, wrong = info && info.got && !info.ok;
    // Topf aus Terrakotta
    this.r(px + 3, py + 10, 10, 5, '#5a2e1c'); this.r(px + 4, py + 10, 8, 4, '#b5623a'); this.r(px + 3, py + 9, 10, 2, '#d17a4a');
    this.r(px + 4, py + 9, 8, 1, '#3a2010');
    this.glyphs(px + 8, py + 12, c.need, '#ffe0c8'); // Wunschfarbe als Symbol am Topf
    // Stängel
    const sway = Math.floor(t / 700) % 2;
    const stemTop = wrong ? py + 6 : py + 4;
    this.r(px + 7 + (wrong ? 1 : 0), stemTop, 2, py + 9 - stemTop, '#2f6b2a');
    this.r(px + 5, py + 7, 2, 1, '#4f9e3c'); this.r(px + 9, py + 6, 2, 1, '#4f9e3c');
    if (ok) {
      // offene Blüte: Blätter in der Lichtfarbe, heller Kern
      const cx = px + 8 + (sway ? 0 : 0), cy = py + 3;
      this.r(cx - 4, cy - 1, 8, 3, hex); this.r(cx - 2, cy - 3, 4, 7, hex);
      this.r(cx - 3, cy - 2, 1, 1, shade(hex, 0.4)); this.r(cx + 2, cy + 1, 1, 1, shade(hex, -0.3));
      this.r(cx - 1, cy, 2, 2, '#fff6b0');
    } else if (wrong) {
      // welke, hängende Blüte
      this.r(px + 9, py + 6, 3, 3, '#7a5a5e'); this.r(px + 10, py + 9, 2, 1, '#5a3a3e');
    } else {
      // geschlossene Knospe mit Farbspitze
      this.r(px + 6, py + 2, 4, 4, '#3f8f34'); this.r(px + 7, py + 1, 2, 2, hex);
    }
  }

  sensor(x, y, c, info) {
    const px = x * T, py = y * T, hex = COLOR_INFO[c.need]?.hex || '#fff';
    const on = info?.ok;
    for (let k = 0; k < 6; k++) { this.r(px + 8 - k, py + 2 + k, k * 2 + 1, 1, on ? hex : '#2a2230'); this.r(px + 8 - k, py + 13 - k, k * 2 + 1, 1, on ? hex : '#2a2230'); }
    this.r(px + 7, py + 6, 2, 2, on ? '#1a1622' : hex); this.r(px + 7, py + 8, 2, 2, on ? '#1a1622' : hex);
    this.r(px + 12, py + 1, 3, 3, '#ffffff');
  }

  door(x, y, open) {
    const px = x * T, py = y * T;
    if (open) { this.r(px + 1, py + 1, 14, 2, '#8a8f9e'); return; }
    this.r(px + 1, py + 1, 14, 2, '#5a5f6e');
    for (let k = 0; k < 4; k++) { this.r(px + 2 + k * 4, py + 1, 2, 14, '#9aa0b2'); this.r(px + 2 + k * 4, py + 1, 1, 14, '#c8cdd8'); }
    this.r(px + 1, py + 8, 14, 1, '#5a5f6e');
  }

  flip(x, y, c, pressed) {
    const px = x * T, py = y * T;
    const orient = pressed ? (c.orient === '/' ? '\\' : '/') : c.orient;
    this.r(px + 1, py + 1, 14, 14, '#2a3a4a'); this.r(px + 2, py + 2, 12, 12, '#3d5266');
    this.diag(px, py, orient, '#e8f0ff');
    this.r(px + 12, py + 12, 3, 3, pressed ? '#4ff0ff' : '#1f7f8f');
  }

  plate(x, y, pressed) {
    const px = x * T, py = y * T;
    this.r(px + 3, py + 5, 10, 7, '#2a2a33'); this.r(px + 4, py + (pressed ? 7 : 5), 8, pressed ? 4 : 5, pressed ? '#4ff0ff' : '#5fa8b8');
  }

  portal(x, y, c, t) {
    const px = x * T, py = y * T;
    const hue = { A: '#ff7af0', B: '#7affc8', C: '#ffb86b' }[c.pair] || '#c9a7ff';
    this.r(px + 2, py + 2, 12, 12, '#120a24');
    const ph = Math.floor(t / 120) % 8;
    for (let k = 0; k < 8; k++) { const a = ((k + ph) / 8) * Math.PI * 2; this.r(px + 7 + Math.round(Math.cos(a) * 5), py + 7 + Math.round(Math.sin(a) * 5), 2, 2, k % 2 ? hue : '#ffffff'); }
  }

  flowTile(x, y, dir, t) {
    const px = x * T, py = y * T;
    this.ctx.fillStyle = 'rgba(60,200,220,0.25)'; this.ctx.fillRect(px + 1, py + 1, 14, 14);
    const ph = Math.floor(t / 150) % 4;
    for (let k = 0; k < 3; k++) {
      const o = ((k * 5 + ph) % 14) + 1;
      const [dx, dy] = DIRS[dir];
      const cx = dx ? px + (dx > 0 ? o : 15 - o) : px + 7, cy = dy ? py + (dy > 0 ? o : 15 - o) : py + 7;
      this.r(cx, cy, 2, 2, '#9ff6ff');
    }
  }

  iceTile(x, y) {
    const px = x * T, py = y * T;
    this.ctx.fillStyle = 'rgba(190,235,255,0.45)'; this.ctx.fillRect(px + 1, py + 1, 14, 14);
    this.r(px + 3, py + 4, 4, 1, '#ffffff'); this.r(px + 8, py + 10, 5, 1, '#ffffff');
  }

  // ---------- Spielfigur (Pixel-Held mit Animationen) ----------
  // p: { x, y, dir, walk (0..1 Schrittphase oder null), push (0..1 Kraftaufwand), stamina (0..1),
  //      exhausted, bump (0..1 Rückstoß), celebrate (0..1), caught, idle (ms ohne Eingabe) }
  // Jeder Körperteil bekommt eine 1-Pixel-Kontur, damit die Figur sich vom Boden abhebt.
  part(x, y, w, h, c) { this.r(x - 1, y - 1, w + 2, h + 2, '#120a1c'); this.r(x, y, w, h, c); }

  player(p, t) {
    const skin = getSkin();
    const body = skin.color.stops[Math.min(1, skin.color.stops.length - 1)];
    const light = skin.color.stops[0];
    const dark = shade(body, -0.35);
    const [dx, dy] = DIRS[p.dir];
    const side = dx !== 0, back = dy === -1;
    let px = Math.round(p.x * T), py = Math.round(p.y * T);
    const walking = p.walk != null;
    const phase = walking ? Math.floor(p.walk * 4) % 4 : 0;
    const breath = !walking && !p.push ? (Math.floor(t / 700) % 2) : 0;
    const strain = p.push ? 1 : 0;
    // Rückstoß beim Anstoßen, Freudensprung, Zittern beim Schieben
    if (p.bump) { px -= Math.round(dx * p.bump * 3); py -= Math.round(dy * p.bump * 3); }
    let jump = 0;
    if (p.celebrate) jump = Math.round(Math.sin(p.celebrate * Math.PI * 3) ** 2 * 5);
    if (strain && Math.floor(t / 60) % 2) px += dx ? 0 : 1;
    const lean = strain ? 2 : walking ? 1 : 0; // Körper neigt sich in Laufrichtung
    const lx = dx * lean, ly = dy * lean;
    // Schatten
    this.ctx.fillStyle = 'rgba(0,0,0,0.45)'; this.ctx.fillRect(px + 3, py + 14, 10, 2);
    py -= jump;
    // Beine / Stiefel (Schrittzyklus; beim Schieben stemmt sich das hintere Bein ab)
    const legA = walking ? [0, -1, 0, 1][phase] : 0, legB = -legA;
    if (side) {
      const back1 = strain ? -3 * dx : legA * dx * 2, front1 = strain ? 1 * dx : legB * dx * 2;
      this.part(px + 6 + back1, py + 12, 2, 2, '#3a2a20');
      this.part(px + 8 + front1, py + 12, 2, 2, '#4a3628');
    } else {
      this.part(px + 5, py + 12 + (legA > 0 ? 0 : legA), 2, 2 - (legA < 0 ? legA : 0), '#3a2a20');
      this.part(px + 9, py + 12 + (legB > 0 ? 0 : legB), 2, 2 - (legB < 0 ? legB : 0), '#3a2a20');
    }
    // Umhang / Körper
    const by = py + 7 + breath;
    this.part(px + 4 + lx, by, 8, 5 - breath, dark);
    this.r(px + 5 + lx, by, 6, 4 - breath, body);
    this.r(px + 7 + lx, by + 1, 2, 1, light); // Brosche
    // Arme: normal schwingend; beim Schieben nach vorne gestreckt
    if (strain) {
      if (side) { this.part(px + (dx > 0 ? 11 : 1) + lx, by + 1, 4, 2, body); }
      else { this.part(px + 3 + lx, by + (dy > 0 ? 3 : -1), 2, 3, body); this.part(px + 11 + lx, by + (dy > 0 ? 3 : -1), 2, 3, body); }
    } else if (!side) {
      const sw = walking ? [0, 1, 0, -1][phase] : 0;
      this.part(px + 3, by + 1 + sw, 1, 3, dark); this.part(px + 12, by + 1 - sw, 1, 3, dark);
    } else {
      const sw = walking ? [0, 1, 0, -1][phase] : 0;
      this.part(px + 7 + sw * dx + lx, by + 1, 2, 3, dark);
    }
    // Kopf mit Kapuze
    const hx = px + 4 + lx + (side ? dx : 0), hy = py + 1 + ly + breath;
    this.part(hx, hy, 8, 7, body);
    this.r(hx, hy, 8, 1, light);
    if (!back) {
      // Gesicht: blinzeln, erschrocken, angestrengt, erschöpft
      const fx = hx + (side ? (dx > 0 ? 3 : 1) : 2), fy = hy + 2;
      this.r(fx, fy, side ? 4 : 4, 4, '#ffe0bd');
      const blink = Math.floor(t / 90) % 40 === 0;
      const eye = '#1a1022';
      if (p.caught) { this.r(fx, fy, 2, 2, '#ffffff'); this.r(fx + (side ? 2 : 2), fy, 2, 2, '#ffffff'); this.r(fx + 1, fy + 3, 2, 1, eye); }
      else if (strain || p.exhausted) { this.r(fx, fy + 1, 2, 1, eye); if (!side) this.r(fx + 2, fy + 1, 2, 1, eye); this.r(fx + 1, fy + 3, 2, 1, '#c9505a'); }
      else if (!blink) { this.r(fx + (side ? (dx > 0 ? 2 : 0) : 0), fy + 1, 1, 2, eye); if (!side) this.r(fx + 3, fy + 1, 1, 2, eye); }
      else { this.r(fx, fy + 2, side ? 2 : 4, 1, eye); }
      if (p.yawn) this.r(fx + 1, fy + 3, 2, 1, '#5a2030');
    }
    this.hat(p.hat ?? currentHat(), hx, hy, t);
    // Laterne (Lichtquelle der Figur) – auf der Seite der Blickrichtung
    const lanX = px + (side ? (dx > 0 ? 13 : 1) : 12) + (strain && side ? dx * 2 : 0), lanY = by + 2;
    this.part(lanX, lanY, 2, 3, '#ffe9a8'); this.r(lanX, lanY + 1, 1, 1, '#ffffff');
    // Schweiß: Tropfen spritzen beim Schieben und bei Erschöpfung
    if (strain || p.exhausted) {
      for (let k = 0; k < 3; k++) {
        const ph = ((t / 420) + k / 3) % 1;
        const sx = hx + (k === 1 ? 9 : -2) + Math.round((k === 1 ? 1 : -1) * ph * 4);
        const sy = hy - 1 + Math.round(ph * ph * 8 - ph * 4);
        this.ctx.globalAlpha = 1 - ph; this.r(sx, sy, 1, 2, '#9fd8ff'); this.ctx.globalAlpha = 1;
      }
    }
    // Atemwölkchen bei Erschöpfung
    if (p.exhausted) { const ph = (t / 500) % 1; this.ctx.globalAlpha = 1 - ph; this.r(hx + 8 + ph * 4, hy + 4 - ph * 3, 2, 2, '#ffffff'); this.ctx.globalAlpha = 1; }
    // Sprechblasen: „!“ erwischt, „?“ beim Warten, „Puh!“ erschöpft
    if (p.caught) this.bubble(hx + 4, hy - 7, '!');
    else if (p.exhausted) this.bubble(hx + 4, hy - 7, '~');
    else if (p.yawn) this.bubble(hx + 4, hy - 7, '?');
    // Kraftleiste über dem Kopf, wenn nicht voll
    if (p.stamina != null && p.stamina < 0.999) {
      const bw = 12, fill = Math.round(bw * p.stamina);
      this.r(px + 2, hy - 4, bw + 2, 3, '#120a1c');
      this.r(px + 3, hy - 3, fill, 1, p.stamina < 0.3 ? '#ff5f6d' : p.stamina < 0.6 ? '#ffd166' : '#7dff6a');
    }
  }

  /** Hüte vom Hutmacher, auf den Kopf (hx, hy = linke obere Ecke der Kapuze, 8 px breit). */
  hat(id, hx, hy, t) {
    if (!id) return;
    const R = (x, y, w, h, c) => this.r(hx + x, hy + y, w, h, c);
    if (id === 'straw') { R(-2, 0, 12, 2, '#3a2a10'); R(-1, 0, 10, 1, '#e8c86a'); R(1, -3, 6, 3, '#d8b050'); R(1, -1, 6, 1, '#c94f4f'); R(2, -3, 2, 1, '#f2dc8a'); }
    else if (id === 'crown') { R(1, -2, 6, 3, '#c98a00'); R(1, -2, 6, 2, '#ffd166'); R(1, -4, 1, 2, '#ffd166'); R(3, -5, 2, 3, '#ffd166'); R(6, -4, 1, 2, '#ffd166'); R(3, -1, 2, 1, '#ff4d6d'); if (Math.floor(t / 500) % 4 === 0) R(4, -5, 1, 1, '#ffffff'); }
    else if (id === 'flowers') { R(0, 0, 8, 1, '#3f8a3a'); [['#ff9cc8', 0], ['#fff6b0', 3], ['#ffffff', 6]].forEach(([c, x]) => { R(x, -1, 2, 2, c); R(x, -1, 1, 1, '#ffd166'); }); }
    else if (id === 'leaf') { R(3, -1, 1, 2, '#2f6b2a'); R(2, -4, 4, 3, '#5ab845'); R(3, -5, 2, 1, '#5ab845'); R(4, -4, 1, 3, '#3f8a3a'); }
    else if (id === 'mushroom') { R(-1, -2, 10, 3, '#a83a3a'); R(0, -3, 8, 1, '#c94f4f'); R(1, -2, 2, 1, '#ffffff'); R(5, -3, 2, 1, '#ffffff'); R(7, -1, 1, 1, '#ffffff'); }
    else if (id === 'pirate') { R(-2, -1, 12, 2, '#1a1a20'); R(0, -3, 8, 2, '#24242c'); R(3, -3, 2, 2, '#ffffff'); R(3, -2, 1, 1, '#1a1a20'); }
    else if (id === 'wizard') { R(-1, -1, 10, 2, '#3a2a6a'); R(1, -3, 6, 2, '#5a3a9a'); R(2, -5, 4, 2, '#5a3a9a'); R(3, -7, 2, 2, '#5a3a9a'); R(4, -8, 2, 1, '#5a3a9a'); R(2, -3, 1, 1, '#ffd166'); R(5, -5, 1, 1, '#ffd166'); }
  }

  bubble(cx, y, ch) {
    this.r(cx - 3, y - 1, 7, 6, '#120a1c'); this.r(cx - 2, y, 5, 4, '#ffffff'); this.r(cx, y + 4, 1, 2, '#120a1c');
    const c = '#120a1c';
    if (ch === '!') { this.r(cx, y + 0, 1, 2, c); this.r(cx, y + 3, 1, 1, c); }
    else if (ch === '?') { this.r(cx - 1, y, 2, 1, c); this.r(cx + 1, y + 1, 1, 1, c); this.r(cx, y + 2, 1, 1, c); this.r(cx, y + 3, 1, 1, c); }
    else { this.r(cx - 2, y + 1, 1, 1, c); this.r(cx - 1, y + 2, 1, 1, c); this.r(cx, y + 1, 1, 1, c); this.r(cx + 1, y + 2, 1, 1, c); this.r(cx + 2, y + 1, 1, 1, c); }
  }

  /** Statt Feuerwerk: Beim Entkommen sprießen Blumen aus dem Boden rund um die Figur und
   *  Blütenblätter steigen von den Zielen und der Tür auf (bloom = { t0, cx, cy, sources }). */
  bloomFx(bloom, t) {
    const { level } = this;
    const k = (t - bloom.t0) / 1000;
    if (k < 0 || k > 3) return;
    // sprießende Blumen auf freien Bodenfeldern im ganzen Raum – zuerst nahe der Tür, dann nach außen
    for (let n = 0; n < 40; n++) {
      const fx = 1 + Math.floor(hash(n, 3) * (level.w - 2)), fy = 1 + Math.floor(hash(n, 5) * (level.h - 2));
      const c = level.cells[fy * level.w + fx];
      if (!c || c.type !== 'empty') continue;
      const delay = Math.hypot(fx - bloom.cx, fy - bloom.cy) * 0.09 + hash(n, 9) * 0.2;
      const g = Math.max(0, Math.min(1, (k - delay) / 0.4));
      if (!g) continue;
      const px = fx * T + 3 + Math.floor(hash(n, 11) * 10), py = fy * T + 12;
      const h = Math.round(g * 5);
      this.r(px, py - h, 1, h, '#2f6b2a');
      if (g >= 1) {
        const col = ['#ff9cc8', '#fff6b0', '#ffffff', '#c9a7ff', '#ffb36b'][n % 5];
        this.r(px - 1, py - h - 1, 3, 1, col); this.r(px, py - h - 2, 1, 3, col); this.r(px, py - h - 1, 1, 1, '#ffd166');
      }
    }
    // Blütenblätter steigen auf und trudeln
    for (const s of bloom.sources) {
      for (let n = 0; n < 7; n++) {
        const ph = k * 0.8 + hash(n, s.x * 7 + s.y) * 0.5;
        if (ph > 1.6) continue;
        const px = s.x * T + 8 + Math.sin(ph * 6 + n) * 6 + (hash(n, 2) - 0.5) * 10, py = s.y * T + 6 - ph * 28;
        this.ctx.globalAlpha = Math.max(0, 1 - ph / 1.6);
        this.r(px, py, 2, 1, n % 2 ? '#ff9cc8' : '#ffd6e7'); this.r(px + (Math.floor(ph * 10) % 2), py + 1, 1, 1, '#ff7ab6');
        this.ctx.globalAlpha = 1;
      }
    }
  }

  /** Staubwölkchen (beim Schieben, Anstoßen, Landen). */
  dust(list, t) {
    for (const d of list) {
      const k = Math.min(1, (t - d.t0) / 450);
      if (k >= 1) continue;
      this.ctx.globalAlpha = (1 - k) * 0.8;
      for (let n = 0; n < 4; n++) {
        const a = d.a + (n - 1.5) * 0.6;
        this.r(d.x * T + Math.cos(a) * k * 7, d.y * T + Math.sin(a) * k * 4 - k * 3, 2, 2, n % 2 ? '#d8cbb8' : '#a89880');
      }
      this.ctx.globalAlpha = 1;
    }
  }

  enemy(e, t) {
    const px = Math.round(e.x * T), py = Math.round(e.y * T);
    const bob = Math.floor(t / 220 + e.x * 3) % 2;
    this.r(px + 3, py + 3 + bob, 10, 9, '#2a0f40'); this.r(px + 4, py + 2 + bob, 8, 1, '#2a0f40');
    for (let k = 0; k < 5; k++) this.r(px + 3 + k * 2, py + 12 + bob + ((k + Math.floor(t / 150)) % 2), 2, 2, '#2a0f40');
    const [dx] = DIRS[e.dir];
    this.r(px + 5 + dx, py + 6 + bob, 2, 2, '#ff5cf0'); this.r(px + 9 + dx, py + 6 + bob, 2, 2, '#ff5cf0');
  }

  exitDoor(ex, open, t) {
    const px = ex.x * T;
    let py = ex.y * T;
    if (ex.y === 0) { // Tür in der hohen Rückwand: höher, mit Rahmen und Türsturz
      this.r(px + 1, py - 12, 14, 28, '#2a1a10'); this.r(px, py - 14, 16, 3, '#6b4a2a'); this.r(px + 6, py - 13, 4, 1, '#ffd166');
      this.r(px + 2, py - 10, 12, 11, open ? '#0c0a14' : '#7a4f2c');
      if (!open) { this.r(px + 7, py - 10, 1, 11, '#3a2416'); this.r(px + 3, py - 6, 10, 1, '#5a3a22'); }
      else { this.r(px + 4, py - 8, 8, 9, Math.floor(t / 150) % 2 ? '#bff8f0' : '#9ff0e8'); this.r(px + 6, py - 6, 4, 7, '#ffffff'); }
    }
    if (open) {
      this.r(px + 2, py + 1, 12, 15, '#0c0a14');
      const g = Math.floor(t / 150) % 2;
      this.r(px + 4, py + 3, 8, 12, g ? '#bff8f0' : '#9ff0e8');
      this.r(px + 6, py + 5, 4, 9, '#ffffff');
    } else {
      this.r(px + 2, py + 1, 12, 15, '#3a2416'); this.r(px + 3, py + 2, 10, 13, '#7a4f2c');
      this.r(px + 7, py + 2, 1, 13, '#3a2416'); this.r(px + 10, py + 8, 2, 2, '#ffd166');
    }
  }

  /** Moor: Grube (dunkles Wasser mit Blasen), gefüllt = Trittstein, brüchiger Boden mit Rissen,
   *  eingebrochen = frische Grube mit Bröseln am Rand. */
  bog(x, y, c, filled, broken, t) {
    const px = x * T, py = y * T;
    if (filled) {
      this.r(px + 1, py + 1, 14, 14, '#2a2a20'); this.r(px + 2, py + 2, 12, 11, '#7a7a6a'); this.r(px + 2, py + 2, 12, 2, '#9a9a88');
      this.r(px + 4, py + 6, 3, 1, '#5a5a4a'); this.r(px + 9, py + 9, 3, 1, '#5a5a4a'); this.r(px + 1, py + 13, 14, 2, '#3a4a2a');
      return;
    }
    if (c.crumble && !broken) {
      this.r(px + 1, py + 1, 14, 14, 'rgba(60,40,20,0.35)');
      this.r(px + 3, py + 4, 4, 1, '#2a1a0a'); this.r(px + 6, py + 5, 1, 3, '#2a1a0a'); this.r(px + 7, py + 8, 4, 1, '#2a1a0a'); this.r(px + 10, py + 9, 1, 3, '#2a1a0a');
      this.r(px + 2, py + 11, 3, 1, '#2a1a0a'); this.r(px + 12, py + 3, 1, 2, '#2a1a0a');
      return;
    }
    this.r(px, py, T, T, '#1a2418'); this.r(px + 1, py + 1, 14, 14, '#16302a'); this.r(px + 2, py + 3, 12, 11, '#1f4a3c');
    this.r(px + 1, py + 1, 14, 2, '#0e1a14');
    const w = Math.floor(t / 400 + x * 3) % 4;
    this.r(px + 4 + w, py + 7, 3, 1, '#3f7a5c'); this.r(px + 9 - w, py + 10, 2, 1, '#3f7a5c');
    const b = ((t / 900) + x * 0.37 + y * 0.21) % 1;
    if (b < 0.3) this.r(px + 6 + (x % 3), py + 8 - Math.floor(b * 10), 1, 1, '#9fd8b8');
    if (broken) { this.r(px, py, 3, 2, '#5a3a22'); this.r(px + 12, py + 1, 3, 2, '#5a3a22'); this.r(px + 2, py + 14, 4, 2, '#5a3a22'); }
    else { this.r(px + 2, py + 13, 2, 3, '#3f8a3a'); this.r(px + 12, py + 12, 2, 4, '#3f8a3a'); this.r(px + 12, py + 11, 2, 1, '#c9a35a'); }
  }

  /** Block versinkt: Spritzer und Ringe. */
  sinkFx(s, t) {
    const k = Math.min(1, (t - s.t0) / 600), px = s.x * T, py = s.y * T;
    this.ctx.globalAlpha = 1 - k;
    for (let n = 0; n < 6; n++) { const a = (n / 6) * Math.PI * 2; this.r(px + 8 + Math.cos(a) * k * 9, py + 8 + Math.sin(a) * k * 5 - Math.sin(k * Math.PI) * 6, 2, 2, '#9fd8b8'); }
    this.r(px + 8 - k * 7, py + 9, k * 14, 1, '#bff8e0');
    this.ctx.globalAlpha = 1;
  }

  /** Schlüssel auf dem Boden: goldener Bart, wippt und funkelt. */
  keyItem(x, y, t) {
    const px = x * T, py = y * T + Math.round(Math.sin(t / 300 + x) * 1.5);
    this.r(px + 4, py + 12, 9, 2, 'rgba(0,0,0,0.25)');
    this.r(px + 3, py + 5, 5, 5, '#7a5200'); this.r(px + 4, py + 6, 3, 3, '#ffd166'); this.r(px + 5, py + 7, 1, 1, '#7a5200');
    this.r(px + 8, py + 7, 6, 1, '#ffd166'); this.r(px + 8, py + 8, 6, 1, '#c98a00');
    this.r(px + 11, py + 9, 1, 2, '#ffd166'); this.r(px + 13, py + 9, 1, 3, '#ffd166');
    if (Math.floor(t / 400 + x) % 5 === 0) this.r(px + 5, py + 4, 1, 1, '#ffffff');
  }

  /** Gittertor: eiserne Stäbe mit goldenem Schloss; offen = Stäbe hochgezogen. */
  gate(x, y, open, t) {
    const px = x * T, py = y * T;
    this.r(px, py - 4, 2, 20, '#3a3a44'); this.r(px + 14, py - 4, 2, 20, '#3a3a44'); this.r(px, py - 5, 16, 2, '#4a4a54');
    if (open) {
      for (let k = 0; k < 5; k++) this.r(px + 2 + k * 3, py - 4, 1, 4, '#6a6a78');
      this.r(px + 2, py, 12, 1, '#2a2a34');
      return;
    }
    for (let k = 0; k < 5; k++) { this.r(px + 2 + k * 3, py - 3, 2, 18, '#5a5a68'); this.r(px + 2 + k * 3, py - 3, 1, 18, '#8a8a98'); }
    this.r(px + 1, py + 3, 14, 2, '#4a4a54'); this.r(px + 1, py + 11, 14, 2, '#4a4a54');
    this.r(px + 5, py + 5, 6, 6, '#c98a00'); this.r(px + 6, py + 6, 4, 4, '#ffd166'); this.r(px + 7, py + 7, 2, 2, '#2a1a08'); this.r(px + 7.5, py + 9, 1, 1, '#2a1a08');
    if (Math.floor(t / 600) % 4 === 0) this.r(px + 6, py + 6, 1, 1, '#ffffff');
  }

  /** Abenteuer-Fundstücke: Münze (dreht sich), Dietrich, Kraftbrot, Wegrolle, Lupe. */
  loot(it, t) {
    if (it.got) return;
    const px = it.x * T, py = it.y * T + Math.round(Math.sin(t / 260 + it.x * 2) * 1.5);
    this.r(px + 5, py + 12, 7, 2, 'rgba(0,0,0,0.25)');
    if (it.kind === 'coin') {
      const w = [6, 4, 2, 4][Math.floor(t / 140 + it.x) % 4];
      this.r(px + 8 - w / 2, py + 5, w, 6, '#c98a00'); this.r(px + 8 - w / 2 + (w > 2 ? 1 : 0), py + 6, Math.max(1, w - 2), 4, '#ffd166');
      if (w === 6) this.r(px + 7, py + 7, 1, 2, '#c98a00');
    } else if (it.kind === 'pick') {
      this.r(px + 4, py + 6, 3, 3, '#a0a0aa'); this.r(px + 7, py + 7, 6, 1, '#c0c0c8'); this.r(px + 12, py + 6, 1, 2, '#c0c0c8');
    } else if (it.kind === 'bread') {
      this.r(px + 4, py + 6, 8, 5, '#c98a3a'); this.r(px + 5, py + 5, 6, 1, '#e0a050'); this.r(px + 6, py + 7, 1, 1, '#f3e1b8'); this.r(px + 9, py + 7, 1, 1, '#f3e1b8');
    } else if (it.kind === 'scroll') {
      this.r(px + 4, py + 5, 8, 6, '#f3e1b8'); this.r(px + 3, py + 5, 1, 6, '#c9a35a'); this.r(px + 12, py + 5, 1, 6, '#c9a35a'); this.r(px + 5, py + 7, 6, 1, '#6b4a22');
    } else if (it.kind === 'lens') {
      this.r(px + 4, py + 4, 6, 6, '#6b4a22'); this.r(px + 5, py + 5, 4, 4, '#bfe8ff'); this.r(px + 9, py + 9, 3, 3, '#6b4a22');
    }
  }

  /** Schatztruhe in einer Wandnische (Seitenwand). */
  chest(c, t) {
    const px = c.x * T, py = c.y * T;
    this.r(px + 1, py + 2, 14, 13, '#1a0f08');
    this.r(px + 2, py + 7, 12, 7, '#6b4426'); this.r(px + 2, py + 13, 12, 1, '#3a2414');
    if (c.open) {
      this.r(px + 2, py + 2, 12, 3, '#9b6a3e'); this.r(px + 3, py + 5, 10, 2, '#2a1a08');
      if (t - (c.t0 || 0) < 1500) for (let k = 0; k < 5; k++) this.r(px + 4 + k * 2, py + 4 - ((t / 60 + k * 7) % 10), 1, 1, '#ffd166');
    } else {
      this.r(px + 2, py + 3, 12, 4, '#9b6a3e'); this.r(px + 2, py + 3, 12, 1, '#c99766');
      this.r(px + 7, py + 6, 2, 3, '#ffd166'); this.r(px + 4, py + 3, 1, 11, '#c98a00'); this.r(px + 11, py + 3, 1, 11, '#c98a00');
      if (Math.floor(t / 500) % 6 === 0) this.r(px + 12, py + 3, 1, 1, '#ffffff');
    }
  }

  /** Hinweisschild an der Rückwand (Pergament auf Holzbrett). */
  signBoard(s, t) {
    const px = s.x * T, py = s.y * T;
    this.r(px + 1, py - 1, 14, 11, '#3a2414'); this.r(px + 2, py, 12, 9, '#c99766'); this.r(px + 3, py + 1, 10, 7, '#f3e1b8');
    for (let k = 0; k < 3; k++) this.r(px + 4, py + 2 + k * 2, 5 + (k % 2) * 3, 1, '#6b4a22');
    this.r(px + 7, py + 10, 2, 3, '#3a2414');
    if (!s.read && Math.floor(t / 400) % 2) { this.r(px + 12, py - 6, 2, 4, '#ffd166'); this.r(px + 12, py - 1, 2, 2, '#ffd166'); }
  }

  fragment(f, t) {
    const px = f.x * T, py = f.y * T - (Math.floor(t / 250) % 2);
    this.r(px + 7, py + 3, 2, 1, '#ffffff'); this.r(px + 6, py + 4, 4, 5, '#9ff6ff'); this.r(px + 7, py + 9, 2, 2, '#4fc3d8'); this.r(px + 7, py + 5, 1, 2, '#ffffff');
  }

  // Licht als leuchtende Ranken: Statt Laserstrahlen wächst aus jeder Lampe eine Ranke den Lichtweg
  // entlang – Stängel mit leichtem Schwung, Blätter abwechselnd links/rechts, leuchtende Blüten in der
  // Lichtfarbe (Form je Farbe: Rot ▲, Grün ●, Blau ■). grow = sichtbare Länge in Feldern (Wachsen).
  beams(beams, t, grow = Infinity) {
    for (const beam of beams) {
      const hex = COLOR_INFO[beam.color]?.hex || '#fff';
      const comps = [1, 2, 4].filter((c) => beam.color & c);
      const seed = Math.floor((beam.points[0][0] * 7 + beam.points[0][1] * 13) * 10);
      let dist = 0;
      const limit = grow * T;
      for (let i = 1; i < beam.points.length && dist < limit; i++) {
        const [x0, y0] = beam.points[i - 1], [x1, y1] = beam.points[i];
        const sx = x0 * T, sy = y0 * T, ex = x1 * T, ey = y1 * T;
        const len = Math.hypot(ex - sx, ey - sy);
        const ux = (ex - sx) / (len || 1), uy = (ey - sy) / (len || 1);
        const nx = -uy, ny = ux; // quer zur Wuchsrichtung
        for (let s = 0; s <= len && dist < limit; s += 1, dist += 1) {
          const sway = Math.round(Math.sin((dist + seed) / 5) * 1.5 + Math.sin(t / 900 + dist / 9) * 0.5);
          const px = Math.round(sx + ux * s + nx * sway), py = Math.round(sy + uy * s + ny * sway);
          this.r(px - 1, py - 1, 2, 2, '#1f4a22');            // Stängel
          this.r(px - 1, py - 1, 1, 1, '#5fae4a');            // Lichtkante
          const k = Math.round(dist);
          if (k % 7 === 3) {                                   // Blatt, abwechselnd links/rechts
            const side = (k / 7) % 2 < 1 ? 1 : -1;
            const lx = px + nx * side * 2, ly = py + ny * side * 2;
            this.r(lx - 1, ly - 1, 3, 2, '#3f8f34'); this.r(lx, ly - 1, 1, 1, '#8fd16a');
          }
          if (k % 15 === 9) {                                  // leuchtende Blüte in der Lichtfarbe
            const pulse = Math.floor(t / 400 + k) % 2;
            comps.forEach((c, j) => this.glyph(px + nx * (j * 4 - (comps.length - 1) * 2) + nx * 3, py + ny * (j * 4 - (comps.length - 1) * 2) + ny * 3, c, pulse ? hex : shade(hex, 0.35)));
          }
        }
        // Ranke rollt sich an Spiegeln/Ecken kurz ein
        if (i < beam.points.length - 1 && dist < limit) { const cx = Math.round(ex), cy = Math.round(ey); this.r(cx - 2, cy - 2, 4, 1, '#5fae4a'); this.r(cx + 1, cy - 2, 1, 3, '#5fae4a'); }
      }
      // Wachstumsspitze: heller Trieb
      if (dist < limit) continue;
    }
  }

  // ---------- Licht wie in Minecraft (mit Shader-Optik) ----------
  // 1) Lichtausbreitung Feld für Feld: jede Quelle hat eine Stärke 0–15, die pro Feld sinkt.
  //    Wände und Kisten halten Licht auf → echte Schatten hinter Hindernissen; Farben mischen sich.
  // 2) Weiches Licht („smooth lighting“): die Lichtkarte (1 Pixel je Feld) wird geglättet
  //    hochskaliert und mit der Szene MULTIPLIZIERT (Dunkelheit), dann additiv als Bloom.
  // 3) Reflexionen: glänzende Böden spiegeln Lichtquellen als pixelige, gedimmte Streifen.
  computeLight(lights, opaque) {
    const { w, h } = this.level;
    const R = new Float32Array(w * h), G = new Float32Array(w * h), B = new Float32Array(w * h);
    for (const l of lights) {
      const sx = Math.floor(l.x), sy = Math.floor(l.y);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const rgb = hexRgb(l.color || '#ffd9a0');
      const lvl0 = l.level ?? 14;
      const seen = new Map([[sy * w + sx, lvl0]]);
      const queue = [[sx, sy, lvl0]];
      while (queue.length) {
        const [x, y, lvl] = queue.shift();
        const f = Math.pow(lvl / 15, 1.6) * (l.i ?? 1);
        const i = y * w + x;
        R[i] += rgb[0] * f; G[i] += rgb[1] * f; B[i] += rgb[2] * f;
        if (opaque[i] && !(x === sx && y === sy)) continue; // Licht trifft die Wand, geht aber nicht hindurch
        const next = lvl - (l.falloff ?? 2);
        if (next <= 0) continue;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if ((seen.get(j) ?? -1) >= next) continue;
          seen.set(j, next);
          queue.push([nx, ny, next]);
        }
      }
    }
    return { R, G, B };
  }

  lighting(lights, th, opaque) {
    const { w, h } = this.level;
    const { R, G, B } = this.computeLight(lights, opaque);
    const amb = hexRgb(th.ambient);
    const ambLevel = (1 - th.dark01) * 0.7; // dunkler Grundton → Lichtquellen setzen sich ab
    // Lichtkarte: 1 Pixel pro Feld (+1 Rand), Werte = Umgebung + Lichtfarbe
    const L = this.lctx;
    if (this.light.width !== w || this.light.height !== h) { this.light.width = w; this.light.height = h; }
    const img = L.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const a = ambLevel;
      img.data[i * 4] = Math.min(255, (amb[0] * 0.25 + a * 0.75 + R[i]) * 255);
      img.data[i * 4 + 1] = Math.min(255, (amb[1] * 0.25 + a * 0.75 + G[i]) * 255);
      img.data[i * 4 + 2] = Math.min(255, (amb[2] * 0.25 + a * 0.85 + B[i]) * 255);
      img.data[i * 4 + 3] = 255;
    }
    L.putImageData(img, 0, 0);
    const { ctx } = this;
    ctx.save();
    // weich hochskaliert und multipliziert = abgedunkelter Raum mit farbigem Licht
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.light, 0, 0, w, h, 0, 0, w * T, h * T);
    // Bloom: helle Bereiche leuchten zusätzlich auf (additiv)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(this.light, 0, 0, w, h, -T * 0.3, -T * 0.3, w * T + T * 0.6, h * T + T * 0.6);
    ctx.restore();
  }

  /** Spiegelungen auf glänzenden Böden: Lichtquellen und Strahlen als gedimmte, gerasterte Streifen. */
  reflections(lights, beams, th) {
    const { ctx, level } = this;
    const shine = { ice: 0.55, water: 0.5, stone: 0.3, planks: 0.2, sand: 0.08, moss: 0.1 }[th.pattern] ?? 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const floorAt = (x, y) => { const c = level.cells[Math.floor(y) * level.w + Math.floor(x)]; return c && c.type !== 'wall'; };
    for (const l of lights) {
      if (!l.reflect) continue;
      const px = Math.round(l.x * T), py = Math.round(l.y * T);
      ctx.fillStyle = l.color;
      for (let k = 2; k < T * 1.6; k += 2) { // gerasterter Streifen nach unten, verblassend
        if (!floorAt(l.x, l.y + k / T)) break;
        ctx.globalAlpha = shine * (1 - k / (T * 1.6)) * (l.reflect ?? 1);
        ctx.fillRect(px - 1 - (k % 4 ? 0 : 1), py + k, 2 + (k % 4 ? 0 : 2), 1);
      }
    }
    // Strahlen spiegeln sich als zweite, schwache Linie unter waagrechten Abschnitten
    for (const beam of beams) {
      const hex = COLOR_INFO[beam.color]?.hex || '#fff';
      ctx.fillStyle = hex;
      for (let i = 1; i < beam.points.length; i++) {
        const [x0, y0] = beam.points[i - 1], [x1, y1] = beam.points[i];
        if (Math.abs(y0 - y1) > 0.01) continue;
        const ax = Math.round(Math.min(x0, x1) * T), bx = Math.round(Math.max(x0, x1) * T), y = Math.round(y0 * T);
        for (let x = ax; x < bx; x += 2) { if (!floorAt(x / T, y0 + 0.3)) continue; ctx.globalAlpha = shine * 0.6; ctx.fillRect(x, y + 4, 1, 1); ctx.globalAlpha = shine * 0.3; ctx.fillRect(x + 1, y + 6, 1, 1); }
      }
    }
    ctx.restore();
  }

  /** Zeichnet den ganzen Raum. opts wie BoardRenderer plus exit, exitOpen, fragments, theme. */
  draw(t, opts) {
    const { level, ctx } = this;
    const th = opts.theme || PIXEL_THEMES.default;
    const exitKey = opts.exit ? `${opts.exit.x},${opts.exit.y}` : '';
    if (!this.static || this.staticTheme !== th || this.staticExit !== exitKey) { this.buildStatic(th, opts.exit); this.staticTheme = th; this.staticExit = exitKey; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.static, 0, 0);
    ctx.translate(this.ox, this.oy);
    const tr = opts.tr;
    const sensorInfo = new Map((tr.sensors || []).map((s) => [s.y * level.w + s.x, s]));
    const targetInfo = new Map(tr.targets.map((s) => [s.y * level.w + s.x, s]));
    // Bodenobjekte
    level.cells.forEach((c, i) => {
      const x = i % level.w, y = Math.floor(i / level.w);
      if (c.ice) this.iceTile(x, y);
      if (c.flow != null) this.flowTile(x, y, c.flow, t);
      if (c.plate) this.plate(x, y, tr.pressed?.has(c.plate));
      if (c.type === 'sensor') this.sensor(x, y, c, sensorInfo.get(i));
      if (c.key && !(opts.got || []).includes(i)) this.keyItem(x, y, t);
      if (c.hole || c.crumble) this.bog(x, y, c, (opts.fill || []).includes(i), (opts.broken || []).includes(i), t);
    });
    for (const s of opts.sinking || []) this.sinkFx(s, t);
    // Fundstücke des Abenteuers (Münzen, Dietrich, Brot …), Truhe und Schild
    for (const it of opts.loot || []) this.loot(it, t);
    for (const f of opts.fragments || []) if (!f.got) this.fragment(f, t);
    // Lichtranken unter den Objekten (wachsen nach jeder Änderung neu aus der Lampe)
    this.beams(tr.beams, t, opts.grow ?? Infinity);
    // Objekte von oben nach unten (Schrägsicht: weiter unten = davor)
    const items = [];
    level.cells.forEach((c, i) => {
      const x = i % level.w, y = Math.floor(i / level.w);
      if (c.type === 'lock') items.push({ y, draw: () => this.gate(x, y, tr.open?.has(i), t) });
      if (['emitter', 'target', 'door', 'flip', 'portal'].includes(c.type)) items.push({ y, draw: () => {
        if (c.type === 'emitter') this.emitter(x, y, c, t);
        if (c.type === 'target') this.target(x, y, c, targetInfo.get(i), t);
        if (c.type === 'door') this.door(x, y, tr.open?.has(i));
        if (c.type === 'flip') this.flip(x, y, c, tr.pressed?.has(c.plate));
        if (c.type === 'portal') this.portal(x, y, c, t);
      } });
    });
    for (const b of opts.blocks || []) items.push({ y: b.y, draw: () => this.block(b, t) });
    for (const e of opts.enemies || []) if (e.alive) items.push({ y: e.y, draw: () => this.enemy(e, t) });
    if (opts.player) items.push({ y: opts.player.y + 0.01, draw: () => this.player(opts.player, t) });
    if (opts.exit) items.push({ y: opts.exit.y, draw: () => this.exitDoor(opts.exit, opts.exitOpen, t) });
    if (opts.chest) items.push({ y: opts.chest.y, draw: () => this.chest(opts.chest, t) });
    if (opts.sign) items.push({ y: opts.sign.y, draw: () => this.signBoard(opts.sign, t) });
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    // Andock-Klammern
    if (opts.dock) {
      const [dx, dy] = DIRS[opts.dock.dir];
      const cx = opts.dock.x * T + 7 - dx * 7, cy = opts.dock.y * T + 7 - dy * 7;
      const on = Math.floor(t / 200) % 2 ? '#9ff6ff' : '#4ff0ff';
      if (dx) { this.r(cx, cy - 6, 2, 4, on); this.r(cx, cy + 4, 2, 4, on); } else { this.r(cx - 6, cy, 4, 2, on); this.r(cx + 4, cy, 4, 2, on); }
    }
    this.dust(opts.dust || [], t);
    if (opts.bloom) this.bloomFx(opts.bloom, t);
    // Auflösen
    for (const d of opts.dissolving || []) {
      const k = Math.min(1, (t - d.t0) / 600);
      for (let n = 0; n < 8; n++) { const a = (n / 8) * Math.PI * 2; this.r(d.x * T + 7 + Math.cos(a) * k * 10, d.y * T + 7 + Math.sin(a) * k * 10 - k * 4, 2, 2, n % 2 ? '#ff9cf6' : '#ffffff'); }
    }

    // Lichtquellen sammeln (Stärke 0–15 wie in Minecraft; Fackel ≈ 14, Spielerlaterne 9)
    const lights = [];
    level.cells.forEach((c, i) => {
      const x = i % level.w + 0.5, y = Math.floor(i / level.w) + 0.5;
      if (c.type === 'emitter') lights.push({ x, y, level: 14, color: COLOR_INFO[c.color]?.hex, reflect: 1 });
      if (c.type === 'target' && targetInfo.get(i)?.ok) lights.push({ x, y, level: 12, color: COLOR_INFO[c.need]?.hex, reflect: 1 });
      if (c.type === 'sensor' && sensorInfo.get(i)?.ok) lights.push({ x, y, level: 8, color: COLOR_INFO[c.need]?.hex });
      if (c.type === 'portal') lights.push({ x, y, level: 7, color: '#c49bff', reflect: 0.6 });
      if (c.flow != null) lights.push({ x, y, level: 4, color: '#4ff0ff', i: 0.5 });
    });
    for (const b of opts.blocks || []) if (b.kind === 'lamp') lights.push({ x: b.x + 0.5, y: b.y + 0.5, level: 14, color: COLOR_INFO[b.color]?.hex, reflect: 1 });
    for (const beam of tr.beams) { // Strahlen erhellen jedes Feld, das sie durchqueren
      const hex = COLOR_INFO[beam.color]?.hex;
      for (let i = 1; i < beam.points.length; i++) {
        const [x0, y0] = beam.points[i - 1], [x1, y1] = beam.points[i];
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k <= n; k++) lights.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n, level: 8, falloff: 4, color: hex, i: 0.4 });
      }
    }
    if (opts.player) lights.push({ x: opts.player.x + 0.5, y: opts.player.y + 0.5, level: opts.bigLantern ? 12 : 9, color: '#ffcf8a', reflect: 0.5 });
    if (opts.exit && opts.exitOpen) lights.push({ x: opts.exit.x + 0.5, y: opts.exit.y + 0.5, level: 13, color: '#9ff0e8', reflect: 1 });
    for (const f of opts.fragments || []) if (!f.got) lights.push({ x: f.x + 0.5, y: f.y + 0.5, level: 6, color: '#9ff6ff' });
    // Undurchsichtig: Wände und massive Kisten (Glas, Prisma, Filter, Teiler lassen Licht durch)
    const opaque = new Uint8Array(level.w * level.h);
    level.cells.forEach((c, i) => { if (c.type === 'wall' || ((c.type === 'door' || c.type === 'lock') && !tr.open?.has(i))) opaque[i] = 1; });
    level.cells.forEach((c, i) => { if (c.key && !(opts.got || []).includes(i)) lights.push({ x: i % level.w + 0.5, y: Math.floor(i / level.w) + 0.5, level: 5, color: '#ffd166' }); });
    for (const it of opts.loot || []) if (!it.got) lights.push({ x: it.x + 0.5, y: it.y + 0.5, level: it.kind === 'coin' ? 3 : 5, color: '#ffd166', i: 0.6 });
    if (opts.chest && !opts.chest.open) lights.push({ x: opts.chest.x + 0.5, y: opts.chest.y + 0.5, level: 4, color: '#ffcf6b', i: 0.5 });
    for (const b of opts.blocks || []) if (['stone', 'mirror'].includes(b.kind)) opaque[Math.round(b.y) * level.w + Math.round(b.x)] = 1;
    lights.push(...this.decor.lights);
    this.reflections(lights, tr.beams, th);
    this.lighting(lights, th, opaque);
    // Außenwelt und Rückwand im selben Grundton abdunkeln, dann Fackeln, Leuchten und Teilchen darüber
    shadeMargin(this, level, th, this.ambientCss(th));
    drawShafts(this, this.decor.shafts, level, t);
    drawGlows(this, this.decor.glows, t);
    drawFlames(this, this.decor.flames, t);
    drawMotes(this, this.decor.motes, t, { x0: -this.ox, y0: -this.oy, x1: this.canvas.width - this.ox, y1: this.canvas.height - this.oy });
    if (opts.marker) this.marker(opts.marker, t);
    for (const m of opts.markers || []) this.marker(m, t + m.x * 97);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return this.canvas;
  }

  /** Tutorial-Pfeil: hüpft über dem Feld, auf das es gerade ankommt, mit pulsierendem Rahmen. */
  marker(m, t) {
    const px = Math.round(m.x * T), py = Math.round(m.y * T);
    const bob = Math.round(Math.abs(Math.sin(t / 220)) * 4);
    const pulse = Math.floor(t / 250) % 2;
    const c = pulse ? '#fff6b0' : '#ffd166';
    this.r(px, py, T, 1, c); this.r(px, py + T - 1, T, 1, c); this.r(px, py, 1, T, c); this.r(px + T - 1, py, 1, T, c);
    const ay = py - 13 - bob;
    this.r(px + 5, ay - 1, 6, 6, '#120a1c'); this.r(px + 2, ay + 4, 12, 2, '#120a1c'); this.r(px + 4, ay + 6, 8, 2, '#120a1c'); this.r(px + 6, ay + 8, 4, 2, '#120a1c');
    this.r(px + 6, ay, 4, 5, c); this.r(px + 3, ay + 5, 10, 1, c); this.r(px + 5, ay + 6, 6, 1, c); this.r(px + 7, ay + 7, 2, 2, c);
  }

  /** Grundton der Dunkelheit (wie in lighting) als CSS-Farbe – für die Außenwelt. */
  ambientCss(th) {
    const amb = hexRgb(th.ambient), a = (1 - th.dark01) * 0.7;
    const ch = (v, k) => Math.round(Math.min(255, (v * 0.25 + a * k) * 255 * 1.12));
    return `rgb(${ch(amb[0], 0.75)},${ch(amb[1], 0.75)},${ch(amb[2], 0.85)})`;
  }
}
