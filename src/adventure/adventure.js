// Escape-Room-Abenteuer (2D, Top-Down, Pixel-Art, Raster): Jedes Level ist ein Raum. Der Spieler
// bewegt sich Feld für Feld (Taste halten = weiterlaufen) und schiebt Kisten. Sind alle Lichtziele
// erfüllt, öffnet sich die Ausgangstür in der Wand – hindurchgehen führt in den nächsten Raum.
// Fragmente im Raum sind freiwillige Sammelstücke. Alle Regeln kommen aus push.js (vom Löser
// geprüft); gezeichnet wird mit dem PixelRenderer inkl. Licht im Minecraft-Shader-Stil.
import { parsePushLevel, createPushState, move, rotateFront, pushTrace, solvePush, isPit } from '../game/push.js';
import { ITEMS, SLOTS, GUIDE, getInv, count, owns, addCoins, addItem, useItem, isFound, markFound } from '../game/inventory.js';
import { PUSH_LEVELS, CHAPTERS } from '../game/pushLevels.js';
import { DIRS, COLOR_INFO } from '../game/engine.js';
import { CHAPTER_WORLD } from '../game/worlds.js';
import { PixelRenderer, PIXEL_THEMES, T } from '../game/pixelRender.js';
import { recordSolve, starsFor, bestMoves } from '../game/progress.js';
import { play, isMuted, toggleMute } from '../game/sound.js';
import { setMusic } from '../game/music.js';
import { transitionTo } from '../ui/transition.js';
import { icon } from '../ui/icons.js';
import { foeOf, bossBeaten, bossPending } from '../game/combat.js';
import { getLook, getSkin, addSpins } from '../game/skins.js';
import { FX, fxQuality, goalBurst, bolt, sparks, ring, mote, squash as squashFx, buzz, addTrauma, hitstop, stopped, shake, drawFx } from '../game/fx.js';
import { codeOn } from '../game/codes.js';
import { volumeHtml, bindVolume } from '../ui/volume.js';
import { isAdmin } from '../game/admin.js';
import { WORLDS } from '../game/worlds.js';
import { prefersReducedMotion } from '../settings.js';
import { stopCelebration } from '../ui/celebrate.js';
import { devlog } from '../devlog.js';
import { isUnlocked, solvedCount, unlockedBetween } from '../game/unlocks.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEYS = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
const STEP_MS = 130;   // Gleitdauer eines Schritts
// Taste halten: der nächste Schritt schließt nahtlos an (gleich lang wie ein Schritt, gleichmäßige
// Geschwindigkeit) – vorher gab es nach jedem Schritt eine kleine Pause, das wirkte ruckelig.
const REPEAT_MS = STEP_MS;
const FRAG_KEY = 'prismara.fragments.v1';
// Kraftleiste: Schieben kostet Kraft, Laufen und Verschnaufen laden sie wieder auf.
// Nutzerwunsch „Ausdauer länger“: 6 Schübe am Stück statt 3, schnelleres Aufladen.
const PUSH_COST = 0.16, STEP_REGEN = 0.15, IDLE_REGEN = 0.7, REST_MS = 700;

// Lehrzimmer (#/adv/tutorial): ein eigener Raum, in dem eine Eule Schritt für Schritt Laufen,
// Schieben, Kraft, Drehen, Licht-Ranke, Kristalle und den Ausgang erklärt. Lösung: 4 Schritte nach
// rechts, Spiegel 3× hoch schieben, drehen, zur Seite treten (9 Züge).
export const TUTORIAL = {
  id: 'tut', name: 'Lehrzimmer', par: 9, tutorial: true,
  hint: 'Folge der Eule – sie zeigt dir alles Schritt für Schritt.',
  legend: { a: { type: 'emitter', dir: 'E', color: 'R' }, 1: { type: 'target', color: 'R' } },
  rows: [
    '###########',
    '#a........#',
    '#.........#',
    '#.........#',
    '#.....m...#',
    '#.@.......#',
    '#.....1...#',
    '###########',
  ],
};
const TUT_SEEN = 'prismara.tutorial.v1';
export function tutorialSeen() { try { return localStorage.getItem(TUT_SEEN) === '1'; } catch { return true; } }

function loadFrags() { try { return JSON.parse(localStorage.getItem(FRAG_KEY) || '{}'); } catch { return {}; } }
function saveFrags(d) { try { localStorage.setItem(FRAG_KEY, JSON.stringify(d)); } catch { /* blockiert */ } }
export function fragmentCount() { return Object.values(loadFrags()).reduce((n, a) => n + a.length, 0); }

function ensurePixelFont() {
  if (document.getElementById('pixel-font')) return;
  const l = document.createElement('link');
  l.id = 'pixel-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
  document.head.appendChild(l);
}

const seeded = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Ausgang: Randwand neben einem freien Bodenfeld, möglichst weit vom Start. */
/** Fest vorgegebene Tür (def.exit = [x, y] in der Randwand) – für Räume, in denen die automatische
 *  Wahl nach dem Lösen versperrt wäre (vom Durchspieltest gefunden). */
export function exitAt(level, [x, y]) {
  const d = DIRS.findIndex(([dx, dy]) => level.cells[(y + dy) * level.w + x + dx]?.type === 'empty');
  const [dx, dy] = DIRS[d];
  return { x, y, inX: x + dx, inY: y + dy, d: 0, out: (d + 2) % 4 };
}

export function findExit(level) {
  const { w, h, cells } = level;
  const p = level.start.player;
  // nur Felder, die man vom Start aus überhaupt erreicht (Live-Test: w37/w5 hatten die Tür hinter
  // Laterne und Topf in einer unerreichbaren Ecke). Abstand = echte Weglänge.
  const dist = new Map([[p.y * w + p.x, 0]]);
  const q = [[p.x, p.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist.has(k)) continue;
      if (!['empty', 'door', 'lock'].includes(cells[k].type) || cells[k].hole) continue;
      dist.set(k, dist.get(y * w + x) + 1); q.push([nx, ny]);
    }
  }
  let best = null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) continue;
    if (cells[y * w + x].type !== 'wall') continue;
    DIRS.forEach(([dx, dy], dir) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const c = cells[ny * w + nx];
      if (c.type !== 'empty' || c.flow != null || c.ice || c.plate || c.hole || c.crumble || !dist.has(ny * w + nx)) return;
      // Ecken meiden: dort landen gern geschobene Kisten und versperren die Tür (Live-Test: w5)
      const wallsAround = DIRS.filter(([ax, ay]) => cells[(ny + ay) * w + nx + ax]?.type === 'wall').length;
      const d = dist.get(ny * w + nx) - (wallsAround >= 2 ? 100 : 0);
      if (!best || d > best.d) best = { x, y, inX: nx, inY: ny, d, out: (dir + 2) % 4 };
    });
  }
  return best;
}

/** Zwei Fragmente auf freien Bodenfeldern (fest je Raum), nicht am Start, nicht unter Kisten. */
export function placeFragments(level, def) {
  const free = [];
  level.cells.forEach((c, i) => {
    const x = i % level.w, y = Math.floor(i / level.w);
    if (c.type !== 'empty' || c.flow != null || c.plate || c.ice || c.key || c.hole || c.crumble) return;
    if (level.start.blocks.some((b) => b.x === x && b.y === y)) return;
    if (level.start.player.x === x && level.start.player.y === y) return;
    if ((level.start.enemies || []).some((e) => e.x === x && e.y === y)) return;
    free.push({ x, y });
  });
  let s = seeded(def.id);
  const pick = [];
  for (let k = 0; k < 2 && free.length; k++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; pick.push(free.splice(s % free.length, 1)[0]); }
  return pick;
}

/** Abenteuer-Ausstattung eines Raums (fest je Raum): 3 Münzen und ein Fundstück auf freien Feldern,
 *  eine Schatztruhe in einer Seitenwand-Nische und ein Hinweisschild an der Rückwand. Nichts davon
 *  blockiert ein Feld – die Rätsel bleiben unverändert. */
