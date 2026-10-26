// Level-Bauer (#/build): eigene Escape-Räume im Raster bauen. Die Vorschau zeichnet derselbe
// PixelRenderer wie das Spiel (inkl. Redstone-Leitungen), der Löser prüft Lösbarkeit und Mindestzüge,
// „Spielen“ startet den Raum im echten Abenteuer. Räume lassen sich speichern und als Link teilen.
// Routen: #/build (letzter Entwurf), #/build/<code> (geteilter Raum), #/build/play/<code> (spielen).
import { parsePushLevel, createPushState, pushTrace, solvePush } from '../game/push.js';
import { PixelRenderer, PIXEL_THEMES } from '../game/pixelRender.js';
import { findExit, mountAdventure } from '../adventure/adventure.js';
import { isUnlocked, lockedHtml } from '../game/unlocks.js';
import { play } from '../game/sound.js';
import { publishUrl } from './communityView.js';

const DRAFT_KEY = 'prismara.builder.draft.v1';
const SAVES_KEY = 'prismara.builder.saves.v1';
const T = 16;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TOOLS = [
  ['.', 'Boden', '⬜'], ['#', 'Wand', '🧱'], ['@', 'Held', '🧍'], ['emitter', 'Fackel', '🔥'], ['target', 'Lampe', '💡'],
  ['m', 'Spiegel ╱', '╱'], ['n', 'Spiegel ╲', '╲'], ['o', 'Stein', '🪨'], ['P', 'Prisma', '🔺'],
  ['h', 'Teiler ╱', '◩'], ['k', 'Teiler ╲', '◪'], ['~', 'Eis', '🧊'], ['O', 'Grube', '🕳'], ['%', 'Morsch', '🪵'],
  ['K', 'Schlüssel', '🗝'], ['L', 'Gittertor', '⛓'],
];
const EMIT_COLORS = [['R', 'Rot'], ['G', 'Grün'], ['B', 'Blau'], ['W', 'Weiß']];
const TARGET_COLORS = [['R', 'Rot'], ['G', 'Grün'], ['B', 'Blau'], ['RG', 'Gelb'], ['RB', 'Magenta'], ['GB', 'Cyan'], ['W', 'Weiß']];
const DIR_NAMES = { N: '↑', E: '→', S: '↓', W: '←' };
const THEMES = { beach: '🏖️ Strand', cherry: '🌸 Kirschblüte', jungle: '🌴 Dschungel', castle: '🏰 Burg', moor: '🌫️ Moor', night: '🌙 Nachtwald', volcano: '🌋 Vulkan', temple: '🏜️ Tempel', aurora: '❄️ Polar', reef: '🐠 Riff', shadow: '🌑 Schatten' };

// ---------- Raum ↔ Raster ↔ Code ----------
function blankGrid(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.push({ ch: x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.' });
  return g;
}
function starterRoom() {
  const w = 11, h = 7, g = blankGrid(w, h);
  g[1 * w + 1] = { ch: 'emitter', dir: 'E', color: 'R' };
  g[1 * w + 6] = { ch: 'm' }; // steht noch falsch herum – Drehen ist das Rätsel
  g[5 * w + 6] = { ch: 'target', color: 'R' };
  g[4 * w + 2] = { ch: '@' };
  return { name: 'Mein Raum', w, h, grid: g, theme: 'cherry' };
}
/** Raster → Leveldefinition (rows + legend) wie in pushLevels.js. */
function toDef(room, par = null) {
  const legend = {}, rows = [];
  let e = 0, t = 0;
  const emitKeys = 'abcdefgj', targetKeys = '123456789';
  for (let y = 0; y < room.h; y++) {
    let row = '';
    for (let x = 0; x < room.w; x++) {
      const c = room.grid[y * room.w + x];
      if (c.ch === 'emitter') {
        const k = emitKeys[e++]; if (!k) { row += '#'; continue; }
        legend[k] = { type: 'emitter', dir: c.dir, color: c.color }; row += k;
      } else if (c.ch === 'target') {
        const k = targetKeys[t++]; if (!k) { row += '.'; continue; }
        legend[k] = { type: 'target', color: c.color }; row += k;
      } else row += c.ch;
    }
    rows.push(row);
  }
  return { id: 'custom', name: room.name || 'Eigener Raum', par, hint: 'Ein selbst gebauter Raum aus dem Level-Bauer.', legend, rows };
}
export const toDefFromRoom = (room) => ({ ...toDef(room), theme: room.theme });
function fromDef(def) {
  const h = def.rows.length, w = def.rows[0].length, grid = [];
  for (const row of def.rows) for (const ch of row) {
    const l = def.legend?.[ch];
    if (l?.type === 'emitter') grid.push({ ch: 'emitter', dir: l.dir, color: l.color });
    else if (l?.type === 'target') grid.push({ ch: 'target', color: l.color });
    else grid.push({ ch });
  }
  return { name: def.name, w, h, grid, theme: def.theme || 'cherry' };
}
export function encodeRoom(room) {
  const json = JSON.stringify({ ...toDef(room), theme: room.theme });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeRoom(code) {
  try {
    const json = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))));
    const def = JSON.parse(json);
    if (!Array.isArray(def.rows) || def.rows.length < 3 || def.rows.length > 15) return null;
    return fromDef(def);
  } catch { return null; }
}
const loadJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch { return d; } };
const saveJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blockiert */ } };

