// Kampflevel am Ende jeder Welt: zwei Gegnerwellen, dann der Boss der Welt. Läuft in Echtzeit auf dem
// Raster: Gegner holen sichtbar aus, Boss-Angriffe markieren vorher ihre Felder rot – ausweichen ist alles.
import { parsePushLevel, createPushState, pushTrace } from '../game/push.js';
import { DIRS } from '../game/engine.js';
import { PixelRenderer, PIXEL_THEMES, T } from '../game/pixelRender.js';
import { CHAPTERS, PUSH_LEVELS } from '../game/pushLevels.js';
import { WORLDS } from '../game/worlds.js';
import { addCoins, getInv, hat } from '../game/inventory.js';
import { getSettings, updateSettings } from '../settings.js';
import { markFound } from '../game/inventory.js';
import { addSpins } from '../game/skins.js';
import { spellSlots, spellOf, spellStats, manaMax, manaRegen, magicColor, hasMagic, foeOf, worldOf, stat, partOf, swordSkin, bossBeaten, markBoss } from '../game/combat.js';
import { drawMinion, drawBoss } from '../game/monsters.js';
import { play, bossSound } from '../game/sound.js';
import { FX, hitstop, stopped, flash as fxFlash, sparks as sparksFx, ring as ringFx, bolt as boltFx, drawFx } from '../game/fx.js';
import { setMusic } from '../game/music.js';
import { addSpellFx, drawSpellFx, clearSpellFx } from '../game/spellFx.js';
import { prefersReducedMotion } from '../settings.js';
import { transitionTo } from '../ui/transition.js';
import { icon } from '../ui/icons.js';

let ROWS = [],
  BASE = ['###################', '#.................#', '#.................#', '#...#.........#...#', '#.................#', '#.................#', '#.................#', '#.................#', '#.................#', '#...#.........#...#', '#.................#', '#.................#', '###################'];