export function planLoot(level, def, exit, fragments) {
  const { w, h, cells } = level;
  let s = seeded(def.id + ':loot');
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  const taken = new Set(fragments.map((f) => f.y * w + f.x));
  const free = [];
  cells.forEach((c, i) => {
    const x = i % w, y = Math.floor(i / w);
    if (c.type !== 'empty' || c.flow != null || c.plate || c.ice || c.key || c.hole || c.crumble || taken.has(i)) return;
    if (level.start.blocks.some((b) => b.x === x && b.y === y) || (level.start.enemies || []).some((e) => e.x === x && e.y === y)) return;
    if (level.start.player.x === x && level.start.player.y === y) return;
    free.push({ x, y });
  });
  const pick = () => free.splice(Math.floor(rnd() * free.length), 1)[0];
  const loot = [];
  for (let k = 0; k < 3 && free.length; k++) loot.push({ ...pick(), kind: 'coin', id: `coin${k}` });
  const r = rnd(), bonus = r < 0.4 ? 'pick' : r < 0.68 ? 'bread' : r < 0.86 ? 'lens' : 'scroll';
  if (free.length) loot.push({ ...pick(), kind: bonus, id: 'item' });
  // Truhe: Seitenwand mit freiem Nachbarfeld, nicht der Ausgang
  const niches = [];
  for (let y = 1; y < h - 1; y++) for (const [x, nx] of [[0, 1], [w - 1, w - 2]]) {
    if (exit && exit.x === x && exit.y === y) continue;
    if (cells[y * w + x].type === 'wall' && cells[y * w + nx].type === 'empty') niches.push({ x, y });
  }
  const chest = niches.length ? niches[Math.floor(rnd() * niches.length)] : null;
  const spots = [];
  for (let x = 1; x < w - 1; x++) if (x % 4 !== 2 && cells[w + x].type !== 'wall' && !(exit && exit.y === 0 && Math.abs(exit.x - x) < 2)) spots.push({ x, y: 0 });
  const sign = spots.length ? spots[Math.floor(rnd() * spots.length)] : null;
  if (free.length) loot.push({ ...pick(), kind: 'critter', id: 'critter' }); // Teaser auf den Kampf am Weltende
  return { loot, chest, sign };
}

/** Raumführer-Text: alle Elemente, die in diesem Raum vorkommen. */
function roomGuide(level) {
  const has = new Set();
  level.cells.forEach((c) => {
    if (['emitter', 'target', 'portal', 'sensor', 'lock'].includes(c.type)) has.add(c.type);
    if (c.type === 'flip' || c.plate) has.add('plate');
    if (c.ice) has.add('ice');
    if (c.flow != null) has.add('flow');
    if (c.key) has.add('key');
    if (c.hole) has.add('hole');
    if (c.crumble) has.add('crumble');
  });
  level.start.blocks.forEach((b) => has.add(b.kind));
  if ((level.start.enemies || []).length) has.add('enemy');
  return Object.keys(GUIDE).filter((k) => has.has(k)).map((k) => GUIDE[k]);
}

