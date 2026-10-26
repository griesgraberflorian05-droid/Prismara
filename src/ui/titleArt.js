// Eigenes Pixel-Titelbild fürs Hauptmenü – im Stil der Welt, in der der Spieler gerade ist:
// Himmel mit geditherten Farbbändern, Sonne oder Mond, ziehende Wolken (oder Polarlicht,
// Lichtstrahlen unter Wasser), Bergketten, ein See (Meer, Oase, Lava, Moor), Hügel mit den Bäumen
// der Welt (Tannen, Palmen, Kirschbäume, Dschungelriesen, tote Bäume, Kakteen, Korallen), der alte
// Laternenturm in den Steinfarben der Welt (in der Burg mit Mauer, in der Wüste mit Pyramide) und
// vorn der Held am Lagerfeuer zwischen Blumen und den Teilchen der Welt. 384×216 Pixel, ohne
// Glättung bildschirmfüllend hochskaliert.
import { prefersReducedMotion } from '../settings.js';

const W = 384, H = 216;
const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const BAND = 12; // Höhe eines Himmelsbands

// Stil je Welt: Himmel (11 Bänder), Himmelslicht, Wolken [Körper, Saum, Oberkante], ferne Berge
// [Farbe, Hang, Kappe|null], mittlere Kette, See (4 Tiefen) + Glitzer, Hügel, Baumart + Farben,
// Turmsteine [mittel, hell, dunkel], Boden [Erde, Kante, Halme], Blumen, Teilchen, Extras.
export const TITLE_STYLES = {
  default: {
    sky: ['#140c2a', '#1c1238', '#261648', '#341a56', '#4a2160', '#662862', '#86325e', '#a8405a', '#c95a4a', '#e07e48', '#f2a85a'],
    light: 'moon', stars: 1, clouds: ['#4a2a5e', '#c96a5a', '#5e3a70'], far: ['#3a2858', '#47336a', '#e8d4ee'], mid: '#2a1f48',
    lake: ['#7a3a62', '#5a2e5e', '#3a2454', '#241a40'], glint: ['#e8846a', '#c9a7ff'], hill: '#1a2a2e', tree: 'pine', trees: ['#122024', '#16282c'],
    stone: ['#4a4656', '#5e5a6c', '#36323e'], ground: ['#24402a', '#3f6b34', '#4a8a3a'], flowers: ['#ff9cc8', '#fff6b0', '#ffffff', '#c9a7ff', '#ffb36b'], fx: 'fireflies',
  },
  beach: {
    sky: ['#2f7cc8', '#3a88d2', '#4894da', '#58a0e0', '#6aaee6', '#7ebcea', '#94caee', '#acd8f0', '#c6e4f0', '#e4ecdc', '#f6e2b0'],
    light: 'sun', stars: 0, clouds: ['#f4f8ff', '#ffffff', '#dce8f8'], far: ['#7aa4cc', '#8ab2d6', null], mid: '#5a9aa0',
    lake: ['#4ac0d8', '#2aa4c4', '#1888ac', '#106c92'], glint: ['#ffffff', '#bff8ff'], hill: '#d8b878', tree: 'palm', trees: ['#2f7a2a', '#4fa83d'],
    stone: ['#e0d0b0', '#f2e6cc', '#b8a682'], ground: ['#c9a56a', '#e8cf96', '#f2dcaa'], flowers: ['#ff8a4a', '#ffd6c0', '#ffffff', '#ff7a8f', '#ffd166'], fx: 'gulls',
  },
  cherry: {
    sky: ['#2a1838', '#3a2048', '#52285a', '#6e3068', '#8c3a72', '#a84a7a', '#c45a80', '#dc7088', '#ec8c92', '#f4aca0', '#f8c8b0'],
    light: 'moon', stars: 0.7, clouds: ['#7a3a6a', '#f2a7c8', '#8a4a7a'], far: ['#5a3a6a', '#6a4a7a', '#f4e0f0'], mid: '#3a2a4a',
    lake: ['#9a5a82', '#7a4a72', '#5a3a62', '#3a2a4a'], glint: ['#ffd6e8', '#ffffff'], hill: '#2a3a2e', tree: 'cherry', trees: ['#f2a7c8', '#d97aa5'],
    stone: ['#6a5a6a', '#8a7a8a', '#4a3e4a'], ground: ['#2e4a2a', '#4a7a3a', '#5a9a44'], flowers: ['#ff9cc8', '#ffd6e7', '#ffffff', '#f2a7c8', '#fff6b0'], fx: 'petals',
  },
  jungle: {
    sky: ['#0a2018', '#0e2a1e', '#123424', '#184030', '#1e4c38', '#285a40', '#346a48', '#447a50', '#5a8a58', '#7a9a60', '#a0b070'],
    light: 'moon', stars: 0.4, clouds: ['#2a4a3a', '#6a8a6a', '#3a5a4a'], far: ['#1e3a2e', '#26463a', null], mid: '#16302a',
    lake: ['#2a5a48', '#1e4a3c', '#163a30', '#0e2a22'], glint: ['#9fd8b8', '#d8ff7a'], hill: '#10261c', tree: 'jungle', trees: ['#1d5a1c', '#2f7a2a'],
    stone: ['#5a6a4a', '#6b7d55', '#3a4630'], ground: ['#1e3a1e', '#3a6a2c', '#4a8a3a'], flowers: ['#ffd166', '#ff7a3a', '#ff4d6d', '#ffffff', '#c9a7ff'], fx: 'fireflies',
  },
  castle: {
    sky: ['#0a0c18', '#0e1020', '#121628', '#161c32', '#1c223c', '#222a48', '#2a3254', '#343c60', '#3e4868', '#4a5470', '#5a6478'],
    light: 'moon', stars: 1, clouds: ['#2a2e44', '#5a6080', '#363a50'], far: ['#2a2e40', '#363a50', '#d8dce8'], mid: '#1e2232',
    lake: ['#3a4260', '#2a3250', '#1e2440', '#141830'], glint: ['#c0c8e8', '#ffd166'], hill: '#141e1a', tree: 'pine', trees: ['#0e1a16', '#12201a'],
    stone: ['#5a5668', '#6e6a7c', '#3e3a4a'], ground: ['#1e2a1e', '#34482e', '#405a38'], flowers: ['#c9a7ff', '#ffffff', '#ffd166', '#9ad1ff', '#ff9cc8'], fx: 'fireflies', wall: true,
  },
  moor: {
    sky: ['#1a2420', '#20302a', '#283a32', '#30443a', '#3a4e42', '#46584c', '#526256', '#606c60', '#6e786a', '#7c8474', '#8a907e'],
    light: 'moon', stars: 0.3, clouds: ['#4a5a50', '#7a8a7a', '#5a6a60'], far: ['#2e3e36', '#36463e', null], mid: '#26342e',
    lake: ['#3a5a4a', '#2e4a3c', '#223a30', '#182a22'], glint: ['#9fffd8', '#bff8e0'], hill: '#1a261e', tree: 'dead', trees: ['#1a1e1a', '#222622'],
    stone: ['#5a5e54', '#6e7266', '#3e4238'], ground: ['#2a3a2a', '#3e523a', '#4e6a48'], flowers: ['#c9e8a0', '#ffffff', '#9fd8b8', '#fff6b0', '#c9a7ff'], fx: 'wisps', fog: true,
  },
  night: {
    sky: ['#02040e', '#040818', '#060c22', '#0a122c', '#0e1836', '#141e40', '#1a264a', '#202e52', '#28385a', '#304262', '#3a4c6a'],
    light: 'moon', stars: 1, clouds: ['#141e3a', '#3a4a7a', '#1c2848'], far: ['#16203a', '#1e2a48', '#c8d8f0'], mid: '#101830',
    lake: ['#1a2a4a', '#14223e', '#0e1a32', '#081226'], glint: ['#9ad1ff', '#ffffff'], hill: '#0c1a18', tree: 'pine', trees: ['#081412', '#0c1a16'],
    stone: ['#3e4656', '#525a6c', '#2a303e'], ground: ['#0e1e1a', '#1e3a30', '#2a4a3c'], flowers: ['#9ad1ff', '#ffffff', '#c9a7ff', '#4ff0d0', '#fff6b0'], fx: 'fireflies',
  },
  volcano: {
    sky: ['#1a0404', '#260606', '#340a08', '#440e0a', '#56140c', '#6c1a0e', '#842210', '#9c2c12', '#b83814', '#d44a18', '#e86a20'],
    light: 'none', stars: 0.2, clouds: ['#2a1a18', '#c84a2a', '#3a2420'], far: ['#2a1a1c', '#36221e', '#ff6a1a'], mid: '#1e1416',
    lake: ['#ffaa3a', '#ff7a1a', '#d44a10', '#8a2a08'], glint: ['#fff3b0', '#ffcf4a'], hill: '#140e10', tree: 'dead', trees: ['#0e0a0a', '#1a1212'],
    stone: ['#4a3a3e', '#5e4a4e', '#2e2226'], ground: ['#2a1e1e', '#3a2a2a', '#4a3434'], flowers: ['#ff6a1a', '#ffcf4a', '#ff4d6d', '#ffb36b', '#fff3b0'], fx: 'embers', lavaGlow: true,
  },
  temple: {
    sky: ['#2a1430', '#3a1a3a', '#4e2240', '#662c42', '#803842', '#9a4640', '#b4583c', '#cc6e3a', '#e08a3c', '#eca848', '#f4c45c'],
    light: 'sun', stars: 0.5, clouds: ['#7a3a3a', '#f2a85a', '#8a4a40'], far: ['#a86a3a', '#b87a46', null], mid: '#8a5430',
    lake: ['#4a9a92', '#3a827a', '#2a6a64', '#1e524c'], glint: ['#ffffff', '#ffe6b0'], hill: '#7a4a28', tree: 'cactus', trees: ['#3f8a3a', '#2a6a28'],
    stone: ['#c9a066', '#e0bb80', '#9c7a4a'], ground: ['#b88a4a', '#d4ab6c', '#e0bb80'], flowers: ['#ff9cc8', '#ffd166', '#ffffff', '#ff7a3a', '#c9a7ff'], fx: 'dust', pyramid: true,
  },
  aurora: {
    sky: ['#020814', '#04101e', '#061828', '#082032', '#0a283c', '#0c3046', '#0e3850', '#10405a', '#124862', '#14506a', '#185872'],
    light: 'moon', stars: 1, clouds: ['#1a3048', '#4a7090', '#20384e'], far: ['#3a5a7a', '#4a6a8a', '#ffffff'], mid: '#2a4060',
    lake: ['#8ab0d0', '#7098b8', '#5880a0', '#406888'], glint: ['#ffffff', '#4fffb0'], hill: '#c8d8e8', tree: 'snowpine', trees: ['#1f4a3a', '#2a5e48'],
    stone: ['#7d93ac', '#a0b4c8', '#5a6e84'], ground: ['#a8bcd0', '#e8f0f8', '#ffffff'], flowers: ['#9ad1ff', '#ffffff', '#4fffb0', '#c9a7ff', '#e8f8ff'], fx: 'snow', aurora: true,
  },
  reef: {
    sky: ['#021428', '#031c34', '#042440', '#052c4c', '#063458', '#073c64', '#08446e', '#0a4e78', '#0c5882', '#0e628c', '#106c96'],
    light: 'rays', stars: 0, clouds: null, far: ['#0a3a5a', '#0e4666', null], mid: '#082e4a',
    lake: ['#2a8aa0', '#1e7690', '#166280', '#0e4e6a'], glint: ['#bff8ff', '#ffffff'], hill: '#0a2a40', tree: 'coral', trees: ['#ff7a8f', '#ffa040'],
    stone: ['#5a6d8a', '#7a8daa', '#3a4a66'], ground: ['#8a7a5a', '#c8b07a', '#e0cc94'], flowers: ['#ff7a8f', '#ffd166', '#4ff0ff', '#ffffff', '#ffa040'], fx: 'bubbles', noFire: true,
  },
  shadow: {
    sky: ['#06020c', '#0a0414', '#0e061c', '#140826', '#1a0a30', '#200c3a', '#280e44', '#30104e', '#3a1258', '#441462', '#4e166c'],
    light: 'moon', stars: 0.8, clouds: ['#2a1040', '#7a3aa8', '#341850'], far: ['#1e1030', '#28163e', '#c8a8ff'], mid: '#160c24',
    lake: ['#3a1a5a', '#2a1048', '#1e0a38', '#140628'], glint: ['#c58bff', '#ffffff'], hill: '#100a18', tree: 'dead', trees: ['#0a0610', '#140c1e'],
    stone: ['#3d3450', '#5c5070', '#2a2238'], ground: ['#1e1428', '#2e2040', '#3a2a50'], flowers: ['#c58bff', '#ffffff', '#ff5cf0', '#9a7aff', '#d0a0ff'], fx: 'motes',
  },
};