ROWS = BASE;
const RS = 2; // Räume werden mit doppelter Feinheit gezeichnet
const W = 19, H = 13;
// Endlos-Modus: jeder Raum ein neuer Grundriss mit Möbeln als Deckung; Trupp und Herzen laufen mit
const RUN = { hp: 0, army: 0 };
function genRows(depth) {
  const g = BASE.map((r, y) => [...(y && y < H - 1 ? `#${'.'.repeat(W - 2)}#` : r)]);
  let s = depth * 7919 + 13;
  const rnd = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 16) % n; };
  for (let k = 0; k < 9; k++) { const x = 3 + rnd(13), y = 1 + rnd(11), wide = rnd(2); if (y !== 4 && y !== 6) { g[y][x] = '#'; if (wide) g[y][x + 1] = '#'; } }
  return g.map((r) => r.join(''));
}
const STEP_MS = 135, SWING_MS = 450, MAGIC_MS = 8000, MODES = ['Rundumschlag', 'Stoß', 'Magie'], SAFE_MS = 950;
const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
// Zauber wie in League of Legends auf vier Tasten; W gehört zum Laufen, darum Q E R und F (oder 1–4)
const CAST = { q: 0, e: 1, r: 2, f: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
const CAST_KEYS = 'QERF';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let wall = (x, y) => ROWS[y]?.[x] !== '.';

export function mountArena(root, params) {
  const endless = params[0] === 'endlos', depth = endless ? Math.max(1, parseInt(params[1] || '1', 10)) : 0;
  ROWS = endless ? genRows(depth) : BASE;
  const ci = endless ? depth % CHAPTERS.length : Math.max(0, Math.min(CHAPTERS.length - 1, parseInt(params[0] || '0', 10) || 0));
  const world = worldOf(ci), foe = foeOf(world), theme = PIXEL_THEMES[world] || PIXEL_THEMES.default;
  const touch = matchMedia('(pointer: coarse)').matches;
  // Licht-Boss (Krabbenkönig Klack): zwei Fackeln in der Wand, zwei Drehspiegel – nur Licht trifft ihn
  // Licht-Bosse: Klack (Strand) nur mit Licht verwundbar; Hanami (Kirschblüte) je Phase nur mit einer Farbe
  const LIGHT_ARENAS = {
    beach: { rows: (r, y) => (y === 2 ? `a${r.slice(1, 5)}m${r.slice(6)}` : y === 10 ? `${r.slice(0, 13)}m${r.slice(14, -1)}b` : r), need: () => 7, hint: ['PANZER SPIEGELT', 'LENK DAS LICHT AUF KLACK'] },
    // weiße Fackel → Prisma: Rot nach oben, Grün geradeaus, Blau nach unten; Spiegel lenken Rot und Blau quer durch den Raum
    cherry: { rows: (r, y) => (y === 6 ? `c..P${r.slice(4)}` : y === 2 ? `${r.slice(0, 3)}m${r.slice(4, 12)}m${r.slice(13)}` : y === 10 ? `${r.slice(0, 3)}n${r.slice(4, 12)}m${r.slice(13)}` : r), need: (stage) => [1, 2, 4][stage - 1] || 1, hint: ['DREI HERZEN', 'NUR DIE RICHTIGE FARBE TRIFFT'] },
    // Rankenschlund (Dschungel): wie Klack, aber Ranken überwuchern Spiegel – das Schwert schneidet sie frei
    jungle: { rows: (r, y) => (y === 2 ? `a${r.slice(1, 5)}m${r.slice(6, 12)}n${r.slice(13)}` : y === 10 ? `${r.slice(0, 6)}n${r.slice(7, 13)}m${r.slice(14, -1)}b` : r), need: () => 7, vines: true, hint: ['RANKEN WUCHERN', 'SCHNEID SIE MIT DEM SCHWERT FREI'] },
    // Kerkermeister Grimbart (Burgverlies): Licht auf seiner Laterne lässt einen Schlüssel fallen; aufgehoben öffnet er die Rüstung fürs Schwert
    castle: { rows: (r, y) => (y === 2 ? `a${r.slice(1, 9)}m${r.slice(10)}` : y === 10 ? `${r.slice(0, 9)}m${r.slice(10, -1)}b` : r), need: () => 7, keys: true, hint: ['RÜSTUNG ZU', 'LEUCHTE AUF SEINE LATERNE'] },
    // Moorhexe Grull (Nebelmoor): Nebelbänke treiben durch die Arena und schlucken das Licht; das Schwert pustet sie weg
    moor: { rows: (r, y) => (y === 2 ? `a${r.slice(1, 5)}m${r.slice(6)}` : y === 10 ? `${r.slice(0, 13)}m${r.slice(14, -1)}b` : r), need: () => 7, fog: true, hint: ['NEBEL SCHLUCKT DAS LICHT', 'PUSTE IHN MIT DEM SCHWERT WEG'] },
    // Eulenfürst Nachtschwinge (Nachtwald): Windstöße schieben alle Spiegel und blasen die Fackeln kurz aus; Spiegel lassen sich zurückschieben
    night: { rows: (r, y) => (y === 2 ? `a${r.slice(1, 6)}m${r.slice(7)}` : y === 10 ? `${r.slice(0, 12)}m${r.slice(13, -1)}b` : r), need: () => 7, wind: true, push: true, hint: ['WINDSTOSS', 'SCHIEB DIE SPIEGEL ZURÜCK'] },
  };
  const LA = !endless && params[1] !== 'mini' ? LIGHT_ARENAS[world] : null, lightBoss = !!LA;
  let key = null; // Schlüssel, den Grimbart fallen lässt
  const rows = ROWS.map((r, y) => (y === 4 ? `#@${r.slice(2)}` : r)).map((r, y) => (!lightBoss ? r : LA.rows(r, y)));
  const level = parsePushLevel({ id: `arena-${ci}`, name: foe.boss, legend: { a: { type: 'emitter', dir: 'E', color: 'R' }, b: { type: 'emitter', dir: 'W', color: 'R' }, c: { type: 'emitter', dir: 'E', color: 'W' } }, rows });
  let room = createPushState(level), tr = pushTrace(room);
  const mirrorAt = (x, y) => room.blocks.findIndex((b) => b.x === x && b.y === y && !b.fog);
  let darkUntil = 0; // Windstoß hat die Fackeln ausgeblasen
  const relight = () => { room = { ...room, player: { ...room.player, x: hero.x, y: hero.y } }; tr = pushTrace(room); if (performance.now() < darkUntil) tr = { ...tr, beams: [], visited: new Set() }; };
  const pix = new PixelRenderer(level, { rs: RS });
  const damage = stat('sword') + partOf('blade').v, swingMs = SWING_MS * partOf('guard').v, magicBonus = partOf('grip').v + stat('magic'), slots = spellSlots(), modes = MODES.slice(0, 2) /* Zauber liegen jetzt auf Q W E R */, ready = {}, help = !!getSettings().bossHelp, maxHp = stat('armor') + (help ? 2 : 0), reach = stat('reach'), skin = swordSkin();
  // Am Handy (Wischen) sind die Gegnerwellen leichter: weniger Treffer nötig, langsamer, längeres Ausholen
  const minionHp = touch ? 1 + Math.floor(ci / 6) : 1 + Math.floor(ci / 4), minionMs = Math.round(Math.max(340, 620 - ci * 26) * (touch ? 1.3 : 1)), windMs = touch ? 700 : 430;
  const mini = endless ? depth % 5 === 0 : params[1] === 'mini', bossHp = mini ? 10 + ci * 3 : 30 + ci * 8; // Miniboss: kurzer Kampf ohne Ultra

  document.body.classList.add('ingame');
  document.body.dataset.world = world;
  setMusic(world);
  root.innerHTML = `
    <section class="adv-full pixel-ui arena${touch ? ' touch' : ''}">
      <canvas id="board" class="pixel-canvas" tabindex="0" aria-label="Kampf. WASD oder Pfeiltasten laufen, Leertaste oder Klick schlägt, Q E R F zaubern."></canvas>
      <div class="ihud ihud-tl pixel"><div class="ihud-world">${esc(WORLDS[world]?.name || '')}</div><div class="ihud-room" id="wave">WELLE 1/2</div></div>
      <div class="ar-hearts" id="hearts" role="img"></div><div class="ar-mode pixel" id="mode"></div>
      <div class="ar-boss" id="bossbar" hidden><span>${mini ? `Wächter: ${esc(foe.critter)}` : esc(foe.boss)}</span><i><b id="bosshp"></b></i></div>
      <div class="ihud ihud-tr"><button class="ibtn" id="pause" title="Pause (Esc)" aria-label="Pause">${icon('pause')}</button></div>
      <div class="ar-banner pixel" id="banner" hidden></div>
      <div class="pause" id="panel" hidden role="dialog"><div class="pause-card pixel-card" id="panel-card"></div></div>
      <div class="ar-spells" id="spells"></div>
      ${touch ? `<div class="dpad" aria-hidden="true"><button data-d="0">▲</button><button data-d="3">◀</button><button data-d="2">▼</button><button data-d="1">▶</button><i class="dpad-hub"></i></div>
      <button class="tpad-rot" id="tpad-hit" aria-label="Schlagen">${icon('sword')}<small>SCHLAG</small></button>` : ''}
    </section>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('#board'), ctx = canvas.getContext('2d');

  let mana = manaMax(), manaT = 0, shield = 0, sunUntil = 0;
  let allies = [], dying = 0, checkpoint = 0, mode = 0, magicAt = 0, shots = [], hero, mobs, boss, tele, phase, held, paused, running = true, shake = 0, view = null, sparks;
  const reduced = prefersReducedMotion();

  function spawnMobs(n) {
    const spots = [[17, 1], [17, 11], [9, 1], [9, 11], [17, 6], [12, 6]];
    for (let k = 0; k < n; k++) {
      const [x, y] = spots[k % spots.length];
      if (!wall(x, y) && !(mobs.some((m) => m.x === x && m.y === y) || (hero.x === x && hero.y === y))) mobs.push({ x, y, hp: minionHp, next: performance.now() + 500 + k * 120, wind: 0, hit: 0, struck: -1e9 });
    }
  }
  function start() {
    key = null;
    allies = Array.from({ length: endless ? RUN.army : 0 }, (_, i) => ({ x: 1, y: i % 2 ? 5 : 3, next: 0, hitAt: 0 }));
    hero = { x: 1, y: 4, dir: 1, hp: endless && RUN.hp ? RUN.hp : maxHp, safe: 0, next: 0, swing: 0, moved: 0 };
    mobs = []; tele = []; shots = []; sparks = []; boss = null; phase = 1;
    setMusic(world); held = null; paused = false;
    if (checkpoint) phase = 2; // Neustart direkt beim Boss an der erreichten Phase
    else spawnMobs(endless ? Math.min(6, 2 + Math.ceil(depth / 2)) : touch ? 2 : 3);
    $('#wave').textContent = 'WELLE 1/2'; $('#bossbar').hidden = true; $('#panel').hidden = true;
    showHearts(); showMode();
    canvas.focus();
  }
  function showMode() {
    const left = mode >= 2 ? Math.ceil(Math.max(0, (ready[slots[mode - 2]] || 0) - performance.now()) / 1000) : 0;
    $('#mode').textContent = modes[mode] + (left ? ` ${left}s` : '');
  }
  function showHearts() {
    $('#hearts').innerHTML = Array.from({ length: maxHp }, (_, i) => `<span class="${i < hero.hp ? 'on' : ''}">${icon('heart')}</span>`).join('');
    $('#hearts').setAttribute('aria-label', `${hero.hp} von ${maxHp} Herzen`);
  }
  const bossCells = () => (boss ? [[boss.x, boss.y], [boss.x + 1, boss.y], [boss.x, boss.y + 1], [boss.x + 1, boss.y + 1]] : []);
  const blocked = (x, y) => wall(x, y) || mirrorAt(x, y) >= 0 || mobs.some((m) => m.x === x && m.y === y) || bossCells().some(([a, b]) => a === x && b === y);

  function hurt(now, n = 1) {
    if (now < hero.safe || phase === 0) return;
    if (shield > 0) { shield--; hero.safe = now + SAFE_MS; ringFx(hero.x, hero.y, '#9ff6ff'); play('rotate'); return; }
    hero.hp -= n; hero.safe = now + SAFE_MS; shake = now + 220;
    play('bump'); navigator.vibrate?.(60);
    showHearts();
    if (hero.hp <= 0) lose();
  }
  function move(d, now) {
    hero.dir = d;
    const [dx, dy] = DIRS[d], x = hero.x + dx, y = hero.y + dy;
    hero.next = now + STEP_MS;
    if (LA?.push) { const bi = mirrorAt(x, y); if (bi >= 0 && !blocked(x + dx, y + dy) && !(bossCells().some(([a, b]) => a === x + dx && b === y + dy))) { room = { ...room, blocks: room.blocks.map((b, i) => (i === bi ? { ...b, x: x + dx, y: y + dy } : b)) }; play('push'); } }
    if (blocked(x, y)) return;
    hero.fromX = hero.x; hero.fromY = hero.y; hero.x = x; hero.y = y; hero.moved = now;
    if (lightBoss) relight();
  }
  // ---------- Magie: Mana + Abklingzeit, vier Plätze ----------
  const castSlots = slots;
  function showSpells(now = performance.now()) {
    const el = $('#spells'); if (!el) return;
    if (!hasMagic()) { el.hidden = true; return; }
    el.innerHTML = `<div class="ar-mana"><b style="width:${(mana / manaMax()) * 100}%"></b></div>` + castSlots.map((id, i) => {
      const st = spellStats(id), left = Math.max(0, (ready[id] || 0) - now), k = left / st.cd;
      return `<div class="ar-spell${st.ult ? ' ult' : ''}${mana < st.mana ? ' low' : ''}" data-cast="${i}">${touch ? '' : `<kbd>${CAST_KEYS[i]}</kbd>`}<small>${esc(touch ? st.name.slice(0, 6) : st.name)}</small>${left ? `<i style="height:${k * 100}%"></i>` : ''}${left && touch ? `<em>${Math.ceil(left / 1000)}</em>` : ''}</div>`;
    }).join('');
  }
  function cast(i) {
    const now = performance.now();
    if (paused || phase === 0 || !hasMagic()) return;
    const st = spellStats(castSlots[i]);
    if (now < (ready[st.id] || 0)) { play('bump'); return; }
    if (mana < st.mana) { play('bump'); banner('ZU WENIG MANA', `${st.name} braucht ${st.mana}`); return; }
    mana -= st.mana; ready[st.id] = now + (now < sunUntil ? st.cd / 2 : st.cd);
    const c = magicColor().color, pow = st.power + magicBonus;
    shake = now + 200; bossSound('slam'); sparksFx(hero.x, hero.y, c);
    const hurtBoss = (n) => { if (!boss || lightBoss) return; addSpellFx('num', { x: boss.x + 0.5, y: boss.y, n, color: '#ff7a2a' }); boss.hp = Math.max(0, boss.hp - n); boss.hit = now; $('#bosshp').style.width = `${(boss.hp / bossHp) * 100}%`; if (boss.hp <= 0) finisher(); else nextStage(now); };
    const zap = (m, n) => { addSpellFx('num', { x: m.x, y: m.y, n }); m.hp -= n; m.hit = now; if (now < sunUntil) mana = Math.min(manaMax(), mana + 8); if (m.hp <= 0) { mobs.splice(mobs.indexOf(m), 1); sparks.push({ x: m.x, y: m.y, t0: now }); } };
    const near = (x, y, r) => Math.max(Math.abs(x - hero.x), Math.abs(y - hero.y)) <= r;
    const bossNear = (r) => boss && bossCells().some(([a, b]) => near(a, b, r));
    hitstop(st.ult ? 140 : 60, now);
    const fxOn = { nova: () => addSpellFx('nova', { x: hero.x, y: hero.y }), schild: () => addSpellFx('schild', { x: hero.x, y: hero.y, dur: 600000, charges: () => shield }), heil: () => addSpellFx('heil', { x: hero.x, y: hero.y }), sonne: () => addSpellFx('sonne', { x: hero.x, y: hero.y }) };
    fxOn[st.id]?.();
    if (st.id === 'nova') { for (let k = 0; k < 3; k++) ringFx(hero.x, hero.y, c, now + k * 120); [...mobs].filter((m) => near(m.x, m.y, 3)).forEach((m) => zap(m, pow)); if (bossNear(3)) hurtBoss(pow); }
    if (st.id === 'blitz') { const list = [...mobs].sort((p, q) => Math.hypot(p.x - hero.x, p.y - hero.y) - Math.hypot(q.x - hero.x, q.y - hero.y)).slice(0, 3); addSpellFx('blitz', { x: hero.x, y: hero.y, pts: list.length ? list.map((m) => [m.x, m.y]) : boss ? [[boss.x + 0.5, boss.y + 0.5]] : [] }); list.forEach((m) => zap(m, pow)); if (!list.length && boss) hurtBoss(pow * 2); }
    if (st.id === 'lanze') { const [dx, dy] = DIRS[hero.dir]; let len = 0; for (let x = hero.x + dx, y = hero.y + dy; !wall(x, y); x += dx, y += dy) len++; addSpellFx('lanze', { x: hero.x, y: hero.y, dir: [dx, dy], len: len + 0.5 }); shake = now + 260; for (let x = hero.x + dx, y = hero.y + dy; !wall(x, y); x += dx, y += dy) { for (const m of [...mobs]) if (m.x === x && m.y === y) zap(m, pow); if (boss && bossCells().some(([a, b]) => a === x && b === y)) hurtBoss(pow); } }
    if (st.id === 'frost') { addSpellFx('frost', { x: hero.x, y: hero.y, pts: [...mobs.map((m) => [m.x, m.y]), ...bossCells()] }); const ms = 1500 + st.power * 1000; for (const m of mobs) { m.next = now + ms; m.wind = 0; } if (boss) { boss.next += ms; boss.walk += ms; } }
    if (st.id === 'schild') { shield = Math.round(st.power); ringFx(hero.x, hero.y, '#9ff6ff'); }
    if (st.id === 'heil') { hero.hp = Math.min(maxHp, hero.hp + Math.max(1, Math.floor(st.power))); showHearts(); }
    if (st.id === 'sprung') { const from = [hero.x, hero.y], [dx, dy] = DIRS[hero.dir]; let n = 0; while (n < Math.floor(st.power) && !blocked(hero.x + dx, hero.y + dy)) { hero.x += dx; hero.y += dy; n++; } hero.moved = 0; if (lightBoss) relight(); addSpellFx('sprung', { x: hero.x, y: hero.y, from }); }
    if (st.id === 'meteor') { banner('STERNENFALL', 'GLEICH SCHLÄGT ES EIN'); addSpellFx('meteor', { x: 9, y: 6, room: { cx: (W * T) / 2, cy: (H * T) / 2, x0: 0, y0: 0, w: W * T, h: H * T } }); setTimeout(() => { if (!running || phase === 0) return; fxFlash(performance.now()); [...mobs].forEach((m) => zap(m, pow * 2)); hurtBoss(pow * 2); shake = performance.now() + 500; }, 1100); }
    if (st.id === 'sonne') { sunUntil = now + 6000; banner('ZWEITE SONNE', 'TREFFER LADEN MANA'); }
    showSpells(now);
  }
  function swing() {
    const now = performance.now();
    if (paused || phase === 0) return;
    if (mode >= 2) { // Zauber aus dem Platz
      const sp = spellOf(slots[mode - 2]);
      if (now < (ready[sp.id] || 0)) return;
      ready[sp.id] = now + sp.cd; shake = now + 240; bossSound('slam');
      const c = magicColor().color; sparksFx(hero.x, hero.y, c); ringFx(hero.x, hero.y, c);
      const hurtBoss = (n) => { if (!boss) return; boss.hp = Math.max(0, boss.hp - n); boss.hit = now; $('#bosshp').style.width = `${(boss.hp / bossHp) * 100}%`; if (boss.hp <= 0) finisher(); else nextStage(now); };
      const zap = (m, n) => { m.hp -= n; m.hit = now; if (m.hp <= 0) { mobs.splice(mobs.indexOf(m), 1); sparks.push({ x: m.x, y: m.y, t0: now }); } };
      if (sp.id === 'nova') { for (let k = 0; k < 3; k++) ringFx(hero.x, hero.y, c, now + k * 120); [...mobs].forEach((m) => zap(m, damage + 1 + magicBonus)); hurtBoss((damage + magicBonus) * 2); }
      if (sp.id === 'blitz') { const m = [...mobs].sort((p, q) => Math.hypot(p.x - hero.x, p.y - hero.y) - Math.hypot(q.x - hero.x, q.y - hero.y))[0]; if (m) { boltFx(m.x, m.y, c, now); zap(m, (damage + magicBonus) * 3); } else if (boss) { boltFx(boss.x, boss.y, c, now); hurtBoss((damage + magicBonus) * 3); } }
      if (sp.id === 'frost') { for (const m of mobs) { m.next = now + 2500; m.wind = 0; } if (boss) { boss.next += 1800; boss.walk += 1800; } }
      if (sp.id === 'heil') { hero.hp = Math.min(maxHp, hero.hp + 1); showHearts(); }
      showMode(); return;
    }
    if (now < hero.swing + swingMs) return;
    if (lightBoss) { // vor einem Spiegel: Schlag dreht ihn statt zuzuschlagen
      const [fx, fy] = DIRS[hero.dir], bi = mirrorAt(hero.x + fx, hero.y + fy);
      if (bi >= 0 && room.blocks[bi].vine) { room = { ...room, blocks: room.blocks.map((b, i) => (i === bi ? { ...b, kind: 'mirror', vine: false } : b)) }; relight(); hero.swing = now; play('swipe'); sparksFx(hero.x + fx, hero.y + fy, '#6cb455', now); return; }
      if (bi >= 0 && room.blocks[bi].orient) { room = { ...room, blocks: room.blocks.map((b, i) => (i === bi ? { ...b, orient: b.orient === '/' ? '\\' : '/' } : b)) }; relight(); hero.swing = now; play('rotate'); return; }
    }
    hero.swing = now; play('swipe');
    if (LA?.fog && room.blocks.some((b) => b.fog && Math.max(Math.abs(b.x - hero.x), Math.abs(b.y - hero.y)) <= reach + 1)) {
      room = { ...room, blocks: room.blocks.filter((b) => !(b.fog && Math.max(Math.abs(b.x - hero.x), Math.abs(b.y - hero.y)) <= reach + 1)) }; relight(); sparksFx(hero.x, hero.y, '#b8c4b4', now);
    }
    // Rundumschlag: trifft alles im Kreis um den Helden
    let hitBoss = false;
    for (let y = hero.y - reach; y <= hero.y + reach; y++) for (let x = hero.x - reach; x <= hero.x + reach; x++) {
      if (wall(x, y) || (x === hero.x && y === hero.y)) continue;
      if (mode === 1) { const [fx, fy] = DIRS[hero.dir], d = (x - hero.x) * fx + (y - hero.y) * fy; if (d < 1 || (x - hero.x) * fy !== 0 || (y - hero.y) * fx !== 0) continue; } // Stoß: nur nach vorn
      const dx = Math.sign(x - hero.x), dy = Math.sign(y - hero.y);
      for (const m of [...mobs]) if (m.x === x && m.y === y) {
        m.hp -= damage; m.hit = now; play('target', 3);
        if (m.hp <= 0) { mobs.splice(mobs.indexOf(m), 1); sparks.push({ x, y, t0: now }); } else if (!blocked(x + dx, y + dy)) { m.x += dx; m.y += dy; m.wind = 0; m.next = now + 500; }
      }
      if (!hitBoss && bossCells().some(([a, b]) => a === x && b === y)) hitBoss = true;
    }
    if (hitBoss && LA?.keys && now < (boss.vulnUntil || 0)) { /* Rüstung offen: Treffer zählt */ }
    else if (hitBoss && lightBoss) { sparksFx(boss.x + 0.5, boss.y + 0.5, '#c8c8d0', now); play('bump'); if (!boss.told) { boss.told = 1; banner(...LA.hint); } hitBoss = false; }
    if (hitBoss && !mini && now > boss.openUntil && !(LA?.keys && now < (boss.vulnUntil || 0))) { // Panzer zu: Treffer prallt ab
      boss.hit = 0; sparksFx(boss.x + 0.5, boss.y + 0.5, '#c8c8d0', now); play('bump'); hitBoss = false;
    }
    if (hitBoss) {
      const dmg = LA?.keys && now < (boss.vulnUntil || 0) ? damage * 3 + 1 : damage; // offene Rüstung: dreifacher Schaden
      boss.hp = Math.max(0, boss.hp - dmg); boss.hit = now; play('target', 6); addSpellFx('num', { x: boss.x + 0.5, y: boss.y, n: dmg, color: '#ff7a2a' });
      $('#bosshp').style.width = `${(boss.hp / bossHp) * 100}%`;
      if (boss.hp <= 0) finisher(); else nextStage(now);
    }
  }

  // ---------- Boss-Angriffe: tele = rote Felder, die nach at Schaden machen ----------
  const inner = (fn) => { const out = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!wall(x, y) && fn(x, y)) out.push([x, y]); return out; };
  const hop = (now) => (boss?.jump ? Math.sin(Math.min(1, (now - boss.jump) / 1500) * Math.PI) * 40 : 0);
  function attack(now) {
    if (now >= boss.ultra) { // Ultra: Boss springt hoch und landet dort, wo du gerade stehst
      const x = Math.min(W - 3, Math.max(1, hero.x)), y = Math.min(H - 3, Math.max(1, hero.y));
      boss.jump = now; boss.ultra = now + 9000 - ci * 200; boss.next = now + 2600; bossSound('roar');
      tele.push({ cells: inner((a, b) => Math.abs(a - x - 0.5) <= 2 && Math.abs(b - y - 0.5) <= 2), at: now + 1500, dmg: 2, then: () => { boss.x = x; boss.y = y; boss.jump = 0; } });
      return;
    }
    const angry = boss.hp <= bossHp / 2, wind = ((angry ? 700 : 900) - ci * 12 - (boss.stage - 1) * 90) * (help ? 1.3 : 1);
    const name = foe.moves[boss.turn++ % foe.moves.length];
    if (name !== 'shots') bossSound(name === 'summon' ? 'roar' : 'charge');
    const cx = boss.x + 0.5, cy = boss.y + 0.5;
    if (name === 'cross') tele.push({ cells: inner((x, y) => x === hero.x || y === hero.y), at: now + wind });
    if (name === 'ring') tele.push({ cells: inner((x, y) => { const q = Math.max(Math.abs(x - cx), Math.abs(y - cy)); return q >= 1.5 && q < (angry ? 4.5 : 3.5); }), at: now + wind });
    if (name === 'shots') { // Geschosse fliegen sternförmig aus dem Boss, die Lücken dazwischen sind sicher
      bossSound('charge');
      const off = boss.turn % 2 ? 0 : Math.PI / 8, n = angry ? 12 : 8;
      for (let k = 0; k < n; k++) { const a = off + (k * Math.PI * 2) / n; shots.push({ x: cx, y: cy, dx: Math.cos(a), dy: Math.sin(a), at: now + wind * 0.7 }); }
    }
    if (name === 'rain') { const n = 10 + (angry ? 6 : 0) + ci; const free = inner(() => true).sort(() => Math.random() - 0.5).slice(0, n); tele.push({ cells: [...free, [hero.x, hero.y]], at: now + wind }); }
    if (name === 'sweep') {
      const gap = 1 + Math.floor(Math.random() * (H - 3)); // zwei freie Reihen zum Durchschlüpfen
      for (let x = W - 2; x >= 1; x--) tele.push({ cells: inner((a, y) => a === x && y !== gap && y !== gap + 1), at: now + wind + (W - 2 - x) * 130 });
    }
    if (name === 'charge') {
      const y = Math.min(H - 3, Math.max(1, hero.y)), x = hero.x < boss.x ? 1 : W - 3;
      tele.push({ cells: inner((a, b) => (b === y || b === y + 1)), at: now + wind, then: () => { boss.x = x; boss.y = y; } });
    }
    if (name === 'summon') { if (mobs.length < 3) spawnMobs(2); else tele.push({ cells: inner((x, y) => x === hero.x || y === hero.y), at: now + wind }); }
    boss.next = now + wind + (angry ? 1000 : 1500);
    boss.openUntil = now + wind + 1100; // nach dem Angriff liegt der Schwachpunkt kurz frei
    boss.openAt = now + wind;
  }

  function update(now) {
    if (manaT) mana = Math.min(manaMax(), mana + ((now - manaT) / 1000) * manaRegen()); manaT = now;
    if (Math.floor(now / 100) !== Math.floor((now - 16) / 100)) showSpells(now);
    if (held != null && now >= hero.next) move(held, now);
    for (const m of mobs) {
      const near = Math.abs(m.x - hero.x) + Math.abs(m.y - hero.y) === 1;
      if (m.wind) {
        if (now >= m.wind) { m.wind = 0; m.struck = now; m.next = now + minionMs; if (near) hurt(now); }
      } else if (now >= m.next) {
        m.next = now + minionMs;
        if (near) { m.wind = now + windMs; continue; }
        const dx = Math.sign(hero.x - m.x), dy = Math.sign(hero.y - m.y);
        const tries = Math.abs(hero.x - m.x) >= Math.abs(hero.y - m.y) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
        for (const [a, b] of tries) {
          const x = m.x + a, y = m.y + b;
          if ((a || b) && !blocked(x, y) && !(x === hero.x && y === hero.y)) { m.x = x; m.y = y; break; }
        }
      }
    }
    for (const a of allies) { // Trupp: läuft zum nächsten Gegner und schlägt zu
      if (now < a.next || !mobs.length) continue;
      a.next = now + 420;
      const m = [...mobs].sort((p, q) => Math.abs(p.x - a.x) + Math.abs(p.y - a.y) - Math.abs(q.x - a.x) - Math.abs(q.y - a.y))[0];
      if (Math.abs(m.x - a.x) + Math.abs(m.y - a.y) === 1) { a.hitAt = now; m.hp -= 1; m.hit = now; if (m.hp <= 0) { mobs.splice(mobs.indexOf(m), 1); sparks.push({ x: m.x, y: m.y, t0: now }); } continue; }
      const dx = Math.sign(m.x - a.x), dy = Math.sign(m.y - a.y);
      if (dx && !blocked(a.x + dx, a.y)) a.x += dx; else if (dy && !blocked(a.x, a.y + dy)) a.y += dy;
    }
    for (let i = tele.length - 1; i >= 0; i--) if (now >= tele[i].at) {
      const z = tele.splice(i, 1)[0];
      z.then?.();
      bossSound('slam'); shake = now + 160;
      if (z.cells.some(([x, y]) => x === hero.x && y === hero.y)) hurt(now, z.dmg || 1);
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      if (now < p.at) continue;
      if (!p.fired) { p.fired = true; p.last = now; bossSound('shot'); }
      const d = ((now - p.last) / 1000) * (5 + ci * 0.25); p.last = now;
      p.x += p.dx * d; p.y += p.dy * d;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x === hero.x && y === hero.y) { hurt(now); shots.splice(i, 1); } else if (x < 0 || y < 0 || x >= W || y >= H || wall(x, y)) shots.splice(i, 1);
    }
    if (phase === 0) return;
    if (boss && LA?.wind) {
      boss.windAt ??= now + 5000;
      if (!boss.gust && now >= boss.windAt - 1500) { boss.gust = { d: [1, 3, 0, 2][Math.floor(Math.random() * 4)], at: boss.windAt }; bossSound('charge'); banner('WINDSTOSS', ['NACH OBEN', 'NACH RECHTS', 'NACH UNTEN', 'NACH LINKS'][boss.gust.d]); }
      if (boss.gust && now >= boss.gust.at) {
        const [dx, dy] = DIRS[boss.gust.d];
        room = { ...room, blocks: room.blocks.map((b) => { const nx = b.x + dx, ny = b.y + dy; const busy = wall(nx, ny) || room.blocks.some((q) => q !== b && q.x === nx && q.y === ny) || (nx === hero.x && ny === hero.y) || bossCells().some(([a, c]) => a === nx && c === ny); return busy ? b : { ...b, x: nx, y: ny }; }) };
        darkUntil = now + 2500; relight(); setTimeout(() => { if (running) relight(); }, 2550);
        shake = now + 300; bossSound('roar'); boss.gust = null; boss.windAt = now + [8000, 6500, 5000][boss.stage - 1];
      }
    }
    if (boss && LA?.fog) {
      boss.fogAt ??= now + 3000; boss.driftAt ??= now + 1500;
      if (now >= boss.fogAt) { // neue Nebelbank: drei Felder senkrecht auf einer Lichtbahn
        boss.fogAt = now + [6500, 5000, 3600][boss.stage - 1];
        const x = 3 + Math.floor(Math.random() * 6), rowsY = Math.random() < 0.5 ? [1, 2, 3] : [9, 10, 11];
        const add = rowsY.filter((y) => !wall(x, y) && mirrorAt(x, y) < 0 && !(x === hero.x && y === hero.y)).map((y) => ({ x, y, kind: 'stone', fog: true }));
        room = { ...room, blocks: [...room.blocks, ...add] }; relight(); bossSound('charge');
      }
      if (now >= boss.driftAt) { // Nebel treibt ein Feld weiter, an Wänden und Spiegeln löst er sich auf
        boss.driftAt = now + 1500;
        room = { ...room, blocks: room.blocks.flatMap((b) => { if (!b.fog) return [b]; const nx = b.x + 1; return wall(nx, b.y) || mirrorAt(nx, b.y) >= 0 ? [] : [{ ...b, x: nx }]; }) }; relight();
      }
    }
    if (boss && LA?.vines && !boss.jump) {
      boss.vineAt ??= now + 4000;
      if (now >= boss.vineAt) {
        boss.vineAt = now + [7000, 5200, 3800][boss.stage - 1];
        const free = room.blocks.map((b, i) => [b, i]).filter(([b]) => b.kind === 'mirror');
        const lit = free.filter(([b]) => tr.visited.has(b.y * W + b.x) || tr.beams.some((bm) => bm.points.some(([x, y]) => Math.floor(x) === b.x && Math.floor(y) === b.y)));
        const pick = (lit.length ? lit : free)[Math.floor(Math.random() * (lit.length || free.length))];
        if (pick) { room = { ...room, blocks: room.blocks.map((b, i) => (i === pick[1] ? { ...b, kind: 'stone', vine: true } : b)) }; relight(); bossSound('charge'); sparksFx(pick[0].x, pick[0].y, '#3f8a2e', now); }
      }
    }
    if (key && hero.x === key.x && hero.y === key.y && boss) {
      key = null; boss.vulnUntil = now + 4000; boss.openUntil = now + 4000; play('target', 7); banner('RÜSTUNG OFFEN', 'JETZT ZUSCHLAGEN!'); ringFx(hero.x, hero.y, '#ffd166');
    }
    if (boss && lightBoss) { // Licht auf dem Panzer lädt auf: 0,35 s Kontakt ist ein Treffer
      const need = LA.need(boss.stage), cells = new Set(bossCells().map(([a, b]) => b * W + a));
      let got = 0;
      for (const bm of tr.beams) for (let i = 1; i < bm.points.length; i++) { const [x0, y0] = bm.points[i - 1], [x1, y1] = bm.points[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); for (let k = 0; k <= n; k++) { const x = Math.floor(x0 + ((x1 - x0) * k) / n), y = Math.floor(y0 + ((y1 - y0) * k) / n); if (cells.has(y * W + x)) got |= bm.color; } }
      const lit = (got & need) === need || (need === 7 && got > 0);
      boss.wrong = got && !lit ? now : boss.wrong; // falsche Farbe: Herz flackert abweisend
      boss.charge = lit ? (boss.charge || 0) + (now - (boss.lastT || now)) : Math.max(0, (boss.charge || 0) - (now - (boss.lastT || now)) * 2);
      boss.lastT = now;
      if (boss.charge >= 350 && LA.keys) {
        boss.charge = 0;
        if (!key && now >= (boss.vulnUntil || 0)) {
          const spots = inner((x, y) => !blocked(x, y) && Math.abs(x - boss.x) + Math.abs(y - boss.y) > 4 && !(x === hero.x && y === hero.y));
          const k = spots[Math.floor(Math.random() * spots.length)];
          if (k) { key = { x: k[0], y: k[1], t0: now }; play('door'); banner('SCHLÜSSEL!', 'HEB IHN AUF'); sparksFx(boss.x + 0.5, boss.y, '#ffd166', now); }
        }
      }
      if (boss.charge >= 350) {
        boss.charge = 0; boss.hp = Math.max(0, boss.hp - (damage + 2)); boss.hit = now; play('target', 6); shake = now + 200; sparksFx(boss.x + 0.5, boss.y + 0.5, '#ff4d6d', now);
        $('#bosshp').style.width = `${(boss.hp / bossHp) * 100}%`;
        if (boss.hp <= 0) { finisher(); return; } nextStage(now);
      }
    }
    if (boss) {
      if (now >= boss.next) attack(now);
      if (!boss.jump && now >= boss.walk) { // zwischen den Angriffen rückt er nach
        boss.walk = now + (boss.hp <= bossHp / 2 ? 450 : 650);
        const nx = boss.x + Math.sign(hero.x - boss.x), ny = boss.y + Math.sign(hero.y - boss.y);
        const free2 = (x, y) => ![[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].some(([a, b]) => mirrorAt(a, b) >= 0);
        if (nx >= 1 && nx <= W - 3 && free2(nx, boss.y)) boss.x = nx; else if (ny >= 1 && ny <= H - 3 && free2(boss.x, ny)) boss.y = ny;
      }
      if (bossCells().some(([a, b]) => a === hero.x && b === hero.y)) { // vom Ansturm getroffen: zur Seite geschleudert
        hurt(now);
        const free = inner((x, y) => !blocked(x, y)).sort((p, q) => Math.abs(p[0] - hero.x) + Math.abs(p[1] - hero.y) - Math.abs(q[0] - hero.x) - Math.abs(q[1] - hero.y));
        if (free[0]) [hero.x, hero.y] = free[0];
      }
    } else if (!mobs.length) {
      phase++;
      if (endless && !mini) { win(); return; }
      if (phase === 2 && !mini) { spawnMobs(5); $('#wave').textContent = 'WELLE 2/2'; } else {
        boss = { x: 13, y: 5, hp: bossHp, next: now + 1600, turn: 0, hit: 0, openUntil: 0, openAt: 0, stage: 1, walk: now + 2000, ultra: mini ? Infinity : now + 7000, jump: 0 };
        $('#wave').textContent = 'BOSS'; $('#bossbar').hidden = false; $('#bosshp').style.width = '100%';
        setMusic('boss'); bossSound('roar'); shake = now + 500;
        if (checkpoint) { boss.hp = checkpoint; boss.stage = bossHp - checkpoint > bossHp / 2 ? 3 : 2; $('#bosshp').style.width = `${(boss.hp / bossHp) * 100}%`; }
        banner(mini ? 'WÄCHTER' : foe.boss, boss.stage > 1 ? `PHASE ${boss.stage}` : 'BOSSKAMPF'); boss.next = now + 2200; boss.walk = now + 2200;
      }
    }
  }

  function banner(top, sub) { const b = $('#banner'); b.innerHTML = `<small>${esc(sub)}</small><b>${esc(top)}</b>`; b.hidden = false; setTimeout(() => { if (running) b.hidden = true; }, 1800); }
  // Neue Phase bei 2/3 und 1/3 Leben: 2 s Atempause, Angriffe gelöscht, danach schneller; Niederlage startet an dieser Phase
  function nextStage(now) {
    if (mini) return;
    const stage = boss.hp <= bossHp / 3 ? 3 : boss.hp <= (bossHp * 2) / 3 ? 2 : 1;
    if (stage <= boss.stage) return;
    boss.stage = stage; checkpoint = boss.hp; tele = []; shots = []; mobs = [];
    boss.next = now + 2000; boss.walk = now + 2000; hero.safe = now + 2000; shake = now + 400;
    bossSound('roar'); hitstop(FX.hitstopBoss, now); banner(`PHASE ${stage}`, world === 'cherry' && lightBoss ? `JETZT ${['ROT', 'GRÜN', 'BLAU'][stage - 1]}` : stage === 3 ? 'LETZTE KRAFT' : 'DER BOSS WIRD WÜTEND');
  }
  // Finisher: Zeitlupe, Weißblitz, Boss zerfällt in Pixel, dann Sieg
  function finisher() {
    const now = performance.now();
    phase = 0; held = null; tele = []; shots = []; mobs = []; checkpoint = 0; dying = now; hero.safe = now + 9999;
    fxFlash(now); bossSound('roar');
    for (let k = 0; k < 4; k++) setTimeout(() => { if (running && boss) { sparksFx(boss.x + k % 2, boss.y + (k >> 1), foe.colors[0]); bossSound('slam'); } }, 200 + k * 220);
    setTimeout(() => { if (running) { dying = 0; boss = null; win(); } }, 1400);
  }
  function panel(html) { $('#panel-card').innerHTML = html; $('#panel').hidden = false; }
  function lose() {
    if (endless) {
      phase = 0; held = null; tele = []; shots = []; RUN.hp = 0; RUN.army = 0;
      const best = Math.max(getSettings().endlessBest || 0, depth); updateSettings({ endlessBest: best });
      panel(`<h2 class="pixel">GEFALLEN</h2><p class="pause-hint">Raum ${depth} erreicht. Bestleistung: Raum ${best}.</p><a class="btn btn-primary" href="#/arena/endlos/1">Neuer Lauf</a><a class="btn" href="#/menu">Hauptmenü</a>`);
      return;
    }
    phase = 0; held = null; tele = []; shots = [];
    panel(`<h2 class="pixel">BESIEGT</h2><p class="pause-hint">${esc(foe.boss)} war stärker. Verbessere dein Schwert in der Schmiede oder versuche es noch einmal.</p>
      <button class="btn btn-primary" id="p-again">Nochmal</button><a class="btn" href="#/menu/shop">Zur Schmiede</a><a class="btn" href="#/menu/chapter/${ci}">Zur Welt</a>`);
    $('#p-again').addEventListener('click', start); $('#p-again').focus();
  }
  function win() {
    phase = 0; held = null; tele = []; shots = []; mobs = [];
    if (endless) {
      RUN.hp = hero.hp; addCoins(5 + depth); play('exitopen');
      const show = () => {
        const price = 40 + RUN.army * 30;
        panel(`<h2 class="pixel">RAUM ${depth} GESCHAFFT</h2><p class="pause-hint">+${5 + depth} Münzen · Münzen ${getInv().coins} · Trupp ${RUN.army}</p>
          <button class="btn" id="p-buy" ${getInv().coins < price ? 'disabled' : ''}>Soldat anwerben (${price})</button><button class="btn" id="p-heal" ${getInv().coins < 30 || RUN.hp >= maxHp ? 'disabled' : ''}>Herz heilen (30)</button>
          <a class="btn btn-primary" href="#/arena/endlos/${depth + 1}" id="p-next">Nächster Raum</a><a class="btn" href="#/menu">Lauf beenden</a>`);
        $('#p-buy').addEventListener('click', () => { addCoins(-price); RUN.army++; play('target', 7); show(); });
        $('#p-heal').addEventListener('click', () => { addCoins(-30); RUN.hp++; play('target', 2); show(); });
      };
      show(); return;
    }
    setMusic(world);
    if (mini) {
      addCoins(20 + ci * 5); markFound(params[3], 'mini'); play('exitopen');
      panel(`<h2 class="pixel">WÄCHTER BESIEGT!</h2><p class="pause-hint">+${20 + ci * 5} Münzen.</p><a class="btn btn-primary" href="#/adv/${params[2]}" id="p-next">Weiter</a>`);
      $('#p-next').focus(); return;
    }
    const first = !bossBeaten(ci), reward = first ? 60 + ci * 25 : 10;
    addCoins(reward); markBoss(ci); play('exitopen');
    if (first) addSpins(1);
    const nextCh = CHAPTERS[ci + 1];
    const nextIndex = nextCh ? PUSH_LEVELS.findIndex((l) => l.id === nextCh.levels[0]) : -1;
    panel(`<h2 class="pixel">BOSS BESIEGT!</h2><p class="pause-hint">${esc(foe.boss)} ist geschlagen. +${reward} Münzen.</p>
      ${nextCh ? `<a class="btn btn-primary" href="#/adv/${nextIndex}" id="p-next">Nächste Welt</a>` : '<a class="btn btn-primary" href="#/menu" id="p-next">Alle Welten geschafft!</a>'}
      <a class="btn" href="#/menu/shop">Zur Schmiede</a>`);
    const to = nextCh ? worldOf(ci + 1) : null;
    if (nextCh) $('#p-next').addEventListener('click', (e) => {
      e.preventDefault();
      transitionTo(`#/adv/${nextIndex}`, { from: world, to, worldChange: true, label: `RAUM 1 · ${PUSH_LEVELS[nextIndex].name}`, kicker: `WELT ${ci + 2}`, title: WORLDS[to]?.name || nextCh.name });
    });
    $('#p-next').focus();
  }
  function setPaused(on) {
    if (phase === 0) return;
    paused = on; held = null;
    if (on) { pausedAt = performance.now(); panel(`<h2 class="pixel">PAUSE</h2><button class="btn btn-primary" id="p-go">Weiter</button><a class="btn" href="#/menu/chapter/${ci}">Kampf aufgeben</a>`); $('#p-go').addEventListener('click', () => setPaused(false)); $('#p-go').focus(); } else {
      const d = performance.now() - pausedAt; // Zeitmarken verschieben, damit die Pause nichts auslöst
      for (const m of mobs) { m.next += d; if (m.wind) m.wind += d; }
      for (const z of tele) z.at += d;
      for (const p of shots) { p.at += d; if (p.last) p.last += d; }
      if (boss) boss.next += d;
      hero.safe += d;
      $('#panel').hidden = true; canvas.focus();
    }
  }
  let pausedAt = 0;

  // ---------- Eingabe ----------
  function onKeyDown(e) {
    if (e.key === 'Escape') { setPaused(!paused); return; }
    if (paused || phase === 0) return;
    if (e.key === 'Tab') { mode = (mode + 1) % modes.length; showMode(); play('ui'); e.preventDefault(); return; }
    if (e.key.toLowerCase() in CAST && !e.repeat) { cast(CAST[e.key.toLowerCase()]); e.preventDefault(); return; }
    if (e.key in KEYS) { if (!e.repeat) { pressed = [...pressed.filter((d) => d !== KEYS[e.key]), KEYS[e.key]]; held = KEYS[e.key]; hero.next = 0; } e.preventDefault(); } else if (e.key === ' ' || e.key === 'e' || e.key === 'E') { swing(); e.preventDefault(); }
  }
  let pressed = [];
  function onKeyUp(e) { if (e.key in KEYS) { pressed = pressed.filter((d) => d !== KEYS[e.key]); held = pressed.length ? pressed[pressed.length - 1] : null; } }
  addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp);
  $('#pause').addEventListener('click', () => setPaused(true));
  if (touch) {
    root.querySelectorAll('.dpad button').forEach((b) => {
      b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); held = +b.dataset.d; hero.next = 0; });
      const up = () => { held = null; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    $('#tpad-hit').addEventListener('pointerdown', (ev) => { ev.preventDefault(); swing(); });
    let sw = null;
    canvas.addEventListener('touchstart', (ev) => { if (ev.touches.length === 2) { mode = (mode + 1) % modes.length; showMode(); sw = null; } }); // zwei Finger wechseln den Angriff
    canvas.addEventListener('pointerdown', (ev) => { sw = { x: ev.clientX, y: ev.clientY, moved: false }; canvas.setPointerCapture?.(ev.pointerId); });
    canvas.addEventListener('pointermove', (ev) => {
      if (!sw) return;
      const dx = ev.clientX - sw.x, dy = ev.clientY - sw.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      sw.x = ev.clientX; sw.y = ev.clientY; sw.moved = true;
      held = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    });
    const end = (ev) => { if (sw && !sw.moved && ev.type === 'pointerup') swing(); sw = null; held = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  } else canvas.addEventListener('click', swing);

  // ---------- Zeichnen ----------
  function drawSword(g, now) {
    const k = (now - hero.swing) / 240, px = (hero.rx ?? hero.x) * T + 8, py = (hero.ry ?? hero.y) * T + 8;
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    if (k < 1) { // Rundumschlag: die Klinge zieht einen vollen Kreis, die Spur bleibt kurz stehen
      const len = 8 + T * reach;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 - Math.PI / 2;
        if (i / 36 > k) break;
        R(Math.round(px + Math.cos(a) * len) - 2, Math.round(py + Math.sin(a) * len) - 2, 4, 4, i / 36 > k - 0.25 ? skin.edge : `${skin.blade}66`);
      }
      const a = k * Math.PI * 2 - Math.PI / 2;
      for (let d = 4; d < len; d += 2) R(Math.round(px + Math.cos(a) * d) - 1, Math.round(py + Math.sin(a) * d) - 1, 3, 3, d > len - 5 ? skin.edge : skin.blade);
    } else {
      for (let i = 0; i < 10; i++) R(px + 6 - i, py - 7 + i, 2, 2, i < 7 ? skin.blade : skin.grip); // auf dem Rücken getragen
      R(px + 6, py - 7, 1, 1, skin.edge);
    }
  }
  // Figuren bleiben im dunklen Bosskampf hell: nach dem Abdunkeln noch einmal obenauf zeichnen
  // Angriff als Animation: zurückziehen, zittern, dann auf den Helden zuschnellen
  function mobLook(m, now) {
    const dx = Math.sign(hero.x - m.x), dy = Math.sign(hero.y - m.y), sx = m.y === hero.y ? dx : 0, sy = m.y === hero.y ? 0 : dy;
    const flash = now - m.hit < 110, strike = now - m.struck;
    if (strike < 180) { const k = 1 - strike / 180; return { flash, bite: true, lunge: [sx * Math.round(9 * k), sy * Math.round(9 * k)] }; }
    if (m.wind) { const j = reduced ? 0 : Math.floor(now / 40) % 2; return { flash, warn: true, lunge: [-sx * 3 + j, -sy * 3] }; }
    return { flash };
  }
  const mirror = (g) => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x + pix.ox, y + pix.oy, w, h); };
  function drawHero(g, now) {
    const r = mirror(g), x = hero.x * T, y = hero.y * T;
    g.save(); g.setTransform(RS, 0, 0, RS, pix.ox * RS, pix.oy * RS); pix.player({ x: hero.rx ?? hero.x, y: hero.ry ?? hero.y, dir: hero.dir, walk: null, stamina: 1, hat: hat(), noTrail: true }, now); drawSword(g, now); // gleiche Position wie im Raumbild, sonst läuft ein zweiter Held hinterher
    for (const q of tele) for (const [a, b] of q.cells) { r(a * T - pix.ox + 1, b * T - pix.oy + 1, T - 2, 1, '#ff3a2a'); }
    for (const p of shots) if (now >= p.at) { const sx = Math.round(p.x * T) + 4, sy = Math.round(p.y * T) + 4; g.fillStyle = '#1a0208'; g.fillRect(sx, sy, 8, 8); g.fillStyle = '#ff3a2a'; g.fillRect(sx + 2, sy + 2, 4, 4); }
    g.restore(); void x; void y;
  }
  function frame(now) {
    if (!running) return;
    if (stopped(now)) { requestAnimationFrame(frame); return; }
    if (!paused) update(now);
    const t = reduced ? 0 : now;
    const walking = now - hero.moved < STEP_MS, lerp = Math.min(1, (now - hero.moved) / STEP_MS);
    const rx = walking ? hero.fromX + (hero.x - hero.fromX) * lerp : hero.x, ry = walking ? hero.fromY + (hero.y - hero.fromY) * lerp : hero.y;
    hero.rx = rx; hero.ry = ry;
    const blink = now < hero.safe && Math.floor(now / 90) % 2;
    const img = pix.draw(t, { tr, blocks: room.blocks.filter((b) => !b.fog), got: [], loot: [], fragments: [], enemies: [], dust: [], theme, grow: Infinity, player: blink ? null : { x: rx, y: ry, dir: hero.dir, walk: held != null || walking ? (now / 300) % 1 : null, stamina: 1, hat: hat() } });
    const g = img.getContext('2d');
    g.save(); g.setTransform(RS, 0, 0, RS, pix.ox * RS, pix.oy * RS);
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    for (const z of tele) {
      const left = (z.at - now) / 900, on = left < 0.4 ? Math.floor(now / 70) % 2 : 1;
      for (const [x, y] of z.cells) { r(x * T + 1, y * T + 1, T - 2, T - 2, on ? 'rgba(255,50,30,0.55)' : 'rgba(255,190,60,0.5)'); r(x * T + 1, y * T + 1, T - 2, 1, '#ffd166'); }
    }
    for (const a of allies) drawMinion(r, 'wisp', ['#7dff6a', '#2f7a3a'], a.x * T, a.y * T, t, { bite: now - a.hitAt < 150 });
    for (const m of mobs) drawMinion(r, foe.minion, foe.colors, m.x * T, m.y * T, t, mobLook(m, now));
    if (boss && !dying) drawBoss(r, foe.shape, foe.colors, boss.x * T, boss.y * T - hop(now), t, { flash: now - boss.hit < 110, state: mini ? 'normal' : boss.stage === 3 ? 'aggro' : boss.stage === 2 ? 'hurt' : 'normal' });
    for (const p of shots) if (now >= p.at) { const x = Math.round(p.x * T) + 4, y = Math.round(p.y * T) + 4; r(x, y, 8, 8, '#1a0208'); r(x + 2, y + 2, 4, 4, '#ff3a2a'); }
    if (key) { const x = key.x * T, y = key.y * T - Math.abs(Math.sin(now / 200)) * 3; r(x + 3, y + 5, 6, 6, '#17121f'); r(x + 4, y + 6, 4, 4, '#ffd166'); r(x + 5, y + 7, 2, 2, '#17121f'); r(x + 8, y + 7.5, 6, 2, '#17121f'); r(x + 8, y + 8, 5, 1, '#ffd166'); r(x + 11, y + 9, 1, 2, '#ffd166'); r(x + 13, y + 9, 1, 2, '#ffd166'); if (Math.floor(now / 150) % 2) r(x + 4, y + 6, 1, 1, '#ffffff'); }
    if (boss && LA?.keys && now < (boss.vulnUntil || 0)) { const f = Math.floor(now / 80) % 2 ? '#ffd166' : '#ffffff'; r(boss.x * T - 2, boss.y * T - 2 - hop(now), 36, 2, f); r(boss.x * T - 2, boss.y * T + 32 - hop(now), 36, 2, f); r(boss.x * T - 2, boss.y * T - hop(now), 2, 32, f); r(boss.x * T + 32, boss.y * T - hop(now), 2, 32, f); }
    if (boss?.gust) { const [dx, dy] = DIRS[boss.gust.d], q = 1 - (boss.gust.at - now) / 1500; for (let k = 0; k < 18; k++) { const sx = ((k * 53) % W) * T, sy = ((k * 37) % H) * T, o = ((now / 4 + k * 40) % (T * 4)); r(sx + dx * o, sy + dy * o, dx ? 10 * q + 2 : 1, dy ? 10 * q + 2 : 1, 'rgba(200,220,255,0.55)'); } }
    for (const b of room.blocks) if (b.fog) { // Nebelbank: weiche, wabernde Schwaden
      const x = b.x * T, y = b.y * T;
      for (let k = 0; k < 6; k++) { const ox = Math.sin(now / 400 + k * 1.7 + b.y) * 3, oy = Math.cos(now / 520 + k) * 2; r(x + 1 + k * 2.4 + ox, y + 3 + (k % 3) * 3 + oy, 6, 5, k % 2 ? 'rgba(184,196,180,0.55)' : 'rgba(220,230,214,0.45)'); }
    }
    for (const b of room.blocks) if (b.vine) { // Ranken: dunkle Kontur, zwei Grüntöne, Blätter, wiegen sich
      const x = b.x * T, y = b.y * T, w = Math.sin(now / 300 + b.x) * 0.5;
      for (let k = 0; k < 5; k++) { const vx = x + 2 + k * 3 + w; for (let j = 0; j < 14; j += 1) { r(vx + Math.sin(j / 2 + k) - 0.5, y + 1 + j, 2, 1, '#17121f'); r(vx + Math.sin(j / 2 + k), y + 1 + j, 1, 1, j % 3 ? '#3f8a2e' : '#6cb455'); } r(vx - 1, y + 3 + k * 2, 3, 2, '#5ab845'); }
      r(x + 6, y + 6, 4, 3, '#c0342c'); r(x + 7, y + 6, 1, 1, '#ffd166'); // Blüte
    }
    if (boss && lightBoss && boss.charge > 0) { const k = Math.min(1, boss.charge / 350); r(boss.x * T, boss.y * T - 8, 32, 4, '#17121f'); r(boss.x * T + 1, boss.y * T - 7, 30 * k, 2, ({ 1: '#ff4d6d', 2: '#3ddc97', 4: '#4da3ff' })[LA.need(boss.stage)] || '#ff4d6d'); }
    if (boss && lightBoss && !dying && world === 'cherry') { const c = ({ 1: '#ff4d6d', 2: '#3ddc97', 4: '#4da3ff' })[LA.need(boss.stage)], f = Math.floor(now / 200) % 2; r(boss.x * T + 12, boss.y * T + 12 - hop(now), 8, 8, '#17121f'); r(boss.x * T + 13, boss.y * T + 13 - hop(now), 6, 6, now - (boss.wrong || 0) < 200 ? '#ffffff' : f ? c : '#ffffff'); } // leuchtendes Herz in der Phasenfarbe
    if (boss && !dying && !mini && now > boss.openAt && now < boss.openUntil) { // Schwachpunkt leuchtet golden
      const f = Math.floor(now / 100) % 2 ? '#ffd166' : '#ffffff'; r(boss.x * T - 2, boss.y * T - 2 - hop(now), 36, 2, f); r(boss.x * T - 2, boss.y * T + 32 - hop(now), 36, 2, f); r(boss.x * T - 2, boss.y * T - hop(now), 2, 32, f); r(boss.x * T + 32, boss.y * T - hop(now), 2, 32, f);
    }
    if (!blink && phase !== 0) drawSword(g, now);
    sparks = sparks.filter((s) => now - s.t0 < 300);
    for (const s of sparks) { const k = (now - s.t0) / 300, a = Math.round(k * 9); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) r(s.x * T + 7 + dx * a, s.y * T + 7 + dy * a, 3, 3, foe.colors[0]); }
    g.restore();
    g.setTransform(RS, 0, 0, RS, 0, 0); // ab hier in Raum-Pixeln ohne Verschiebung
    if (boss && dying) { const k = (now - dying) / 1400; drawBoss(mirror(g), foe.shape, foe.colors, boss.x * T, boss.y * T - k * 24, t, { state: 'ghost' }); for (let i = 0; i < 90; i++) { const a = i * 2.4, d = k * (10 + (i % 17) * 3); g.fillStyle = foe.colors[i % 2]; g.fillRect(pix.ox + boss.x * T + 16 + Math.cos(a) * d, pix.oy + boss.y * T + 16 + Math.sin(a) * d - k * 14, 3, 3); } }
    if (boss && !dying) { // Bosskampf: Raum wird düster, die Ränder pulsieren blutrot
      const p = img.width, q = img.height, beat = reduced ? 0.5 : (Math.sin(now / 420) + 1) / 2;
      g.fillStyle = 'rgba(6,0,10,0.45)'; g.fillRect(0, 0, p, q);
      g.fillStyle = `rgba(120,0,10,${0.14 + beat * 0.14})`; g.fillRect(0, 0, p, q);
      for (const m of mobs) drawMinion(mirror(g), foe.minion, foe.colors, m.x * T, m.y * T, t, mobLook(m, now));
      drawBoss(mirror(g), foe.shape, foe.colors, boss.x * T, boss.y * T - hop(now), t, { flash: now - boss.hit < 110, state: mini ? 'normal' : boss.stage === 3 ? 'aggro' : boss.stage === 2 ? 'hurt' : 'normal' });
      if (!blink) pix.ctx && drawHero(g, now);
    }
    drawSpellFx(mirror(g), now, T, magicColor().color, hero); // Zauber leuchten auch im düsteren Bosskampf voll
    g.save(); g.setTransform(RS, 0, 0, RS, pix.ox * RS, pix.oy * RS); drawFx(g, T, now); g.restore();
    const dpr = devicePixelRatio || 1, rect = canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width * dpr)), ch = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cw, ch);
    const v = pix.view, scale = Math.max(1, Math.floor(Math.min(cw / v.w, ch / v.h)));
    const quake = !reduced && now < shake ? (Math.floor(now / 30) % 2 ? scale : -scale) : 0;
    view = { dx: Math.floor((cw - v.w * scale) / 2) - v.x * scale + quake, dy: Math.floor((ch - v.h * scale) / 2) - v.y * scale };
    ctx.drawImage(img, view.dx, view.dy, (img.width / RS) * scale, (img.height / RS) * scale);
    requestAnimationFrame(frame);
  }

  start();
  showSpells();
  // Handy: Zauberknöpfe im Bogen um den Schlag-Knopf, antippen zaubert (wie in Wild Rift)
  $('#spells').addEventListener('pointerdown', (ev) => { const b = ev.target.closest('[data-cast]'); if (!b) return; ev.preventDefault(); cast(+b.dataset.cast); });
  requestAnimationFrame(frame);
  if (location.hostname === 'localhost') window.__arena = { get state() { return { hero, mobs, boss, tele, phase, paused, key }; }, swing, finish: () => { if (boss) { boss.hp = 0; finisher(); } else { mobs.length = 0; } } };

  return () => {
    running = false;
    clearSpellFx();
    document.body.classList.remove('ingame');
    removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp);
    delete window.__arena;
  };
}
