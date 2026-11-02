// Hauptmenü im Pixel-Abenteuer-Stil: Hinter allem läuft eine lebendige Raum-Szene der aktuellen
// Welt (gleicher Renderer wie im Spiel), davor ein hängendes Holzschild und Holz-/Pergament-Knöpfe.
// Unterseiten: #/menu, #/menu/chapters[/i], #/menu/chapter/i, #/menu/kit, #/menu/shop.
import { PUSH_LEVELS, CHAPTERS } from '../game/pushLevels.js';
import { isSolved, bestMoves, starsFor } from '../game/progress.js';
import { SKIN_COLORS, SKIN_TONES, LANTERNS, getSkin, setSkin, getLook, setLook, hasHalloween, TRAILS } from '../game/skins.js';
import { redeem, usedCodes, toggleCode, resetAll, ALL_CODES, CODE_PASSWORD } from '../game/codes.js';
import { jumpscare } from './jumpscare.js';
import { CHANGELOG } from '../game/changelog.js';
import { UPGRADES, shownSkins, ownsSkin, pickSkin, swordSkin, getCombat, nextCost, upgrade, foeOf, bossBeaten, bossPending, worldDone } from '../game/combat.js';
import { icon } from './icons.js';
import { prefersReducedMotion, getSettings, updateSettings } from '../settings.js';
import { play, isMuted, toggleMute } from '../game/sound.js';
import { setMusic, stopMusic } from '../game/music.js';
import { volumeHtml, bindVolume } from './volume.js';
import { WORLDS, worldForChapter, CHAPTER_WORLD } from '../game/worlds.js';
import { todayKey } from '../game/daily.js';
import { tutorialSeen, fragmentCount } from '../adventure/adventure.js';
import { ITEMS, HATS, getInv, addCoins, buy, buyHat, wearHat, hat, ownsHat, crystalsSpent } from '../game/inventory.js';
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
import { roomThumb } from './menuScene.js';
import { mountTitleArt, titleThumb } from './titleArt.js';
import { logoCanvas } from './logo.js';
import { isAdmin } from '../game/admin.js';
import { checkUpdate, applyUpdate, showUpdate } from './updater.js';
import { transitionTo, CURTAINS } from './transition.js';
import { VERSION, LABEL } from '../version.js';

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
  const pending = bossPending();
  const open = isAdmin() || ((pending < 0 || ci <= pending) && (idx.some((i) => isSolved(PUSH_LEVELS[i].id) || i === firstOpen) || firstOpen < 0 || (ci > 0 && bossBeaten(ci - 1))));
  return { ch, idx, solved, stars, open, done: solved === idx.length };
}
const currentChapter = () => { const t = totals(); return t.firstOpen < 0 ? 0 : Math.max(0, CHAPTERS.findIndex((c) => c.levels.includes(PUSH_LEVELS[t.firstOpen].id))); };

/** Menü-Hintergrund: selbst gewählte Welt, sonst die zuletzt betretene, sonst die aktuelle. */
const menuBackground = () => { const { menuBg, lastWorld } = getSettings(); return [menuBg, lastWorld].find((w) => WORLDS[w]) || themeOf(currentChapter()); };

export function mountMenu(root, params = []) {
  const page = params[0] || 'main';
  root.innerHTML = `<section class="tm${page === 'main' ? '' : ' sub'}"><canvas class="tm-scene" aria-hidden="true"></canvas><div class="tm-shade"></div><div class="tm-ui"></div></section>`;
  const ui = root.querySelector('.tm-ui');
  const startCh = page === 'chapter' || page === 'chapters' ? Math.max(0, parseInt(params[1] ?? currentChapter(), 10) || 0) : currentChapter();
  // Welt-Seiten zeigen einen lebendigen Raum der Welt, alle anderen das eigene Titelbild
  const worldPage = page === 'chapter' || page === 'chapters';
  if (page === 'chapter') updateSettings({ lastWorld: themeOf(startCh) }); // Welt betreten: Hauptmenü zeigt sie ab sofort
  document.body.dataset.world = worldPage ? themeOf(startCh) : menuBackground(); // Oberflächenfarben der Welt
  setMusic(worldPage ? themeOf(startCh) : getSettings().radio || 'menu');
  // Panorama der Welt: auf Welten-Seiten die gezeigte, sonst die aktuelle – oder das selbst gewählte
  const scene = mountTitleArt(root.querySelector('.tm-scene'), worldPage ? themeOf(startCh) : menuBackground());
  let cleanup = () => {};

  // Gesperrte Modi: Hinweis statt Inhalt (Welten-Seiten zählen als Modus „worlds“)
  const lockId = { chapters: 'worlds', chapter: 'worlds', kit: 'kit', shop: 'shop' }[page];
  if (lockId && !isUnlocked(lockId)) ui.innerHTML = lockedHtml(lockId);
  else if (page === 'chapters') cleanup = chaptersPage(ui, parseInt(params[1] ?? '-1', 10), scene);
  else if (page === 'chapter') chapterPage(ui, parseInt(params[1] || '0', 10));
  else if (page === 'kit') cleanup = kitPage(ui, scene);
  else if (page === 'shop') shopPage(ui);
  else if (page === 'forge') forgePage(ui);
  else if (page === 'radio') radioPage(ui);
  else if (page === 'updates') updatesPage(ui);
  else if (page === 'settings') settingsPage(ui);
  else if (page === 'code') codePage(ui);
  else if (page === 'codes') myCodesPage(ui);
  else { ui.classList.add('tm-main', 'mm'); mainPage(ui); }

  const onKey = (e) => {
    if (e.key === 'Escape' && page !== 'main') location.hash = page === 'chapter' ? `#/menu/chapters/${params[1] || 0}` : page === 'codes' ? '#/menu/code' : '#/menu';
  };
  window.addEventListener('keydown', onKey);
  return () => { cleanup(); scene.stop(); window.removeEventListener('keydown', onKey); };
}