function layer() { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); return [c, g]; }
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function ridge(x, base, amp, seed, rough = 1) {
  return base - amp * (0.55 * Math.sin(x / 37 + seed) + 0.3 * Math.sin(x / 17 + seed * 2.3) + 0.15 * rough * Math.sin(x / 7 + seed * 5.1));
}
const groundY = (x) => Math.round(188 + Math.sin(x / 23) * 4 + Math.sin(x / 7) * 1.2 - Math.max(0, (x - 200) * 0.06));

function drawBack(S) {
  const [c, g] = layer();
  // Himmel: Farbbänder mit Schachbrett-Dithering an den Übergängen
  for (let y = 0; y < H; y++) {
    const b = Math.min(S.sky.length - 1, Math.floor(y / BAND)), nb = Math.min(S.sky.length - 1, b + 1), k = y % BAND;
    for (let x = 0; x < W; x++) {
      const dither = (k >= BAND - 3 && ((x + y) % 2 === 0)) || (k === BAND - 1 && x % 2 === 0);
      g.fillStyle = dither ? S.sky[nb] : S.sky[b];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// ---------- Bäume der Welten (Fußpunkt x, y; Größe s) ----------
const TREES = {
  pine(g, x, y, s, [a, b], snow) {
    for (let k = 0; k < s; k++) { const w = 1 + Math.floor(k * 0.7); R(g, x - w, y - s + k, w * 2 + 1, 1, k % 4 === 3 ? b : a); if (snow && k % 4 === 0) R(g, x - w, y - s + k, w * 2 + 1, 1, '#f2f7ff'); }
    R(g, x, y, 1, 2, a);
  },
  snowpine(g, x, y, s, c) { TREES.pine(g, x, y, s, c, true); },
  palm(g, x, y, s, [a, b]) {
    for (let k = 0; k < s; k++) R(g, x + Math.round(Math.sin(k / 6) * 2), y - k, 2, 1, k % 3 ? '#8a6438' : '#6a4a28');
    const cx = x + Math.round(Math.sin(s / 6) * 2), cy = y - s;
    for (const [dx, dy] of [[-8, 3], [-5, -2], [0, -4], [5, -2], [8, 3], [-3, 5], [4, 5]]) for (let k = 1; k <= 4; k++) R(g, cx + Math.round(dx * k / 4), cy + Math.round(dy * k / 4), 2, 1, k % 2 ? a : b);
  },
  cherry(g, x, y, s, [a, b]) {
    R(g, x, y - s / 2, 2, s / 2 + 2, '#3a2420');
    const r = Math.max(3, Math.floor(s / 2.4));
    for (let yy = -r; yy <= r; yy++) for (let xx = -r - 2; xx <= r + 2; xx++) if (xx * xx / ((r + 2) * (r + 2)) + yy * yy / (r * r) <= 1) R(g, x + xx, y - s / 2 - r + yy, 1, 1, (xx + yy) % 3 ? a : b);
  },
  jungle(g, x, y, s, [a, b]) {
    R(g, x, y - s, 2, s + 2, '#2a1e10');
    const r = Math.max(4, Math.floor(s / 2));
    for (let yy = -r; yy <= r / 2; yy++) for (let xx = -r - 3; xx <= r + 3; xx++) if (xx * xx / ((r + 3) * (r + 3)) + yy * yy / (r * r) <= 1) R(g, x + xx, y - s + yy, 1, 1, yy < -r / 2 ? b : a);
    for (let k = 0; k < 3; k++) for (let v = 0; v < 4 + k * 2; v++) R(g, x - r + k * r, y - s + r / 2 + v, 1, 1, '#2f7a2a');
  },
  dead(g, x, y, s, [a]) {
    R(g, x, y - s, 1, s + 2, a);
    for (let k = 0; k < 4; k++) { const by = y - s + 2 + k * Math.floor(s / 5), dir = k % 2 ? 1 : -1; for (let v = 0; v < 3 + k; v++) R(g, x + dir * v, by - Math.floor(v / 2), 1, 1, a); }
  },
  cactus(g, x, y, s, [a, b]) {
    R(g, x, y - s, 3, s + 2, a); R(g, x, y - s, 1, s + 2, b);
    R(g, x - 3, y - s * 0.6, 3, 2, a); R(g, x - 3, y - s * 0.6 - 4, 2, 4, a); R(g, x + 3, y - s * 0.4, 3, 2, a); R(g, x + 4, y - s * 0.4 - 3, 2, 3, a);
  },
  coral(g, x, y, s, [a, b]) {
    for (let k = -2; k <= 2; k++) for (let v = 0; v < s * (0.5 + Math.abs(k) * -0.1 + 0.3); v++) R(g, x + k * 2 + Math.round(Math.sin(v / 3 + k) * (Math.abs(k) / 2)), y - v, 1, 1, k % 2 ? a : b);
    for (let v = 0; v < s; v++) R(g, x + 7 + Math.round(Math.sin(v / 2) * 1.5), y - v, 1, 1, '#2f8a5a');
  },
};

function drawFront(S) {
  const [c, g] = layer();
  // Pyramide in der Ferne (Wüste)
  if (S.pyramid) for (let k = 0; k < 34; k++) R(g, 70 - k, 86 + k, k * 2 + 1, 1, k % 6 === 5 ? '#9c7a4a' : k < 17 ? '#e0bb80' : '#c9a066');
  // ferne Berge mit Kappen (Schnee, im Vulkan glühende Lava)
  for (let x = 0; x < W; x++) {
    const y = Math.round(ridge(x, 112, 26, 1.7, 1.3));
    R(g, x, y, 1, H - y, S.far[0]);
    const slope = ridge(x + 1, 112, 26, 1.7, 1.3) - y;
    if (slope > 0.3) R(g, x, y + 1, 1, 10, S.far[1]);
    if (S.far[2] && y < 96) { R(g, x, y, 1, Math.min(4, 98 - y), S.far[2]); if (slope > 0.2) R(g, x, y, 1, 2, S.lavaGlow ? '#ffcf4a' : '#ffffff'); }
  }
  // mittlere Kette
  for (let x = 0; x < W; x++) { const y = Math.round(ridge(x, 128, 14, 4.2)); R(g, x, y, 1, H - y, S.mid); if (hash(x, 3) > 0.6) R(g, x, y, 1, 1, S.far[1]); }
  // See / Meer / Oase / Lava / Moor
  const lakeTop = 146;
  for (let y = lakeTop; y < H; y++) { const k = (y - lakeTop) / 30; R(g, 0, y, W, 1, S.lake[k < 0.2 ? 0 : k < 0.45 ? 1 : k < 0.75 ? 2 : 3]); }
  // Uferhügel mit den Bäumen der Welt
  for (let x = 0; x < W; x++) {
    const left = 150 + Math.max(0, (x - 40) * 0.5) + Math.sin(x / 9) * 1.5;
    const right = 152 + Math.max(0, (250 - x) * 0.45) + Math.sin(x / 11) * 1.5;
    const y = Math.round(Math.min(left, right));
    if (y < H) R(g, x, y, 1, H - y, S.hill);
  }
  const tree = TREES[S.tree] || TREES.pine;
  const count = S.tree === 'pine' || S.tree === 'snowpine' ? 46 : 24;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, 1) * W);
    const onLeft = x < 120, onRight = x > 250 && (x < 300 || x > 336);
    if (!onLeft && !onRight) continue;
    const base = onLeft ? 150 + Math.max(0, (x - 40) * 0.5) : 152 + Math.max(0, (250 - x) * 0.45);
    tree(g, x, base + 2, 8 + Math.floor(hash(i, 2) * 10), S.trees);
  }
  // Burgmauer neben dem Turm
  const tx = 318, tb = 154, tt = 74;
  const [st, sl, sd] = S.stone;
  if (S.wall) {
    R(g, 262, tb - 30, 46, 30, st); R(g, 262, tb - 30, 46, 2, sl);
    for (let k = 0; k < 8; k++) R(g, 262 + k * 6, tb - 35, 4, 5, st);
    for (let y = tb - 26, k = 0; y < tb; y += 5, k++) R(g, 262, y, 46, 1, sd);
    R(g, 280, tb - 14, 6, 14, '#1a1410'); R(g, 296, tb - 22, 3, 5, '#ffcf6b');
  }
  // Laternenturm in den Steinfarben der Welt
  R(g, tx - 11, tt, 22, tb - tt, st);
  R(g, tx - 11, tt, 3, tb - tt, sl); R(g, tx + 8, tt, 3, tb - tt, sd);
  for (let y = tt + 4, k = 0; y < tb; y += 6, k++) { R(g, tx - 11, y, 22, 1, sd); R(g, tx - 11 + (k % 2 ? 5 : 13), y - 6, 1, 6, sd); }
  R(g, tx - 14, tt - 4, 28, 5, sl); R(g, tx - 14, tt - 4, 28, 1, '#ffffff22');
  for (let k = 0; k < 5; k++) R(g, tx - 14 + k * 6, tt - 9, 4, 5, sl);
  R(g, tx - 5, tt - 22, 10, 13, '#2a2030'); R(g, tx - 7, tt - 24, 14, 3, '#6b4426'); R(g, tx - 4, tt - 28, 8, 4, '#6b4426'); R(g, tx - 1, tt - 31, 2, 3, '#c9963f');
  R(g, tx - 3, tt - 20, 6, 9, '#ffcf6b'); R(g, tx - 1, tt - 20, 2, 9, '#fff3c0');
  R(g, tx - 3, tt + 30, 6, 8, '#2a1a10'); R(g, tx - 2, tt + 31, 4, 7, '#ffb050');
  R(g, tx - 4, tb - 18, 8, 18, '#2a1a10'); R(g, tx - 3, tb - 17, 6, 17, '#6b4426'); R(g, tx + 1, tb - 9, 1, 1, '#ffd166');
  // Ranken am Turm mit Blüten in den Farben der Welt
  for (let v = 0; v < 3; v++) {
    const vx = tx - 9 + v * 8, len = 30 + v * 14;
    for (let s = 0; s < len; s++) {
      const y = tb - s, x = vx + Math.round(Math.sin(s / 5 + v) * 2);
      R(g, x, y, 1, 1, '#3f8a3a');
      if (s % 5 === 2) R(g, x + (s % 10 === 2 ? 1 : -2), y, 2, 1, '#5ab845');
      if (s % 11 === 6) { const col = S.flowers[(s + v) % S.flowers.length]; R(g, x - 1, y, 3, 1, col); R(g, x, y - 1, 1, 3, col); R(g, x, y, 1, 1, '#ffd166'); }
    }
  }
  // Vordergrund: Boden der Welt mit Klippenkante
  const [ge, gk, gh] = S.ground;
  for (let x = 0; x < W; x++) {
    const y = groundY(x);
    R(g, x, y, 1, H - y, ge);
    R(g, x, y, 1, 2, gk);
    if (hash(x, 9) > 0.55) R(g, x, y - 1 - Math.floor(hash(x, 10) * 3), 1, 2, gh);
    if (hash(x, 11) > 0.93) R(g, x, y + 4 + Math.floor(hash(x, 12) * 12), 2, 1, gk);
  }
  // Steine ums Feuer und Baumstamm zum Sitzen
  const fx = 238, fy = 196;
  if (!S.noFire) {
    R(g, fx - 9, fy + 3, 18, 3, '#1a1a20');
    for (let k = 0; k < 6; k++) R(g, fx - 9 + k * 3, fy + 2 + (k % 2), 3, 2, k % 2 ? '#6a6674' : '#7a7688');
  }
  R(g, 206, 198, 22, 5, '#5a3a22'); R(g, 206, 198, 22, 1, '#7a5233'); R(g, 205, 199, 2, 3, '#c99766');
  return c;
}

