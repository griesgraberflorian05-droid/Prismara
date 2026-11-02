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
import { magicColor, hasMagic, foeOf, worldOf, stat, partOf, swordSkin, bossBeaten, markBoss } from '../game/combat.js';
import { drawMinion, drawBoss } from '../game/monsters.js';
import { play, bossSound } from '../game/sound.js';
import { FX, hitstop, stopped, flash as fxFlash, sparks as sparksFx, ring as ringFx, drawFx } from '../game/fx.js';
import { setMusic } from '../game/music.js';
import { prefersReducedMotion } from '../settings.js';
import { transitionTo } from '../ui/transition.js';
import { icon } from '../ui/icons.js';

let ROWS = [],
  BASE = ['###################', '#.................#', '#.................#', '#...#.........#...#', '#.................#', '#.................#', '#.................#', '#.................#', '#.................#', '#...#.........#...#', '#.................#', '#.................#', '###################'];
ROWS = BASE;
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
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const wall = (x, y) => ROWS[y]?.[x] !== '.';

export function mountArena(root, params) {
  const endless = params[0] === 'endlos', depth = endless ? Math.max(1, parseInt(params[1] || '1', 10)) : 0;
  ROWS = endless ? genRows(depth) : BASE;
  const ci = endless ? depth % CHAPTERS.length : Math.max(0, Math.min(CHAPTERS.length - 1, parseInt(params[0] || '0', 10) || 0));
  const world = worldOf(ci), foe = foeOf(world), theme = PIXEL_THEMES[world] || PIXEL_THEMES.default;
  const touch = matchMedia('(pointer: coarse)').matches;
  const level = parsePushLevel({ id: `arena-${ci}`, name: foe.boss, legend: {}, rows: ROWS.map((r, y) => (y === 4 ? `#@${r.slice(2)}` : r)) });
  const room = createPushState(level), tr = pushTrace(room);
  const pix = new PixelRenderer(level);
  const damage = stat('sword') + partOf('blade').v, swingMs = SWING_MS * partOf('guard').v, magicBonus = partOf('grip').v + stat('magic'), modes = MODES.filter((_, i) => i < 2 || hasMagic()), maxHp = stat('armor'), reach = stat('reach'), skin = swordSkin();
  // Am Handy (Wischen) sind die Gegnerwellen leichter: weniger Treffer nötig, langsamer, längeres Ausholen
  const minionHp = touch ? 1 + Math.floor(ci / 6) : 1 + Math.floor(ci / 4), minionMs = Math.round(Math.max(340, 620 - ci * 26) * (touch ? 1.3 : 1)), windMs = touch ? 700 : 430;
  const mini = endless ? depth % 5 === 0 : params[1] === 'mini', bossHp = mini ? 10 + ci * 3 : 30 + ci * 8; // Miniboss: kurzer Kampf ohne Ultra

  document.body.classList.add('ingame');
  document.body.dataset.world = world;
  setMusic(world);
  root.innerHTML = `
    <section class="adv-full pixel-ui arena${touch ? ' touch' : ''}">
      <canvas id="board" class="pixel-canvas" tabindex="0" aria-label="Kampf. WASD oder Pfeiltasten laufen, Leertaste oder Klick schlägt."></canvas>
      <div class="ihud ihud-tl pixel"><div class="ihud-world">${esc(WORLDS[world]?.name || '')}</div><div class="ihud-room" id="wave">WELLE 1/2</div></div>
      <div class="ar-hearts" id="hearts" role="img"></div><div class="ar-mode pixel" id="mode"></div>
      <div class="ar-boss" id="bossbar" hidden><span>${mini ? `Wächter: ${esc(foe.critter)}` : esc(foe.boss)}</span><i><b id="bosshp"></b></i></div>
      <div class="ihud ihud-tr"><button class="ibtn" id="pause" title="Pause (Esc)" aria-label="Pause">${icon('pause')}</button></div>
      <div class="ar-banner pixel" id="banner" hidden></div>
      <div class="pause" id="panel" hidden role="dialog"><div class="pause-card pixel-card" id="panel-card"></div></div>
      ${touch ? `<div class="dpad" aria-hidden="true"><button data-d="0">▲</button><button data-d="3">◀</button><button data-d="2">▼</button><button data-d="1">▶</button><i class="dpad-hub"></i></div>
      <button class="tpad-rot" id="tpad-hit" aria-label="Schlagen">${icon('sword')}<small>SCHLAG</small></button>` : ''}
    </section>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('#board'), ctx = canvas.getContext('2d');

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
    allies = Array.from({ length: endless ? RUN.army : 0 }, (_, i) => ({ x: 1, y: i % 2 ? 5 : 3, next: 0, hitAt: 0 }));
    hero = { x: 1, y: 4, dir: 1, hp: endless && RUN.hp ? RUN.hp : maxHp, safe: 0, next: 0, swing: 0, moved: 0 };
    mobs = []; tele = []; shots = []; sparks = []; boss = null; phase = 1;
    setMusic(world); held = null; paused = false;
    spawnMobs(endless ? Math.min(6, 2 + Math.ceil(depth / 2)) : touch ? 2 : 3);
    $('#wave').textContent = 'WELLE 1/2'; $('#bossbar').hidden = true; $('#panel').hidden = true;
    showHearts(); showMode();
    canvas.focus();
  }
  function showMode() {
    const left = Math.ceil(Math.max(0, magicAt - performance.now()) / 1000);
    $('#mode').textContent = MODES[mode] + (mode === 2 && left ? ` ${left}s` : '');
  }
  function showHearts() {
    $('#hearts').innerHTML = Array.from({ length: maxHp }, (_, i) => `<span class="${i < hero.hp ? 'on' : ''}">${icon('heart')}</span>`).join('');
    $('#hearts').setAttribute('aria-label', `${hero.hp} von ${maxHp} Herzen`);
  }
  const bossCells = () => (boss ? [[boss.x, boss.y], [boss.x + 1, boss.y], [boss.x, boss.y + 1], [boss.x + 1, boss.y + 1]] : []);
  const blocked = (x, y) => wall(x, y) || mobs.some((m) => m.x === x && m.y === y) || bossCells().some(([a, b]) => a === x && b === y);

  function hurt(now, n = 1) {
    if (now < hero.safe || phase === 0) return;
    hero.hp -= n; hero.safe = now + SAFE_MS; shake = now + 220;
    play('bump'); navigator.vibrate?.(60);
    showHearts();
    if (hero.hp <= 0) lose();
  }
  function move(d, now) {
    hero.dir = d;
    const [dx, dy] = DIRS[d], x = hero.x + dx, y = hero.y + dy;
    hero.next = now + STEP_MS;
    if (blocked(x, y)) return;
    hero.fromX = hero.x; hero.fromY = hero.y; hero.x = x; hero.y = y; hero.moved = now;
  }
  function swing() {
    const now = performance.now();
    if (paused || phase === 0) return;
    if (mode === 2) { // Magie: Lichtnova trifft alles im Raum
      if (now < magicAt) return;
      magicAt = now + MAGIC_MS; shake = now + 300; bossSound('slam');
      { const c = magicColor().color; sparksFx(hero.x, hero.y, c); sparksFx(hero.x, hero.y, c); ringFx(hero.x, hero.y, c); for (let k = 0; k < 3; k++) ringFx(hero.x, hero.y, c, now + k * 120); }
      for (const m of [...mobs]) { m.hp -= damage + 1 + magicBonus; m.hit = now; if (m.hp <= 0) { mobs.splice(mobs.indexOf(m), 1); sparks.push({ x: m.x, y: m.y, t0: now }); } }
      if (boss) { boss.hp = Math.max(0, boss.hp - (damage + magicBonus) * 2); boss.hit = now; $('#bosshp').style.width = `${(boss.hp / bossHp) * 100}%`; if (boss.hp <= 0) finisher(); else nextStage(now); }
      showMode(); return;
    }
    if (now < hero.swing + swingMs) return;
    hero.swing = now; play('swipe');
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
    if (hitBoss) {
      boss.hp = Math.max(0, boss.hp - damage); boss.hit = now; play('target', 6);
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
    const angry = boss.hp <= bossHp / 2, wind = (angry ? 700 : 900) - ci * 12 - (boss.stage - 1) * 90;
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
  }

  function update(now) {
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
    if (boss) {
      if (now >= boss.next) attack(now);
      if (!boss.jump && now >= boss.walk) { // zwischen den Angriffen rückt er nach
        boss.walk = now + (boss.hp <= bossHp / 2 ? 450 : 650);
        const nx = boss.x + Math.sign(hero.x - boss.x), ny = boss.y + Math.sign(hero.y - boss.y);
        if (nx >= 1 && nx <= W - 3) boss.x = nx; else if (ny >= 1 && ny <= H - 3) boss.y = ny;
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
        boss = { x: 13, y: 5, hp: bossHp, next: now + 1600, turn: 0, hit: 0, stage: 1, walk: now + 2000, ultra: mini ? Infinity : now + 7000, jump: 0 };
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
    bossSound('roar'); hitstop(FX.hitstopBoss, now); banner(`PHASE ${stage}`, stage === 3 ? 'LETZTE KRAFT' : 'DER BOSS WIRD WÜTEND');
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
    if (e.key === 'f' || e.key === 'F') { mode = (mode + 1) % modes.length; showMode(); play('ui'); return; }
    if (e.key in KEYS) { if (!e.repeat) { held = KEYS[e.key]; hero.next = 0; } e.preventDefault(); } else if (e.key === ' ' || e.key === 'e' || e.key === 'E') { swing(); e.preventDefault(); }
  }
  function onKeyUp(e) { if (e.key in KEYS && KEYS[e.key] === held) held = null; }
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
    g.save(); g.setTransform(1, 0, 0, 1, pix.ox, pix.oy); pix.player({ x: hero.x, y: hero.y, dir: hero.dir, walk: null, stamina: 1, hat: hat() }, now); drawSword(g, now);
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
    const img = pix.draw(t, { tr, blocks: [], got: [], loot: [], fragments: [], enemies: [], dust: [], theme, grow: Infinity, player: blink ? null : { x: rx, y: ry, dir: hero.dir, walk: held != null || walking ? (now / 300) % 1 : null, stamina: 1, hat: hat() } });
    const g = img.getContext('2d');
    g.save(); g.setTransform(1, 0, 0, 1, pix.ox, pix.oy);
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    for (const z of tele) {
      const left = (z.at - now) / 900, on = left < 0.4 ? Math.floor(now / 70) % 2 : 1;
      for (const [x, y] of z.cells) { r(x * T + 1, y * T + 1, T - 2, T - 2, on ? 'rgba(255,50,30,0.55)' : 'rgba(255,190,60,0.5)'); r(x * T + 1, y * T + 1, T - 2, 1, '#ffd166'); }
    }
    for (const a of allies) drawMinion(r, 'wisp', ['#7dff6a', '#2f7a3a'], a.x * T, a.y * T, t, { bite: now - a.hitAt < 150 });
    for (const m of mobs) drawMinion(r, foe.minion, foe.colors, m.x * T, m.y * T, t, mobLook(m, now));
    if (boss && !dying) drawBoss(r, foe.shape, foe.colors, boss.x * T, boss.y * T - hop(now), t, { flash: now - boss.hit < 110, angry: boss.hp <= bossHp / 2 });
    for (const p of shots) if (now >= p.at) { const x = Math.round(p.x * T) + 4, y = Math.round(p.y * T) + 4; r(x, y, 8, 8, '#1a0208'); r(x + 2, y + 2, 4, 4, '#ff3a2a'); }
    if (!blink && phase !== 0) drawSword(g, now);
    sparks = sparks.filter((s) => now - s.t0 < 300);
    for (const s of sparks) { const k = (now - s.t0) / 300, a = Math.round(k * 9); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) r(s.x * T + 7 + dx * a, s.y * T + 7 + dy * a, 3, 3, foe.colors[0]); }
    g.restore();
    if (boss && dying) { const k = (now - dying) / 1400; for (let i = 0; i < 90; i++) { const a = i * 2.4, d = k * (10 + (i % 17) * 3); g.fillStyle = foe.colors[i % 2]; g.fillRect(pix.ox + boss.x * T + 16 + Math.cos(a) * d, pix.oy + boss.y * T + 16 + Math.sin(a) * d - k * 14, 3, 3); } }
    if (boss && !dying) { // Bosskampf: Raum wird düster, die Ränder pulsieren blutrot
      const p = img.width, q = img.height, beat = reduced ? 0.5 : (Math.sin(now / 420) + 1) / 2;
      g.fillStyle = 'rgba(6,0,10,0.45)'; g.fillRect(0, 0, p, q);
      g.fillStyle = `rgba(120,0,10,${0.14 + beat * 0.14})`; g.fillRect(0, 0, p, q);
      for (const m of mobs) drawMinion(mirror(g), foe.minion, foe.colors, m.x * T, m.y * T, t, mobLook(m, now));
      drawBoss(mirror(g), foe.shape, foe.colors, boss.x * T, boss.y * T - hop(now), t, { flash: now - boss.hit < 110, angry: boss.hp <= bossHp / 2 });
      if (!blink) pix.ctx && drawHero(g, now);
    }
    g.save(); g.setTransform(1, 0, 0, 1, pix.ox, pix.oy); drawFx(g, T, now); g.restore();
    const dpr = devicePixelRatio || 1, rect = canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width * dpr)), ch = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cw, ch);
    const v = pix.view, scale = Math.max(1, Math.floor(Math.min(cw / v.w, ch / v.h)));
    const quake = !reduced && now < shake ? (Math.floor(now / 30) % 2 ? scale : -scale) : 0;
    view = { dx: Math.floor((cw - v.w * scale) / 2) - v.x * scale + quake, dy: Math.floor((ch - v.h * scale) / 2) - v.y * scale };
    ctx.drawImage(img, view.dx, view.dy, img.width * scale, img.height * scale);
    requestAnimationFrame(frame);
  }

  start();
  requestAnimationFrame(frame);
  if (location.hostname === 'localhost') window.__arena = { get state() { return { hero, mobs, boss, tele, phase, paused }; }, swing, finish: () => { if (boss) { boss.hp = 0; finisher(); } else { mobs.length = 0; } } };

  return () => {
    running = false;
    document.body.classList.remove('ingame');
    removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp);
    delete window.__arena;
  };
}
