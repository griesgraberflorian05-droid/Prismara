// Reine Lichtlogik (ohne DOM): Zellen einlesen und Strahlen verfolgen.
// Spielzüge des Lichtläufers liegen in push.js.
// Koordinaten: x nach rechts, y nach unten. Richtungen: 0=N, 1=O, 2=S, 3=W.

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIR_INDEX = { N: 0, E: 1, O: 1, S: 2, W: 3 };

// Farben als Bitmaske, damit sich Licht additiv mischen lässt.
export const R = 1, G = 2, B = 4;
export const COLOR_INFO = {
  1: { name: 'Rot', hex: '#ff4d6d' },
  2: { name: 'Grün', hex: '#3ddc97' },
  4: { name: 'Blau', hex: '#4da3ff' },
  3: { name: 'Gelb', hex: '#ffd166' },
  5: { name: 'Magenta', hex: '#ff5ce1' },
  6: { name: 'Cyan', hex: '#4ff0ff' },
  7: { name: 'Weiß', hex: '#ffffff' },
};
export const COMPONENTS = [R, G, B];

export function parseColor(str) {
  let mask = 0;
  for (const ch of String(str).toUpperCase()) mask |= { R, G, B, W: 7 }[ch] || 0;
  if (!mask) throw new Error(`Unbekannte Farbe: ${str}`);
  return mask;
}

/** Rot→Grün, Grün→Blau, Blau→Rot (Bitmaske um eins rotieren). Weiß bleibt Weiß. */
export const shiftColor = (c) => ((c << 1) | (c >> 2)) & 7;

// Spiegel: neue Richtung je einfallender Richtung.
const REFLECT = { '/': [1, 0, 3, 2], '\\': [3, 2, 1, 0] };

export function parseLevel(def) {
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  const cells = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = def.rows[y][x] ?? '#';
      cells.push(parseCell(ch, def.legend || {}, def.id));
    }
  }
  return {
    id: def.id,
    name: def.name,
    hint: def.hint || '',
    w, h, cells,
    inventory: def.inventory || 0,
    par: def.par ?? null,
  };
}

function parseCell(ch, legend, id) {
  switch (ch) {
    case '#': return { type: 'wall' };
    case '.': return { type: 'empty', build: true };
    case ',': return { type: 'empty', build: false };
    case '/': case '\\': return { type: 'mirror', orient: ch, rotatable: true };
    case 'L': return { type: 'mirror', orient: '/', rotatable: false };
    case 'J': return { type: 'mirror', orient: '\\', rotatable: false };
  }
  const entry = legend[ch];
  if (!entry) throw new Error(`Level ${id}: unbekanntes Zeichen '${ch}'`);
  if (entry.type === 'emitter') return { type: 'emitter', dir: DIR_INDEX[entry.dir], color: parseColor(entry.color) };
  if (entry.type === 'target') return { type: 'target', need: parseColor(entry.color) };
  if (entry.type === 'prism') return { type: 'prism' };
  if (entry.type === 'filter') return { type: 'filter', pass: parseColor(entry.color) };
  if (entry.type === 'portal') return { type: 'portal', pair: entry.pair };
  if (entry.type === 'sensor') return { type: 'sensor', need: parseColor(entry.color), door: entry.door };
  if (entry.type === 'door') return { type: 'door', door: entry.door };
  throw new Error(`Level ${id}: unbekannter Typ ${entry.type}`);
}

export function createState(level) {
  return { level, cells: level.cells.map((c) => ({ ...c })), inv: level.inventory, moves: 0 };
}

/**
 * Verfolgt alle Strahlen. Ergebnis:
 *  beams: [{ color, points: [[x,y],…] }] in Zellkoordinaten (Mitte = x+0.5)
 *  targets: [{ x, y, need, got, ok }]
 *  visited: Set der durchlaufenen Zellindizes
 *  solved: alle Ziele exakt in ihrer Farbe getroffen
 */
