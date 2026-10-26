// Levelschmiede: baut Rätsel aus einem festen Grundriss. forge() verteilt Blöcke und den Spieler
// zufällig auf freie Felder und behält den Entwurf, für den der Löser die meisten Mindestzüge
// findet. climb() verbessert einen lösbaren Entwurf schrittweise (Bergsteigen): ein Block oder
// der Spieler zieht auf ein anderes freies Feld – behalten, wenn es lösbar bleibt und nicht leichter wird.
// Genutzt für Meisterprüfungen (im Browser) und das Tagesrätsel im Spiel.
import { parsePushLevel, createPushState, pushTrace, solvePush } from './push.js';

/** Deterministischer Zufall (gleicher Startwert → gleiches Rätsel). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 1) / 0x7fffffff; };
}

function evaluate(legend, rows, limit) {
  try {
    const level = parsePushLevel({ id: 'forge', name: 'forge', legend, rows });
    if (pushTrace(createPushState(level)).solved) return null; // schon gelöst = kein Rätsel
    const r = solvePush(level, { limit });
    return r.solvable ? { par: r.minMoves, explored: r.explored } : null;
  } catch { return null; }
}

/** Zufällige Verteilung von `blocks` (Levelzeichen) und Spieler auf '.'-Felder. */
export function forge(base, blocks, { tries = 30, limit = 150000, seed = 1, minPar = 1, maxPar = Infinity } = {}) {
  const rand = rng(seed);
  const free = [];
  base.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') free.push([x, y]); }));
  let best = null, tried = 0, solvable = 0;
  for (let k = 0; k < tries; k++) {
    const pool = [...free];
    const rows = base.rows.map((r) => [...r]);
    for (const ch of [...blocks, '@']) {
      const [x, y] = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      rows[y][x] = ch;
    }
    const joined = rows.map((r) => r.join(''));
    tried++;
    const r = evaluate(base.legend, joined, limit);
    if (!r) continue;
    solvable++;
    if (r.par >= minPar && r.par <= maxPar && (!best || r.par > best.par)) best = { ...r, rows: joined };
  }
  return { tried, solvable, best };
}

/** Bergsteigen von einem lösbaren Entwurf aus. `movable`: Zeichen, die verschoben werden dürfen. */
export function climb(legend, startRows, { iters = 20, limit = 150000, seed = 1, movable = 'nmhkoxP@LK' } = {}) {
  const rand = rng(seed);
  let cur = startRows, curR = evaluate(legend, cur, limit);
  if (!curR) return { error: 'Start nicht lösbar' };
  let accepted = 0;
  for (let k = 0; k < iters; k++) {
    const g = cur.map((r) => [...r]);
    const items = [], free = [];
    g.forEach((r, y) => r.forEach((ch, x) => { if (movable.includes(ch)) items.push([x, y]); else if (ch === '.') free.push([x, y]); }));
    if (!items.length || !free.length) break;
    const [ix, iy] = items[Math.floor(rand() * items.length)], [fx, fy] = free[Math.floor(rand() * free.length)];
    g[fy][fx] = g[iy][ix]; g[iy][ix] = '.';
    const rows = g.map((r) => r.join(''));
    const r = evaluate(legend, rows, limit);
    if (r && r.par >= curR.par) { cur = rows; curR = r; accepted++; }
  }
  return { ...curR, accepted, rows: cur };
}
