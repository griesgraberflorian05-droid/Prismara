// Hauptmenü im Pixel-Abenteuer-Stil: Hinter allem läuft eine lebendige Raum-Szene der aktuellen
// Welt (gleicher Renderer wie im Spiel), davor ein hängendes Holzschild und Holz-/Pergament-Knöpfe.
// Unterseiten: #/menu, #/menu/chapters[/i], #/menu/chapter/i, #/menu/kit, #/menu/shop.
import { PUSH_LEVELS, CHAPTERS } from '../game/pushLevels.js';
import { isSolved, bestMoves, starsFor } from '../game/progress.js';
import { SKIN_COLORS, getSkin, setSkin } from '../game/skins.js';
import { prefersReducedMotion, getSettings, updateSettings } from '../settings.js';
import { play, isMuted, toggleMute } from '../game/sound.js';
import { worldForChapter, CHAPTER_WORLD } from '../game/worlds.js';
import { todayKey } from '../game/daily.js';
import { tutorialSeen, fragmentCount } from '../adventure/adventure.js';
import { ITEMS, HATS, getInv, buy, buyHat, wearHat, hat, ownsHat, crystalsSpent } from '../game/inventory.js';
import { PixelRenderer } from '../game/pixelRender.js';
import { MODES, isUnlocked, solvedCount, takeNewUnlocks, lockedHtml } from '../game/unlocks.js';

/** Vorschau: der Pixel-Held mit Hut (gleicher Sprite wie im Spiel). */
function drawHatPreview(canvas, id) {
  const pr = Object.create(PixelRenderer.prototype);
  pr.ctx = canvas.getContext('2d');
  pr.ctx.save(); pr.ctx.translate(4, 8);
  pr.player({ x: 0, y: 0, dir: 2, walk: null, stamina: 1, hat: id }, 0);
  pr.ctx.restore();
}
import { mountScene, roomThumb } from './menuScene.js';
import { mountTitleArt } from './titleArt.js';
import { logoCanvas } from './logo.js';

// Schwierigkeit einer Welt: 1–5 Punkte nach dem höchsten Zugziel (Meisterprüfung) der Welt.
const difficulty = (ci) => {
  const maxPar = Math.max(...CHAPTERS[ci].levels.map((id) => PUSH_LEVELS[indexOf(id)].par || 0));
  return Math.max(1, Math.min(5, Math.ceil(maxPar / 7)));
};
const skulls = (n) => `<span class="diff">${'<b>◆</b>'.repeat(n)}${'<i>◆</i>'.repeat(5 - n)}</span>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const starsOf = (l) => (isSolved(l.id) ? starsFor(bestMoves(l.id), l.par) : 0);
const indexOf = (id) => PUSH_LEVELS.findIndex((l) => l.id === id);
const themeOf = (ci) => CHAPTER_WORLD[CHAPTERS[ci]?.id] || 'default';
const starRow = (n) => [1, 2, 3].map((s) => `<b class="${s <= n ? 'on' : ''}">★</b>`).join('');

function totals() {
  const solved = PUSH_LEVELS.filter((l) => isSolved(l.id)).length;
  const stars = PUSH_LEVELS.reduce((n, l) => n + starsOf(l), 0);
  const firstOpen = PUSH_LEVELS.findIndex((l) => !isSolved(l.id));
  return { solved, stars, maxStars: PUSH_LEVELS.length * 3, firstOpen };
}

function chapterInfo(ci) {
  const ch = CHAPTERS[ci];
  const idx = ch.levels.map(indexOf);
  const solved = idx.filter((i) => isSolved(PUSH_LEVELS[i].id)).length;
  const stars = idx.reduce((n, i) => n + starsOf(PUSH_LEVELS[i]), 0);
  const { firstOpen } = totals();
  const open = idx.some((i) => isSolved(PUSH_LEVELS[i].id) || i === firstOpen) || firstOpen < 0;
  return { ch, idx, solved, stars, open, done: solved === idx.length };
}
const currentChapter = () => { const t = totals(); return t.firstOpen < 0 ? 0 : Math.max(0, CHAPTERS.findIndex((c) => c.levels.includes(PUSH_LEVELS[t.firstOpen].id))); };

export function mountMenu(root, params = []) {
  const page = params[0] || 'main';
  root.innerHTML = `<section class="tm${page === 'main' ? '' : ' sub'}"><canvas class="tm-scene" aria-hidden="true"></canvas><div class="tm-shade"></div><div class="tm-ui"></div></section>`;
  const ui = root.querySelector('.tm-ui');
  const startCh = page === 'chapter' || page === 'chapters' ? Math.max(0, parseInt(params[1] ?? currentChapter(), 10) || 0) : currentChapter();
  // Welt-Seiten zeigen einen lebendigen Raum der Welt, alle anderen das eigene Titelbild
  const worldPage = page === 'chapter' || page === 'chapters';
  document.body.dataset.world = themeOf(worldPage ? startCh : currentChapter()); // Oberflächenfarben der Welt
  const scene = worldPage ? mountScene(root.querySelector('.tm-scene'), themeOf(startCh)) : mountTitleArt(root.querySelector('.tm-scene'), themeOf(currentChapter())); // Titelbild im Stil der aktuellen Welt
  let cleanup = () => {};

  // Gesperrte Modi: Hinweis statt Inhalt (Welten-Seiten zählen als Modus „worlds“)
  const lockId = { chapters: 'worlds', chapter: 'worlds', kit: 'kit', shop: 'shop' }[page];
  if (lockId && !isUnlocked(lockId)) ui.innerHTML = lockedHtml(lockId);
  else if (page === 'chapters') cleanup = chaptersPage(ui, parseInt(params[1] ?? '-1', 10), scene);
  else if (page === 'chapter') chapterPage(ui, parseInt(params[1] || '0', 10));
  else if (page === 'kit') cleanup = kitPage(ui);
  else if (page === 'shop') shopPage(ui);
  else if (page === 'settings') settingsPage(ui);
  else { ui.classList.add('tm-main'); mainPage(ui); }

  const onKey = (e) => {
    if (e.key === 'Escape' && page !== 'main') location.hash = page === 'chapter' ? `#/menu/chapters/${params[1] || 0}` : '#/menu';
  };
  window.addEventListener('keydown', onKey);
  return () => { cleanup(); scene.stop(); window.removeEventListener('keydown', onKey); };
}