export function mountAdventure(root, params, opts = {}) {
  ensurePixelFont();
  const custom = opts.def || null; // z. B. das Tagesrätsel
  // Allererstes Spiel: Raum 1 leitet automatisch ins Lehrzimmer um
  if (!custom && params[0] !== 'tutorial' && !tutorialSeen() && (parseInt(params[0] || '0', 10) || 0) === 0) { location.replace('#/adv/tutorial'); return () => {}; }
  const tutorial = params[0] === 'tutorial';
  const index = tutorial || custom ? -1 : Math.max(0, Math.min(PUSH_LEVELS.length - 1, parseInt(params[0] || '0', 10) || 0));
  const def = custom || (tutorial ? TUTORIAL : PUSH_LEVELS[index]);
  const level = parsePushLevel(def);
  const chIndex = CHAPTERS.findIndex((c) => c.levels.includes(def.id));
  const chapter = CHAPTERS[chIndex];
  // Boss nicht besiegt: Folgewelten bleiben zu, auch über direkte Links
  const gate = custom || tutorial ? -1 : bossPending();
  if (gate >= 0 && chIndex > gate) { location.replace(`#/arena/${gate}`); return () => {}; }
  const roomNo = chapter ? chapter.levels.indexOf(def.id) + 1 : 1;
  const themeId = opts.theme || (chapter ? CHAPTER_WORLD[chapter.id] : 'default');
  const theme = PIXEL_THEMES[themeId] || PIXEL_THEMES.default;
  const exit0 = def.exit ? exitAt(level, def.exit) : findExit(level);
  let exit = exit0; // die Tür kann umziehen, wenn sie zugestellt ist (relocateDoor)
  // Handy-Steuerung nur, wenn der Finger das Hauptzeigegerät ist (Handy/Tablet). Laptops mit
  // Touchscreen haben eine Maus als Hauptzeiger und behalten die Tastatur-Ansicht.
  const touch = matchMedia('(pointer: coarse)').matches;
  const frags = loadFrags();
  const fragments = placeFragments(level, def).map((f, i) => ({ ...f, got: (frags[def.id] || []).includes(i), i }));
  const plan = planLoot(level, def, exit, fragments);
  const foe = foeOf(themeId);
  const loot = plan.loot.filter((l) => l.kind !== 'critter' || chapter).map((l) => ({ ...l, foe, got: isFound(def.id, l.id) }));
  const chest = plan.chest && { ...plan.chest, open: isFound(def.id, 'chest') };
  const sign = plan.sign && { ...plan.sign, read: isFound(def.id, 'sign') };
  const guide = roomGuide(level);
  const hasKeys = level.cells.some((c) => c.key);
  // Dauerhafte Ausrüstung aus dem Shop
  const pushCost = isAdmin() ? 0 : owns('gloves') ? 0.11 : PUSH_COST, stepRegen = owns('boots') ? STEP_REGEN * 2 : STEP_REGEN;

  // Vollbild-Spiel mit Ingame-HUD (wie Shell Shockers): keine Webseiten-Leiste, alle Anzeigen
  // liegen als Pixel-Panels direkt über dem Spielbild; Esc/⏸ öffnet das Pausenmenü.
  document.body.classList.add('ingame');
  document.body.dataset.world = themeId; // Oberflächenfarben der Welt
  setMusic(themeId);
  const worldName = tutorial ? '📖 Tutorial' : { beach: '🏖️ Sommerstrand', cherry: '🌸 Kirschblüte', jungle: '🌴 Dschungel', night: '🌙 Nachtwald', volcano: '🌋 Vulkanschmiede', temple: '🏜️ Wüstentempel', shadow: '🌑 Schattenreich', aurora: '❄️ Polarlicht', reef: '🐠 Korallenriff', castle: '🏰 Burgverlies', moor: '🌫️ Nebelmoor' }[themeId] || '';
  if (!prefersReducedMotion()) { const iris = document.createElement('div'); iris.className = 'iris'; iris.addEventListener('animationend', () => iris.remove()); document.body.append(iris); }
  root.innerHTML = `
    <section class="adv-full pixel-ui${touch ? ' touch' : ''}${tutorial ? ' has-coach' : ''}" style="--w1:${theme.ambient};--w2:${theme.dark};--w3:${theme.face}">
      <canvas id="board" class="pixel-canvas" tabindex="0" aria-label="Raum. WASD oder Pfeiltasten: ein Feld laufen und Kisten schieben, Leertaste: drehen. Sind alle Ziele beleuchtet, öffnet sich die Tür."></canvas>

      <div class="ihud ihud-tl pixel">
        <div class="ihud-world">${worldName}</div>
        <div class="ihud-room">RAUM ${roomNo}/${chapter ? chapter.levels.length : 1}</div>
        <div class="ihud-name">${def.master ? '👑 ' : ''}${esc(def.name)}</div>
      </div>
      <div class="ihud ihud-tc pixel" aria-live="polite">
        <span class="ihud-chip" title="Fragmente">${icon('gem')}<b id="frags">0/2</b></span>
        <span class="ihud-chip" title="Beleuchtete Ziele">${icon('star')}<b id="targets">0/0</b></span>
        <span class="ihud-chip ihud-door" title="Ausgangstür">${icon('door')}<b id="exit-state">ZU</b></span>
        <span class="ihud-chip" title="Münzen">${icon('coin')}<b id="coins">0</b></span>
        ${hasKeys ? `<span class="ihud-chip" title="Schlüssel in der Tasche">${icon('key')}<b id="keys">0</b></span>` : ''}
      </div>
      <div class="ihud ihud-tr">
        <button class="ibtn" id="snd" title="Ton an/aus" aria-label="Ton an oder aus">${icon(isMuted() ? 'mute' : 'sound')}</button>
        <button class="ibtn" id="pause" title="Pause (Esc)" aria-label="Pause">${icon('pause')}</button>
      </div>
      <div class="ihud ihud-bl pixel">
        <div class="ihud-label">KRAFT</div>
        <i class="stamina-bar big" id="stamina" style="--k:1"></i>
        <div class="ihud-moves">ZÜGE <b id="moves">0</b> / ${def.par ?? '–'}</div>
        <div class="inv" id="inv" aria-label="Inventar">${SLOTS.map((id, k) => `<button class="inv-slot" data-item="${id}" title="${ITEMS[id].name} (${k + 1}): ${ITEMS[id].info}"><span>${ITEMS[id].icon}</span><b>0</b><i>${k + 1}</i></button>`).join('')}</div>
      </div>
      <div class="sign-dlg" id="signdlg" hidden role="dialog" aria-labelledby="sign-title"><div class="parch sign-card">
        <h2 id="sign-title" class="pixel">📜 RAUMFÜHRER</h2>
        <p class="sign-hint">${esc(def.hint)}</p>
        <ul>${guide.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
        <p class="sign-extra">🪙 Münzen und Fundstücke liegen im Raum herum.${chest ? ' 🧰 In der Wand steckt eine Truhe – öffnen mit einem Dietrich 🔧.' : ''} Tasten 1–4 benutzen dein Inventar. Tipp: Ist die Tür offen, zählen Züge nicht mehr für die Sterne – dann in Ruhe sammeln!</p>
        <button class="btn btn-primary" id="sign-close">Verstanden</button>
      </div></div>
      <div class="ihud ihud-br">
        <button class="ibtn" id="reset" title="Raum neu (R)" aria-label="Raum neu">${icon('reset')}</button>
      </div>
      ${tutorial ? `<div class="coach pixel" id="coach" aria-live="polite"><div class="coach-owl" aria-hidden="true"><i></i></div><div class="coach-body"><div class="coach-step" id="coach-step"></div><p id="coach-text"></p><div class="coach-dots" id="coach-dots"></div></div></div>` : `<div class="ihud-note pixel" id="note"><span>📜</span> ${esc(def.hint)}</div>`}

      <div class="win" id="win" hidden role="dialog" aria-labelledby="win-title"></div>
      <div class="adv-toast pixel" id="toast" hidden></div>
      <div class="pause" id="pausemenu" hidden role="dialog" aria-label="Pause">
        <div class="pause-card pixel-card">
          <h2 class="pixel">PAUSE</h2>
          <p class="pause-hint">📜 ${esc(def.hint)}</p>
          <div class="vol-box">${volumeHtml()}</div>
          ${isAdmin() ? `<div class="dbg"><b>🐞 ADMIN-DEBUG</b><p id="dbg-info"></p><div class="dbg-grid">
            <button class="btn" data-dbg="open">Tür öffnen</button><button class="btn" data-dbg="solve">Raum lösen</button>
            <button class="btn" data-dbg="hint">Nächster Zug</button><button class="btn" data-dbg="curtain">Vorhang testen</button>
            <button class="btn" data-dbg="prev" ${index > 0 ? '' : 'disabled'}>◀ Raum</button><button class="btn" data-dbg="next" ${index >= 0 && index + 1 < PUSH_LEVELS.length ? '' : 'disabled'}>Raum ▶</button>
          </div></div>` : ''}
          <button class="btn btn-primary" id="p-resume">${icon('play')} Weiter</button>
          <button class="btn" id="p-reset">${icon('reset')} Raum neu</button>
          ${isUnlocked('worlds') ? `<a class="btn" href="#/menu/chapter/${Math.max(0, chIndex)}">🗺 Weltkarte</a>` : ''}
          ${opts.back ? `<a class="btn" href="${esc(opts.back)}">${esc(opts.backLabel || 'Zurück')}</a>` : ''}
          <a class="btn" href="#/menu">⌂ Hauptmenü</a>
          <p class="pause-keys">WASD/Pfeile laufen &amp; schieben · Leertaste drehen · Z zurück · R neu · Esc Pause</p>
        </div>
      </div>
      ${touch ? `<div class="dpad" aria-hidden="true"><button data-d="0">▲</button><button data-d="3">◀</button><button data-d="2">▼</button><button data-d="1">▶</button><i class="dpad-hub"></i></div>
      <button class="tpad-rot" id="tpad-rot" aria-label="Drehen">${icon('turn')}<small>DREHEN</small></button>` : ''}
    </section>`;

  const $ = (s) => root.querySelector(s);
  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  const pix = new PixelRenderer(level);

  let state, tr, history, anim, exitOpen, done, caught, dissolving, dock, squash, held, lastStep, timers = [];
  let solveMoves = null; // Züge bis zum Öffnen der Tür – nur sie zählen für die Sterne
  let growStart = 0, bloom = null; // Ranken wachsen neu nach jeder Änderung; Blüte beim Entkommen
  let doorT0 = -1e9, escapeT0 = 0;
  let stamina = 1, restUntil = 0, bumpT0 = 0, pushT0 = 0, lastInput = 0, celebrateT0 = 0, dust = [], sinking = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  let toastTimer = 0;
  function toast(text) {
    const el = $('#toast'); el.textContent = text; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 1400);
  }

  function reset() {
    timers.forEach(clearTimeout); timers = [];
    stopCelebration();
    exit = exit0;
    state = createPushState(level);
    tr = pushTrace(state);
    history = [];
    anim = snap(state, 0);
    inputs = [];
    escapeT0 = 0;
    exitOpen = false; done = false; caught = false; dissolving = []; dock = null; squash = null; solveMoves = null;
    growStart = performance.now(); bloom = null;
    stamina = 1; restUntil = 0; bumpT0 = 0; pushT0 = 0; celebrateT0 = 0; dust = []; lastInput = performance.now();
    $('#win').hidden = true;
    updateHud();
  }
  const snap = (s, t0) => ({ t0, player: { ...s.player }, blocks: s.blocks.map((b) => ({ ...b })), enemies: s.enemies.map((e) => ({ ...e })) });

  function updateHud() {
    $('#moves').textContent = state.moves;
    $('#targets').textContent = `${tr.targets.filter((t) => t.ok).length}/${tr.targets.length}`;
    $('#exit-state').textContent = exitOpen ? 'OFFEN' : 'ZU';
    $('#exit-state').closest('.ihud-chip').classList.toggle('open', exitOpen);
    $('#frags').textContent = `${fragments.filter((f) => f.got).length}/${fragments.length}`;
    $('#coins').textContent = getInv().coins;
    if (hasKeys) $('#keys').textContent = state.keys || 0;
    root.querySelectorAll('.inv-slot').forEach((b) => { const n = count(b.dataset.item); b.querySelector('b').textContent = n === Infinity ? '∞' : n; b.disabled = !n; });
    coach();
  }

  // ---------- Wandernde Tür: Ist die offene Tür zugestellt (Kiste davor) oder nicht erreichbar,
  // zieht sie an die nächstgelegene freie, erreichbare Stelle der Außenwand um (Nutzerwunsch: „verschiebe
  // einfach die Tür“ – im Dschungel hatte sich ein Spieler die Tür mit einer Kiste versperrt).
  function relocateDoor() {
    if (!exitOpen || !exit || done) return;
    const { w, h, cells } = level;
    const blockSet = new Set(state.blocks.map((b) => b.y * w + b.x));
    const passable = (i) => {
      const c = cells[i];
      if (blockSet.has(i) || isPit(state, i)) return false;
      // Licht- und Gittertore zählen als passierbar: sie gehen wieder auf. Sonst sprang die Tür hin und
      // her, sobald der Spieler kurz ein Lichttor schloss (Durchspieltest w25).
      return c.type === 'empty' || c.type === 'door' || c.type === 'lock';
    };
    const reach = new Set([state.player.y * w + state.player.x]);
    const q = [[state.player.x, state.player.y]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || reach.has(k) || !passable(k)) continue;
        reach.add(k); q.push([nx, ny]);
      }
    }
    const usable = (x, y) => {
      if (cells[y * w + x]?.type !== 'wall' || (x > 0 && y > 0 && x < w - 1 && y < h - 1)) return null;
      if ((chest && chest.x === x && chest.y === y) || (sign && sign.x === x && sign.y === y)) return null;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const c = cells[k];
        if (c.type === 'empty' && !c.hole && c.flow == null && reach.has(k)) return exitAt(level, [x, y]);
      }
      return null;
    };
    if (usable(exit.x, exit.y)) return;
    let best = null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const e = usable(x, y);
      if (!e) continue;
      const d = Math.abs(x - exit0.x) + Math.abs(y - exit0.y);
      if (!best || d < best.d) best = { e, d };
    }
    if (!best) return;
    exit = best.e;
    play('door'); toast('🚪 Die Tür war zugestellt – sie ist umgezogen!');
    for (let k = 0; k < 4; k++) dust.push({ x: exit.inX + 0.5, y: exit.inY + 0.5, a: k * 1.6, t0: performance.now() + k * 50 });
    devlog('SPIEL', `${def.id}: Tür umgezogen nach (${exit.x},${exit.y})`);
  }

  // ---------- Fundstücke, Truhe, Schild, Inventar ----------
  let hintMark = null, lensUntil = 0;
  function pickup() {
    for (const it of loot) if (!it.got && it.x === state.player.x && it.y === state.player.y) {
      it.got = true; markFound(def.id, it.id);
      if (it.kind === 'critter') { addCoins(1); play('swipe'); toast(`⚔ ${foe.critter} besiegt! +1 Münze. Am Weltende wartet ${foe.boss}`); }
      else if (it.kind === 'coin') { addCoins(2); play('target', 1); toast('🪙 +2 Münzen'); }
      else { addItem(it.kind); play('target', 7); toast(`${ITEMS[it.kind].icon} ${ITEMS[it.kind].name} gefunden!`); }
      dust.push({ x: it.x + 0.5, y: it.y + 0.6, a: -Math.PI / 2, t0: performance.now() });
      devlog('SPIEL', `${def.id}: Fundstück ${it.kind} eingesammelt`);
    }
  }
  function interact(tx, ty) {
    if (chest && chest.x === tx && chest.y === ty) {
      if (chest.open) { toast('Die Truhe ist leer.'); return true; }
      if (!useItem('pick')) { toast('🧰 Verschlossen – du brauchst einen Dietrich 🔧'); play('bump'); return true; }
      chest.open = true; chest.t0 = performance.now(); markFound(def.id, 'chest');
      const prize = ['bread', 'lens', 'scroll', 'pick'][seeded(def.id + 'chest') % 4];
      addCoins(10); addItem(prize);
      play('door'); later(() => play('target', 7), 200);
      toast(`🧰 Truhe auf! +10 🪙 und ${ITEMS[prize].icon} ${ITEMS[prize].name}`);
      devlog('SPIEL', `${def.id}: Truhe geöffnet → ${prize}`);
      updateHud(); return true;
    }
    if (sign && sign.x === tx && sign.y === ty) { openSign(); return true; }
    return false;
  }
  function openSign() {
    if (sign && !sign.read) { sign.read = true; markFound(def.id, 'sign'); }
    play('ui'); $('#signdlg').hidden = false; $('#sign-close').focus(); paused = true;
  }
  function closeSign() { $('#signdlg').hidden = true; paused = false; canvas.focus(); }
  function use(id) {
    if (done || caught || !count(id)) { play('bump'); return; }
    if (id === 'bread') { useItem(id); stamina = 1; restUntil = 0; play('target', 2); toast('🍞 Kraft voll!'); }
    else if (id === 'lens') { useItem(id); lensUntil = performance.now() + 8000; play('ui'); toast('🔍 Die Lupe zeigt alle Fundstücke'); }
    else if (id === 'scroll') {
      const res = solvePush(level, { from: state, limit: 150000 });
      const step = res.path.find((p) => !String(p).startsWith('turn'));
      if (!res.solvable || step == null) { toast('📜 Die Rolle bleibt leer – erst einen Zug zurück?'); return; }
      useItem(id); play('ui');
      if (step === 'rot') { const [dx, dy] = DIRS[state.player.dir]; hintMark = { x: state.player.x + dx, y: state.player.y + dy }; toast('📜 Dreh den Block vor dir (Leertaste)'); }
      else { const [dx, dy] = DIRS[step]; hintMark = { x: state.player.x + dx, y: state.player.y + dy }; toast(`📜 Nächster Zug: ${['↑ hoch', '→ rechts', '↓ runter', '← links'][step]}`); }
    } else if (id === 'pick') { toast('🔧 Lauf gegen eine Truhe in der Wand, um sie zu öffnen.'); return; }
    updateHud();
  }
  root.querySelectorAll('.inv-slot').forEach((b) => b.addEventListener('click', () => { use(b.dataset.item); canvas.focus(); }));
  $('#sign-close').addEventListener('click', closeSign);

  // ---------- Tutorial-Eule: Schritt für Schritt, mit hüpfendem Pfeil aufs nächste Ziel ----------
  const mirror = () => state.blocks.find((b) => b.kind === 'mirror');
  const TUT_STEPS = [
    { text: `Willkommen im Lehrzimmer! ${touch ? 'Wisch übers Spielfeld, um zu laufen. Lässt du den Finger unten, läuft der Held weiter.' : 'Lauf mit WASD oder den Pfeiltasten ein paar Schritte.'}`, done: () => state.moves >= 2, mark: () => null },
    { text: `Siehst du den Spiegel? Stell dich unter ihn und ${touch ? 'wisch nach oben' : 'lauf dagegen'} – so schiebst du ihn nach oben.`, done: () => mirror().y < 4, mark: () => ({ x: 6, y: 5 }) },
    { text: 'Schieb ihn bis ganz nach oben an die Wand. Schieben kostet KRAFT (unten links) – ist sie leer, verschnaufst du kurz.', done: () => mirror().y === 1, mark: () => ({ x: 6, y: 1 }) },
    { text: `${touch ? 'Tipp irgendwo aufs Spielfeld: Das dreht den Spiegel vor dir.' : 'Leertaste oder ein Klick auf den Spiegel dreht ihn, wenn du davor stehst.'} Dreh ihn, damit die Leitung nach unten läuft.`, done: () => mirror().y === 1 && mirror().orient === '\\', mark: () => mirror() },
    { text: 'Die Leitung läuft zu dir! Tritt zur Seite, damit sie die Glutlampe erreicht.', done: () => tr.solved, mark: () => ({ x: 6, y: 6 }) },
    { text: 'Die Lampe leuchtet – die Tür ist offen! Hol dir noch einen Kristall, wenn du magst, und geh dann durch die Tür.', done: () => done, mark: () => exit },
  ];
  let tutStep = 0, tutShown = -1, bumps = 0;
  function coach() {
    if (!tutorial) return;
    while (tutStep < TUT_STEPS.length - 1 && TUT_STEPS[tutStep].done()) tutStep++;
    // Rückschritt (z. B. nach Zurück/Neu): wieder zum passenden Schritt
    while (tutStep > 0 && !TUT_STEPS[tutStep - 1].done()) tutStep--;
    if (tutShown === tutStep) return;
    if (tutShown >= 0 && tutStep > tutShown) play('ui');
    tutShown = tutStep;
    $('#coach-step').textContent = `SCHRITT ${tutStep + 1}/${TUT_STEPS.length}`;
    $('#coach-text').textContent = TUT_STEPS[tutStep].text;
    $('#coach-dots').innerHTML = TUT_STEPS.map((_, i) => `<i class="${i < tutStep ? 'on' : i === tutStep ? 'now' : ''}"></i>`).join('');
    const c = $('#coach'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  }
  function coachTip(text) {
    if (!tutorial) return;
    $('#coach-text').textContent = text;
    tutShown = -2; // beim nächsten Zug wieder die eigentliche Aufgabe zeigen
  }

  function commit(next) {
    if (!next || done || caught) return false;
    const now = performance.now();
    const before = tr;
    anim = snap(state, now);
    if (next.pushed != null) squash = { i: next.pushed, t0: now };
    // Block versinkt in der Grube: Blockliste ist kürzer → Animation neu ausrichten, Platsch + Klang
    if (next.sunk) {
      anim.blocks = next.blocks.map((b) => ({ ...b }));
      sinking.push({ ...next.sunk, t0: now });
      for (let k = 0; k < 4; k++) dust.push({ x: next.sunk.x + 0.5, y: next.sunk.y + 0.6, a: k * 1.6, t0: now + k * 40 });
      later(() => play('dissolve'), 60); later(() => play('push'), 200);
    }
    const prevBroken = state.broken?.length || 0;
    if ((next.broken?.length || 0) > prevBroken) { later(() => play('bump'), 120); toast('Der Boden bricht ein!'); }
    next.enemies.forEach((e, i) => { if (!e.alive && state.enemies[i]?.alive) { dissolving.push({ x: e.x, y: e.y, t0: now + 80 }); later(() => play('dissolve'), 120); } });
    history.push(state);
    state = next;
    if (!exitOpen) tr = pushTrace(state); // Lampen brennen weiter: nach dem Lösen unterbricht der Held die Leitung nicht mehr
    if (JSON.stringify(tr.beams.map((b) => b.points)) !== JSON.stringify(before.beams.map((b) => b.points))) growStart = now - (before.visited.size / 16) * 1000; // vorhandener Strahl bleibt stehen, nur Neues wächst nach
    // Klänge
    if (next.rotated != null) play('rotate');
    else if (next.pushed != null) play('push');
    else if (next.moves !== history[history.length - 1].moves) play('step');
    tr.targets.forEach((t, i) => { if (t.ok && !before.targets[i]?.ok) later(() => play('target', t.need), 160); });
    if ((tr.open?.size || 0) > (before.open?.size || 0)) later(() => play('door'), 120);
    if ((tr.pressed?.size || 0) !== (before.pressed?.size || 0)) play('plate');
    hintMark = null;
    pickup();
    const prevState = history[history.length - 1];
    if ((state.got?.length || 0) > (prevState.got?.length || 0)) { play('target', 4); toast('🗝 Schlüssel eingesteckt!'); }
    if ((state.unl?.length || 0) > (prevState.unl?.length || 0)) { play('door'); toast('⛓ Gittertor aufgeschlossen!'); }
    // Fragment aufheben
    for (const f of fragments) if (!f.got && f.x === state.player.x && f.y === state.player.y) {
      f.got = true; play('target', 7);
      const d = loadFrags(); d[def.id] = [...new Set([...(d[def.id] || []), f.i])]; saveFrags(d);
      devlog('SPIEL', `${def.id}: Fragment ${f.i + 1} gefunden`);
    }
    // Tür
    if (tr.solved && !exitOpen) { exitOpen = true; if (solveMoves == null || state.moves < solveMoves) solveMoves = state.moves; later(() => play('exitopen'), 260); devlog('SPIEL', `${def.id}: Ausgang offen nach ${state.moves} Zügen`); }
    // Einmal aufgeblüht bleibt die Tür offen – sonst schlösse sie sich, wenn der Weg hinaus die Ranke kreuzt
    // (im Live-Test: w36, w37, w5). Nur Zurück/Neu schließen sie wieder.
    relocateDoor();
    updateHud();
    if (state.dead) onCaught();
    return true;
  }

  let inputs = []; // Lauf des Spielers für den Code „replay“
  function stepDir(d) {
    if (done || caught || paused) return;
    inputs.push(d);
    // durch die offene Ausgangstür gehen
    if (exit && exitOpen) {
      const [dx, dy] = DIRS[d];
      if (state.player.x + dx === exit.x && state.player.y + dy === exit.y) { escapeRoom(d); return; }
    }
    const now = performance.now();
    lastInput = now;
    if (now < restUntil) return; // verschnauft gerade
    if (restUntil) { stamina = Math.max(stamina, pushCost + 0.02); restUntil = 0; } // Pause vorbei: ein Schub geht wieder
    const n = move(state, d);
    if (!n || n.moves === state.moves) {
      { const [dx, dy] = DIRS[d]; if (interact(state.player.x + dx, state.player.y + dy)) { if (n) { state = n; anim = snap(n, 0); } return; } }
      if (level.cells[(state.player.y + DIRS[d][1]) * level.w + state.player.x + DIRS[d][0]]?.type === 'lock' && !(state.keys > 0)) toast('⛓ Gesperrt – du brauchst einen Schlüssel 🗝');
      held = null; // gegen die Wand: Held bleibt stehen, auch wenn die Taste gehalten wird
      play('bump'); // kein Rückprall: der Held bleibt an der Wand einfach stehen
      const [dx, dy] = DIRS[d];
      dust.push({ x: state.player.x + 0.5 + dx * 0.45, y: state.player.y + 0.8 + dy * 0.3, a: Math.atan2(-dy, -dx), t0: now });
      if (n) { state = n; anim = snap(n, 0); }
      if (++bumps === 4) coachTip('Verrannt? Z (oder ↶) nimmt den letzten Zug zurück, R (⟲) startet den Raum neu.');
      return;
    }
    if (n.pushed != null) {
      if (stamina < pushCost) { // zu erschöpft zum Schieben
        restUntil = now + REST_MS; play('caught');
        toast('Puh! Kurz verschnaufen …');
        coachTip('Puh – die Kraft ist leer! Einen Moment warten oder ein paar Schritte laufen, dann geht es weiter.');
        return;
      }
      stamina -= pushCost; pushT0 = now;
      const b = n.blocks[n.pushed], [dx, dy] = DIRS[d];
      dust.push({ x: b.x + 0.5 - dx * 0.5, y: b.y + 0.85, a: Math.atan2(-dy, -dx) + Math.PI, t0: now });
      dust.push({ x: state.player.x + 0.5, y: state.player.y + 0.9, a: Math.PI / 2 + Math.PI, t0: now });
    } else stamina = Math.min(1, stamina + stepRegen);
    commit(n);
  }
  function rotate() { if (done || caught) return; inputs.push('rot'); const r = rotateFront(state); if (!r) { play('bump'); return; } commit(r); }
  function undo() {
    if (!history.length || done) return;
    state = history.pop(); anim = snap(state, 0); tr = pushTrace(state);
    exitOpen = tr.solved;
    if (caught) { caught = false; $('#win').hidden = true; }
    relocateDoor();
    play('undo'); updateHud();
  }

  function escapeRoom(d) {
    done = true;
    celebrateT0 = 0; escapeT0 = performance.now(); // Held geht durch die Tür, kein Freudensprung auf der Schwelle
    anim = snap(state, performance.now());
    state = { ...state, player: { ...state.player, x: exit.x, y: exit.y, dir: d } };
    const prevBest = tutorial ? null : bestMoves(def.id);
    const counted = solveMoves ?? state.moves;
    const solvedBefore = solvedCount();
    const improved = !tutorial && recordSolve(def.id, counted);
    const unlockedNow = custom ? [] : unlockedBetween(solvedBefore, solvedCount());
    if (tutorial) { try { localStorage.setItem(TUT_SEEN, '1'); } catch { /* blockiert */ } }
    // Münzen fürs Entkommen: erstes Mal viel, Verbesserung etwas, Wiederholung ein bisschen
    const firstTime = !tutorial && prevBest == null;
    const reward = tutorial ? 10 : firstTime ? 10 + 3 * starsFor(solveMoves ?? state.moves, def.par) : improved ? 5 : 1;
    addCoins(reward);
    if (Math.random() < 0.04) { addSpins(1); later(() => toast('Glück gehabt: +1 Drehung am Glücksrad!'), 900); } // bewusst selten
    const stars = starsFor(counted, def.par);
    for (let i = 0; i < stars; i++) later(() => play('lamp', i * 2), 1550 + i * 150); // Sterne fliegen mit steigendem Ton ein
    const lastInWorld = !tutorial && (!chapter || roomNo === chapter.levels.length);
    const nextIndex = custom ? null : index + 1 < PUSH_LEVELS.length ? index + 1 : null;
    coach();
    play(lastInWorld ? 'chapter' : 'win');
    devlog('SPIEL', `${def.id} „${def.name}“ ENTKOMMEN – Rätsel in ${counted} Zügen · ${'★'.repeat(stars)} · Fragmente ${fragments.filter((f) => f.got).length}/2`);
    bloom = { t0: performance.now() + 150, cx: exit.inX, cy: exit.inY, sources: [...tr.targets.map((tg) => ({ x: tg.x, y: tg.y })), { x: exit.x, y: exit.y }] };
    const win = $('#win');
    win.innerHTML = `
      <div class="win-card pixel-card">
        <div class="win-stars" aria-label="${stars} von 3 Sternen">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
        <h2 id="win-title" class="pixel">${tutorial ? 'TUTORIAL GESCHAFFT!' : lastInWorld ? 'WELT GESCHAFFT!' : 'ENTKOMMEN!'}</h2>
        ${tutorial ? '<p>Du kannst laufen, schieben, drehen und Glutlampen zum Leuchten bringen. Jetzt wartet der Sommerstrand!</p>' : ''}
        <p class="win-coins">🪙 +${reward} Münzen · im Beutel ${getInv().coins}</p>
        ${unlockedNow.map((m) => `<p class="win-unlock">🔓 Neu freigeschaltet: ${m.icon} <b>${esc(m.name)}</b></p>`).join('')}
        <p>Rätsel in ${counted} Zügen · Ziel ≤ ${def.par}${improved && prevBest != null ? ' · neue Bestleistung' : ''} · Fragmente ${fragments.filter((f) => f.got).length}/${fragments.length}</p>
        <div class="win-actions">
          ${tutorial ? '<a class="btn btn-primary" href="#/adv/0" id="win-next">Los geht’s: Raum 1 →</a>' : nextIndex != null ? (!lastInWorld && roomNo % 4 === 0 && !isFound(def.id, 'mini') ? `<a class="btn btn-primary" href="#/arena/${chIndex}/mini/${nextIndex}/${def.id}" id="win-boss">⚔ Miniboss</a>` : lastInWorld && !bossBeaten(chIndex) ? `<a class="btn btn-primary" href="#/arena/${chIndex}" id="win-boss">⚔ Zum Bosskampf</a>` : `<a class="btn btn-primary" href="#/adv/${nextIndex}" id="win-next">${lastInWorld ? 'Nächste Welt →' : 'Nächster Raum →'}</a>`) : (custom ? `<a class="btn btn-primary" href="${esc(opts.back || '#/menu')}" id="win-next">${esc(opts.backLabel || 'Zurück zum Menü')}</a>` : '<a class="btn btn-primary" href="#/menu" id="win-next">Alle Räume geschafft!</a>')}
          ${codeOn('replay') ? '<button class="btn" id="win-replay">Replay ansehen</button>' : ''}
          <button class="btn" id="win-retry">Nochmal (R)</button>
        </div>
      </div>`;
    later(() => { win.hidden = false; ($('#win-next') || $('#win-boss'))?.focus(); }, 1500); // erst die Blüte genießen
    $('#win-retry').addEventListener('click', () => { reset(); canvas.focus(); });
    $('#win-replay')?.addEventListener('click', () => {
      const run = [...inputs];
      reset();
      run.forEach((p, i) => later(() => {
        if (p === 'rot') rotate();
        else if (String(p).startsWith('face')) { state = { ...state, player: { ...state.player, dir: +String(p).slice(4) } }; inputs.push(p); } else stepDir(p);
      }, 300 + i * 190));
    });
    // Weiter mit Vorhang: im Raum der Vorhang der nächsten Welt, beim Weltwechsel erst ihr Panorama
    const nextDef = tutorial ? PUSH_LEVELS[0] : nextIndex != null ? PUSH_LEVELS[nextIndex] : null;
    if (nextDef) $('#win-next')?.addEventListener('click', (e) => {
      e.preventDefault();
      const nci = CHAPTERS.findIndex((c) => c.levels.includes(nextDef.id)), nch = CHAPTERS[nci];
      const to = CHAPTER_WORLD[nch.id] || 'default';
      transitionTo(`#/adv/${tutorial ? 0 : nextIndex}`, { from: themeId, to, worldChange: to !== themeId, label: `RAUM ${nch.levels.indexOf(nextDef.id) + 1} · ${nextDef.name}`, kicker: `WELT ${nci + 1}`, title: WORLDS[to]?.name || nch.name });
    });
  }

  function onCaught() {
    caught = true;
    play('caught');
    const win = $('#win');
    win.innerHTML = `
      <div class="win-card caught-card pixel-card">
        <h2 id="win-title" class="pixel">ERWISCHT!</h2>
        <p>Ein Schattenläufer hat dich berührt. Locke ihn in einen Lichtstrahl!</p>
        <div class="win-actions"><button class="btn btn-primary" id="c-undo">${icon('undo')} Zug zurück (Z)</button><button class="btn" id="c-reset">${icon('reset')} Raum neu (R)</button></div>
      </div>`;
    win.hidden = false;
    $('#c-undo').addEventListener('click', () => { undo(); canvas.focus(); });
    $('#c-reset').addEventListener('click', () => { reset(); canvas.focus(); });
  }

  // ---------- Eingabe: Taste halten = weiterlaufen ----------
  held = null; lastStep = 0;
  let paused = false;
  function setPaused(on) {
    paused = on; held = null;
    $('#pausemenu').hidden = !on;
    if (on) debugInfo();
    if (on) { play('ui'); $('#p-resume').focus(); } else canvas.focus();
  }
  $('#pause').addEventListener('click', () => setPaused(true));
  $('#p-resume').addEventListener('click', () => setPaused(false));
  $('#p-reset').addEventListener('click', () => { setPaused(false); reset(); });
  bindVolume($('#pausemenu'));
  // Admin-Debug im Pausenmenü
  function debugInfo() {
    const el = $('#dbg-info');
    if (el) el.textContent = `${def.id} · ${themeId} · Held ${state.player.x},${state.player.y} · Züge ${state.moves}/${def.par ?? '–'} · Blöcke ${state.blocks.length} · Tür ${exit.x},${exit.y}${exitOpen ? ' offen' : ' zu'}`;
  }
  function debug(a) {
    setPaused(false);
    if (a === 'open') { exitOpen = true; if (solveMoves == null) solveMoves = state.moves; play('exitopen'); updateHud(); }
    if (a === 'hint') { hintMark = null; use('scroll'); }
    if (a === 'next' || a === 'prev') location.hash = `#/adv/${index + (a === 'next' ? 1 : -1)}`;
    if (a === 'curtain') transitionTo(location.hash, { from: themeId, to: themeId, label: 'Vorhang-Test' });
    if (a === 'solve') {
      const res = solvePush(level, { from: state, limit: 800000 });
      if (!res.solvable) { toast('Von hier aus nicht lösbar – erst Zurück oder Neu'); return; }
      res.path.forEach((p, i) => later(() => { if (p === 'rot') rotate(); else stepDir(String(p).startsWith('turn') ? +String(p).slice(4) : p); }, i * 170));
    }
  }
  root.querySelectorAll('[data-dbg]').forEach((b) => b.addEventListener('click', () => debug(b.dataset.dbg)));
  const sndBtn = $('#snd');
  const showSnd = () => { sndBtn.innerHTML = icon(isMuted() ? 'mute' : 'sound'); };
  showSnd();
  sndBtn.addEventListener('click', () => { toggleMute(); showSnd(); canvas.focus(); });
  // Hinweiszettel blendet sich nach ein paar Sekunden aus, Antippen zeigt ihn wieder
  const note = $('#note');
  const noteTimer = note && setTimeout(() => note.classList.add('faded'), 6000);
  note?.addEventListener('click', () => note.classList.toggle('faded'));

  function onKeyDown(e) {
    if (e.target.closest('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#signdlg').hidden) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { closeSign(); e.preventDefault(); } return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { setPaused(!paused); e.preventDefault(); return; }
    if (!paused && e.key >= '1' && e.key <= '4') { use(SLOTS[+e.key - 1]); e.preventDefault(); return; }
    if (paused) return;
    if (e.target.closest('a, button') && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.key in KEYS) { if (!e.repeat) { pressed = [...pressed.filter((d) => d !== KEYS[e.key]), KEYS[e.key]]; held = KEYS[e.key]; stepDir(held); lastStep = performance.now(); } e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'e' || e.key === 'E') { rotate(); e.preventDefault(); }
    else if (e.key === 'z' || e.key === 'Z') undo();
    else if (e.key === 'r' || e.key === 'R') reset();
  }
  // Gedrückte Richtungen in Reihenfolge: lässt man die neueste los, gilt wieder die davor
  let pressed = [];
  function onKeyUp(e) {
    if (!(e.key in KEYS)) return;
    pressed = pressed.filter((d) => d !== KEYS[e.key]);
    const top = pressed.length ? pressed[pressed.length - 1] : null;
    if (top !== held) { held = top; if (top != null) { stepDir(top); lastStep = performance.now(); } }
  }
  const clearKeys = () => { pressed = []; held = null; };
  addEventListener('blur', clearKeys);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  $('#reset').addEventListener('click', () => { reset(); canvas.focus(); });
  if (touch) {
    root.querySelectorAll('.dpad button').forEach((b) => {
      const d = +b.dataset.d;
      b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); held = d; stepDir(d); lastStep = performance.now(); });
      const up = () => { held = null; }; // Finger hoch = stehen bleiben (auch wenn er auf einen anderen Pfeil gerutscht ist)
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    $('#tpad-rot').addEventListener('pointerdown', (ev) => { ev.preventDefault(); rotate(); if (navigator.vibrate) navigator.vibrate(12); });
    // Langes Drücken öffnet sonst das Kontextmenü (und stoppt das Laufen)
    root.querySelector('.adv-full').addEventListener('contextmenu', (ev) => ev.preventDefault());
    // Finger gleitet vom Pfeil auf einen anderen: Richtung wechseln statt hängenzubleiben
    root.querySelector('.dpad').addEventListener('pointermove', (ev) => {
      if (held == null) return;
      const b = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.dpad button');
      if (b && +b.dataset.d !== held) held = +b.dataset.d;
    });
    // Wischen übers Spielfeld: Held läuft in Wischrichtung, solange der Finger unten bleibt
    let swipe = null;
    canvas.addEventListener('pointerdown', (ev) => { swipe = { x: ev.clientX, y: ev.clientY, moved: false, dir: null }; canvas.setPointerCapture?.(ev.pointerId); });
    canvas.addEventListener('pointermove', (ev) => {
      if (!swipe) return;
      const dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      swipe.x = ev.clientX; swipe.y = ev.clientY; swipe.moved = true;
      if (d === swipe.dir) return; // gleiche Richtung: läuft schon oder steht an der Wand
      swipe.dir = held = d; stepDir(d); lastStep = performance.now();
    });
    const endSwipe = (ev) => {
      if (swipe && !swipe.moved && ev.type === 'pointerup') tapBoard(ev);
      swipe = null; held = null;
    };
    canvas.addEventListener('pointerup', endSwipe);
    canvas.addEventListener('pointercancel', endSwipe);
  } else canvas.addEventListener('click', (ev) => tapBoard(ev));

  // Block antippen oder anklicken: steht der Held direkt davor, dreht er ihn (und schaut dabei hin)
  function tapBoard(ev) {
    if (!view || done || caught || paused) return;
    const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
    const x = Math.floor((((ev.clientX - r.left) * k - view.dx) / view.scale - pix.ox) / T);
    const y = Math.floor((((ev.clientY - r.top) * k - view.dy) / view.scale - pix.oy) / T);
    const d = DIRS.findIndex(([dx, dy]) => state.player.x + dx === x && state.player.y + dy === y);
    const b = state.blocks.find((o) => o.x === x && o.y === y);
    if (d < 0 || !b || (!b.orient && b.kind !== 'lamp')) { if (touch) rotate(); return; } // am Handy dreht jeder Tipp den Block, auf den der Held schaut
    state = { ...state, player: { ...state.player, dir: d } };
    inputs.push(`face${d}`);
    rotate();
  }

  // ---------- Zeichnen ----------
  let running = true, shownStamina = '', view = null, chipTop = null, litSeen = new Set(), lastLit = -1, fxState = null, nextMote = 0, waveDone = false, trail = [], trailAt = { x: -1, y: -1 };
  const trailColor = getLook().trail.color || (getSkin().color.hero ? getSkin().color.glow : null); // Lichtspur des Skins
  const staminaEl = $('#stamina');
  const lerp = (a, b, k) => a + (b - a) * k;
  function frame(t) {
    if (!running) return;
    if (held != null && t - lastStep >= REPEAT_MS / (codeOn('turbo') ? 2 : 1) && (codeOn('turbo') || !anim.t0 || t - anim.t0 >= STEP_MS)) {
      // Anschluss genau am Ende des vorigen Schritts (nicht erst beim nächsten Bild) → keine Lücke
      const chainT0 = anim.t0 && t - anim.t0 < STEP_MS + 60 ? anim.t0 + STEP_MS : 0;
      const before = anim;
      stepDir(held); lastStep = t;
      if (anim !== before && anim.t0 && chainT0) { anim.t0 = chainT0; anim.chain = true; }
    }
    const reduced = prefersReducedMotion();
    const k = reduced || !anim.t0 ? 1 : Math.min(1, (t - anim.t0) / STEP_MS);
    // gehaltene Taste: gleichmäßig laufen; einzelner Schritt: weich ausbremsen
    const e = anim.chain ? k : 1 - Math.pow(1 - k, 3);
    // Kraft lädt sich beim Verschnaufen auf; nach der Pause mindestens für einen Schub
    if (t - lastInput > 350 && stamina < 1) stamina = Math.min(1, stamina + IDLE_REGEN * (1 / 60));
    if (restUntil && t >= restUntil) { stamina = Math.max(stamina, pushCost + 0.02); restUntil = 0; }
    const idle = t - lastInput;
    const player = {
      x: lerp(anim.player.x, state.player.x, e), y: lerp(anim.player.y, state.player.y, e), dir: state.player.dir,
      walk: k < 1 ? k : null,
      push: t - pushT0 < 260 ? 1 : 0,
      stamina,
      exhausted: t < restUntil,
      bump: t - bumpT0 < 160 ? 1 - (t - bumpT0) / 160 : 0,
      celebrate: celebrateT0 && t - celebrateT0 < 1200 ? (t - celebrateT0) / 1200 : 0,
      caught,
      yawn: !done && !caught && idle > 8000 && (idle % 9000) < 1800,
    };
    dust = dust.filter((d) => t - d.t0 < 450);
    const kStr = stamina.toFixed(2);
    if (kStr !== shownStamina) { shownStamina = kStr; staminaEl.style.setProperty('--k', kStr); }
    const blocks = state.blocks.map((b, i) => {
      const sq = squash && squash.i === i && !reduced ? Math.max(0, 1 - (t - squash.t0) / 220) : 0;
      return { ...b, x: lerp(anim.blocks[i].x, b.x, e), y: lerp(anim.blocks[i].y, b.y, e), squash: sq ? Math.sin(sq * Math.PI) * 0.15 : 0, squashDir: state.player.dir };
    });
    const enemies = state.enemies.map((en, i) => ({ ...en, x: lerp(anim.enemies[i]?.x ?? en.x, en.x, e), y: lerp(anim.enemies[i]?.y ?? en.y, en.y, e) }));
    dissolving = dissolving.filter((d) => t - d.t0 < 700);
    sinking = sinking.filter((s) => t - s.t0 < 600);
    // Andocken
    const [fx, fy] = DIRS[state.player.dir];
    const front = k >= 1 && state.blocks.find((b) => b.x === state.player.x + fx && b.y === state.player.y + fy);
    const key = front && !done ? `${front.x},${front.y},${state.player.dir}` : null;
    if (key !== dock?.key) { dock = key ? { key, x: front.x, y: front.y, dir: state.player.dir } : null; if (dock) play('dock'); }

    const marker = hintMark || (tutorial && !done ? TUT_STEPS[tutStep].mark() : null);
    const markers = t < lensUntil ? [...loot.filter((l) => !l.got), ...fragments.filter((f) => !f.got), ...level.cells.map((c, i) => (c.key && !state.got?.includes(i) ? { x: i % level.w, y: Math.floor(i / level.w) } : null)).filter(Boolean)] : [];
    if (trailColor && (state.player.x !== trailAt.x || state.player.y !== trailAt.y)) { if (trailAt.x >= 0) trail.push({ ...trailAt, t0: t, side: trail.length % 2 }); trailAt = { x: state.player.x, y: state.player.y }; }
    if (stopped(t)) { requestAnimationFrame(frame); return; } // Hitstop: ein kurzer Moment Stillstand
    // Lampe leuchtet neu auf: Funken, Lichtring, Ton je Lampe höher
    const litNow = tr.targets.filter((o) => o.ok);
    for (const o of litNow) if (!litSeen.has(o)) {
      if (lastLit >= 0 && litNow.length > lastLit) { sparks(o.x, o.y, theme.trim || '#ffd166', t); bolt(o.x, o.y, theme.trim || '#ffd166', t); ring(o.x, o.y, theme.trim || '#ffd166', t); addTrauma(0.3); hitstop(FX.hitstopLamp, t); play('lamp', litNow.length - 1); }
    }
    litSeen = new Set(litNow); lastLit = litNow.length;
    const glow = theme.trim || '#ffd166';
    if (state !== fxState) { // neuer Zug: Schieben und Drehen federn, Funken wo der Strahl umgelenkt wird
      fxState = state;
      // Monster stehen nie unter einer Leitung: weicht zum nächsten freien Feld aus
      for (const m of loot) if (m.kind === 'critter' && !m.got && tr.visited.has(m.y * level.w + m.x)) {
        const spot = level.cells.map((c, i) => ({ c, x: i % level.w, y: Math.floor(i / level.w), i })).filter((o) => o.c.type === 'empty' && !tr.visited.has(o.i) && !state.blocks.some((b) => b.x === o.x && b.y === o.y) && !(o.x === state.player.x && o.y === state.player.y)).sort((p, q) => Math.hypot(p.x - m.x, p.y - m.y) - Math.hypot(q.x - m.x, q.y - m.y))[0];
        if (spot) { m.x = spot.x; m.y = spot.y; }
      }
      if (state.pushed != null || state.rotated != null) { squashFx(t); buzz(12); }
      for (const b of state.blocks) if (b.orient && tr.visited.has(b.y * level.w + b.x) && (state.rotated != null || state.pushed != null)) ring(b.x, b.y, glow, t, true);
    }
    if (tr.visited.size && t > nextMote) { nextMote = t + 180; const c = [...tr.visited][Math.floor(Math.random() * tr.visited.size)]; mote(c % level.w, Math.floor(c / level.w), glow, t); }
    if (exitOpen && !waveDone) { // Lichtwelle läuft durch die Leitung zur Tür
      waveDone = true;
      doorT0 = t;
      { const g = getLook().goal; goalBurst(g.id, exit.x, exit.y, g.color || glow, t); celebrateT0 = t; }
      const cells = [...tr.visited].map((c) => ({ x: c % level.w, y: Math.floor(c / level.w) })).sort((p, q) => Math.hypot(q.x - exit.x, q.y - exit.y) - Math.hypot(p.x - exit.x, p.y - exit.y));
      cells.forEach((c, i) => ring(c.x, c.y, glow, t + i * 35, true));
      ring(exit.x, exit.y, glow, t + cells.length * 35); buzz(40);
    } else if (!exitOpen) waveDone = false;
    const img = pix.draw(reduced ? 0 : t, { marker, markers, loot, chest, sign, got: state.got, fill: state.fill, broken: state.broken, sinking, doorAge: t - doorT0, heroShrink: escapeT0 ? Math.min(1, (t - escapeT0) / 420) : 0, bigLantern: owns('lantern'), tr, blocks, player, enemies, dissolving, dock, exit, exitOpen, fragments, theme, dust, bloom, grow: reduced ? Infinity : ((t - growStart) / 1000) * 16 });
    // Hochskalieren ohne Glättung → Pixel-Art
    const dpr = devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), chh = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    ctx.imageSmoothingEnabled = false;
    // Leichte Bewegungsunschärfe: das vorige Bild scheint kurz durch (ab 50 % Grafik, nicht bei „Weniger Bewegung“)
    const blur = !reduced && fxQuality() >= 0.5 && held != null; // nur beim Laufen, Fackeln bleiben im Stand scharf
    if (!blur) ctx.clearRect(0, 0, cw, chh);
    // Raum samt Rückwand einpassen; die Außenwelt drumherum füllt den Rest des Bildschirms
    const v = pix.view;
    const scale = Math.max(1, Math.floor(Math.min(cw / v.w, chh / v.h)));
    const dx = Math.floor((cw - v.w * scale) / 2) - v.x * scale, dy = Math.floor((chh - v.h * scale) / 2) - v.y * scale;
    view = { dx, dy, scale };
    if (touch && chh > cw) { // Handy hochkant: Anzeigen mittig zwischen oberen Knöpfen und Raumkante
      const k = canvas.getBoundingClientRect().width / cw, roomTop = (dy + v.y * scale) * k;
      const tc = $('.ihud-tc'), top = Math.round(($('.ihud-tr').getBoundingClientRect().bottom + roomTop - tc.getBoundingClientRect().height) / 2);
      if (top !== chipTop) { chipTop = top; tc.style.setProperty('top', `${top}px`, 'important'); }
    }
    if (trail.length) { // Spur auf den Boden, verblasst in zwei Sekunden
      const g = img.getContext('2d');
      trail = trail.filter((p) => t - p.t0 < 2000);
      g.save(); g.setTransform(1, 0, 0, 1, pix.ox, pix.oy); g.fillStyle = trailColor;
      for (const p of trail) { g.globalAlpha = 0.7 * (1 - (t - p.t0) / 2000); g.fillRect(p.x * T + (p.side ? 4 : 9), p.y * T + 11, 3, 3); }
      g.restore();
    }
    { const g = img.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, pix.ox, pix.oy); drawFx(g, T, t); g.restore(); }
    const [qx, qy] = shake(scale, t);
    ctx.globalAlpha = blur ? 0.72 : 1;
    ctx.drawImage(img, dx + qx, dy + qy, img.width * scale, img.height * scale);
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  reset();
  requestAnimationFrame(frame);
  canvas.focus();
  devlog('SPIEL', `Abenteuer: Raum „${def.name}“ (${def.id}) betreten · Ausgang (${exit?.x},${exit?.y}) · Welt ${themeId}`);
  if (location.hostname === 'localhost') window.__adv = { get state() { return { moves: state.moves, player: state.player, exitOpen, done, caught, solved: tr.solved, exit, fragments, loot, chest, sign, keys: state.keys, level, blocks: state.blocks, raw: state, held }; }, step: stepDir, rotate, use };

  return () => {
    running = false;
    document.body.classList.remove('ingame');
    clearTimeout(noteTimer);
    timers.forEach(clearTimeout);
    stopCelebration();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    removeEventListener('blur', clearKeys);
    delete window.__adv;
  };
}