const head = (back, title, right = '') => `<div class="tm-head"><a class="wbtn sm" href="${back}">← Zurück</a><h2 class="tm-plank">${title}</h2>${right ? `<span class="tm-purse">${right}</span>` : '<span></span>'}</div>`;
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
  const boss = bossPending();
  const MODE_ICON = { worlds: 'map', kit: 'hero', daily: 'cal', shop: 'cart' };
  el.innerHTML = `
    <ul class="mm-stats" aria-label="Fortschritt">
      <li title="Räume">${icon('door')}<b>${t.solved}</b>/${PUSH_LEVELS.length}</li>
      <li title="Sterne">${icon('star')}<b>${t.stars}</b>/${t.maxStars}</li>
      <li title="Münzen">${icon('coin')}<b>${getInv().coins}</b></li>
      <li title="Kristalle">${icon('gem')}<b>${fragmentCount()}</b></li>
      <li class="mm-radio"><a href="#/menu/radio" title="Radio" aria-label="Radio">${icon('note')}</a></li>
    </ul>
    <div class="mm-a">
      <header class="mm-logo" aria-label="Prismara"><h1 class="logo-h1"><span class="sr">PRISMARA</span></h1><p>${isAdmin() ? 'ADMIN-MODUS' : 'Ein Licht-Abenteuer'}</p></header>
      <a class="wbtn big mm-play" id="play" href="${fresh ? '#/adv/tutorial' : boss >= 0 ? `#/arena/${boss}` : next ? `#/adv/${t.firstOpen}` : '#/menu/chapters'}">
        <span class="mm-play-ic">${icon('play')}</span><span class="mm-play-txt"><b>${fresh ? 'ABENTEUER BEGINNEN' : boss >= 0 ? 'BOSSKAMPF' : 'SPIELEN'}</b><small>${fresh ? 'Mit dem Lehrzimmer' : boss >= 0 ? esc(foeOf(themeOf(boss)).boss) : next ? `Weiter: ${esc(next.name)}` : 'Alle Räume geschafft!'}</small></span></a>
    </div>
    <div class="mm-b">
      ${newModes.length ? `<div class="tm-unlock parch" role="status">Neu freigeschaltet: <b>${newModes.map((m) => esc(m.name)).join(', ')}</b></div>` : ''}
      ${fresh ? '' : `<a class="tm-journey parch" href="#/menu/chapter/${ci}" data-world="${esc(wid || '')}">
        <span class="tj-icon" aria-hidden="true">${world?.icon || info.ch.icon}</span>
        <span class="tj-body"><span class="tj-kicker">WELT ${ci + 1} VON ${CHAPTERS.length}</span><span class="tj-name">${esc(world?.name || info.ch.name)}</span>
          <span class="tj-bar" aria-label="${info.solved} von ${info.idx.length} Räumen"><i style="width:${pct}%"></i></span></span></a>`}
      <nav class="mm-tiles" aria-label="Hauptmenü">${MODES.map((m) => {
        const href = { worlds: `#/menu/chapters/${currentChapter()}`, kit: '#/menu/kit', daily: '#/daily', shop: '#/menu/shop' }[m.id];
        if (!isUnlocked(m.id, t.solved)) return `<span class="wbtn mm-tile locked" aria-disabled="true" title="${esc(m.info)}">${icon('lock')}<span>${m.name}</span><small>ab ${m.need} Räumen</small></span>`;
        const glow = (m.id === 'daily' && !daily) || freshModes.has(m.id);
        return `<a class="wbtn mm-tile${glow ? ' glow' : ''}" href="${href}">${icon(MODE_ICON[m.id])}<span>${m.name}${m.id === 'daily' && daily ? ' ✓' : ''}</span></a>`;
      }).join('')}<a class="wbtn mm-tile" href="#/menu/forge">${icon('sword')}<span>Schmiede</span></a></nav>
      <div class="mm-tools">
        <a class="wbtn sm" href="#/menu/code">${icon('key')}<span>Code</span></a>
        <a class="wbtn sm" href="#/menu/settings">${icon('gear')}<span>Optionen</span></a>
        <button class="wbtn sm" id="upd" type="button">${icon('reset')}<span>Update</span></button>
        <a class="wbtn sm" href="#/lab">${icon('brain')}<span>Lab</span></a>
      </div>
      <a class="tm-version" href="#/menu/updates">Version ${VERSION === 'dev' ? 'lokal' : LABEL} · Updates</a>
    </div>`;
  const logo = logoCanvas(); logo.className = isAdmin() ? 'logo admin' : 'logo'; // Admin-Modus: rotes Logo logo.setAttribute('aria-hidden', 'true');
  el.querySelector('.logo-h1').prepend(logo);
  el.querySelector('#upd').addEventListener('click', async (e) => {
    const b = e.currentTarget.querySelector('span');
    if (VERSION === 'dev') { b.textContent = 'Lokal'; return; }
    b.textContent = 'Prüfe …';
    const info = await checkUpdate();
    if (info) { b.textContent = 'Lädt …'; applyUpdate(info.version); } else { b.textContent = '✓ Aktuell'; play('ui'); }
  });
  el.querySelector('#play').focus();
  el.querySelector('#play').addEventListener('click', () => play('play'));
}

// ---------- Code eingeben: „freeadmin“ schaltet alles frei ----------
function codePage(el) {
  const applyCode = (text) => {
    const code = redeem(text);
    if (code === 'resetall') { play('bump'); confirmReset(); return; }
    if (code === 'function') { play('ui'); askPassword(); return; }
    if (code === 'used') { play('bump'); render('Diesen Code hast du schon eingelöst.'); return; }
    if (code === 'moneten') { play('chapter'); render('250 Münzen gehören dir!'); return; }
    if (!code) { play('bump'); render('Dieser Code stimmt nicht.'); return; }
    play('chapter');
    if (code === 'halloween') {
      render('🎃 Halloween-Umhang freigeschaltet und angelegt!');
      setTimeout(() => { stopMusic(); setTimeout(jumpscare, 1400); }, 4000 + Math.random() * 5000); // erst in Sicherheit wiegen, dann Stille, dann zuschlagen
    } else render(code === 'dinnerbone' ? 'Dein Held steht jetzt auf dem Kopf.' : '');
  };
  const render = (msg = '') => {
    const on = isAdmin();
    el.innerHTML = `
      ${head('#/menu', '🔑 Code')}
      <form class="parch settings code-form">
        ${on ? '<p class="code-msg">✓ Admin-Modus ist an: Alle Räume, Welten, Modi, Umhänge und Hüte sind frei, alle Gegenstände unendlich.</p>' : ''}
        <label for="code">Code eingeben</label>
        <input id="code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="32">
        <button class="wbtn big" type="submit">Einlösen</button>
        ${usedCodes().length ? '<a class="wbtn" href="#/menu/codes">Meine Codes verwalten</a>' : ''}
        ${msg ? `<p class="code-msg">${esc(msg)}</p>` : ''}
        ${on ? `<a class="wbtn big" href="#/menu/chapters/0">🗺 Zu den Welten</a>
        <h3>🐞 Debug</h3>
        <div class="dbg-grid"><button class="wbtn sm" type="button" data-d="coins">+1000 Münzen</button><button class="wbtn sm" type="button" data-d="update">Update-Nachricht testen</button></div>
        <h3>Vorhänge testen</h3>
        <div class="dbg-grid">${Object.keys(CURTAINS).map((id) => `<button class="wbtn sm" type="button" data-curtain="${id}">${esc(WORLDS[id]?.name || 'Lehrzimmer')}</button>`).join('')}</div>` : ''}
      </form>`;
    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      applyCode(el.querySelector('#code').value);
    });
    el.querySelector('[data-d="coins"]')?.addEventListener('click', () => { addCoins(1000); play('target', 7); render(`🪙 Jetzt ${getInv().coins} Münzen`); });
    el.querySelector('[data-d="update"]')?.addEventListener('click', () => showUpdate({ version: '0', label: 'Test', note: 'So sieht die Update-Nachricht aus.' }));
    el.querySelectorAll('[data-curtain]').forEach((b) => b.addEventListener('click', () => transitionTo(location.hash, { from: b.dataset.curtain, to: b.dataset.curtain, label: 'Vorhang-Test' })));
    el.querySelector('#code')?.focus();
  };
  // Code „function“: nach dem Passwort die Liste aller Codes
  // Die Unterseiten liegen auf derselben Adresse, der Link allein löst also nichts aus
  const backToForm = () => el.querySelector('.tm-head a').addEventListener('click', (e) => { e.preventDefault(); play('ui'); render(); });
  const askPassword = (msg = '') => {
    el.innerHTML = `
      ${head('#/menu/code', 'Passwort')}
      <form class="parch settings code-form">
        <label for="pw">Passwort eingeben</label>
        <input id="pw" type="password" inputmode="numeric" autocomplete="off" maxlength="16">
        <button class="wbtn big" type="submit">Öffnen</button>
        ${msg ? `<p class="code-msg">${esc(msg)}</p>` : ''}
      </form>`;
    backToForm();
    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (el.querySelector('#pw').value !== CODE_PASSWORD) { play('bump'); askPassword('Falsches Passwort.'); return; }
      play('chapter');
      el.innerHTML = `
        ${head('#/menu/code', 'Geheime Codes')}
        <div class="parch settings">${ALL_CODES.map(([id, info]) => `<div class="set-row"><span class="code-row"><b>${esc(id)}</b><small>${esc(info)}</small></span><button class="wbtn sm" type="button" data-apply="${esc(id)}">Anwenden</button></div>`).join('')}</div>`;
      backToForm();
      el.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', () => applyCode(b.dataset.apply)));
    });
    el.querySelector('#pw').focus();
  };
  // resetall löscht alles und lässt sich nicht rückgängig machen, darum einmal nachfragen
  const confirmReset = () => {
    el.innerHTML = `
      ${head('#/menu', 'Spiel zurücksetzen')}
      <div class="parch settings code-form">
        <p class="code-msg">Wirklich alles löschen? Räume, Sterne, Münzen, Gegenstände, Aussehen und Codes sind danach weg.</p>
        <button class="wbtn" type="button" id="rs-no">Abbrechen</button>
        <button class="wbtn big rs-yes" type="button" id="rs-yes">Alles löschen</button>
      </div>`;
    el.querySelector('#rs-no').addEventListener('click', () => { play('ui'); render(); });
    el.querySelector('#rs-yes').addEventListener('click', resetAll);
    el.querySelector('#rs-no').focus();
  };
  render();
}

// ---------- Meine Codes: jede eingelöste Code-Funktion einzeln an- und ausschalten ----------
function myCodesPage(el) {
  const render = () => {
    el.innerHTML = `
      ${head('#/menu/code', 'Meine Codes')}
      <div class="parch settings">
        ${usedCodes().map((c) => `<div class="set-row"><span class="code-row"><b>${esc(c.name)}</b><small>${esc(c.info)}</small></span>
          <button class="wbtn sm" type="button" data-code="${c.id}" aria-pressed="${c.on()}">${c.on() ? 'AN' : 'AUS'}</button></div>`).join('') || '<p class="code-msg">Du hast noch keine Codes eingelöst.</p>'}
      </div>`;
    el.querySelectorAll('[data-code]').forEach((b) => b.addEventListener('click', () => {
      toggleCode(b.dataset.code); play('ui'); render();
      el.querySelector(`[data-code="${b.dataset.code}"]`)?.focus();
    }));
  };
  render();
}

// ---------- Einstellungen: Ton, Bewegung, Tutorial nochmal ----------
function settingsPage(el) {
  const render = () => {
    const rm = getSettings().reducedMotion;
    el.innerHTML = `
      ${head('#/menu', '⚙ Einstellungen')}
      <div class="parch settings">
        <div class="set-row"><span>🔇 Alles stumm</span><button class="wbtn sm" id="snd" aria-pressed="${isMuted()}">${isMuted() ? 'AN' : 'AUS'}</button></div>
        <div class="set-row vol-box">${volumeHtml()}</div>
        <div class="set-row"><span>🌀 Bewegung reduzieren</span><button class="wbtn sm" id="motion" aria-pressed="${!!rm}">${rm === null ? 'SYSTEM' : rm ? 'AN' : 'AUS'}</button></div>
        <div class="set-row"><span>📖 Tutorial (Lehrzimmer)</span><a class="wbtn sm" href="#/adv/tutorial">NOCHMAL SPIELEN</a></div>
        <div class="set-row"><span>◈ Prismara Lab</span><a class="wbtn sm" href="#/lab">ÖFFNEN</a></div>
      </div>`;
    el.querySelector('#snd').addEventListener('click', () => { toggleMute(); play('ui'); render(); el.querySelector('#snd').focus(); });
    bindVolume(el);
    el.querySelector('#motion').addEventListener('click', () => {
      updateSettings({ reducedMotion: rm === null ? true : rm ? false : null }); play('ui'); render(); el.querySelector('#motion').focus();
    });
  };
  render();
}

// ---------- Weltenauswahl: Leiste mit dem Panorama jeder Welt; Hintergrund, Farben und Musik wechseln mit ----------
function chaptersPage(el, start, scene) {
  const t = totals();
  let cur = start >= 0 && start < CHAPTERS.length ? start : currentChapter();
  let musicTimer = 0;
  el.closest('.tm').classList.add('worlds');
  el.innerHTML = `
    ${head('#/menu', 'Welten', `★ ${t.stars}/${t.maxStars}`)}
    <div class="wsel-info parch" id="info" aria-live="polite"></div>
    <div class="wstrip" id="strip" role="listbox" aria-label="Welten">${CHAPTERS.map((ch, i) => {
      const info = chapterInfo(i), w = worldForChapter(ch.id);
      return `<button class="wtile${info.open ? '' : ' locked'}${info.done ? ' done' : ''}" role="option" data-i="${i}">
        <canvas></canvas>${info.open ? '' : '<span class="wlock">🔒</span>'}${info.done ? '<span class="wdone">✓</span>' : ''}
        <span class="wt-name">${esc(w?.name || ch.name)}</span>
        <span class="wbar"><i style="width:${Math.round((info.solved / info.idx.length) * 100)}%"></i></span></button>`;
    }).join('')}</div>
    <p class="tm-tip">Mausrad oder ← → wählen · Enter betreten · Esc zurück</p>`;
  const strip = el.querySelector('#strip'), tiles = [...strip.children];
  tiles.forEach((b, i) => titleThumb(b.querySelector('canvas'), themeOf(i)));

  function select(i, smooth = true, dir = 0) {
    cur = i;
    const info = chapterInfo(i), w = worldForChapter(info.ch.id), id = themeOf(i);
    scene.setWorld(id, dir || 1);
    document.body.dataset.world = id;
    clearTimeout(musicTimer); musicTimer = setTimeout(() => setMusic(id), 350); // beim schnellen Durchblättern nicht jedes Lied anspielen
    const next = info.idx.find((n) => !isSolved(PUSH_LEVELS[n].id));
    const infoEl = el.querySelector('#info');
    infoEl.classList.remove('in-right', 'in-left'); void infoEl.offsetWidth; // Animation neu starten
    if (dir) infoEl.classList.add(dir > 0 ? 'in-right' : 'in-left');
    infoEl.innerHTML = `
      <span class="wnum">WELT ${i + 1} VON ${CHAPTERS.length}</span>
      <span class="wname">${w?.icon || ''} ${esc(w?.name || info.ch.name)}</span>
      <span class="wsum">${esc(info.ch.summary)}</span>
      <span class="wrow">Schwierigkeit ${skulls(difficulty(i))} · <b>${info.solved}/${info.idx.length}</b> Räume · <b class="gold">★ ${info.stars}/${info.idx.length * 3}</b></span>
      ${info.open ? `<a class="wbtn big" id="enter" href="#/menu/chapter/${i}">▶ ${info.done ? 'Räume ansehen' : next != null ? 'Betreten' : 'Betreten'}</a>` : '<span class="wlocked">🔒 Schaffe zuerst die Welt davor</span>'}`;
    tiles.forEach((b, n) => { b.classList.toggle('on', n === i); b.setAttribute('aria-selected', String(n === i)); });
    history.replaceState(null, '', `#/menu/chapters/${i}`);
    tiles[i].scrollIntoView({ behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  }
  const go = (d) => { play('swipe'); select((cur + d + CHAPTERS.length) % CHAPTERS.length, true, d); tiles[cur].focus({ preventScroll: true }); };
  // Mausrad blättert durch die Welten (Hochkant-Handy wischt die Leiste direkt)
  let wheelSum = 0, wheelAt = 0;
  el.closest('.tm').addEventListener('wheel', (e) => {
    e.preventDefault();
    wheelSum += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const now = performance.now();
    if (Math.abs(wheelSum) < 30 || now - wheelAt < 240) return;
    wheelAt = now; go(wheelSum > 0 ? 1 : -1); wheelSum = 0;
  }, { passive: false });
  strip.addEventListener('click', (e) => {
    const b = e.target.closest('.wtile'); if (!b) return;
    const i = +b.dataset.i;
    if (i === cur && chapterInfo(i).open) location.hash = `#/menu/chapter/${i}`;
    else { play('swipe'); select(i, true, Math.sign(i - cur)); }
  });
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd') { go(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'a') { go(-1); e.preventDefault(); }
    if (e.key === 'Enter' && chapterInfo(cur).open) { location.hash = `#/menu/chapter/${cur}`; e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey);
  select(cur, false);
  tiles[cur].focus({ preventScroll: true });
  return () => { clearTimeout(musicTimer); window.removeEventListener('keydown', onKey); };
}

