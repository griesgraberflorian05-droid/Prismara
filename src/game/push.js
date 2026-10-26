// Modus "Lichtläufer": Der Spieler steuert einen Lichtblock durchs Level und schiebt
// Spiegelblöcke. Leertaste dreht den Spiegel (oder Strahlteiler) vor dem Spieler. Der
// Spielerblock wirft Schatten (blockiert Licht). Portale sind fest und nicht begehbar.
// Lichtschlösser: ein beleuchteter Sensor öffnet sein Tor. Strahlen und Ziele nutzen
// dieselbe Logik wie engine.js.
import { DIRS, parseColor, trace } from './engine.js';

const DIR_INDEX = { N: 0, E: 1, O: 1, S: 2, W: 3 };
// Strömungen (Einbahnfelder): nur in Pfeilrichtung betretbar – für Spieler und Blöcke.
const FLOW_CHARS = { '^': 0, '>': 1, v: 2, '<': 3 };

export function parsePushLevel(def) {
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  const cells = [];
  const blocks = [];
  const enemies = [];
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
      else if (ch === 'x') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'shifter' }); }
      else if (ch === 'o') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'stone' }); }
      else if (ch === 'P') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'prism' }); }
      else if (ch === '~') cells.push({ type: 'empty', ice: true });
      // Schlüssel ('K') liegt auf dem Boden und wird beim Betreten eingesteckt; Gittertor ('L') ist
      // fest, bis der Spieler mit einem Schlüssel dagegenläuft – dann schwingt es auf (verbraucht ihn).
      // (nur wenn die Legende das Zeichen nicht anders belegt – 'L' ist in alten Räumen eine Wanderlampe)
      else if (ch === 'K' && !legend[ch]) cells.push({ type: 'empty', key: true });
      else if (ch === 'L' && !legend[ch]) cells.push({ type: 'lock' });
      // Moor: 'O' Grube (Spieler kann nicht hinein; ein hineingeschobener Block versinkt und füllt sie
      // zum Trittstein), '%' brüchiger Boden (bricht hinter dem Spieler ein und wird zur Grube).
      else if (ch === 'O' && !legend[ch]) cells.push({ type: 'empty', hole: true });
      else if (ch === '%' && !legend[ch]) cells.push({ type: 'empty', crumble: true });
      else if (ch in FLOW_CHARS) cells.push({ type: 'empty', flow: FLOW_CHARS[ch] });
      else if (legend[ch]?.type === 'lamp') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'lamp', dir: DIR_INDEX[legend[ch].dir], color: parseColor(legend[ch].color) }); }
      else if (legend[ch]?.type === 'filter') { cells.push({ type: 'empty' }); blocks.push({ x, y, kind: 'filter', pass: parseColor(legend[ch].color) }); }
      else if (legend[ch]?.type === 'emitter') cells.push({ type: 'emitter', dir: DIR_INDEX[legend[ch].dir], color: parseColor(legend[ch].color) });
      else if (legend[ch]?.type === 'target') cells.push({ type: 'target', need: parseColor(legend[ch].color) });
      else if (legend[ch]?.type === 'portal') cells.push({ type: 'portal', pair: legend[ch].pair });
      else if (legend[ch]?.type === 'sensor') cells.push({ type: 'sensor', need: parseColor(legend[ch].color), door: legend[ch].door });
      else if (legend[ch]?.type === 'door') cells.push({ type: 'door', door: legend[ch].door });
      else if (legend[ch]?.type === 'plate') cells.push({ type: 'empty', plate: legend[ch].plate });
      else if (legend[ch]?.type === 'flip') cells.push({ type: 'flip', plate: legend[ch].plate, orient: legend[ch].orient });
      // Schattenläufer (Gegner): 'z' patrouilliert waagrecht (startet nach Osten), 'y' senkrecht (nach Süden)
      else if (ch === 'z' || ch === 'y') { cells.push({ type: 'empty' }); enemies.push({ x, y, dir: ch === 'z' ? 1 : 2, alive: true }); }
      else throw new Error(`Level ${def.id}: unbekanntes Zeichen '${ch}'`);
    }
  }
  if (!player) throw new Error(`Level ${def.id}: kein Spieler '@'`);
  return { id: def.id, name: def.name, hint: def.hint || '', w, h, cells, start: { player, blocks, enemies }, par: def.par ?? null };
}