export function trace(state) {
  const { w, h } = state.level;
  const cells = state.cells;
  const got = new Map();
  const visited = new Set();
  const beams = [];
  const seen = new Set();
  const stack = [];

  // Portale paarweise verbinden (gleiche Kennung 'pair')
  const portals = new Map();
  const partner = new Map();
  cells.forEach((c, i) => {
    if (c.type === 'emitter') stack.push({ x: i % w, y: Math.floor(i / w), dir: c.dir, color: c.color });
    if (c.type === 'portal') {
      if (portals.has(c.pair)) { const j = portals.get(c.pair); partner.set(i, j); partner.set(j, i); }
      else portals.set(c.pair, i);
    }
  });

  while (stack.length) {
    const start = stack.pop();
    let { x, y, dir } = start;
    const { color } = start;
    const points = [[x + 0.5, y + 0.5]];
    let guard = w * h * 4 + 4;
    for (;;) {
      const key = `${x},${y},${dir},${color}`;
      if (seen.has(key) || guard-- < 0) break;
      seen.add(key);
      const [dx, dy] = DIRS[dir];
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) { points.push([x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5]); break; }
      const c = cells[ny * w + nx];
      x = nx; y = ny;
      if (c.type === 'wall') { points.push([x + 0.5 - dx * 0.5, y + 0.5 - dy * 0.5]); break; }
      if (c.type === 'emitter') { points.push([x + 0.5 - dx * 0.32, y + 0.5 - dy * 0.32]); break; }
      visited.add(ny * w + nx);
      // Ziele und Sensoren (Lichtschloss) sammeln Licht und stoppen den Strahl.
      if (c.type === 'target' || c.type === 'sensor') {
        got.set(ny * w + nx, (got.get(ny * w + nx) || 0) | color);
        points.push([x + 0.5 - dx * 0.18, y + 0.5 - dy * 0.18]);
        break;
      }
      if (c.type === 'mirror') {
        points.push([x + 0.5, y + 0.5]);
        dir = REFLECT[c.orient][dir];
      }
      // Strahlteiler: halbdurchlässiger Spiegel – ein Teil läuft geradeaus weiter, ein Teil wird gespiegelt.
      if (c.type === 'splitter') {
        points.push([x + 0.5, y + 0.5]);
        stack.push({ x, y, dir: REFLECT[c.orient][dir], color });
      }
      // Portal: Licht tritt am Partnerportal in derselben Richtung wieder aus.
      if (c.type === 'portal') {
        points.push([x + 0.5, y + 0.5]);
        const j = partner.get(ny * w + nx);
        if (j != null) {
          visited.add(j);
          stack.push({ x: j % w, y: Math.floor(j / w), dir, color });
        }
        break;
      }
      // Farbwandler: verschiebt jede Farbkomponente um eins (Rot→Grün→Blau→Rot), Licht läuft weiter.
      if (c.type === 'shifter') {
        points.push([x + 0.5, y + 0.5]);
        stack.push({ x, y, dir, color: shiftColor(color) });
        break;
      }
      // Prisma: zerlegt Licht – Rot knickt nach links, Grün geradeaus, Blau nach rechts ab.
      if (c.type === 'prism') {
        points.push([x + 0.5, y + 0.5]);
        for (const [comp, turn] of [[R, 3], [G, 0], [B, 1]]) {
          if (color & comp) stack.push({ x, y, dir: (dir + turn) % 4, color: comp });
        }
        break;
      }
      // Farbfilter: lässt nur die eigenen Farbanteile durch.
      if (c.type === 'filter') {
        points.push([x + 0.5, y + 0.5]);
        const out = color & c.pass;
        if (out) stack.push({ x, y, dir, color: out });
        break;
      }
    }
    if (points.length > 1) beams.push({ color, points });
  }

  const targets = [];
  const sensors = [];
  cells.forEach((c, i) => {
    if (c.type !== 'target' && c.type !== 'sensor') return;
    const g = got.get(i) || 0;
    const info = { x: i % w, y: Math.floor(i / w), need: c.need, got: g, ok: g === c.need };
    if (c.type === 'target') targets.push(info);
    else sensors.push({ ...info, door: c.door });
  });
  // Sensoren zählen nicht als Ziele: gelöst ist das Level erst, wenn alle Ziele stimmen.
  const solved = targets.length > 0 && targets.every((t) => t.ok);
  return { beams, targets, sensors, visited, solved };
}
