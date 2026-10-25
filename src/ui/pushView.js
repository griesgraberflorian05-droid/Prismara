// Spielansicht Modus "Lichtläufer": Lichtblock steuern, Spiegelblöcke schieben und drehen.
import { parsePushLevel, createPushState, move, rotateFront, pushTrace } from '../game/push.js';
import { PUSH_LEVELS } from '../game/pushLevels.js';
import { BoardRenderer } from '../game/render.js';
import { recordSolve, starsFor, bestMoves } from '../game/progress.js';
import { prefersReducedMotion } from '../settings.js';
import { IS_DEV } from '../config.js';
import { COLOR_INFO } from '../game/engine.js';
import { celebrate, sparkle } from './celebrate.js';
import { devlog } from '../devlog.js';

const DIR_NAME = ['Norden', 'Osten', 'Süden', 'Westen'];
const KIND_NAME = { mirror: 'Spiegel', splitter: 'Strahlteiler', stone: 'Stein', prism: 'Prisma', filter: 'Filter' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SLIDE_MS = 110;

export function mountPush(root, params) {
  const index = Math.max(0, Math.min(PUSH_LEVELS.length - 1, parseInt(params[0] || '0', 10) || 0));
  const def = PUSH_LEVELS[index];
  const level = parsePushLevel(def);

  root.innerHTML = `
    <section class="game">
      <div class="game-hud">
        <div class="hud-left">
          <a class="btn btn-sm" href="#/menu" aria-label="Zurück zum Menü">← Menü</a>
          <div>
            <div class="kicker">Lichtläufer · Level ${index + 1} / ${PUSH_LEVELS.length}</div>
            <h1 class="level-name">${esc(def.name)}</h1>
          </div>
        </div>
        <div class="hud-stats" aria-live="polite">
          <div class="stat"><span>Züge</span><b id="moves">0</b><small>Ziel ≤ ${def.par ?? '–'}</small></div>
          <div class="stat"><span>Ziele</span><b id="targets">0/0</b><small>erfüllt</small></div>
        </div>
        <div class="hud-actions">
          <button class="btn btn-sm" id="rotate" title="Spiegel vor dir drehen (Leertaste)">⟳ Drehen</button>
          <button class="btn btn-sm" id="undo" title="Rückgängig (Z)">↶ Zurück</button>
          <button class="btn btn-sm" id="reset" title="Neustart (R)">⟲ Neustart</button>
        </div>
      </div>
      <div class="board-wrap">
        <canvas id="board" tabindex="0" aria-label="Spielfeld. Pfeiltasten oder WASD bewegen den Lichtblock, Leertaste dreht den Spiegel davor."></canvas>
        <div class="win" id="win" hidden role="dialog" aria-labelledby="win-title"></div>
      </div>
      <p class="hint"><span class="hint-text">${esc(def.hint)}</span>
        <span class="keys muted">Pfeile/WASD: laufen &amp; schieben · Leertaste: drehen · Klick/Tippen: Schritt in diese Richtung · Z zurück · R neu</span></p>
      <p class="legend-line muted small">Farbsymbole: <b class="sym-r">▲ Rot</b> <b class="sym-g">● Grün</b> <b class="sym-b">■ Blau</b> · Dein Block wirft Schatten · Ziel erfüllt = gefüllt mit ✓ · falsche Farbe = ≠</p>
    </section>`;

  const $ = (s) => root.querySelector(s);
  const canvas = $('#board');
  const renderer = new BoardRenderer(canvas);
  let state = createPushState(level);
  let history = [];
  let tr = pushTrace(state);
  let won = false;
  let beamStart = performance.now();
  let running = true;
  // Animation: vorherige Positionen für sanftes Gleiten
  let anim = { t0: 0, player: { ...state.player }, blocks: state.blocks.map((b) => ({ ...b })) };

  function resize() { renderer.resize(); renderer.layout(level); }
  resize();

  function updateHud() {
    $('#moves').textContent = state.moves;
    const okCount = tr.targets.filter((t) => t.ok).length;
    $('#targets').textContent = `${okCount}/${tr.targets.length}`;
    $('#undo').disabled = !history.length || won;
    $('#moves').parentElement.classList.toggle('over-par', def.par != null && state.moves > def.par);
  }

  function commit(next) {
    if (!next || won) return false;
    anim = { t0: performance.now(), player: { ...state.player }, blocks: state.blocks.map((b) => ({ ...b })) };
    history.push(state);
    state = next;
    const before = tr;
    tr = pushTrace(state);
    keepStablePrefix(before, tr);
    beamStart = performance.now();
    updateHud();
    // Funken, sobald ein Ziel neu erfüllt ist (kurz verzögert, bis der Strahl angekommen ist)
    tr.targets.forEach((t, i) => {
      if (t.ok && !before.targets[i]?.ok && !tr.solved) {
        setTimeout(() => { const p = targetClient(t); sparkle(p.x, p.y, COLOR_INFO[t.need].hex); }, 250);
      }
    });
    logMove(history[history.length - 1], state, before);
    if (tr.solved) onWin();
    return true;
  }

  // Jeder Zug als Zeile im Live-Log: Richtung, Position, geschobener/gedrehter Block, Strahlen, Ziele.
  function logMove(prev, next, beforeTr) {
    const p = next.player;
    let what = next.rotated != null
      ? `dreht ${KIND_NAME[next.blocks[next.rotated].kind]} auf „${next.blocks[next.rotated].orient}“`
      : `→ ${DIR_NAME[p.dir]} nach (${p.x},${p.y})`;
    if (next.pushed != null) {
      const b = next.blocks[next.pushed];
      what += ` · schiebt ${KIND_NAME[b.kind]} nach (${b.x},${b.y})`;
    }
    if (prev && (Math.abs(prev.player.x - p.x) + Math.abs(prev.player.y - p.y)) > 1) what += ' · rutscht über Eis';
    const ok = tr.targets.filter((t) => t.ok).length;
    devlog('SPIEL', `${def.id} Zug ${next.moves}: ${what} · ${tr.beams.length} Strahlen · Ziele ${ok}/${tr.targets.length}`);
    tr.targets.forEach((t, i) => {
      if (t.ok && !beforeTr.targets[i]?.ok) devlog('SPIEL', `${def.id}: Ziel ${COLOR_INFO[t.need].name} bei (${t.x},${t.y}) leuchtet ✓`);
      if (!t.ok && beforeTr.targets[i]?.ok) devlog('SPIEL', `${def.id}: Ziel ${COLOR_INFO[t.need].name} bei (${t.x},${t.y}) erlischt`);
    });
  }

  // Unveränderte Strahlanfänge bleiben stehen; nur der neue Teil wächst nach (kein Flackern beim Laufen).
  function keepStablePrefix(oldTr, newTr) {
    const key = (b) => `${b.points[0][0]},${b.points[0][1]},${b.color}`;
    const old = new Map(oldTr.beams.map((b) => [key(b), b]));
    for (const b of newTr.beams) {
      const o = old.get(key(b));
      b.prefix = o ? commonLength(o.points, b.points) : 0;
    }
  }
  function commonLength(a, b) {
    let len = 0;
    for (let i = 1; i < Math.min(a.length, b.length); i++) {
      const [ax, ay] = a[i], [bx, by] = b[i], [px, py] = a[i - 1];
      const same = ax === bx && ay === by;
      if (same) { len += Math.hypot(ax - px, ay - py); continue; }
      // gleiche Richtung, unterschiedliche Länge: überlappender Teil bleibt stehen
      const dirA = [Math.sign(ax - px), Math.sign(ay - py)], dirB = [Math.sign(bx - px), Math.sign(by - py)];
      if (dirA[0] === dirB[0] && dirA[1] === dirB[1]) len += Math.min(Math.hypot(ax - px, ay - py), Math.hypot(bx - px, by - py));
      break;
    }
    return len;
  }

  function targetClient(t) {
    const r = canvas.getBoundingClientRect();
    const c = renderer.cellCenter(t.x, t.y);
    return { x: r.left + c.x, y: r.top + c.y };
  }

  const step = (dir) => commit(move(state, dir));
  const rotate = () => commit(rotateFront(state));

  function undo() {
    if (!history.length || won) return;
    state = history.pop();
    anim = { t0: 0, player: { ...state.player }, blocks: state.blocks.map((b) => ({ ...b })) };
    tr = pushTrace(state);
    devlog('SPIEL', `${def.id}: Zug zurückgenommen → ${state.moves} Züge`);
    updateHud();
  }

  function reset() {
    state = createPushState(level);
    history = [];
    anim = { t0: 0, player: { ...state.player }, blocks: state.blocks.map((b) => ({ ...b })) };
    tr = pushTrace(state);
    won = false;
    devlog('SPIEL', `${def.id}: Neustart`);
    $('#win').hidden = true;
    beamStart = performance.now();
    updateHud();
    canvas.focus();
  }

  function onWin() {
    won = true;
    const prevBest = bestMoves(def.id);
    const improved = recordSolve(def.id, state.moves);
    const stars = starsFor(state.moves, def.par);
    const last = index === PUSH_LEVELS.length - 1;
    devlog('SPIEL', `${def.id} „${def.name}“ GELÖST in ${state.moves} Zügen (Ziel ≤ ${def.par}) · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`);
    setTimeout(() => celebrate(tr.targets.map((t) => ({ ...targetClient(t), color: COLOR_INFO[t.need].hex }))), 250);
    const win = $('#win');
    win.innerHTML = `
      <div class="win-card">
        <div class="win-stars" aria-label="${stars} von 3 Sternen">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
        <h2 id="win-title">Gelöst!</h2>
        <p>${state.moves} Züge${def.par != null ? ` · Ziel ≤ ${def.par}` : ''}${improved && prevBest != null ? ' · neue Bestleistung' : ''}</p>
        ${stars < 3 ? `<p class="muted small">Für 3 Sterne: mit höchstens ${def.par} Zügen lösen.</p>` : ''}
        <div class="win-actions">
          ${last
            ? '<a class="btn btn-primary" href="#/menu" id="win-next">Alle Level geschafft – zum Menü</a>'
            : `<a class="btn btn-primary" href="#/run/${index + 1}" id="win-next">Nächstes Level →</a>`}
          <button class="btn" id="win-retry">Nochmal (R)</button>
        </div>
      </div>`;
    setTimeout(() => { win.hidden = false; $('#win-next').focus(); }, prefersReducedMotion() ? 0 : 650);
    $('#win-retry').addEventListener('click', reset);
    updateHud();
  }

  // ---------- Eingabe ----------
  const KEYS = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
  function onKey(e) {
    if (e.target.closest('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    // Auf Links/Buttons (z. B. "Nächstes Level") gehört Enter dem Element selbst.
    if (e.target.closest('a, button') && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.key in KEYS && !won) { step(KEYS[e.key]); e.preventDefault(); }
    else if ((e.key === ' ' || e.key === 'e' || e.key === 'E') && !won) { rotate(); e.preventDefault(); }
    else if (e.key === 'z' || e.key === 'Z') undo();
    else if (e.key === 'r' || e.key === 'R') reset();
    else if (e.key === 'Escape') location.hash = '#/menu';
  }
  window.addEventListener('keydown', onKey);
  $('#undo').addEventListener('click', undo);
  $('#reset').addEventListener('click', reset);
  $('#rotate').addEventListener('click', () => { rotate(); canvas.focus(); });

  // Klick/Tippen: ein Schritt in Richtung des Feldes (größere Achse); Klick auf den
  // Spiegel direkt vor dem Block dreht ihn.
  canvas.addEventListener('pointerdown', (e) => {
    if (won) return;
    const r = canvas.getBoundingClientRect();
    const cell = renderer.cellAt(e.clientX - r.left, e.clientY - r.top, level);
    if (!cell) return;
    const dx = cell.x - state.player.x, dy = cell.y - state.player.y;
    if (!dx && !dy) return;
    const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    const [fx, fy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][state.player.dir];
    const isFront = cell.x === state.player.x + fx && cell.y === state.player.y + fy;
    const frontBlock = isFront && state.blocks.some((b) => b.x === cell.x && b.y === cell.y && b.orient);
    if (frontBlock && e.button === 2) rotate();
    else step(dir);
    canvas.focus();
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  if (IS_DEV) {
    window.__prismaraGame = {
      cellToClient(x, y) {
        const r = canvas.getBoundingClientRect();
        const c = renderer.cellCenter(x, y);
        return { x: Math.round(r.left + c.x), y: Math.round(r.top + c.y) };
      },
      get state() { return { moves: state.moves, player: state.player, blocks: state.blocks, solved: tr.solved, targets: tr.targets }; },
    };
  }

  // ---------- Darstellung ----------
  const lerp = (a, b, k) => a + (b - a) * k;
  function frame(t) {
    if (!running) return;
    if (canvas.clientWidth !== renderer.w || canvas.clientHeight !== renderer.h) resize();
    const reduced = prefersReducedMotion();
    const k = reduced || !anim.t0 ? 1 : Math.min(1, (t - anim.t0) / SLIDE_MS);
    const e = 1 - Math.pow(1 - k, 3);
    const player = { x: lerp(anim.player.x, state.player.x, e), y: lerp(anim.player.y, state.player.y, e), dir: state.player.dir };
    const blocks = state.blocks.map((b, i) => ({ ...b, x: lerp(anim.blocks[i].x, b.x, e), y: lerp(anim.blocks[i].y, b.y, e) }));
    const grow = reduced ? null : ((t - beamStart) / 1000) * 45;
    renderer.draw({ level, cells: level.cells }, t, { tr, reduced, blocks, player, beamGrow: grow });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  updateHud();
  canvas.focus();
  devlog('SPIEL', `Level ${index + 1} „${def.name}“ (${def.id}) geladen · ${level.w}×${level.h} Felder · ${state.blocks.length} Blöcke · ${tr.targets.length} Ziele · Zugziel ${def.par}`);

  return () => {
    running = false;
    window.removeEventListener('keydown', onKey);
    if (window.__prismaraGame) delete window.__prismaraGame;
  };
}