export function createPushState(level) {
  return {
    level, player: { ...level.start.player }, blocks: level.start.blocks.map((b) => ({ ...b })),
    enemies: (level.start.enemies || []).map((e) => ({ ...e })), moves: 0,
    keys: 0, got: [], unl: [], // Schlüssel in der Tasche, aufgehobene Schlüssel, offene Gittertore (Zellindizes)
    fill: [], broken: [], // gefüllte Gruben, eingebrochener Boden (Zellindizes)
  };
}

/** Ist das Feld gerade eine offene Grube (von Anfang an oder eingebrochen, noch nicht gefüllt)? */
export function isPit(state, i) {
  const c = state.level.cells[i];
  if (!c || (state.fill || []).includes(i)) return false;
  return !!c.hole || (state.broken || []).includes(i);
}

const blockAt = (s, x, y) => s.blocks.findIndex((b) => b.x === x && b.y === y);
// open: Zellindizes offener Lichttore (Sensor beleuchtet oder Tor durch Block/Spieler verklemmt)
// dir: Bewegungsrichtung – Strömungsfelder sperren jede andere Richtung.
const solidCell = (level, x, y, open, dir) => {
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return true;
  const c = level.cells[y * level.w + x];
  if (c.type === 'door' || c.type === 'lock') return !open.has(y * level.w + x);
  if (c.flow != null && c.flow !== dir) return true;
  return c.type !== 'empty';
};

const onIce = (level, x, y) => !!level.cells[y * level.w + x].ice;

/** Schritt in Richtung dir (0..3). Schiebt einen Block, wenn dahinter frei ist. Auf Eis rutschen
 *  Spieler und geschobene Blöcke weiter, bis etwas im Weg ist. */
export function move(state, dir) {
  const [dx, dy] = DIRS[dir];
  const { level } = state;
  const nx = state.player.x + dx, ny = state.player.y + dy;
  const turned = state.player.dir !== dir;
  const open = pushTrace(state).open; // Tore so, wie sie vor dem Zug stehen
  // Gittertor aufschließen: mit Schlüssel dagegenlaufen öffnet es und man geht gleich hindurch
  const ti = ny * level.w + nx;
  if (level.cells[ti]?.type === 'lock' && !open.has(ti) && (state.keys || 0) > 0 && blockAt(state, nx, ny) < 0) {
    return move({ ...state, keys: state.keys - 1, unl: [...state.unl, ti].sort((a, b) => a - b) }, dir);
  }
  const pit = (x, y) => isPit(state, y * level.w + x);
  if (solidCell(level, nx, ny, open, dir) || pit(nx, ny)) {
    // gegen Wand oder an den Grubenrand: nur umdrehen (zählt nicht als Zug)
    return turned ? { ...state, player: { ...state.player, dir } } : null;
  }
  const bi = blockAt(state, nx, ny);
  let blocks = state.blocks.map((b) => ({ ...b }));
  const enemyAt = (x, y) => (state.enemies || []).some((e) => e.alive && e.x === x && e.y === y);
  const free = (x, y, ignore) => !solidCell(level, x, y, open, dir) && !blocks.some((b, i) => i !== ignore && b.x === x && b.y === y) && !enemyAt(x, y);
  let pushed = null, sunk = null;
  let fill = state.fill || [];
  if (bi >= 0) {
    const bx = nx + dx, by = ny + dy;
    if (!free(bx, by, bi)) {
      return turned ? { ...state, player: { ...state.player, dir } } : null;
    }
    blocks[bi].x = bx; blocks[bi].y = by;
    // geschobener Block rutscht auf Eis weiter (bis zur Grube, in die er fällt)
    while (!pit(blocks[bi].x, blocks[bi].y) && onIce(level, blocks[bi].x, blocks[bi].y) && free(blocks[bi].x + dx, blocks[bi].y + dy, bi)) {
      blocks[bi].x += dx; blocks[bi].y += dy;
    }
    pushed = bi;
    // Block versinkt in der Grube und füllt sie
    if (pit(blocks[bi].x, blocks[bi].y)) {
      sunk = { ...blocks[bi] };
      fill = [...fill, blocks[bi].y * level.w + blocks[bi].x].sort((a, b) => a - b);
      blocks = blocks.filter((_, i) => i !== bi);
      pushed = null;
    }
  }
  let px = nx, py = ny;
  // Spieler rutscht auf Eis weiter (nicht, wenn er gerade einen Block geschoben hat; nie in eine Grube)
  if (bi < 0) {
    while (onIce(level, px, py) && free(px + dx, py + dy, -1) && !pit(px + dx, py + dy)) { px += dx; py += dy; }
  }
  // Brüchiger Boden: das verlassene Feld bricht ein
  let broken = state.broken || [];
  const from = state.player.y * level.w + state.player.x;
  if (level.cells[from].crumble && !broken.includes(from) && !fill.includes(from)) broken = [...broken, from].sort((a, b) => a - b);
  // Schlüssel einstecken
  let { keys = 0, got = [], unl = [] } = state;
  const pi = py * level.w + px;
  if (level.cells[pi].key && !got.includes(pi)) { keys++; got = [...got, pi].sort((a, b) => a - b); }
  return stepEnemies(state, { level, player: { x: px, y: py, dir }, blocks, enemies: state.enemies, moves: state.moves + 1, pushed, sunk, keys, got, unl, fill, broken });
}