// ---------- Weltseite: Raumkarten mit Vorschaubild ----------
function chapterPage(el, ci) {
  ci = Math.max(0, Math.min(CHAPTERS.length - 1, ci));
  const info = chapterInfo(ci);
  const { firstOpen } = totals();
  const w = worldForChapter(info.ch.id);
  const nextRoom = info.idx.find((i) => !isSolved(PUSH_LEVELS[i].id) && (isAdmin() || (i === firstOpen && bossPending() < 0)));
  const pct = Math.round((info.solved / info.idx.length) * 100);
  const bossOpen = isAdmin() || worldDone(ci);
  el.innerHTML = `
    ${head(`#/menu/chapters/${ci}`, `${w ? `${w.icon} ${esc(w.name)}` : esc(info.ch.name)}`, `${icon('coin')} ${getInv().coins}`)}
    <div class="lv">
      <aside class="lv-side parch">
        <span class="wnum">WELT ${ci + 1} VON ${CHAPTERS.length}</span>
        <span class="lv-name">${esc(info.ch.name)}</span>
        <span class="lv-row">Schwierigkeit ${skulls(difficulty(ci))}</span>
        <span class="wbar" aria-label="${info.solved} von ${info.idx.length} Räumen"><i style="width:${pct}%"></i></span>
        <span class="lv-count"><span>${icon('door')} ${info.solved}/${info.idx.length}</span><span>${icon('star')} ${info.stars}/${info.idx.length * 3}</span></span>
        ${nextRoom != null ? `<a class="wbtn big lv-go" href="#/adv/${nextRoom}">${icon('play')} WEITER<small>${esc(PUSH_LEVELS[nextRoom].name)}</small></a>` : `<span class="lv-done">${icon('check')} Welt geschafft</span>`}
      </aside>
      <ol class="rooms lv-trail">${info.idx.map((i, k) => {
        const l = PUSH_LEVELS[i];
        const solved = isSolved(l.id);
        const open = isAdmin() || (info.open && (solved || (i === firstOpen && bossPending() < 0)));
        const inner = `<span class="rthumb"><canvas data-i="${i}"></canvas>
          <span class="rbadge">${k + 1}</span>
          ${solved ? `<span class="rstamp">${icon('check')}</span>` : ''}
          ${open ? '' : `<span class="wlock">${icon('lock')}</span>`}${l.master ? `<span class="rcrown">${icon('crown')}</span>` : ''}
          ${i === nextRoom ? '<span class="rflag">HIER</span>' : ''}</span>
          <span class="rinfo"><span class="rname">${esc(l.name)}</span>
          <span class="rfoot"><span class="rstars">${starRow(starsOf(l))}</span><span class="rmeta">${solved ? `Best ${bestMoves(l.id)} / ${l.par}` : `Ziel ${l.par}`}</span></span></span>`;
        return open
          ? `<li><a class="room parch${solved ? ' solved' : ' next'}${l.master ? ' master' : ''}" href="#/adv/${i}" style="--k:${k}">${inner}</a></li>`
          : `<li><span class="room parch locked${l.master ? ' master' : ''}" style="--k:${k}">${inner}</span></li>`;
      }).join('')}
        <li><${bossOpen ? `a href="#/arena/${ci}"` : 'span'} class="room parch rboss${bossOpen ? '' : ' locked'}" style="--k:${info.idx.length}"><span class="rinfo"><span class="rnum">KAMPF</span><span class="rname">${esc(foeOf(themeOf(ci)).boss)}</span><span class="rmeta">${bossBeaten(ci) ? 'Besiegt' : bossOpen ? 'Bereit zum Kampf' : 'Erst alle Räume schaffen'}</span></span></${bossOpen ? 'a' : 'span'}></li></ol>
    </div>`;
  el.querySelectorAll('.rthumb canvas').forEach((c) => roomThumb(c, PUSH_LEVELS[+c.dataset.i], themeOf(ci), 1));
  (el.querySelector('.room.next') || el.querySelector('a.room'))?.focus();
}

// ---------- Schmiede: Schwert verbessern und Waffen-Skins ----------
function forgePage(el) {
  const render = (msg = '') => {
    const inv = getInv();
    el.innerHTML = `
      ${head('#/menu', 'Schmiede', `${icon('coin')} ${inv.coins}`)}
      <div class="shop">
        <div class="parch shop-keeper"><span class="shop-face" aria-hidden="true">⚒</span><p>Die Schmiede verbessert dein Redstone-Schwert. ${msg || 'Billig ist hier nichts, spar gut.'}</p></div>
        <ul class="shop-list">${Object.entries(UPGRADES).map(([id, u]) => {
          const cost = nextCost(id), lvl = getCombat()[id];
          return `<li class="parch shop-item"><span class="si-icon">${icon(id === 'armor' ? 'heart' : 'sword')}</span>
            <span class="si-text"><b>${esc(u.name)} ${lvl + 1}/${u.values.length}</b><small>${esc(u.info)}</small><em>${u.values[lvl]} ${u.unit}</em></span>
            <button class="wbtn sm" data-up="${id}" ${cost == null || inv.coins < cost ? 'disabled' : ''}>${cost == null ? 'MAX' : cost ? `${icon('coin')} ${cost}` : 'GRATIS'}</button></li>`;
        }).join('')}</ul>
        <div class="kit-row sword-skins">${shownSkins().map((s) => `<button class="kit-swatch${swordSkin().id === s.id ? ' active' : ''}" data-sword="${s.id}" aria-pressed="${swordSkin().id === s.id}"><span class="ks-dot" style="background:${s.blade};box-shadow:0 0 0 3px ${s.edge}"></span><small>${esc(s.name)}${ownsSkin(s.id) ? '' : ` ${s.price}`}</small></button>`).join('')}</div>
      </div>`;
    el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { if (upgrade(b.dataset.up)) play('target', 7); render('Die Klinge glüht – Verbesserung geschafft!'); }));
    el.querySelectorAll('[data-sword]').forEach((b) => b.addEventListener('click', () => { const ok = pickSkin(b.dataset.sword); play(ok ? 'ui' : 'bump'); render(ok ? 'Schöne Waffe!' : 'Dafür fehlen dir Münzen.'); }));
  };
  render();
}

// ---------- Radio: je erreichter Welt ein Lied, das Gewählte läuft im Menü ----------
const SONG_TITLES = {
  menu: 'Lied vom Lagerfeuer', beach: 'Sonne auf der Haut', cherry: 'Wenn die Blüten fallen', jungle: 'Trommeln im Blätterdach', castle: 'Marsch der Kerkerwache',
  moor: 'Stimmen im Nebel', night: 'Mondlicht-Walzer', volcano: 'Hammer und Glut', temple: 'Der Sand erinnert sich', shadow: 'Was im Dunkel wartet',
  aurora: 'Tanz der Polarlichter', reef: 'Lied der Tiefe', boss: 'Der letzte Atemzug',
};
function radioPage(el) {
  const tracks = [
    { id: 'menu', world: 'Hauptmenü', open: true },
    ...CHAPTERS.map((c, i) => ({ id: themeOf(i), world: WORLDS[themeOf(i)]?.name || c.name, open: chapterInfo(i).open })),
    { id: 'boss', world: 'Bosskampf', open: isAdmin() || CHAPTERS.some((_, i) => bossBeaten(i)) },
  ];
  const render = () => {
    const now = getSettings().radio || 'menu', cur = tracks.find((t) => t.id === now) || tracks[0];
    el.innerHTML = `
      ${head('#/menu', 'Radio', `${tracks.filter((t) => t.open).length}/${tracks.length}`)}
      <div class="rd">
        <div class="rd-now parch"><span class="rd-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="rd-info"><small>LÄUFT GERADE · ${esc(cur.world)}</small><b>${esc(SONG_TITLES[cur.id] || cur.world)}</b></span></div>
        <ol class="rd-list">${tracks.map((t, i) => `<li><button class="rd-track${now === t.id ? ' on' : ''}" type="button" ${t.open ? `data-track="${t.id}"` : 'disabled'} aria-pressed="${now === t.id}">
          <span class="rd-no">${t.open ? (now === t.id ? icon('note') : i + 1) : icon('lock')}</span>
          <span class="rd-text"><b>${t.open ? esc(SONG_TITLES[t.id] || t.world) : '???'}</b><small>${t.open ? esc(t.world) : 'Noch nicht entdeckt'}</small></span></button></li>`).join('')}</ol>
      </div>`;
    el.querySelectorAll('[data-track]').forEach((b) => b.addEventListener('click', () => {
      updateSettings({ radio: b.dataset.track }); setMusic(b.dataset.track); render();
      el.querySelector(`[data-track="${b.dataset.track}"]`)?.focus();
    }));
  };
  render();
}

// ---------- Update-Log ----------
function updatesPage(el) {
  el.innerHTML = `
    ${head('#/menu', 'Updates')}
    <div class="rd">${CHANGELOG.map((u, i) => `<section class="parch up-card"><b>Version ${esc(u.v)}${i ? '' : ' · Neu'}</b><ul>${u.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`).join('')}</div>`;
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
            <button class="wbtn sm" data-buy="${id}" ${sold || (!isAdmin() && inv.coins < it.price) ? 'disabled' : ''}>${sold ? '✓ gekauft' : isAdmin() ? 'GRATIS' : `🪙 ${it.price}`}</button></li>`;
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
function kitPage(el, scene) {
  const { stars } = totals();
  const render = () => {
    const skin = getSkin(), worn = hat(), look = getLook(), bg = getSettings().menuBg || '';
    const allOpen = CHAPTERS.every((_, i) => chapterInfo(i).open);
    const bgWorlds = CHAPTERS.map((c) => CHAPTER_WORLD[c.id]).filter((id) => WORLDS[id]);
    const owned = Object.entries(HATS).filter(([id]) => ownsHat(id));
    el.innerHTML = `
      ${head('#/menu', '🎨 Held', `★ ${stars}`)}
      <div class="kit parch">
        <div class="kit-stage"><canvas class="kit-big" width="48" height="48" aria-label="Vorschau deines Helden: Umhang ${esc(skin.color.name)}${worn ? `, ${esc(HATS[worn].name)}` : ''}"></canvas></div>
        <div>
          <h3>Umhang</h3>
          <div class="kit-row">${SKIN_COLORS.filter((c) => !c.secret || isAdmin() || hasHalloween()).map((c) => {
            const locked = !isAdmin() && stars < c.stars, active = skin.color.id === c.id;
            return `<button class="kit-swatch${active ? ' active' : ''}" ${locked ? 'disabled' : `data-pick="color" data-id="${c.id}"`} aria-pressed="${active}" title="${esc(c.name)}${locked ? ` – ab ★ ${c.stars}` : ''}">
              <canvas class="ks-cloak" data-color="${c.id}" width="12" height="12"></canvas><small>${locked ? `🔒 ★${c.stars}` : esc(c.name)}</small></button>`;
          }).join('')}</div>
          <h3>Hut</h3>
          <div class="kit-row">
            <button class="kit-swatch${worn ? '' : ' active'}" data-hat="" aria-pressed="${!worn}"><canvas class="ks-hat" data-hat="" width="24" height="28"></canvas><small>Ohne</small></button>
            ${owned.map(([id, h]) => `<button class="kit-swatch${worn === id ? ' active' : ''}" data-hat="${id}" aria-pressed="${worn === id}"><canvas class="ks-hat" data-hat="${id}" width="24" height="28"></canvas><small>${esc(h.name)}</small></button>`).join('')}
          </div>
          <h3>Hautton</h3>
          <div class="kit-row">${SKIN_TONES.map((t) => `<button class="kit-swatch${look.tone.id === t.id ? ' active' : ''}" data-tone="${t.id}" aria-pressed="${look.tone.id === t.id}"><span class="ks-dot" style="background:${t.color}"></span><small>${esc(t.name)}</small></button>`).join('')}</div>
          <h3>Spur</h3>
          <div class="kit-row">${TRAILS.map((t) => { const locked = !isAdmin() && stars < t.stars, on = look.trail.id === t.id; return `<button class="kit-swatch${on ? ' active' : ''}" ${locked ? 'disabled' : `data-trail="${t.id}"`} aria-pressed="${on}"><span class="ks-dot" style="background:${t.color || 'transparent'}"></span><small>${locked ? `★${t.stars}` : esc(t.name)}</small></button>`; }).join('')}</div>
          <h3>Laterne</h3>
          <div class="kit-row">${LANTERNS.map((t) => `<button class="kit-swatch${look.lantern.id === t.id ? ' active' : ''}" data-lantern="${t.id}" aria-pressed="${look.lantern.id === t.id}"><span class="ks-dot" style="background:${t.color};box-shadow:0 0 0 3px ${t.glow}"></span><small>${esc(t.name)}</small></button>`).join('')}</div>
          ${allOpen ? `<h3>Anpassung: Menü-Hintergrund</h3>
          <div class="kit-row">
            <button class="kit-swatch${bg ? '' : ' active'}" data-bg="" aria-pressed="${!bg}"><small>Zuletzt betreten</small></button>
            ${bgWorlds.map((id) => `<button class="kit-swatch${bg === id ? ' active' : ''}" data-bg="${id}" aria-pressed="${bg === id}"><small>${WORLDS[id].icon} ${esc(WORLDS[id].name)}</small></button>`).join('')}
          </div>` : ''}
          <p class="small">Neue Umhänge schaltest du mit Sternen frei, Hüte gibt es im Shop gegen Kristalle 💎.</p>
        </div>
      </div>`;
    el.querySelectorAll('.ks-cloak').forEach((c) => drawCloak(c, SKIN_COLORS.find((s) => s.id === c.dataset.color)));
    el.querySelectorAll('.ks-hat').forEach((c) => drawHatPreview(c, c.dataset.hat)); // '' = ohne Hut
    el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      setSkin({ color: b.dataset.id }); play('ui'); render();
      el.querySelector(`[data-id="${b.dataset.id}"]`)?.focus();
    }));
    const pick = (attr, fn) => el.querySelectorAll(`[data-${attr}]`).forEach((b) => b.addEventListener('click', () => {
      fn(b.dataset[attr]); play('ui'); render();
      el.querySelector(`[data-${attr}="${b.dataset[attr]}"]`)?.focus();
    }));
    pick('tone', (id) => setLook({ tone: id }));
    pick('lantern', (id) => setLook({ lantern: id }));
    pick('trail', (id) => setLook({ trail: id }));
    pick('bg', (id) => { updateSettings({ menuBg: id || null }); scene.setWorld(menuBackground()); document.body.dataset.world = menuBackground(); });
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
