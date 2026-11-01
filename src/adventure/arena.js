// Kampflevel am Ende jeder Welt: zwei Gegnerwellen, dann der Boss der Welt. Läuft in Echtzeit auf dem
// Raster: Gegner holen sichtbar aus, Boss-Angriffe markieren vorher ihre Felder rot – ausweichen ist alles.
import { parsePushLevel, createPushState, pushTrace } from '../game/push.js';
import { DIRS } from '../game/engine.js';
import { PixelRenderer, PIXEL_THEMES, T } from '../game/pixelRender.js';
import { CHAPTERS, PUSH_LEVELS } from '../game/pushLevels.js';
import { WORLDS } from '../game/worlds.js';
import { addCoins, hat } from '../game/inventory.js';
import { foeOf, worldOf, stat, swordSkin, bossBeaten, markBoss } from '../game/combat.js';
import { drawMinion, drawBoss } from '../game/monsters.js';
import { play, bossSound } from '../game/sound.js';
import { setMusic } from '../game/music.js';
import { prefersReducedMotion } from '../settings.js';
import { transitionTo } from '../ui/transition.js';
import { icon } from '../ui/icons.js';

const ROWS = ['#############', '#...........#', '#..#.....#..#', '#...........#', '#...........#', '#...........#', '#..#.....#..#', '#...........#', '#############'];
const W = 13, H = 9;
const STEP_MS = 135, SWING_MS = 320, SAFE_MS = 950;
const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const wall = (x, y) => ROWS[y]?.[x] !== '.';