/** Nach jedem echten Zug gehen alle Schattenläufer einen Schritt; vor Hindernissen kehren sie um.
 *  Berühren sie den Spieler (oder kreuzen ihn), ist er erwischt (dead). Wer danach in einem
 *  Lichtstrahl steht, löst sich auf (alive = false). */
function stepEnemies(prev, next) {
  if (!next.enemies || !next.enemies.length) return next;
  const { level } = next;
  const open = pushTrace(prev).open;
  const p = next.player, p0 = prev.player;
  let dead = false;
  const blocked = (x, y, d) => solidCell(level, x, y, open, d) || next.blocks.some((b) => b.x === x && b.y === y) || isPit(next, y * level.w + x);
  let enemies = next.enemies.map((e) => {
    if (!e.alive) return e;
    if (e.x === p.x && e.y === p.y) { dead = true; return e; } // Spieler läuft in den Gegner
    let dir = e.dir;
    for (let attempt = 0; attempt < 2; attempt++) {
      const [dx, dy] = DIRS[dir];
      const tx = e.x + dx, ty = e.y + dy;
      if (!blocked(tx, ty, dir)) {
        if (tx === p.x && ty === p.y) dead = true;
        if (tx === p0.x && ty === p0.y && e.x === p.x && e.y === p.y) dead = true; // aneinander vorbei = erwischt
        return { ...e, x: tx, y: ty, dir };
      }
      dir = (dir + 2) % 4; // umkehren
    }
    return { ...e, dir };
  });
  const lit = trace0(next, enemies);
  enemies = enemies.map((e) => (e.alive && lit.has(e.y * level.w + e.x) ? { ...e, alive: false, dissolved: true } : e));
  return { ...next, enemies, dead };
}

// Lichtverfolgung für die Gegner-Prüfung (Gegner selbst blockieren kein Licht)
function trace0(next, enemies) {
  return pushTrace({ ...next, enemies }).visited;
}

/** Dreht den Block direkt vor dem Spieler: Spiegel/Strahlteiler kippen, Wanderlampen drehen
 *  ihre Leuchtrichtung um 90° im Uhrzeigersinn. */
export function rotateFront(state) {
  const [dx, dy] = DIRS[state.player.dir];
  const bi = blockAt(state, state.player.x + dx, state.player.y + dy);
  if (bi < 0) return null;
  const b0 = state.blocks[bi];
  if (!b0.orient && b0.kind !== 'lamp') return null;
  const turn = (b) => (b.kind === 'lamp' ? { ...b, dir: (b.dir + 1) % 4 } : { ...b, orient: b.orient === '/' ? '\\' : '/' });
  const blocks = state.blocks.map((b, i) => (i === bi ? turn(b) : { ...b }));
  return stepEnemies(state, { ...state, blocks, moves: state.moves + 1, rotated: bi });
}

const traceCache = new WeakMap();

/** Baut die Zellen für die Strahlverfolgung: Spiegelblöcke spiegeln, Steine und Spieler blockieren.
 *  Lichtschlösser: Ein Tor ist offen, solange sein Sensor genau richtig beleuchtet ist oder
 *  etwas im Tor steht (verklemmt). Da offenes Licht weitere Sensoren erreichen kann, wird bis
 *  zum Gleichgewicht neu verfolgt. Ergebnis enthält 'open' (Zellindizes offener Tore). */