export function mountBuilder(root, params = []) {
  document.body.classList.add('wood');
  if (!isUnlocked('builder')) {
    root.innerHTML = `<section class="tm sub"><div class="tm-ui" style="justify-content:center">${lockedHtml('builder')}</div></section>`;
    return () => {};
  }
  // Spielen: echter Escape-Raum, danach zurück in den Bauer
  if (params[0] === 'play' && params[1]) {
    const room = decodeRoom(params[1]);
    if (!room) { location.replace('#/build'); return () => {}; }
    const level = parsePushLevel(toDef(room));
    const r = solvePush(level, { limit: 300000 });
    return mountAdventure(root, ['custom'], { def: toDef(room, r.solvable ? r.minMoves : null), theme: room.theme, back: `#/build/${params[1]}`, backLabel: '🔨 Zurück zum Bauen' });
  }

  let room = (params[0] && decodeRoom(params[0])) || (() => { const d = loadJson(DRAFT_KEY, null); return d ? fromDef(d) : null; })() || starterRoom();
  let tool = '#', emitColor = 'R', emitDir = 'E', targetColor = 'R';
  let check = null; // letzte Prüfung { ok, text }

  root.innerHTML = `
    <section class="bld">
      <header class="bld-head">
        <a class="wbtn sm" href="#/menu">← Menü</a>
        <h2 class="tm-plank">🔨 Level-Bauer</h2>
        <input class="bld-name" id="bld-name" maxlength="28" aria-label="Name des Raums">
      </header>
      <div class="bld-main">
        <div class="bld-stage"><canvas id="bld-canvas" aria-label="Raum-Raster: tippen oder klicken setzt das gewählte Teil, ziehen malt."></canvas></div>
        <aside class="bld-side parch">
          <h3>Bauteile</h3>
          <div class="bld-tools" id="bld-tools">${TOOLS.map(([id, name, icon]) => `<button class="bld-tool" data-tool="${id}" title="${name}"><span>${icon}</span><small>${name}</small></button>`).join('')}</div>
          <div class="bld-opts" id="bld-opts"></div>
          <h3>Raum</h3>
          <div class="bld-row">
            <label>Breite <select id="bld-w">${[7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => `<option>${n}</option>`).join('')}</select></label>
            <label>Höhe <select id="bld-h">${[5, 6, 7, 8, 9, 10, 11].map((n) => `<option>${n}</option>`).join('')}</select></label>
          </div>
          <label class="bld-full">Welt <select id="bld-theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <div class="bld-check" id="bld-check" aria-live="polite">Bau einen Raum: mindestens eine Fackel, eine Lampe und deinen Helden.</div>
          <div class="bld-actions">
            <button class="wbtn" id="bld-test">🧪 Prüfen</button>
            <button class="wbtn big" id="bld-play">▶ Spielen</button>
            <button class="wbtn sm" id="bld-save">💾 Speichern</button>
            <button class="wbtn sm" id="bld-share">🔗 Teilen</button>
            <button class="wbtn sm bld-pub" id="bld-pub">🌍 Veröffentlichen</button>
            <button class="wbtn sm" id="bld-new">🧹 Neu</button>
          </div>
          <h3>Gespeichert</h3>
          <ul class="bld-saves" id="bld-saves"></ul>
        </aside>
      </div>
    </section>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('#bld-canvas'), ctx = canvas.getContext('2d');
  let pix = null, level = null, tr = null, view = null;

  function rebuild() {
    // Leveldefinition neu einlesen (ohne Held gibt es kein gültiges Level → Platzhalter-Held nur für die Vorschau)
    const def = toDef(room);
    if (!def.rows.some((r) => r.includes('@'))) { const i = room.grid.findIndex((c) => c.ch === '.'); if (i >= 0) def.rows[Math.floor(i / room.w)] = def.rows[Math.floor(i / room.w)].replace(/\./, '@'); }
    try { level = parsePushLevel(def); } catch { level = null; return; }
    pix = new PixelRenderer(level);
    tr = pushTrace(createPushState(level));
    saveJson(DRAFT_KEY, { ...toDef(room), theme: room.theme });
  }
  function changed() { check = null; rebuild(); showCheck(); }

  function showOpts() {
    const o = $('#bld-opts');
    if (tool === 'emitter') o.innerHTML = `<div class="bld-chips">${EMIT_COLORS.map(([c, n]) => `<button data-ec="${c}" class="${c === emitColor ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="bld-chips">${Object.entries(DIR_NAMES).map(([d, a]) => `<button data-ed="${d}" class="${d === emitDir ? 'on' : ''}">${a}</button>`).join('')}</div>`;
    else if (tool === 'target') o.innerHTML = `<div class="bld-chips">${TARGET_COLORS.map(([c, n]) => `<button data-tc="${c}" class="${c === targetColor ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    else o.innerHTML = '';
    root.querySelectorAll('.bld-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  }
  $('#bld-tools').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) { tool = b.dataset.tool; play('ui'); showOpts(); } });
  $('#bld-opts').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ec) emitColor = b.dataset.ec; if (b.dataset.ed) emitDir = b.dataset.ed; if (b.dataset.tc) targetColor = b.dataset.tc;
    showOpts();
  });

  // ---------- Setzen per Klick/Tippen (Ziehen malt) ----------
  function cellAt(ev) {
    if (!view) return null;
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    const ix = ((ev.clientX - r.left) * dpr - view.dx) / view.scale, iy = ((ev.clientY - r.top) * dpr - view.dy) / view.scale;
    const x = Math.floor((ix - pix.ox) / T), y = Math.floor((iy - pix.oy) / T);
    return x >= 0 && y >= 0 && x < room.w && y < room.h ? { x, y } : null;
  }
  function place(x, y) {
    const border = x === 0 || y === 0 || x === room.w - 1 || y === room.h - 1;
    if (border) return false; // Rand bleibt Wand (dort setzt das Spiel die Tür ein)
    const i = y * room.w + x, cur = room.grid[i];
    let next;
    if (tool === 'emitter') next = { ch: 'emitter', dir: emitDir, color: emitColor };
    else if (tool === 'target') next = { ch: 'target', color: targetColor };
    else next = { ch: tool };
    if (cur.ch === next.ch && cur.dir === next.dir && cur.color === next.color) return false;
    if (tool === '@') room.grid.forEach((c, j) => { if (c.ch === '@') room.grid[j] = { ch: '.' }; });
    room.grid[i] = next;
    return true;
  }
  let painting = false;
  canvas.addEventListener('pointerdown', (e) => { const c = cellAt(e); if (!c) return; painting = tool !== '@' && tool !== 'emitter'; canvas.setPointerCapture(e.pointerId); if (place(c.x, c.y)) { play('step'); changed(); } });
  canvas.addEventListener('pointermove', (e) => { if (!painting) return; const c = cellAt(e); if (c && place(c.x, c.y)) changed(); });
  const stop = () => { painting = false; };
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);

  // ---------- Raumgröße, Welt, Name ----------
  function resize(w, h) {
    const g = blankGrid(w, h);
    for (let y = 1; y < Math.min(h, room.h) - 1; y++) for (let x = 1; x < Math.min(w, room.w) - 1; x++) g[y * w + x] = room.grid[y * room.w + x];
    room = { ...room, w, h, grid: g };
    changed();
  }
  $('#bld-w').addEventListener('change', (e) => resize(+e.target.value, room.h));
  $('#bld-h').addEventListener('change', (e) => resize(room.w, +e.target.value));
  $('#bld-theme').addEventListener('change', (e) => { room.theme = e.target.value; changed(); });
  $('#bld-name').addEventListener('input', (e) => { room.name = e.target.value || 'Mein Raum'; saveJson(DRAFT_KEY, { ...toDef(room), theme: room.theme }); });
  function syncFields() { $('#bld-w').value = room.w; $('#bld-h').value = room.h; $('#bld-theme').value = room.theme; $('#bld-name').value = room.name || ''; }

  // ---------- Prüfen, Spielen, Speichern, Teilen ----------
  function problems() {
    const count = (ch) => room.grid.filter((c) => c.ch === ch).length;
    const p = [];
    if (count('@') !== 1) p.push('genau einen Helden setzen');
    if (!count('emitter')) p.push('mindestens eine Fackel setzen');
    if (!count('target')) p.push('mindestens eine Lampe setzen');
    if (count('target') > 9) p.push('höchstens 9 Lampen');
    if (count('emitter') > 8) p.push('höchstens 8 Fackeln');
    return p;
  }
  function runCheck() {
    const p = problems();
    if (p.length) { check = { ok: false, text: `Noch fehlt: ${p.join(', ')}.` }; return check; }
    const lv = parsePushLevel(toDef(room));
    if (pushTrace(createPushState(lv)).solved) { check = { ok: false, text: 'Der Raum ist schon gelöst, bevor man sich bewegt – bau ein Hindernis ein.' }; return check; }
    if (!findExit(lv)) { check = { ok: false, text: 'Kein Platz für die Ausgangstür: Ein freies Bodenfeld muss vom Start aus erreichbar an der Wand liegen.' }; return check; }
    const t0 = performance.now();
    const r = solvePush(lv, { limit: 300000 });
    const ms = Math.round(performance.now() - t0);
    check = r.solvable
      ? { ok: true, par: r.minMoves, text: `✓ Lösbar in mindestens ${r.minMoves} Zügen (${r.explored.toLocaleString('de-DE')} Stellungen geprüft, ${ms} ms). Das ist dein Zugziel für ★★★.` }
      : { ok: false, text: r.exhausted ? 'Zu groß zum Prüfen (über 300 000 Stellungen) – kleiner bauen oder weniger Kisten.' : '✗ Unlösbar: Keine Zugfolge bringt alle Lampen zum Leuchten.' };
    return check;
  }
  function showCheck() {
    const el = $('#bld-check');
    if (!check) { const p = problems(); el.className = 'bld-check'; el.textContent = p.length ? `Noch fehlt: ${p.join(', ')}.` : 'Fertig gebaut? „Prüfen“ lässt den Löser rechnen.'; return; }
    el.className = `bld-check ${check.ok ? 'ok' : 'bad'}`; el.textContent = check.text;
  }
  $('#bld-test').addEventListener('click', () => { $('#bld-check').textContent = 'Der Löser rechnet …'; setTimeout(() => { runCheck(); play(check.ok ? 'target' : 'bump', 1); showCheck(); }, 30); });
  $('#bld-play').addEventListener('click', () => {
    if (!check) runCheck();
    showCheck();
    if (!check.ok) { play('bump'); return; }
    location.hash = `#/build/play/${encodeRoom(room)}`;
  });
  function renderSaves() {
    const saves = loadJson(SAVES_KEY, []);
    $('#bld-saves').innerHTML = saves.length ? saves.map((s, i) => `<li><button class="link" data-load="${i}">${esc(s.name)}</button><small>${s.w}×${s.h}${s.par ? ` · ${s.par} Züge` : ''}</small><button class="bld-del" data-del="${i}" aria-label="${esc(s.name)} löschen">✕</button></li>`).join('') : '<li class="muted">Noch nichts gespeichert.</li>';
  }
  $('#bld-save').addEventListener('click', () => {
    const saves = loadJson(SAVES_KEY, []);
    const entry = { name: room.name || 'Mein Raum', w: room.w, h: room.h, code: encodeRoom(room), par: check?.ok ? check.par : null };
    const i = saves.findIndex((s) => s.name === entry.name);
    if (i >= 0) saves[i] = entry; else saves.unshift(entry);
    saveJson(SAVES_KEY, saves.slice(0, 30)); renderSaves(); play('target', 2);
  });
  $('#bld-saves').addEventListener('click', (e) => {
    const saves = loadJson(SAVES_KEY, []);
    const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
    if (l) { const r = decodeRoom(saves[+l.dataset.load].code); if (r) { room = r; syncFields(); changed(); play('ui'); } }
    if (d) { saves.splice(+d.dataset.del, 1); saveJson(SAVES_KEY, saves); renderSaves(); }
  });
  $('#bld-share').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#/build/${encodeRoom(room)}`;
    try { await navigator.clipboard.writeText(url); $('#bld-check').textContent = '🔗 Link kopiert – wer ihn öffnet, bekommt genau diesen Raum.'; }
    catch { $('#bld-check').textContent = url; }
  });
  // Veröffentlichen: nur geprüfte, lösbare Räume → vorausgefülltes GitHub-Issue (Community-Tab liest es)
  $('#bld-pub').addEventListener('click', () => {
    if (!check) runCheck();
    showCheck();
    if (!check.ok) { play('bump'); return; }
    window.open(publishUrl(room, encodeRoom(room), check.par), '_blank', 'noopener');
    $('#bld-check').className = 'bld-check ok';
    $('#bld-check').textContent = '🌍 GitHub öffnet sich: dort auf „Submit new issue“ klicken – dann steht dein Raum im Community-Tab (bis zu 5 Minuten Verzögerung).';
  });
  $('#bld-new').addEventListener('click', () => { room = { ...starterRoom(), grid: blankGrid(11, 7) }; room.grid[3 * 11 + 2] = { ch: '@' }; syncFields(); changed(); });

  // ---------- Zeichnen (wie im Spiel, plus Rasterlinien zum Bauen) ----------
  let running = true;
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!pix || !level || !canvas.getClientRects().length) return;
    const img = pix.draw(t, { tr, theme: PIXEL_THEMES[room.theme] || PIXEL_THEMES.default, blocks: createPushState(level).blocks, player: { ...level.start.player, dir: 2, walk: null, push: 0, stamina: 1 }, enemies: [], grow: Infinity });
    const dpr = devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const v = pix.view;
    const scale = Math.max(1, Math.floor(Math.min(cw / v.w, ch / v.h)));
    const dx = Math.floor((cw - v.w * scale) / 2) - v.x * scale, dy = Math.floor((ch - v.h * scale) / 2) - v.y * scale;
    view = { scale, dx, dy };
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#120b06'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
    // Rasterlinien über dem Raum
    ctx.strokeStyle = 'rgba(255, 240, 210, 0.16)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = dx + pix.ox * scale, y0 = dy + pix.oy * scale, s = T * scale;
    for (let x = 0; x <= room.w; x++) { ctx.moveTo(x0 + x * s + 0.5, y0); ctx.lineTo(x0 + x * s + 0.5, y0 + room.h * s); }
    for (let y = 0; y <= room.h; y++) { ctx.moveTo(x0, y0 + y * s + 0.5); ctx.lineTo(x0 + room.w * s, y0 + y * s + 0.5); }
    ctx.stroke();
  }

  syncFields(); showOpts(); changed(); renderSaves();
  requestAnimationFrame(frame);
  return () => { running = false; };
}
