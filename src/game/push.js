// Modus "Lichtläufer": Der Spieler steuert einen Lichtblock durchs Level und schiebt
// Spiegelblöcke. Leertaste dreht den Spiegel (oder Strahlteiler) vor dem Spieler. Der
// Spielerblock wirft Schatten (blockiert Licht). Portale sind fest und nicht begehbar. Strahlen und Ziele nutzen dieselbe Logik wie engine.js.
import { DIRS, parseColor, trace } from './engine.js';

const DIR_INDEX = { N: 0, E: 1, O: 1, S: 2, W: 3 };

export function parsePushLevel(def) {
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  const cells = [];
  const blocks = [];
  let player = null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = def.rows[y][x] ?? '#';
      const legend = def.legend || {};
      if (ch === '#') cells.push({ type: 'wall' });
      else if (ch === '.') cells.push({ type: 'empty' });
      else if (ch === '@') { cells.push({ type: 'empty' }); player = { x, y, dir: 0 }; }
      else if (ch === 'm' || ch === 'n') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'mirror', orient: ch === 'm' ? '/' : '\\' }); }
      else if (ch === 'h' || ch === 'k') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'splitter', orient: ch === 'h' ? '/' : '\\' }); }
      else if (ch === 'o') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'stone' }); }
      else if (ch === 'P') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'prism' }); }
      else if (ch === '~') cells.push({ type: 'empty', ice: true });
      else if (legend[ch]?.type === 'filter') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'filter', pass: parseColor(legend[ch].color) }); }
      else if (legend[ch]?.type === 'emitter') cells.push({ type: 'emitter', dir: DIR_INDEX[legend[ch].dir], color: parseColor(legend[ch].color) });
      else if (legend[ch]?.type === 'target') cells.push({ type: 'target', need: parseColor(legend[ch].color) });
      else if (legend[ch]?.type === 'portal') cells.push({ type: 'portal', pair: legend[ch].pair });
      else throw new Error(`Level ${def.id}: unbekanntes Zeichen '${ch}'`);
    }
  }
  if (!player) throw new Error(`Level ${def.id}: kein Spieler '@'`);
  return { id: def.id, name: def.name, hint: def.hint || '', w, h, cells, start: { player, blocks }, par: def.par ?? null };
}

export function createPushState(level) {
  return { level, player: { ...level.start.player }, blocks: level.start.blocks.map((b) => ({ ...b })), moves: 0 };
}

const blockAt = (s, x, y) => s.blocks.findIndex((b) => b.x === x && b.y === y);
const solidCell = (level, x, y) => {
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return true;
  return level.cells[y * level.w + x].type !== 'empty';
};

const onIce = (level, x, y) => !!level.cells[y * level.w + x].ice;

/** Schritt in Richtung dir (0..3). Schiebt einen Block, wenn dahinter frei ist. Auf Eis rutschen
 *  Spieler und geschobene Blöcke weiter, bis etwas im Weg ist. */
export function move(state, dir) {
  const [dx, dy] = DIRS[dir];
  const { level } = state;
  const nx = state.player.x + dx, ny = state.player.y + dy;
  const turned = state.player.dir !== dir;
  if (solidCell(level, nx, ny)) {
    // gegen Wand: nur umdrehen (zählt nicht als Zug)
    return turned ? { ...state, player: { ...state.player, dir } } : null;
  }
  const bi = blockAt(state, nx, ny);
  const blocks = state.blocks.map((b) => ({ ...b }));
  const free = (x, y, ignore) => !solidCell(level, x, y) && !blocks.some((b, i) => i !== ignore && b.x === x && b.y === y);
  let pushed = null;
  if (bi >= 0) {
    const bx = nx + dx, by = ny + dy;
    if (!free(bx, by, bi)) {
      return turned ? { ...state, player: { ...state.player, dir } } : null;
    }
    blocks[bi].x = bx; blocks[bi].y = by;
    // geschobener Block rutscht auf Eis weiter
    while (onIce(level, blocks[bi].x, blocks[bi].y) && free(blocks[bi].x + dx, blocks[bi].y + dy, bi)) {
      blocks[bi].x += dx; blocks[bi].y += dy;
    }
    pushed = bi;
  }
  let px = nx, py = ny;
  // Spieler rutscht auf Eis weiter (nicht, wenn er gerade einen Block geschoben hat)
  if (pushed === null) {
    while (onIce(level, px, py) && free(px + dx, py + dy, -1)) { px += dx; py += dy; }
  }
  return { level, player: { x: px, y: py, dir }, blocks, moves: state.moves + 1, pushed };
}

/** Dreht den Spiegel- oder Strahlteilerblock direkt vor dem Spieler. */
export function rotateFront(state) {
  const [dx, dy] = DIRS[state.player.dir];
  const bi = blockAt(state, state.player.x + dx, state.player.y + dy);
  if (bi < 0 || !state.blocks[bi].orient) return null;
  const blocks = state.blocks.map((b, i) => (i === bi ? { ...b, orient: b.orient === '/' ? '\\' : '/' } : { ...b }));
  return { ...state, blocks, moves: state.moves + 1, rotated: bi };
}

/** Baut die Zellen für die Strahlverfolgung: Spiegelblöcke spiegeln, Steine und Spieler blockieren. */
export function pushTrace(state) {
  const { level } = state;
  const cells = level.cells.map((c) => ({ ...c }));
  for (const b of state.blocks) {
    cells[b.y * level.w + b.x] =
      b.kind === 'mirror' ? { type: 'mirror', orient: b.orient }
      : b.kind === 'splitter' ? { type: 'splitter', orient: b.orient }
      : b.kind === 'prism' ? { type: 'prism' }
      : b.kind === 'filter' ? { type: 'filter', pass: b.pass }
      : { type: 'wall' };
  }
  cells[state.player.y * level.w + state.player.x] = { type: 'wall', player: true };
  return trace({ level: { ...level, cells }, cells });
}

function key(s) {
  return `${s.player.x},${s.player.y}|` + s.blocks.map((b) => `${b.x},${b.y},${b.kind[0]}${b.orient || b.pass || ''}`).sort().join(';');
}

/** Breitensuche über Spielerposition + Blöcke. Blickrichtung zählt nur fürs Drehen. */
export function solvePush(level, { limit = 400000, onProgress = null, every = 50000 } = {}) {
  const start = createPushState(level);
  const queue = [{ s: start, path: [] }];
  const seen = new Set([key(start) + '|' + start.player.dir]);
  let head = 0;
  let nextReport = every;
  while (head < queue.length && seen.size < limit) {
    const { s, path } = queue[head++];
    if (onProgress && seen.size >= nextReport) { nextReport += every; onProgress({ explored: seen.size, depth: path.length, queue: queue.length - head }); }
    if (pushTrace(s).solved) return { solvable: true, minMoves: path.filter((p) => p !== 'turn').length, path, explored: seen.size };
    const next = [];
    for (let d = 0; d < 4; d++) { const n = move(s, d); if (n) next.push([n, d]); }
    const r = rotateFront(s);
    if (r) next.push([r, 'rot']);
    for (const [n, a] of next) {
      const k = key(n) + '|' + n.player.dir;
      if (seen.has(k)) continue;
      seen.add(k);
      const isTurnOnly = typeof a === 'number' && n.moves === s.moves;
      queue.push({ s: n, path: [...path, isTurnOnly ? 'turn' : a] });
    }
  }
  return { solvable: false, minMoves: null, path: [], explored: seen.size, exhausted: seen.size >= limit };
}