export function pushTrace(state) {
  const cached = traceCache.get(state);
  if (cached) return cached;
  const { level } = state;
  const base = level.cells.map((c) => ({ ...c }));
  const occupied = new Set(state.blocks.map((b) => b.y * level.w + b.x));
  occupied.add(state.player.y * level.w + state.player.x);
  const doorCells = [];
  base.forEach((c, i) => { if (c.type === 'door') doorCells.push(i); });
  // Gittertore: zu = Wand (hält Licht auf), offen = Boden
  const unlocked = new Set(state.unl || []);
  base.forEach((c, i) => { if (c.type === 'lock') base[i] = unlocked.has(i) ? { type: 'empty' } : { type: 'wall', lock: true }; });
  for (const b of state.blocks) {
    base[b.y * level.w + b.x] =
      b.kind === 'mirror' ? { type: 'mirror', orient: b.orient }
      : b.kind === 'splitter' ? { type: 'splitter', orient: b.orient }
      : b.kind === 'prism' ? { type: 'prism' }
      : b.kind === 'filter' ? { type: 'filter', pass: b.pass }
      : b.kind === 'lamp' ? { type: 'emitter', dir: b.dir, color: b.color }
      : b.kind === 'shifter' ? { type: 'shifter' }
      : { type: 'wall' };
  }
  base[state.player.y * level.w + state.player.x] = { type: 'wall', player: true };

  // Druckplatten: belegt von Spieler oder Block → alle Kippspiegel mit gleichem Buchstaben kippen.
  const pressed = new Set();
  level.cells.forEach((c, i) => { if (c.plate && c.type === 'empty' && occupied.has(i)) pressed.add(c.plate); });
  level.cells.forEach((c, i) => {
    if (c.type !== 'flip') return;
    const orient = pressed.has(c.plate) ? (c.orient === '/' ? '\\' : '/') : c.orient;
    base[i] = { type: 'mirror', orient, flip: true };
  });

  let litDoors = new Set();
  let tr;
  for (let round = 0; round < 6; round++) {
    const cells = base.map((c, i) => (level.cells[i].type === 'door' && !occupied.has(i)
      ? (litDoors.has(level.cells[i].door) ? { type: 'empty' } : { type: 'wall', door: true })
      : c));
    tr = trace({ level: { ...level, cells }, cells });
    const next = new Set(tr.sensors.filter((s) => s.ok).map((s) => s.door));
    const same = next.size === litDoors.size && [...next].every((d) => litDoors.has(d));
    litDoors = next;
    if (same) break;
  }
  tr.open = new Set([...doorCells.filter((i) => occupied.has(i) || litDoors.has(level.cells[i].door)), ...unlocked]);
  tr.litDoors = litDoors;
  tr.pressed = pressed;
  traceCache.set(state, tr);
  return tr;
}

function key(s) {
  return `${s.player.x},${s.player.y}|` + s.blocks.map((b) => `${b.x},${b.y},${b.kind.slice(0, 2)}${b.orient || b.pass || ''}${b.kind === 'lamp' ? b.dir : ''}`).sort().join(';')
    + (s.enemies?.length ? '|' + s.enemies.map((e) => (e.alive ? `${e.x},${e.y},${e.dir}` : 'x')).join(';') : '')
    + (s.got?.length || s.unl?.length ? `|k${s.keys}g${s.got.join(',')}u${s.unl.join(',')}` : '')
    + (s.fill?.length || s.broken?.length ? `|f${s.fill.join(',')}x${s.broken.join(',')}` : '');
}

/** Breitensuche über Spielerposition + Blöcke. Blickrichtung zählt nur fürs Drehen.
 *  from: optional ein laufender Spielstand (für die Wegrolle: nächster richtiger Zug). */
export function solvePush(level, { limit = 400000, onProgress = null, every = 50000, from = null } = {}) {
  const start = from ? { ...from, moves: 0, dead: false } : createPushState(level);
  const queue = [{ s: start, path: [] }];
  const seen = new Set([key(start) + '|' + start.player.dir]);
  let head = 0;
  let nextReport = every;
  while (head < queue.length && seen.size < limit) {
    const { s, path } = queue[head++];
    if (onProgress && seen.size >= nextReport) { nextReport += every; onProgress({ explored: seen.size, depth: path.length, queue: queue.length - head }); }
    if (pushTrace(s).solved) return { solvable: true, minMoves: path.filter((p) => !String(p).startsWith('turn')).length, path, explored: seen.size };
    const next = [];
    for (let d = 0; d < 4; d++) { const n = move(s, d); if (n) next.push([n, d]); }
    const r = rotateFront(s);
    if (r) next.push([r, 'rot']);
    for (const [n, a] of next) {
      if (n.dead) continue; // erwischt: kein gültiger Weg
      const k = key(n) + '|' + n.player.dir;
      if (seen.has(k)) continue;
      seen.add(k);
      const isTurnOnly = typeof a === 'number' && n.moves === s.moves;
      queue.push({ s: n, path: [...path, isTurnOnly ? `turn${a}` : a] }); // turnN = nur umdrehen (Richtung N)
    }
  }
  return { solvable: false, minMoves: null, path: [], explored: seen.size, exhausted: seen.size >= limit };
}
