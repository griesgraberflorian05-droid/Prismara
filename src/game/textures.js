// Boden-Texturen nach Pixelart-Regeln: 16×16, begrenzte Farbrampen, Helligkeit in Clustern statt Rauschen,
// nahtlos durch umlaufendes Gitter. Jede Textur ist ein Generator (x, y) → Farbe, das Ergebnis wird zwischengespeichert.
const S = 16;
const hash = (x, y, s) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };

/** Weiche, nahtlose Helligkeit 0–1: Gitter der Breite cell läuft am Rand um. */
function blob(x, y, cell, s) {
  const n = Math.round(S / cell), fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
  const at = (a, b) => hash(((a % n) + n) % n, ((b % n) + n) % n, s);
  return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
}
const ramp = (r, k) => r[Math.min(r.length - 1, Math.max(0, Math.floor(k * r.length)))];
const clusters = (r, s) => (x, y) => ramp(r, blob(x, y, 4, s) * 0.75 + blob(x, y, 2, s + 1) * 0.3);
const speck = (base, list) => (x, y) => { for (const [px, py, c] of list) if (px === x && py === y) return c; return base(x, y); };

const bricks = (top, mid, dark, mortar, moss) => (x, y) => {
  const row = Math.floor(y / 4), ox = row % 2 ? 4 : 0, bx = (x + ox) % 8;
  if (y % 4 === 3 || bx === 7) return (moss && hash(x, y, 9) < 0.14) ? moss : mortar;
  if (y % 4 === 0 || bx === 0) return top;
  return hash(Math.floor((x + ox) / 8), row, 3) < 0.4 ? dark : mid;
};

export const TEXTURES = {
  glutErz: { name: 'Glutstein-Erz', draw: speck(clusters(['#34333a', '#44434b', '#55545d'], 1), [[3, 3, '#b81e1e'], [4, 3, '#ff4a3a'], [5, 4, '#b81e1e'], [11, 6, '#6e1010'], [12, 6, '#b81e1e'], [13, 7, '#ff4a3a'], [2, 11, '#6e1010'], [3, 12, '#ff4a3a'], [4, 12, '#ffb199'], [10, 13, '#b81e1e'], [11, 13, '#ff4a3a']]) },
  korallensand: { name: 'Korallensand', draw: speck(clusters(['#c9a66b', '#d9b97c', '#e8cd94'], 2), [[4, 4, '#ff7aa8'], [3, 3, '#ff7aa8'], [5, 3, '#ff7aa8'], [4, 5, '#d4497a'], [11, 10, '#ff7aa8'], [10, 9, '#ff7aa8'], [12, 9, '#ff7aa8'], [11, 11, '#d4497a']]) },
  eis: { name: 'Eisblock', draw: (x, y) => ((x + y) % 16 === 9 ? '#6aa8cc' : (x + y) % 16 === 10 ? '#d9f2fc' : ramp(['#8fc9e8', '#b4e0f5', '#d9f2fc'], blob(x, y, 8, 3))) },
  bluetengras: { name: 'Blütengras', draw: speck(clusters(['#3f7a3a', '#4f9446', '#64ad55'], 4), [[3, 6, '#ffb7d0'], [11, 2, '#ffb7d0'], [13, 12, '#ffb7d0'], [6, 13, '#ffb7d0']]) },
  burgziegel: { name: 'Burgziegel', draw: bricks('#806a62', '#6e5a54', '#5a4a46', '#2b2622', '#4f6b35') },
  schattenstein: { name: 'Schattenstein', draw: speck(clusters(['#120d1f', '#1e1533', '#2c2047', '#3b2b5c'], 5), [[4, 5, '#c38bff'], [6, 5, '#c38bff'], [11, 12, '#c38bff'], [13, 12, '#c38bff']]) },
  sandstein: { name: 'Tempel-Sandstein', draw: speck(clusters(['#b8864f', '#c99a5e', '#d8ae72'], 6), [[6, 7, '#7d5a30'], [7, 6, '#7d5a30'], [8, 6, '#7d5a30'], [9, 7, '#7d5a30'], [7, 8, '#7d5a30'], [8, 8, '#7d5a30'], [7, 7, '#ffcf4a'], [8, 7, '#ffcf4a']]) },
  morschholz: { name: 'Morsches Holz', draw: (x, y) => (y % 4 === 3 ? '#2a1d12' : hash(Math.floor(x / 5), Math.floor(y / 4), 7) < 0.12 && x % 5 === 2 ? '#1a120a' : ramp(['#5c4024', '#6e4d2c', '#7f5a34'], blob(x, y, 4, 7))) },
  moorwasser: { name: 'Moorwasser', draw: (x, y) => ramp(['#13261c', '#1d3a29', '#2b5537', '#467a4b'], blob((x + y) % 16, (y * 2) % 16, 8, 8) * 0.9) },
  ziegelboden: { name: 'Ziegelboden', draw: (x, y) => {
    const row = Math.floor(y / 4), ox = row % 2 ? 4 : 0, bx = (x + ox) % 8;
    if (y % 4 === 3 || bx === 7) return '#3a2a1e';
    const v = hash(Math.floor((x + ox) / 8), row, 21);
    return y % 4 === 0 ? (v > 0.5 ? '#9a6a48' : '#8a5e40') : v > 0.66 ? '#8a5c3e' : v > 0.33 ? '#7a5038' : '#6a5a48';
  } },
  platten: { name: 'Steinplatten', draw: (x, y) => {
    if (x === 15 || y === 15) return '#23201e';
    if (x === 0 || y === 0) return '#5e584e';
    if ((x === 6 && y > 3 && y < 11) || (y === 10 && x > 5 && x < 12)) return '#2e2a26';
    return ramp(['#3a3630', '#46423a', '#524c42'], blob(x, y, 8, 22));
  } },
  lava: { name: 'Lava', draw: (x, y) => ramp(['#3a0a05', '#8a1a0a', '#d4410f', '#ff8a1c', '#ffd25a'], blob(x, y, 4, 9)) },
};

// Stein: runde Kanten, Licht oben links, Schatten unten rechts, ein paar Kiesel und Risse
export function stoneTile() {
  if (stoneTile.c) return stoneTile.c;
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  const ramp = ['#3a3644', '#524e5c', '#6e6a78', '#8c8896', '#b0acb8'];
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
    const corner = (x === 1 || x === 14) && (y === 1 || y === 14);
    if (corner) continue;
    const edge = x === 1 || y === 1 || x === 14 || y === 14;
    const lit = (14 - x + 14 - y) / 26, k = blob(x, y, 4, 12) * 0.5 + lit * 0.5;
    g.fillStyle = edge ? '#1f1c26' : ramp[Math.min(4, Math.floor(k * 5))];
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#d4d0dc'; g.fillRect(3, 3, 3, 1); g.fillRect(3, 4, 1, 1);
  g.fillStyle = '#2e2a36'; [[9, 5], [10, 6], [10, 7], [11, 8], [5, 10], [6, 11], [7, 11]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  g.fillStyle = '#4f6b4a'; [[3, 12], [4, 13], [5, 13], [12, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  return (stoneTile.c = c);
}

const cache = {};
/** Liefert die Textur als Liste aus Zeilen mit Farben. */
export function texture(id) {
  return (cache[id] ||= Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_, x) => TEXTURES[id].draw(x, y))));
}