export function mountArena(root, params) {
  const ci = Math.max(0, Math.min(CHAPTERS.length - 1, parseInt(params[0] || '0', 10) || 0));
  const world = worldOf(ci), foe = foeOf(world), theme = PIXEL_THEMES[world] || PIXEL_THEMES.default;
  const touch = matchMedia('(pointer: coarse)').matches;
  const level = parsePushLevel({ id: `arena-${ci}`, name: foe.boss, legend: {}, rows: ROWS.map((r, y) => (y === 4 ? `#@${r.slice(2)}` : r)) });
  const room = createPushState(level), tr = pushTrace(room);
  const pix = new PixelRenderer(level);
  const damage = stat('sword'), maxHp = stat('armor'), reach = stat('reach'), skin = swordSkin();
  const minionHp = 1 + Math.floor(ci / 4), minionMs = Math.max(420, 760 - ci * 28);
  const bossHp = 14 + ci * 4;

  document.body.classList.add('ingame');
  document.body.dataset.world = world;
  setMusic(world);
  root.innerHTML = `
    <section class="adv-full pixel-ui arena${touch ? ' touch' : ''}">
      <canvas id="board" class="pixel-canvas" tabindex="0" aria-label="Kampf. WASD oder Pfeiltasten laufen, Leertaste oder Klick schlägt."></canvas>
      <div class="ihud ihud-tl pixel"><div class="ihud-world">${esc(WORLDS[world]?.name || '')}</div><div class="ihud-room" id="wave">WELLE 1/2</div></div>
      <div class="ar-hearts" id="hearts" role="img"></div>
      <div class="ar-boss" id="bossbar" hidden><span>${esc(foe.boss)}</span><i><b id="bosshp"></b></i></div>
      <div class="ihud ihud-tr"><button class="ibtn" id="pause" title="Pause (Esc)" aria-label="Pause">${icon('pause')}</button></div>
      <div class="pause" id="panel" hidden role="dialog"><div class="pause-card pixel-card" id="panel-card"></div></div>
      ${touch ? `<div class="dpad" aria-hidden="true"><button data-d="0">▲</button><button data-d="3">◀</button><button data-d="2">▼</button><button data-d="1">▶</button><i class="dpad-hub"></i></div>
      <button class="tpad-rot" id="tpad-hit" aria-label="Schlagen">${icon('sword')}<small>SCHLAG</small></button>` : ''}
    </section>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('#board'), ctx = canvas.getContext('2d');

  let shots = [], hero, mobs, boss, tele, phase, held, paused, running = true, shake = 0, view = null, sparks;
  const reduced = prefersReducedMotion();

  function spawnMobs(n) {
    const spots = [[11, 1], [11, 7], [6, 1], [6, 7], [11, 4], [8, 4]];
    for (let k = 0; k < n; k++) {
      const [x, y] = spots[k % spots.length];
      if (!(mobs.some((m) => m.x === x && m.y === y) || (hero.x === x && hero.y === y))) mobs.push({ x, y, hp: minionHp, next: performance.now() + 500 + k * 120, wind: 0, hit: 0 });
    }
  }
  function start() {
    hero = { x: 1, y: 4, dir: 1, hp: maxHp, safe: 0, next: 0, swing: 0, moved: 0 };
    mobs = []; tele = []; shots = []; sparks = []; boss = null; phase = 1;
    setMusic(world); held = null; paused = false;
    spawnMobs(3);
    $('#wave').textContent = 'WELLE 1/2'; $('#bossbar').hidden = true; $('#panel').hidden = true;
    showHearts();
    canvas.focus();
  }
  function showHearts() {
    $('#hearts').innerHTML = Array.from({ length: maxHp }, (_, i) => `<span class="${i < hero.hp ? 'on' : ''}">${icon('heart')}</span>`).join('');
    $('#hearts').setAttribute('aria-label', `${hero.hp} von ${maxHp} Herzen`);
  }
  const bossCells = () => (boss ? [[boss.x, boss.y], [boss.x + 1, boss.y], [boss.x, boss.y + 1], [boss.x + 1, boss.y + 1]] : []);
  const blocked = (x, y) => wall(x, y) || mobs.some((m) => m.x === x && m.y === y) || bossCells().some(([a, b]) => a === x && b === y);

  function hurt(now) {
    if (now < hero.safe || phase === 0) return;
    hero.hp--; hero.safe = now + SAFE_MS; shake = now + 220;
    play('bump'); navigator.vibrate?.(60);
    showHearts();
    if (hero.hp <= 0) lose();
  }
  function move(d, now) {
    hero.dir = d;
    const [dx, dy] = DIRS[d], x = hero.x + dx, y = hero.y + dy;
    hero.next = now + STEP_MS;
    if (blocked(x, y)) return;
    hero.x = x; hero.y = y; hero.moved = now;
  }
  function swing() {
    const now = performance.now();
    if (paused || phase === 0 || now < hero.swing + SWING_MS) return;
    hero.swing = now; play('swipe');
    // Rundumschlag: trifft alles im Kreis um den Helden
    let hitBoss = false;
    for (let y = hero.y - reach; y <= hero.y + reach; y++) for (let x = hero.x - reach; x <= hero.x + reach; x++) {
      if (wall(x, y) || (x === hero.x && y === hero.y)) continue;
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
      if (boss.hp <= 0) win();
    }
  }

  // ---------- Boss-Angriffe: tele = rote Felder, die nach at Schaden machen ----------
  const inner = (fn) => { const out = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!wall(x, y) && fn(x, y)) out.push([x, y]); return out; };
  function attack(now) {
    const angry = boss.hp <= bossHp / 2, wind = (angry ? 700 : 900) - ci * 12;
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
        if (now >= m.wind) { m.wind = 0; m.next = now + minionMs; if (near) hurt(now); }
      } else if (now >= m.next) {
        m.next = now + minionMs;
        if (near) { m.wind = now + 430; continue; }
        const dx = Math.sign(hero.x - m.x), dy = Math.sign(hero.y - m.y);
        const tries = Math.abs(hero.x - m.x) >= Math.abs(hero.y - m.y) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
        for (const [a, b] of tries) {
          const x = m.x + a, y = m.y + b;
          if ((a || b) && !blocked(x, y) && !(x === hero.x && y === hero.y)) { m.x = x; m.y = y; break; }
        }
      }
    }
    for (let i = tele.length - 1; i >= 0; i--) if (now >= tele[i].at) {
      const z = tele.splice(i, 1)[0];
      z.then?.();
      bossSound('slam'); shake = now + 160;
      if (z.cells.some(([x, y]) => x === hero.x && y === hero.y)) hurt(now);
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
      if (bossCells().some(([a, b]) => a === hero.x && b === hero.y)) { // vom Ansturm getroffen: zur Seite geschleudert
        hurt(now);
        const free = inner((x, y) => !blocked(x, y)).sort((p, q) => Math.abs(p[0] - hero.x) + Math.abs(p[1] - hero.y) - Math.abs(q[0] - hero.x) - Math.abs(q[1] - hero.y));
        if (free[0]) [hero.x, hero.y] = free[0];
      }
    } else if (!mobs.length) {
      phase++;
      if (phase === 2) { spawnMobs(5); $('#wave').textContent = 'WELLE 2/2'; } else {
        boss = { x: 9, y: 3, hp: bossHp, next: now + 1600, turn: 0, hit: 0 };
        $('#wave').textContent = 'BOSS'; $('#bossbar').hidden = false; $('#bosshp').style.width = '100%';
        setMusic('boss'); bossSound('roar'); shake = now + 500;
      }
    }
  }

  function panel(html) { $('#panel-card').innerHTML = html; $('#panel').hidden = false; }
  function lose() {
    phase = 0; held = null; tele = []; shots = [];
    panel(`<h2 class="pixel">BESIEGT</h2><p class="pause-hint">${esc(foe.boss)} war stärker. Verbessere dein Schwert in der Schmiede oder versuche es noch einmal.</p>
      <button class="btn btn-primary" id="p-again">Nochmal</button><a class="btn" href="#/menu/shop">Zur Schmiede</a><a class="btn" href="#/menu/chapter/${ci}">Zur Welt</a>`);
    $('#p-again').addEventListener('click', start); $('#p-again').focus();
  }
  function win() {
    phase = 0; held = null; tele = []; shots = []; mobs = []; setMusic(world); shake = performance.now() + 400;
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
    if (e.key in KEYS) { if (!e.repeat) { held = KEYS[e.key]; hero.next = 0; } e.preventDefault(); } else if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'f' || e.key === 'F') { swing(); e.preventDefault(); }
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
    const k = (now - hero.swing) / 240, px = hero.x * T + 8, py = hero.y * T + 8;
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
      R(px + 6, py - 8, 3, 11, skin.blade); R(px + 6, py - 8, 1, 11, skin.edge); R(px + 4, py + 3, 7, 2, skin.grip); R(px + 6, py + 5, 3, 3, skin.grip);
    }
  }
  // Figuren bleiben im dunklen Bosskampf hell: nach dem Abdunkeln noch einmal obenauf zeichnen
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
    if (!paused) update(now);
    const t = reduced ? 0 : now;
    const walking = now - hero.moved < STEP_MS;
    const blink = now < hero.safe && Math.floor(now / 90) % 2;
    const img = pix.draw(t, { tr, blocks: [], got: [], loot: [], fragments: [], enemies: [], dust: [], theme, grow: Infinity, player: blink ? null : { x: hero.x, y: hero.y, dir: hero.dir, walk: walking ? ((now - hero.moved) / STEP_MS) : null, stamina: 1, hat: hat() } });
    const g = img.getContext('2d');
    g.save(); g.setTransform(1, 0, 0, 1, pix.ox, pix.oy);
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    for (const z of tele) {
      const left = (z.at - now) / 900, on = left < 0.4 ? Math.floor(now / 70) % 2 : 1;
      for (const [x, y] of z.cells) { r(x * T + 1, y * T + 1, T - 2, T - 2, on ? 'rgba(255,50,30,0.55)' : 'rgba(255,190,60,0.5)'); r(x * T + 1, y * T + 1, T - 2, 1, '#ffd166'); }
    }
    for (const m of mobs) drawMinion(r, foe.minion, foe.colors, m.x * T, m.y * T, t, { flash: now - m.hit < 110, warn: !!m.wind });
    if (boss) drawBoss(r, foe.shape, foe.colors, boss.x * T, boss.y * T, t, { flash: now - boss.hit < 110, angry: boss.hp <= bossHp / 2 });
    for (const p of shots) if (now >= p.at) { const x = Math.round(p.x * T) + 4, y = Math.round(p.y * T) + 4; r(x, y, 8, 8, '#1a0208'); r(x + 2, y + 2, 4, 4, '#ff3a2a'); }
    if (!blink && phase !== 0) drawSword(g, now);
    sparks = sparks.filter((s) => now - s.t0 < 300);
    for (const s of sparks) { const k = (now - s.t0) / 300, a = Math.round(k * 9); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) r(s.x * T + 7 + dx * a, s.y * T + 7 + dy * a, 3, 3, foe.colors[0]); }
    g.restore();
    if (boss) { // Bosskampf: Raum wird düster, die Ränder pulsieren blutrot
      const p = img.width, q = img.height, beat = reduced ? 0.5 : (Math.sin(now / 420) + 1) / 2;
      g.fillStyle = 'rgba(6,0,10,0.45)'; g.fillRect(0, 0, p, q);
      g.fillStyle = `rgba(120,0,10,${0.14 + beat * 0.14})`; g.fillRect(0, 0, p, q);
      for (const m of mobs) drawMinion(mirror(g), foe.minion, foe.colors, m.x * T, m.y * T, t, { flash: now - m.hit < 110, warn: !!m.wind });
      drawBoss(mirror(g), foe.shape, foe.colors, boss.x * T, boss.y * T, t, { flash: now - boss.hit < 110, angry: boss.hp <= bossHp / 2 });
      if (!blink) pix.ctx && drawHero(g, now);
    }
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
  if (location.hostname === 'localhost') window.__arena = { get state() { return { hero, mobs, boss, tele, phase, paused }; }, swing, finish: () => { if (boss) { boss.hp = 0; win(); } else { mobs.length = 0; } } };

  return () => {
    running = false;
    document.body.classList.remove('ingame');
    removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp);
    delete window.__arena;
  };
}