// ---------- Teilchen der Welt ----------
function particles(g, S, t) {
  const fx = S.fx;
  g.save();
  if (fx === 'fireflies' || fx === 'wisps' || fx === 'motes') {
    g.globalCompositeOperation = 'lighter';
    const c = fx === 'wisps' ? ['#9fffd8', '#e8fff4'] : fx === 'motes' ? ['#c58bff', '#f0d8ff'] : ['#d8ff7a', '#f4ffb0'];
    for (let i = 0; i < 22; i++) {
      const x = hash(i, 101) * W + Math.sin(t / 1400 + i * 2) * 10, y = 120 + hash(i, 102) * 80 + Math.cos(t / 1700 + i) * 6;
      const a = Math.max(0, Math.sin(t / 450 + i * 5));
      g.globalAlpha = a * 0.35; R(g, x - 1, y - 1, 3, 3, c[0]); g.globalAlpha = a; R(g, x, y, 1, 1, c[1]);
    }
  } else if (fx === 'petals') {
    for (let i = 0; i < 30; i++) {
      const x = (hash(i, 111) * W + t * 0.012 + Math.sin(t / 700 + i) * 8) % W, y = (hash(i, 112) * H + t * 0.02 * (0.6 + hash(i, 113))) % H;
      R(g, x, y, 2, 1, i % 2 ? '#ff9cc8' : '#ffd6e7');
    }
  } else if (fx === 'snow') {
    for (let i = 0; i < 60; i++) { const x = (hash(i, 121) * W + Math.sin(t / 900 + i) * 6) % W, y = (hash(i, 122) * H + t * 0.018 * (0.6 + hash(i, 123))) % H; R(g, x, y, i % 4 ? 1 : 2, i % 4 ? 1 : 2, '#ffffff'); }
  } else if (fx === 'embers') {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const x = (hash(i, 131) * W + Math.sin(t / 500 + i) * 4) % W, y = H - ((hash(i, 132) * H + t * 0.025 * (0.6 + hash(i, 133))) % H); g.globalAlpha = 0.5 + 0.5 * Math.sin(t / 200 + i); R(g, x, y, 1, 1, i % 3 ? '#ffb040' : '#ff6a1a'); }
  } else if (fx === 'bubbles') {
    for (let i = 0; i < 34; i++) { const x = (hash(i, 141) * W + Math.sin(t / 600 + i) * 3) % W, y = H - ((hash(i, 142) * H + t * 0.02 * (0.6 + hash(i, 143))) % H); g.globalAlpha = 0.6; R(g, x, y - 1, 2, 1, '#bff8ff'); R(g, x - 1, y, 1, 2, '#bff8ff'); R(g, x + 2, y, 1, 2, '#bff8ff'); R(g, x, y + 2, 2, 1, '#bff8ff'); }
  } else if (fx === 'dust') {
    for (let i = 0; i < 40; i++) { const x = (hash(i, 151) * W + t * 0.01) % W, y = 100 + (hash(i, 152) * 110 + Math.sin(t / 900 + i) * 4); g.globalAlpha = 0.3 + 0.3 * Math.sin(t / 700 + i); R(g, x, y, 1, 1, '#ffe6b0'); }
  } else if (fx === 'gulls') {
    for (let i = 0; i < 5; i++) {
      const x = (hash(i, 161) * (W + 60) + t * 0.015 * (0.7 + hash(i, 162))) % (W + 60) - 30, y = 30 + hash(i, 163) * 50 + Math.sin(t / 800 + i) * 4;
      const up = Math.floor(t / 250 + i) % 2;
      R(g, x - 3, y + (up ? -1 : 0), 3, 1, '#ffffff'); R(g, x, y, 1, 1, '#ffffff'); R(g, x + 1, y + (up ? -1 : 0), 3, 1, '#ffffff');
    }
  }
  g.restore();
}