const head = (back, title, right = '') => `<div class="tm-head"><a class="wbtn sm" href="${back}">← Zurück</a><h2 class="tm-plank">${title}</h2><span class="tm-purse">${right}</span></div>`;
const purse = () => `🪙 ${getInv().coins} · 💎 ${fragmentCount()}`;

// ---------- Hauptseite ----------
function mainPage(el) {
  const t = totals();
  const fresh = !tutorialSeen(); // erstes Spiel: Spielen startet automatisch das Lehrzimmer
  const next = t.firstOpen >= 0 ? PUSH_LEVELS[t.firstOpen] : null;
  const daily = isSolved(`daily-${todayKey()}`);
  // Reisetagebuch: aktuelle Welt mit Fortschritt und nächstem Raum
  const ci = currentChapter(), info = chapterInfo(ci), wid = CHAPTER_WORLD[info.ch.id];
  const world = worldForChapter(info.ch.id);
  const pct = Math.round((info.solved / info.idx.length) * 100);
  const newModes = takeNewUnlocks(), freshModes = new Set(newModes.map((m) => m.id));
  el.innerHTML = `
    ${newModes.length ? `<div class="tm-unlock parch" role="status">🔓 Neu freigeschaltet: <b>${newModes.map((m) => `${m.icon} ${esc(m.name)}`).join(', ')}</b></div>` : ''}
    <header class="tm-sign" aria-label="Prismara"><i class="rope l"></i><i class="rope r"></i>
      <h1 class="logo-h1"><span class="sr">PRISMARA</span></h1><p>Ein Licht-Abenteuer</p></header>
    ${fresh ? '' : `<a class="tm-journey parch" href="#/menu/chapter/${ci}" data-world="${esc(wid || '')}">
      <span class="tj-icon" aria-hidden="true">${world?.icon || info.ch.icon}</span>
      <span class="tj-body"><span class="tj-kicker">WELT ${ci + 1} VON ${CHAPTERS.length}</span><span class="tj-name">${esc(world?.name || info.ch.name)}</span>
        <span class="tj-bar" aria-label="${info.solved} von ${info.idx.length} Räumen"><i style="width:${pct}%"></i></span>
        <span class="tj-meta">${info.solved}/${info.idx.length} Räume · ★ ${info.stars}/${info.idx.length * 3}${next ? ` · als Nächstes: ${esc(next.name)}` : ''}</span></span></a>`}
    <nav class="tm-menu tm-board" aria-label="Hauptmenü">
      <a class="wbtn big" id="play" href="${fresh ? '#/adv/tutorial' : next ? `#/adv/${t.firstOpen}` : '#/menu/chapters'}">
        ▶ ${fresh ? 'ABENTEUER BEGINNEN' : 'SPIELEN'}<small>${fresh ? 'Mit dem Lehrzimmer' : next ? `Weiter: ${esc(next.name)}` : 'Alle Räume geschafft!'}</small></a>
      <div class="tm-grid">${MODES.map((m) => {
        const href = { worlds: `#/menu/chapters/${currentChapter()}`, kit: '#/menu/kit', daily: '#/daily', shop: '#/menu/shop' }[m.id];
        if (!isUnlocked(m.id, t.solved)) return `<span class="wbtn locked" aria-disabled="true" title="${esc(m.info)}">🔒 ${m.name}<small>ab ${m.need} Räumen</small></span>`;
        const glow = (m.id === 'daily' && !daily) || freshModes.has(m.id);
        return `<a class="wbtn${glow ? ' glow' : ''}" href="${href}">${m.icon} ${m.name}${m.id === 'daily' && daily ? ' ✓' : ''}</a>`;
      }).join('')}
        <a class="wbtn" href="#/menu/settings">⚙ Einstellungen</a>
        <a class="wbtn sm tm-lab" href="#/lab">🧠 Gehirn Lab</a>
      </div>
    </nav>
    <footer class="tm-stats parch">
      <span>🚪 <b>${t.solved}</b>/${PUSH_LEVELS.length} Räume</span>
      <span>★ <b>${t.stars}</b>/${t.maxStars}</span>
      <span>🗺 <b>${CHAPTERS.filter((_, i) => chapterInfo(i).done).length}</b>/${CHAPTERS.length} Welten</span>
      <span>🪙 <b>${getInv().coins}</b></span>
      <span>💎 <b>${fragmentCount()}</b></span>
    </footer>`;
  const logo = logoCanvas(); logo.className = 'logo'; logo.setAttribute('aria-hidden', 'true');
  el.querySelector('.logo-h1').prepend(logo);
  el.querySelector('#play').focus();
  el.querySelector('#play').addEventListener('click', () => play('play'));
}

// ---------- Einstellungen: Ton, Bewegung, Tutorial nochmal ----------
function settingsPage(el) {
  const render = () => {
    const rm = getSettings().reducedMotion;
    el.innerHTML = `
      ${head('#/menu', '⚙ Einstellungen')}
      <div class="parch settings">
        <div class="set-row"><span>🔊 Ton</span><button class="wbtn sm" id="snd" aria-pressed="${!isMuted()}">${isMuted() ? 'AUS' : 'AN'}</button></div>
        <div class="set-row"><span>🌀 Bewegung reduzieren</span><button class="wbtn sm" id="motion" aria-pressed="${!!rm}">${rm === null ? 'SYSTEM' : rm ? 'AN' : 'AUS'}</button></div>
        <div class="set-row"><span>📖 Tutorial (Lehrzimmer)</span><a class="wbtn sm" href="#/adv/tutorial">NOCHMAL SPIELEN</a></div>
        <div class="set-row"><span>◈ Prismara Lab</span><a class="wbtn sm" href="#/lab">ÖFFNEN</a></div>
      </div>`;
    el.querySelector('#snd').addEventListener('click', () => { toggleMute(); play('ui'); render(); el.querySelector('#snd').focus(); });
    el.querySelector('#motion').addEventListener('click', () => {
      updateSettings({ reducedMotion: rm === null ? true : rm ? false : null }); play('ui'); render(); el.querySelector('#motion').focus();
    });
  };
  render();
}

// ---------- Welten-Karussell: Bild eines echten Raums + Pergament mit Infos ----------
function chaptersPage(el, start, scene) {
  const t = totals();
  let cur = start >= 0 && start < CHAPTERS.length ? start : currentChapter();
  el.innerHTML = `
    ${head('#/menu', 'Welten', `★ ${t.stars}/${t.maxStars}`)}
    <div class="carousel">
      <button class="wbtn arrow" id="prev" aria-label="Vorherige Welt">◀</button>
      <div class="car-stage" id="stage" aria-live="polite"></div>
      <button class="wbtn arrow" id="next" aria-label="Nächste Welt">▶</button>
    </div>
    <div class="tm-dots" id="dots">${CHAPTERS.map((_, i) => `<button aria-label="Welt ${i + 1}" data-i="${i}"></button>`).join('')}</div>
    <p class="tm-tip">← → wechseln · Enter öffnen · Esc zurück</p>`;
  const stage = el.querySelector('#stage');

  function show(dirClass = '') {
    const info = chapterInfo(cur);
    const w = worldForChapter(info.ch.id);
    const pct = Math.round((info.solved / info.idx.length) * 100);
    scene.setTheme(themeOf(cur));
    document.body.dataset.world = themeOf(cur);
    stage.innerHTML = `
      <a class="wcard ${dirClass}${info.open ? '' : ' locked'}${info.done ? ' done' : ''}" ${info.open ? `href="#/menu/chapter/${cur}"` : 'aria-disabled="true"'}>
        <span class="wframe"><canvas class="wthumb"></canvas>${info.open ? '' : '<span class="wlock">🔒</span>'}</span>
        <span class="parch wbody">
          <span class="wnum">WELT ${cur + 1}</span>
          <span class="wname">${w?.icon || ''} ${esc(w?.name || info.ch.name)}</span>
          <span class="wsum">${esc(info.ch.summary)}</span>
          <span class="wrow">Schwierigkeit ${skulls(difficulty(cur))}</span>
          <span class="wbar"><i style="width:${pct}%"></i></span>
          <span class="wrow"><b>${info.solved}/${info.idx.length}</b> Räume · <b class="gold">★ ${info.stars}/${info.idx.length * 3}</b>${info.done ? ' · ✓ geschafft' : ''}</span>
        </span>
      </a>`;
    roomThumb(stage.querySelector('.wthumb'), PUSH_LEVELS[info.idx[0]], themeOf(cur), 2);
    el.querySelectorAll('#dots button').forEach((b, i) => b.classList.toggle('on', i === cur));
    history.replaceState(null, '', `#/menu/chapters/${cur}`);
    stage.querySelector('a').focus({ preventScroll: true });
  }
  const go = (d) => { cur = (cur + d + CHAPTERS.length) % CHAPTERS.length; play('swipe'); show(d > 0 ? 'in-right' : 'in-left'); };
  el.querySelector('#prev').addEventListener('click', () => go(-1));
  el.querySelector('#next').addEventListener('click', () => go(1));
  el.querySelector('#dots').addEventListener('click', (e) => { const i = e.target.dataset.i; if (i != null) { const d = +i - cur; cur = +i; show(d >= 0 ? 'in-right' : 'in-left'); } });
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd') { go(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'a') { go(-1); e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey);
  let sx = null;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; });
  show();
  return () => window.removeEventListener('keydown', onKey);
}

