// Tagesrätsel: Die Levelschmiede baut aus dem Datum jeden Tag ein neues Rätsel. Gleiches Datum
// → gleicher Startwert → gleiches Rätsel für alle. Der Löser garantiert Lösbarkeit und Zugziel.
// Ergebnis wird je Tag im Browser zwischengespeichert.
import { forge } from './forge.js';

const R_E = { type: 'emitter', dir: 'E', color: 'R' };
const T = (c) => ({ type: 'target', color: c });

// Grundrisse: Wände, Lampen und Ziele stehen fest – Blöcke und Spieler verteilt die Schmiede.
const TEMPLATES = [
  { name: 'Spiegelgarten', blocks: ['n', 'm', 'o'], legend: { a: R_E, 1: T('R') },
    rows: ['###########', '#a........#', '#.........#', '#...#.#...#', '#.........#', '#........1#', '###########'] },
  { name: 'Prismenhof', blocks: ['P', 'o', 'o'], legend: { w: { type: 'emitter', dir: 'S', color: 'W' }, 1: T('R'), 2: T('G'), 3: T('B') },
    rows: ['###########', '#....w....#', '#.........#', '#3.......1#', '#.........#', '#....2....#', '###########'] },
  { name: 'Strömungskreis', blocks: ['n', 'm'], legend: { a: R_E, 1: T('R') },
    rows: ['#########', '#a......#', '#..>>>..#', '#.......#', '#..<<<..#', '#.....1.#', '#########'] },
  { name: 'Zwielicht', blocks: ['n', 'o', 'o'], legend: { a: R_E, b: { type: 'emitter', dir: 'W', color: 'B' }, 5: T('RB') },
    rows: ['###########', '#a........#', '#.........#', '#....#....#', '#.........#', '#..5.....b#', '###########'] },
  { name: 'Wandelweg', blocks: ['x', 'x', 'o'], legend: { a: R_E, 3: T('B') },
    rows: ['###########', '#a.......3#', '#.........#', '#..#...#..#', '#.........#', '###########'] },
  { name: 'Lampenhain', blocks: ['L', 'o'], legend: { L: { type: 'lamp', dir: 'N', color: 'G' }, 2: T('G') },
    rows: ['#########', '#.......#', '#.#...#.#', '#...2...#', '#.#...#.#', '#.......#', '#########'] },
];

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function seedOf(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const cacheKey = (key) => `prismara.daily.${key}`;

/** Gespeichertes Rätsel des Tages oder null. */
export function cachedDaily(key = todayKey()) {
  try { const c = JSON.parse(localStorage.getItem(cacheKey(key)) || 'null'); return c?.rows ? c : null; } catch { return null; }
}
export function storeDaily(def) {
  try { localStorage.setItem(cacheKey(def.id.slice(6)), JSON.stringify(def)); } catch { /* kein Speicher */ }
}

/** Baut (oder lädt) das Rätsel für ein Datum (im Hauptthread). */
export function dailyLevel(key = todayKey()) {
  const c = cachedDaily(key);
  if (c) return c;
  const def = buildDaily(key);
  if (def) storeDaily(def);
  return def;
}

/** Reine Berechnung (auch im Web Worker nutzbar): probiert Grundrisse, bis die Schmiede ein
 *  Rätsel mit 8–24 Zügen findet. */
export function buildDaily(key) {
  const seed = seedOf(key);
  for (let k = 0; k < TEMPLATES.length * 2; k++) {
    const tpl = TEMPLATES[(seed + k) % TEMPLATES.length];
    const r = forge({ legend: tpl.legend, rows: tpl.rows }, tpl.blocks, { tries: 14, limit: 40000, seed: seed + k * 7919, minPar: 8, maxPar: 24 });
    if (!r.best) continue;
    const [y, m, d] = key.split('-');
    const def = {
      id: `daily-${key}`, name: `Tagesrätsel ${d}.${m}.`, daily: true, par: r.best.par, legend: tpl.legend, rows: r.best.rows,
      hint: `Heute aus der Levelschmiede: „${tpl.name}“. Jeder bekommt heute dasselbe Rätsel – morgen gibt es ein neues.`,
    };
    return def;
  }
  return null;
}