/** Startet das Titelbild in canvas, im Stil der Welt worldId. Liefert { stop, setWorld }. */
export function mountTitleArt(canvas, worldId = 'default') {
  let S = TITLE_STYLES[worldId] || TITLE_STYLES.default;
  let back = drawBack(S), front = drawFront(S);
  const [buf, g] = layer();
  const ctx = canvas.getContext('2d');
  let run = true;
  function frame(tms) {
    if (!run) return;
    const t = prefersReducedMotion() ? 0 : tms;
    g.drawImage(back, 0, 0);
    // Sterne
    if (S.stars) for (let i = 0; i < 90; i++) {
      const x = Math.floor(hash(i, 21) * W), y = Math.floor(hash(i, 22) * 90);
      const tw = 0.5 + 0.5 * Math.sin(t / (500 + hash(i, 23) * 900) + i);
      if (tw < 0.25) continue;
      g.globalAlpha = tw * (1 - y / 110) * S.stars;
      R(g, x, y, 1, 1, '#fff6e0');
      if (hash(i, 24) > 0.88) { R(g, x - 1, y, 3, 1, '#fff6e0'); R(g, x, y - 1, 1, 3, '#fff6e0'); }
    }
    g.globalAlpha = 1;
    // Polarlicht
    if (S.aurora) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) for (let x = 0; x < W; x += 2) {
        const y = 22 + k * 10 + Math.round(Math.sin(x / 30 + t / 1800 + k * 2) * 8);
        g.globalAlpha = 0.18 + 0.1 * Math.sin(x / 20 + t / 900 + k);
        R(g, x, y, 2, 14 + k * 3, k === 1 ? '#9f7aff' : '#4fffb0');
      }
      g.restore();
    }
    // Sonne oder Mond (mit Hof); unter Wasser: Lichtstrahlen von oben
    const mx = 172, my = 46;
    if (S.light === 'moon' || S.light === 'sun') {
      const sun = S.light === 'sun';
      const halo = g.createRadialGradient(mx, my, 4, mx, my, sun ? 48 : 34); halo.addColorStop(0, sun ? 'rgba(255,240,180,0.45)' : 'rgba(255,240,200,0.25)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = halo; g.fillRect(mx - 48, my - 48, 96, 96);
      for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
        if (x * x + y * y > 81) continue;
        if (!sun && (x - 4) * (x - 4) + (y + 3) * (y + 3) < 64) continue;
        R(g, mx + x, my + y, 1, 1, sun ? (x * x + y * y > 60 ? '#ffd166' : '#fff3c0') : (x * x + y * y > 60 ? '#e8d8b0' : '#fff6d8'));
      }
    } else if (S.light === 'rays') {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) { const x0 = 40 + k * 60 + Math.sin(t / 2000 + k) * 10; g.globalAlpha = 0.06 + 0.03 * Math.sin(t / 900 + k); g.fillStyle = '#bff8ff'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 18, 0); g.lineTo(x0 + 60, 150); g.lineTo(x0 + 30, 150); g.fill(); }
      g.restore();
    }
    // Wolken (ziehen langsam)
    if (S.clouds) for (let i = 0; i < 6; i++) {
      const span = W + 120, sp = 0.004 + hash(i, 31) * 0.004;
      const cx = ((hash(i, 32) * span + t * sp) % span) - 60, cy = 40 + Math.floor(hash(i, 33) * 50);
      const n = 4 + Math.floor(hash(i, 34) * 4);
      for (let k = 0; k < n; k++) {
        const w = 10 + Math.floor(hash(i, k + 40) * 14), h = 3 + Math.floor(hash(i, k + 50) * 4);
        const x = cx + k * 7 - n * 3, y = cy - h + Math.floor(hash(i, k + 60) * 3);
        R(g, x, y, w, h, S.clouds[0]); R(g, x + 1, y + h - 1, w - 2, 1, S.clouds[1]); R(g, x + 2, y, w - 4, 1, S.clouds[2]);
      }
    }
    g.drawImage(front, 0, 0);
    // Nebelschwaden im Moor
    if (S.fog) for (let k = 0; k < 4; k++) { g.globalAlpha = 0.12; R(g, ((t * 0.006 * (k + 1)) % (W + 120)) - 120, 140 + k * 12, 160, 6, '#c8d8c8'); }
    g.globalAlpha = 1;
    // Glitzern auf dem See: Spiegelbild von Sonne/Mond und Schimmerstriche
    if (S.light === 'moon' || S.light === 'sun') for (let k = 0; k < 14; k++) {
      const y = 148 + k * 2 + (k > 6 ? k : 0);
      if (y > 186) break;
      const w = 2 + ((Math.floor(t / 300) + k) % 4);
      g.globalAlpha = 0.65 - k * 0.04;
      R(g, mx - w / 2 + Math.sin(t / 700 + k) * 2, y, w, 1, '#fff0c8');
    }
    for (let i = 0; i < 18; i++) {
      const x = 110 + Math.floor(hash(i, 71) * 140), y = 150 + Math.floor(hash(i, 72) * 30);
      if (Math.sin(t / 400 + i * 1.7) < 0.3) continue;
      g.globalAlpha = 0.5; R(g, x, y, 3, 1, S.glint[i % 2]);
    }
    // Spiegelung des Turmfensters im See
    g.globalAlpha = 0.35 + 0.15 * Math.sin(t / 500); R(g, 316, 160, 4, 1, '#ffcf6b'); R(g, 315, 163, 6, 1, '#ffcf6b'); R(g, 317, 166, 2, 1, '#ffcf6b');
    g.globalAlpha = 1;
    // Leuchten: Turmfenster und Lagerfeuer (Lavasee leuchtet mit)
    const glow = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c.replace('A', a)); gr.addColorStop(1, c.replace('A', 0)); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; };
    glow(318, 58, 30, 'rgba(255,200,110,A)', 0.35 + 0.08 * Math.sin(t / 300));
    if (S.lavaGlow) glow(190, 165, 120, 'rgba(255,110,30,A)', 0.18 + 0.05 * Math.sin(t / 600));
    const fx = 238, fy = 196, fl = Math.sin(t / 90) * 0.5 + Math.sin(t / 37) * 0.3;
    if (!S.noFire) {
      glow(fx, fy - 4, 46, 'rgba(255,150,60,A)', 0.42 + 0.1 * fl);
      R(g, fx - 6, fy + 1, 12, 2, '#4a2a14'); R(g, fx - 4, fy, 8, 2, '#6b4426');
      const f = Math.floor(t / 100) % 3;
      R(g, fx - 4, fy - 4, 8, 4, '#ff6a1a'); R(g, fx - 3, fy - 7 - (f === 1), 6, 4, '#ff9a2a'); R(g, fx - 2, fy - 10 - f, 4, 4, '#ffcf4a'); R(g, fx - 1, fy - 12 - (f === 2) * 2, 2, 3, '#fff3b0');
      R(g, fx - 1 + (f - 1), fy - 4, 2, 3, '#fff3b0');
      for (let i = 0; i < 8; i++) { // Funken steigen auf
        const ph = ((t / 1000) * (0.5 + hash(i, 81) * 0.6) + hash(i, 82)) % 1;
        g.globalAlpha = 1 - ph; R(g, fx + Math.sin(ph * 9 + i) * 4, fy - 10 - ph * 40, 1, 1, ph < 0.5 ? '#ffcf4a' : '#ff6a1a');
      }
    } else glow(fx, fy - 2, 30, 'rgba(120,240,255,A)', 0.3 + 0.08 * fl); // Unterwasser: leuchtende Muschel statt Feuer
    if (S.noFire) { R(g, fx - 4, fy - 1, 8, 4, '#ffd6c0'); R(g, fx - 3, fy - 2, 6, 1, '#ffe9de'); R(g, fx - 1, fy, 2, 2, '#bff8ff'); }
    g.globalAlpha = 1;
    // Held sitzt auf dem Baumstamm, Laterne neben sich, blinzelt und wärmt sich
    const hx = 217, hy = 186, blink = Math.floor(t / 180) % 24 === 0;
    R(g, hx - 1, hy + 2, 10, 10, '#120a1c');
    R(g, hx, hy + 3, 8, 8, '#2f6f86'); R(g, hx, hy + 3, 2, 8, '#4fa3c0'); R(g, hx + 1, hy, 6, 5, '#2f6f86'); R(g, hx + 2, hy - 1, 4, 1, '#2f6f86');
    R(g, hx + 3, hy + 2, 4, 3, '#f2c8a0'); if (!blink) { R(g, hx + 4, hy + 3, 1, 1, '#120a1c'); R(g, hx + 6, hy + 3, 1, 1, '#120a1c'); }
    R(g, hx + 7, hy + 7, 4, 2, '#2f6f86'); R(g, hx + 10, hy + 7, 2, 2, '#f2c8a0');
    R(g, hx + 1, hy + 11, 3, 2, '#3a2414'); R(g, hx + 5, hy + 11, 3, 2, '#3a2414');
    R(g, hx - 6, hy + 6, 4, 6, '#6b4426'); R(g, hx - 5, hy + 7, 2, 4, '#ffcf6b'); R(g, hx - 5, hy + 5, 2, 1, '#3a2414');
    glow(hx - 4, hy + 9, 14, 'rgba(255,210,120,A)', 0.3);
    // Blumen im Vordergrund wiegen sich
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(hash(i, 91) * W);
      if (Math.abs(x - fx) < 14 || (x > 200 && x < 232)) continue;
      const base = groundY(x) + 3 + Math.floor(hash(i, 92) * 14);
      const sway = Math.round(Math.sin(t / 900 + i) * 1.2), h = 4 + Math.floor(hash(i, 93) * 4);
      const col = S.flowers[i % S.flowers.length];
      R(g, x, base - h, 1, h, '#3f8a3a'); R(g, x + sway - 1, base - h - 1, 3, 1, col); R(g, x + sway, base - h - 2, 1, 3, col); R(g, x + sway, base - h - 1, 1, 1, '#ffd166');
    }
    particles(g, S, t);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // bildschirmfüllend, unten bündig
    const dpr = devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const s = Math.max(1, Math.ceil(Math.max(cw / W, ch / H)));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, Math.round((cw - W * s) * 0.65), ch - H * s, W * s, H * s);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    stop() { run = false; },
    setWorld(id) { S = TITLE_STYLES[id] || TITLE_STYLES.default; back = drawBack(S); front = drawFront(S); },
  };
}