// ---------- Weltseite: Raumkarten mit Vorschaubild ----------
function chapterPage(el, ci) {
  ci = Math.max(0, Math.min(CHAPTERS.length - 1, ci));
  const info = chapterInfo(ci);
  const { firstOpen } = totals();
  const w = worldForChapter(info.ch.id);
  el.innerHTML = `
    ${head(`#/menu/chapters/${ci}`, `${w ? `${w.icon} ${esc(w.name)}` : esc(info.ch.name)}`, `★ ${info.stars}/${info.idx.length * 3}`)}
    <p class="tm-tip">Welt ${ci + 1} · ${esc(info.ch.name)} · Schwierigkeit ${skulls(difficulty(ci))}</p>
    <ol class="rooms">${info.idx.map((i, k) => {
      const l = PUSH_LEVELS[i];
      const solved = isSolved(l.id);
      const open = solved || i === firstOpen;
      const inner = `<span class="rthumb"><canvas data-i="${i}"></canvas>${open ? '' : '<span class="wlock">🔒</span>'}${l.master ? '<span class="rcrown">👑</span>' : ''}</span>
        <span class="rinfo"><span class="rnum">RAUM ${k + 1}</span><span class="rname">${esc(l.name)}</span>
        <span class="rstars">${starRow(starsOf(l))}</span><span class="rmeta">Ziel ≤ ${l.par} Züge${solved ? ` · Best ${bestMoves(l.id)}` : ''}</span></span>`;
      return open
        ? `<li><a class="room parch${solved ? ' solved' : ' next'}${l.master ? ' master' : ''}" href="#/adv/${i}" style="--k:${k}">${inner}</a></li>`
        : `<li><span class="room parch locked${l.master ? ' master' : ''}" style="--k:${k}">${inner}</span></li>`;
    }).join('')}</ol>`;
  el.querySelectorAll('.rthumb canvas').forEach((c) => roomThumb(c, PUSH_LEVELS[+c.dataset.i], themeOf(ci), 1));
  (el.querySelector('.room.next') || el.querySelector('a.room'))?.focus();
}

// ---------- Shoppen ----------
function shopPage(el) {
  const render = (msg = '') => {
    const inv = getInv();
    el.innerHTML = `
      ${head('#/menu', '🛒 Shoppen', purse())}
      <div class="shop">
        <div class="parch shop-keeper"><span class="shop-face" aria-hidden="true">🧙</span><p>${msg || 'Willkommen, Lichtläufer! Münzen findest du in Räumen und Truhen – und fürs Entkommen gibt’s auch welche.'}</p></div>
        <ul class="shop-list">${Object.entries(ITEMS).map(([id, it]) => {
          const have = inv.items[id] || 0;
          const sold = it.permanent && have;
          return `<li class="parch shop-item${sold ? ' sold' : ''}"><span class="si-icon">${it.icon}</span>
            <span class="si-text"><b>${esc(it.name)}</b><small>${esc(it.info)}</small>${it.permanent ? '<em>dauerhaft</em>' : `<em>im Beutel: ${have}</em>`}</span>
            <button class="wbtn sm" data-buy="${id}" ${sold || inv.coins < it.price ? 'disabled' : ''}>${sold ? '✓ gekauft' : `🪙 ${it.price}`}</button></li>`;
        }).join('')}</ul>
        <div class="parch shop-keeper"><span class="shop-face" aria-hidden="true">🎩</span><p>Der Hutmacher nimmt keine Münzen – nur Kristalle 💎 aus den Räumen. Du hast <b>${fragmentCount() - crystalsSpent()}</b> übrig.</p></div>
        <ul class="hat-list">${Object.entries(HATS).map(([id, h]) => {
          const own = ownsHat(id), worn = hat() === id;
          return `<li class="parch hat-item${worn ? ' worn' : ''}"><canvas class="hat-prev" data-hat="${id}" width="24" height="28"></canvas><b>${esc(h.name)}</b>
            ${own ? `<button class="wbtn sm" data-wear="${worn ? '' : id}">${worn ? 'ABSETZEN' : 'AUFSETZEN'}</button>` : `<button class="wbtn sm" data-hat-buy="${id}" ${fragmentCount() - crystalsSpent() < h.price ? 'disabled' : ''}>💎 ${h.price}</button>`}</li>`;
        }).join('')}</ul>
      </div>`;
    el.querySelectorAll('.hat-prev').forEach((c) => drawHatPreview(c, c.dataset.hat));
    el.querySelectorAll('[data-hat-buy]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.hatBuy;
      if (buyHat(id, fragmentCount())) { play('target', 7); render(`${HATS[id].name} – steht dir ausgezeichnet!`); } else { play('bump'); render('Dafür fehlen dir noch Kristalle.'); }
    }));
    el.querySelectorAll('[data-wear]').forEach((b) => b.addEventListener('click', () => { wearHat(b.dataset.wear || null); play('ui'); render(); }));
    el.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.buy;
      if (buy(id)) { play('target', 7); render(`${ITEMS[id].icon} ${ITEMS[id].name} – gute Wahl! ${ITEMS[id].permanent ? 'Wirkt ab sofort.' : 'Benutze ihn im Raum mit der Inventarleiste.'}`); }
      else { play('bump'); render('Da fehlen dir leider noch ein paar Münzen.'); }
      el.querySelector(`[data-buy="${id}"]`)?.focus();
    }));
  };
  render();
}

// ---------- Held: Umhangfarbe und Hut – Vorschau ist der echte Pixel-Held aus dem Spiel ----------
function kitPage(el) {
  const { stars } = totals();
  const render = () => {
    const skin = getSkin(), worn = hat();
    const owned = Object.entries(HATS).filter(([id]) => ownsHat(id));
    el.innerHTML = `
      ${head('#/menu', '🎨 Held', `★ ${stars}`)}
      <div class="kit parch">
        <div class="kit-stage"><canvas class="kit-big" width="48" height="48" aria-label="Vorschau deines Helden: Umhang ${esc(skin.color.name)}${worn ? `, ${esc(HATS[worn].name)}` : ''}"></canvas></div>
        <div>
          <h3>Umhang</h3>
          <div class="kit-row">${SKIN_COLORS.map((c) => {
            const locked = stars < c.stars, active = skin.color.id === c.id;
            return `<button class="kit-swatch${active ? ' active' : ''}" ${locked ? 'disabled' : `data-pick="color" data-id="${c.id}"`} aria-pressed="${active}" title="${esc(c.name)}${locked ? ` – ab ★ ${c.stars}` : ''}">
              <canvas class="ks-cloak" data-color="${c.id}" width="12" height="12"></canvas><small>${locked ? `🔒 ★${c.stars}` : esc(c.name)}</small></button>`;
          }).join('')}</div>
          <h3>Hut</h3>
          <div class="kit-row">
            <button class="kit-swatch${worn ? '' : ' active'}" data-hat="" aria-pressed="${!worn}"><canvas class="ks-hat" data-hat="" width="24" height="28"></canvas><small>Ohne</small></button>
            ${owned.map(([id, h]) => `<button class="kit-swatch${worn === id ? ' active' : ''}" data-hat="${id}" aria-pressed="${worn === id}"><canvas class="ks-hat" data-hat="${id}" width="24" height="28"></canvas><small>${esc(h.name)}</small></button>`).join('')}
          </div>
          <p class="small">Neue Umhänge schaltest du mit Sternen frei, Hüte gibt es im Shop gegen Kristalle 💎.</p>
        </div>
      </div>`;
    el.querySelectorAll('.ks-cloak').forEach((c) => drawCloak(c, SKIN_COLORS.find((s) => s.id === c.dataset.color)));
    el.querySelectorAll('.ks-hat').forEach((c) => drawHatPreview(c, c.dataset.hat)); // '' = ohne Hut
    el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      setSkin({ color: b.dataset.id }); play('ui'); render();
      el.querySelector(`[data-id="${b.dataset.id}"]`)?.focus();
    }));
    el.querySelectorAll('button[data-hat]').forEach((b) => b.addEventListener('click', () => {
      wearHat(b.dataset.hat || null); play('ui'); render();
      el.querySelector(`button[data-hat="${b.dataset.hat}"]`)?.focus();
    }));
    stop?.();
    stop = animateHero(el.querySelector('.kit-big'));
  };
  let stop = null;
  render();
  return () => stop?.();
}

/** Umhang-Muster als kleines Pixelbild (Körper, Saum, Brosche) statt Neon-Verlauf. */
function drawCloak(canvas, c) {
  const g = canvas.getContext('2d'), body = c.stops[Math.min(1, c.stops.length - 1)], light = c.stops[0];
  g.fillStyle = '#120a1c'; g.fillRect(0, 0, 12, 12);
  g.fillStyle = body; g.fillRect(1, 1, 10, 10);
  g.fillStyle = light; g.fillRect(1, 1, 10, 2); g.fillRect(5, 5, 2, 2);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(1, 9, 10, 2);
}

/** Der echte Pixel-Held auf einem Bodenstück: läuft auf der Stelle und dreht sich reihum. */
function animateHero(canvas) {
  if (!canvas) return () => {};
  const g = canvas.getContext('2d');
  const pr = Object.create(PixelRenderer.prototype); pr.ctx = g;
  let run = true;
  const frame = (t) => {
    if (!run) return;
    const reduced = prefersReducedMotion();
    g.clearRect(0, 0, 48, 48);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { g.fillStyle = (x + y) % 2 ? '#6b4a32' : '#5a3d29'; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = '#43301f'; g.fillRect(x * 16, y * 16 + 15, 16, 1); }
    const dir = reduced ? 2 : [2, 1, 0, 3][Math.floor(t / 1400) % 4];
    const walk = reduced ? null : ((t / 520) % 1);
    g.save(); g.translate(16, 14);
    pr.player({ x: 0, y: 0, dir, walk, stamina: 1, yawn: !reduced && Math.floor(t / 1400) % 9 === 8 }, t);
    g.restore();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return () => { run = false; };
}
