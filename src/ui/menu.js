// Hauptmenü im Pixel-Abenteuer-Stil: Hinter allem läuft eine lebendige Raum-Szene der aktuellen
// Welt (gleicher Renderer wie im Spiel), davor ein hängendes Holzschild und Holz-/Pergament-Knöpfe.
// Unterseiten: #/menu, #/menu/chapters[/i], #/menu/chapter/i, #/menu/kit, #/menu/shop.
import { PUSH_LEVELS, CHAPTERS } from '../game/pushLevels.js';
import { isSolved, bestMoves, starsFor } from '../game/progress.js';
import { SKIN_COLORS, SKIN_TONES, LANTERNS, getSkin, setSkin, getLook, setLook, hasHalloween, TRAILS, AURAS, ownsAura, buyAura, GOALS, CAPES, ownedHeroes, buyHero, getPreview, setPreview, dupes, addDupe, SELL_PRICE, getSpins, addSpins, rollSkin, rarityOf, RARITY, skinTint, setSkinTint } from '../game/skins.js';
import { redeem, usedCodes, toggleCode, resetAll, ALL_CODES, CODE_PASSWORD } from '../game/codes.js';
import { jumpscare } from './jumpscare.js';
import { spanAllMonitors, startCinema } from '../game/cinematic.js';
import { drawSwordIcon } from '../game/monsters.js';
const shadeHex = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c + (k > 0 ? (255 - c) * k : c * k)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
import { CHANGELOG } from '../game/changelog.js';
import * as fx from '../game/fx.js';
const fxNs = fx;
import { TEXTURES, texture } from '../game/textures.js';
import { swordTint, setSwordTint, hasMagic, SPELLS, spellSlots, setSlots, spellOf, presets, savePreset, spellStats, spellCost, levelSpell, TALENTS, talentLv, talentCost, levelTalent, manaMax, manaRegen, MAX_SPELL_LV, MAGIC_COLORS, magicColor, ownsMagic, pickMagic, PARTS, partOf, ownsPart, pickPart, UPGRADES, shownSkins, ownsSkin, pickSkin, swordSkin, getCombat, nextCost, upgrade, foeOf, bossBeaten, bossPending, worldDone } from '../game/combat.js';
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
  pr.player({ x: 0, y: 0, dir: 2, walk: null, stamina: 1, hat: id, plain: true }, 0);
  pr.ctx.restore();
}
import { roomThumb } from './menuScene.js';
import { mountTitleArt, titleThumb } from './titleArt.js';
import { logoCanvas } from './logo.js';
import { isAdmin, isFull } from '../game/admin.js';
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
  setPreview(null);
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
  const lockId = { chapters: 'worlds', chapter: 'worlds', kit: 'kit', garderobe: 'kit', shop: 'shop' }[page];
  if (lockId && !isUnlocked(lockId)) ui.innerHTML = lockedHtml(lockId);
  else if (page === 'chapters') cleanup = chaptersPage(ui, parseInt(params[1] ?? '-1', 10), scene);
  else if (page === 'chapter') chapterPage(ui, parseInt(params[1] || '0', 10));
  else if (page === 'kit') cleanup = kitPage(ui, scene);
  else if (page === 'garderobe') wardrobePage(ui);
  else if (page === 'shop') shopPage(ui);
  else if (page === 'forge') forgePage(ui);
  else if (page === 'radio') radioPage(ui);
  else if (page === 'magie') magicPage(ui);
  else if (page === 'echtshop') realShopPage(ui);
  else if (page === 'updates') updatesPage(ui);
  else if (page === 'galerie') galleryPage(ui);
  else if (page === 'settings') settingsPage(ui, scene);
  else if (page === 'code') codePage(ui);
  else if (page === 'codes') myCodesPage(ui);
  else { ui.classList.add('tm-main', 'mm'); if (getSettings().menuStyle === 'b') ui.classList.add('mm2'); if (getSettings().menuStyle === 'c') ui.classList.add('mm3'); mainPage(ui); }

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
        const href = { worlds: `#/menu/chapters/${currentChapter()}`, kit: '#/menu/garderobe', daily: '#/daily', shop: '#/menu/shop' }[m.id];
        if (!isUnlocked(m.id, t.solved)) return `<span class="wbtn mm-tile locked" aria-disabled="true" title="${esc(m.info)}">${icon('lock')}<span>${m.name}</span><small>ab ${m.need} Räumen</small></span>`;
        const glow = (m.id === 'daily' && !daily) || freshModes.has(m.id);
        return `<a class="wbtn mm-tile${glow ? ' glow' : ''}" href="${href}">${icon(MODE_ICON[m.id])}<span>${m.name}${m.id === 'daily' && daily ? ' ✓' : ''}</span></a>`;
      }).join('')}<a class="wbtn mm-tile" href="#/menu/forge">${icon('sword')}<span>Schmiede</span></a><a class="wbtn mm-tile" href="#/arena/endlos/1">${icon('map')}<span>Endlos</span></a><a class="wbtn mm-tile" href="#/menu/magie">${icon('gem')}<span>Magie</span></a></nav>
      <div class="mm-tools">
        <a class="wbtn sm" href="#/menu/echtshop">${icon('gem')}<span>Echtshop</span></a>
        <a class="wbtn sm" href="#/menu/code">${icon('key')}<span>Code</span></a>
        <a class="wbtn sm" href="#/menu/settings">${icon('gear')}<span>Optionen</span></a>
      </div>
      <a class="tm-version" href="#/menu/updates">Version ${VERSION === 'dev' ? 'lokal' : LABEL} · Updates</a><a class="tm-version" href="#/menu/galerie">Galerie</a>
    </div>`;
  const logo = logoCanvas(); logo.className = isAdmin() ? 'logo admin' : 'logo'; // Admin-Modus: rotes Logo logo.setAttribute('aria-hidden', 'true');
  el.querySelector('.logo-h1').prepend(logo);
  el.querySelector('#play').focus();
  el.querySelector('#play').addEventListener('click', () => play('play'));
}

// ---------- Code eingeben: „freeadmin“ schaltet alles frei ----------
function codePage(el) {
  const applyCode = (text, say = (m) => render(m)) => {
    const code = redeem(text);
    if (code === 'resetall') { play('bump'); confirmReset(); return; }
    if (code === 'lab') { location.hash = '#/lab'; return; }
    if (code === 'allfullmonitor') { play('chapter'); spanAllMonitors().then(({ screens, popup }) => say(popup ? `Prismara läuft jetzt über ${screens} Monitor${screens > 1 ? 'e' : ''}. Ab jetzt öffnet auch F11 diese Ansicht.` : 'Dein Browser hat das Fenster blockiert – Vollbild auf diesem Monitor. F11 versucht es erneut.')); return; }
    if (code === 'cinematicplayer') { play('chapter'); startCinema(); location.hash = '#/menu'; return; }
    if (code === 'function') { play('ui'); askPassword(); return; }
    if (code === 'used') { play('bump'); say('Diesen Code hast du schon eingelöst.'); return; }
    if (code === 'moneten') { play('chapter'); say('250 Münzen gehören dir!'); return; }
    if (!code) { play('bump'); say('Dieser Code stimmt nicht.'); return; }
    play('chapter');
    if (code === 'halloween') {
      say('🎃 Halloween-Umhang freigeschaltet und angelegt!');
      setTimeout(() => { stopMusic(); setTimeout(jumpscare, 1400); }, 4000 + Math.random() * 5000); // erst in Sicherheit wiegen, dann Stille, dann zuschlagen
    } else say(code === 'dinnerbone' ? 'Dein Held steht jetzt auf dem Kopf.' : `„${code}“ ist jetzt an.`);
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
      showList();
    });
    el.querySelector('#pw').focus();
  };
  // Liste aller Codes: bleibt nach „Anwenden“ offen, bis man selbst zurückgeht; Meldung steht oben
  const showList = (msg = '') => {
    const y = scrollY;
    el.innerHTML = `
      ${head('#/menu/code', 'Geheime Codes')}
      ${msg ? `<p class="parch code-msg">${esc(msg)}</p>` : ''}
      <div class="parch settings">${ALL_CODES.map(([id, info]) => `<div class="set-row"><span class="code-row"><b>${esc(id)}</b><small>${esc(info)}</small></span><button class="wbtn sm" type="button" data-apply="${esc(id)}">Anwenden</button></div>`).join('')}</div>`;
    backToForm();
    el.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', () => applyCode(b.dataset.apply, showList)));
    scrollTo(0, y);
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
function settingsPage(el, scene) {
  // Hintergrund: zuletzt betretene Welt oder jede bereits offene Welt
  const bgOptions = () => ['', ...CHAPTERS.map((c, i) => (chapterInfo(i).open ? CHAPTER_WORLD[c.id] : null)).filter((id) => WORLDS[id])];
  const render = () => {
    const rm = getSettings().reducedMotion, bg = getSettings().menuBg || '';
    el.innerHTML = `
      ${head('#/menu', '⚙ Einstellungen')}
      <div class="parch settings">
        <div class="set-row"><span>🔇 Alles stumm</span><button class="wbtn sm" id="snd" aria-pressed="${isMuted()}">${isMuted() ? 'AN' : 'AUS'}</button></div>
        <div class="set-row vol-box">${volumeHtml()}</div>
        <div class="set-row"><span>🌀 Bewegung reduzieren</span><button class="wbtn sm" id="motion" aria-pressed="${!!rm}">${rm === null ? 'SYSTEM' : rm ? 'AN' : 'AUS'}</button></div>
        <div class="set-row"><span>✨ Grafik: <b id="gfx-v">${getSettings().gfx ?? 100} %</b></span><input id="gfx" type="range" min="0" max="100" step="10" value="${getSettings().gfx ?? 100}" aria-label="Menge an Effekten und Partikeln"></div>
        <div class="set-row"><span>🏠 Hauptmenü</span><button class="wbtn sm" id="mstyle">${{ b: 'FREIE SICHT', c: 'MITTE' }[getSettings().menuStyle] || 'SPALTE'}</button></div>
        <div class="set-row"><span>🖼 Hintergrund</span><button class="wbtn sm" id="mbg">${WORLDS[bg] ? esc(WORLDS[bg].name) : 'ZULETZT'}</button></div>
        <div class="set-row"><span>🛡 Boss-Hilfe</span><button class="wbtn sm" id="bh" aria-pressed="${!!getSettings().bossHelp}">${getSettings().bossHelp ? 'AN' : 'AUS'}</button></div>
        <div class="set-row"><span>📳 Vibration</span><button class="wbtn sm" id="vib" aria-pressed="${getSettings().vibrate !== false}">${getSettings().vibrate !== false ? 'AN' : 'AUS'}</button></div>
        <div class="set-row"><span>📖 Tutorial (Lehrzimmer)</span><a class="wbtn sm" href="#/adv/tutorial">NOCHMAL SPIELEN</a></div>
      </div>`;
    el.querySelector('#snd').addEventListener('click', () => { toggleMute(); play('ui'); render(); el.querySelector('#snd').focus(); });
    bindVolume(el);
    el.querySelector('#gfx').addEventListener('input', (e) => { updateSettings({ gfx: +e.target.value }); el.querySelector('#gfx-v').textContent = `${e.target.value} %`; });
    el.querySelector('#mbg').addEventListener('click', () => {
      const o = bgOptions(), next = o[(o.indexOf(bg) + 1) % o.length];
      updateSettings({ menuBg: next || null }); scene?.setWorld(menuBackground()); document.body.dataset.world = menuBackground(); play('ui'); render();
    });
    el.querySelector('#mstyle').addEventListener('click', () => { updateSettings({ menuStyle: { a: 'b', b: 'c', c: 'a' }[getSettings().menuStyle || 'a'] }); play('ui'); render(); });
    el.querySelector('#bh').addEventListener('click', () => { updateSettings({ bossHelp: !getSettings().bossHelp }); play('ui'); render(); });
    el.querySelector('#vib').addEventListener('click', () => { updateSettings({ vibrate: getSettings().vibrate === false }); play('ui'); render(); });
    el.querySelector('#motion').addEventListener('click', () => {
      updateSettings({ reducedMotion: rm === null ? true : rm ? false : null }); play('ui'); render(); el.querySelector('#motion').focus();
    });
  };
  render();
}

// ---------- Weltenauswahl: Leiste mit dem Panorama jeder Welt; Hintergrund, Farben und Musik wechseln mit ----------
let fadeMs = 620;
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
    scene.setWorld(id, dir || 1, fadeMs);
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
  // Schnell blättern: Animation verkürzt sich mit dem Abstand der Schritte
  let lastGo = 0;
  const go = (d) => {
    const now = performance.now(), gap = now - lastGo, fast = gap < 180;
    lastGo = now; fadeMs = fast ? Math.max(110, gap * 1.4) : 620;
    if (!fast) play('swipe');
    select((cur + d + CHAPTERS.length) % CHAPTERS.length, !fast, d);
    tiles[cur].focus({ preventScroll: true });
  };
  // Mausrad blättert durch die Welten (Hochkant-Handy wischt die Leiste direkt)
  let wheelSum = 0;
  el.closest('.tm').addEventListener('wheel', (e) => {
    e.preventDefault();
    wheelSum += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    // Jede Rastung ist genau eine Welt, auch bei schnellem Drehen
    if (Math.abs(wheelSum) >= 50) { go(wheelSum > 0 ? 1 : -1); wheelSum = 0; }
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
        <div class="parch shop-keeper"><span class="shop-face" aria-hidden="true">${icon('sword')}</span><p>Die Schmiede verbessert dein Glut-Schwert. ${msg || 'Billig ist hier nichts, spar gut.'}</p></div>
        <ul class="shop-list">${Object.entries(UPGRADES).map(([id, u]) => {
          const cost = nextCost(id), lvl = getCombat()[id];
          return `<li class="parch shop-item"><span class="si-icon">${icon(id === 'armor' ? 'heart' : 'sword')}</span>
            <span class="si-text"><b>${esc(u.name)} ${lvl + 1}/${u.values.length}</b><small>${esc(u.info)}</small><em>${u.values[lvl]} ${u.unit}</em></span>
            <button class="wbtn sm" data-up="${id}" ${cost == null || inv.coins < cost ? 'disabled' : ''}>${cost == null ? 'MAX' : cost ? `${icon('coin')} ${cost}` : 'GRATIS'}</button></li>`;
        }).join('')}</ul>
        <div id="sel"></div>
      </div>`;
    el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { if (upgrade(b.dataset.up)) play('target', 7); render('Die Klinge glüht – Verbesserung geschafft!'); }));
    const swatch = (color, opt = {}) => (cv) => {
      const g = cv.getContext('2d'), cur2 = swordSkin();
      drawSwordIcon(g, 4, 6, { blade: color, edge: opt.edge || shadeHex(color, 0.45), dark: shadeHex(color, -0.4), guard: opt.guard, grip: opt.grip });
      void cur2;
    };
    selectGrid(el.querySelector('#sel'), {
      title: 'Ausrüstung', action: 'Ausrüsten',
      items: [
        ...Object.entries(PARTS).flatMap(([slot, g]) => g.list.map((p) => ({ id: p.id, name: p.name, sub: `${g.name}: ${p.v} ${g.unit}`, owned: ownsPart(p.id), price: p.price, active: partOf(slot).id === p.id, paint: slot === 'blade' ? swatch(['#8a7a6a', '#c0c4d0', '#e0342c', '#ffd166'][g.list.indexOf(p)]) : slot === 'guard' ? swatch('#8a8794', { guard: ['#8a5a32', '#b0b4c0', '#ffd166'][g.list.indexOf(p)] }) : swatch('#8a8794', { grip: ['#6b4426', '#3f6fb0', '#7fe0ff'][g.list.indexOf(p)] }), pick: () => pickPart(slot, p.id) }))),
        ...shownSkins().map((c) => ({ id: c.id, name: `Skin ${c.name}`, sub: 'Waffen-Skin', owned: ownsSkin(c.id), price: c.price, active: swordSkin().id === c.id, paint: swatch((swordTint(c.id) || [c.blade])[0], { edge: (swordTint(c.id) || [c.blade, c.edge])[1], grip: c.grip }), tint: { labels: ['Klinge', 'Schneide'], get: () => swordTint(c.id) || [c.blade, c.edge], set: (t) => setSwordTint(c.id, t) }, pick: () => pickSkin(c.id) })),
      ],
      after: () => render(),
    });
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

// ---------- Galerie: jedes neue Element einzeln ansehen ----------
function galleryPage(el) {
  const BTN = { Funken: () => fx.sparks(3.5, 2, '#ffd166'), Lichtring: () => fx.ring(3.5, 2, '#ff8a3a'), Beben: () => fx.addTrauma(0.7), Weißblitz: () => fx.flash(), Hitstop: () => fx.hitstop(fx.FX.hitstopBoss), Tor: () => fx.goalBurst('feuerwerk', 3.5, 2, '#ff5a7a'), Federn: () => fx.squash(), Vibration: () => fx.buzz(40),
    Tonleiter: () => [0, 1, 2, 3, 4].forEach((i) => setTimeout(() => play('lamp', i), i * 160)),
    Iris: () => { const d = document.createElement('div'); d.className = 'iris'; d.addEventListener('animationend', () => d.remove()); document.body.append(d); } };
  el.innerHTML = `
    ${head('#/menu', 'Galerie')}
    <div class="rd"><p class="gal-name parch" id="gal-name">Tippe auf „Alle vorführen“</p><canvas class="gal-canvas" width="128" height="80"></canvas>
      <button class="wbtn big" type="button" id="gal-all">Alle vorführen</button>
      <div class="parch settings gal-tex">${Object.entries(TEXTURES).map(([id, t]) => `<span><canvas data-tex="${id}" width="32" height="32"></canvas><small>${esc(t.name)}</small></span>`).join('')}</div>
      <div class="parch settings"><div class="dbg-grid">${Object.keys(BTN).map((k) => `<button class="wbtn sm" type="button" data-fx="${k}">${k}</button>`).join('')}</div></div></div>`;
  el.querySelectorAll('[data-fx]').forEach((b) => b.addEventListener('click', () => BTN[b.dataset.fx]()));
  el.querySelector('#gal-all').addEventListener('click', () => {
    Object.keys(BTN).forEach((k, i) => setTimeout(() => {
      if (!el.isConnected) return;
      el.querySelector('#gal-name').textContent = `${i + 1}/${Object.keys(BTN).length}: ${k}`;
      BTN[k]();
    }, i * 1800));
  });
  el.querySelectorAll('[data-tex]').forEach((t) => { const q = t.getContext('2d'); texture(t.dataset.tex).forEach((row, y) => row.forEach((col, x) => { q.fillStyle = col; for (const [a, b] of [[0, 0], [16, 0], [0, 16], [16, 16]]) q.fillRect(x + a, y + b, 1, 1); })); });
  const c = el.querySelector('.gal-canvas'), g = c.getContext('2d');
  const loop = (t) => {
    if (!c.isConnected) return;
    requestAnimationFrame(loop);
    if (fx.stopped(t)) return;
    const [x, y] = fx.shake(1, t), q = fx.squashScale(t) || [1, 1];
    g.fillStyle = '#1a1420'; g.fillRect(0, 0, 128, 80);
    g.save(); g.translate(x, y); g.fillStyle = '#e8701a'; g.fillRect(64 - 8 * q[0], 56 - 16 * q[1], 16 * q[0], 16 * q[1]); fx.drawFx(g, 16, t); g.restore();
  };
  requestAnimationFrame(loop);
}

// ---------- Auswahl-Raster wie in der Garderobe: große Vorschau, Kacheln, unten Info und Aktion ----------
function selectGrid(el, cfg) {
  let cur = cfg.items.find((i) => i.active) || cfg.items[0], info = false, edit = false, turn = 0, timer = 0, lastTap = {};
  const render = () => {
    const can = cur.owned || cur.price;
    el.innerHTML = `
      <div class="sg">
        <h2 class="sg-title">${esc(cfg.title)}</h2>
        <div class="sg-stage"><button class="wbtn sm" type="button" data-nav="-1" aria-label="Vorheriger">◀</button>
          <canvas class="sg-big e-${cfg.items.indexOf(cur) % 4}${cur.owned ? '' : ' sil'}" width="24" height="28"></canvas>
          <button class="wbtn sm" type="button" data-nav="1" aria-label="Nächster">▶</button>
          ${cur.tint && cur.owned ? `<button class="sg-pen" type="button" id="sg-pen" aria-label="Anpassen">${icon('pen')}</button>` : ''}</div>
        <b class="sg-name">${esc(cur.name)}</b><small class="sg-sub">${esc(cur.owned ? cur.sub : cur.lockText || `${cur.price} Münzen`)}</small>
        ${info ? `<p class="sg-info">${esc(cur.sub)}</p>` : ''}
        ${edit && cur.tint && cur.owned ? `<div class="sg-tint"><label>${esc(cur.tint.labels[0])}<input type="color" id="t0" value="${cur.tint.get()[0]}"></label><label>${esc(cur.tint.labels[1])}<input type="color" id="t1" value="${cur.tint.get()[1]}"></label>${cfg.more ? `<a class="wbtn sm" href="${cfg.more}">Hut, Laterne, Spur</a>` : ''}</div>` : ''}
        <div class="sg-grid">${cfg.items.map((it, i) => `<button class="sg-tile${it === cur ? ' on' : ''}${it.rarity && it.owned ? ` r-${it.rarity}` : ''}" type="button" data-i="${i}" aria-label="${esc(it.name)}"><canvas class="${it.owned ? '' : 'sil'}" width="24" height="28"></canvas>${it.owned ? '' : icon('lock')}${it.active ? '<i></i>' : ''}${it.dupes ? `<span class="sg-dup">×${it.dupes}</span>` : ''}${it.rarity && it.owned ? `<small class="sg-r">${RARITY[it.rarity].name}</small>` : ''}</button>`).join('')}</div>
        <div class="sg-bar"><button class="wbtn" type="button" id="sg-info">Info</button>
          <button class="wbtn big" type="button" id="sg-go" ${can && !cur.active ? '' : 'disabled'}>${icon('play')} ${cur.active ? 'Aktiv' : cur.owned ? cfg.action : cur.price ? (isAdmin() ? 'Gratis kaufen' : `Kaufen ${cur.price}`) : 'Gesperrt'}</button></div>
      </div>`;
    cfg.onShow?.(cur);
    const big = el.querySelector('.sg-big');
    cur.paint(big, 0);
    // Vorschau dreht sich langsam, jeder Skin hat seinen eigenen Emote (CSS e-0 bis e-3)
    clearInterval(timer);
    timer = setInterval(() => { if (!big.isConnected) { clearInterval(timer); return; } turn = (turn + 1) % 36; big.getContext('2d').clearRect(0, 0, 24, 28); cur.paint(big, turn); }, 120);
    el.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const own = cfg.items.filter((i) => i.owned), list = own.length ? own : cfg.items;
      cur = list[(list.indexOf(cur) + +b.dataset.nav + list.length) % list.length]; play('ui'); render();
    }));
    el.querySelector('#sg-pen')?.addEventListener('click', () => { edit = !edit; play('ui'); render(); });
    el.querySelectorAll('.sg-tile canvas').forEach((c, i) => cfg.items[i].paint(c));
    el.querySelectorAll('.sg-tile').forEach((b) => b.addEventListener('click', () => {
      const it = cfg.items[+b.dataset.i], now = performance.now();
      if (it.dupes && lastTap.it === it && now - lastTap.at < 400) { it.sell(); return; } // Doppeltipp verkauft ein Duplikat
      lastTap = { it, at: now }; cur = it; play('ui'); render();
    }));
    el.querySelectorAll('.sg-tint input').forEach((i) => i.addEventListener('change', () => { cur.tint.set([el.querySelector('#t0').value, el.querySelector('#t1').value]); render(); }));
    el.querySelector('#sg-info').addEventListener('click', () => { info = !info; render(); });
    el.querySelector('#sg-go').addEventListener('click', () => {
      if (!cur.pick()) { play('bump'); location.hash = '#/menu/echtshop'; return; }
      play('chapter');
      if (cfg.after) cfg.after(); else { cfg.items.forEach((i) => { i.active = i === cur; }); cur.owned = true; render(); }
    });
  };
  render();
}

const SPIN_PRICE = 300;
function wardrobePage(el, msg = '') {
  const { stars } = totals();
  el.innerHTML = `
    <ul class="mm-stats"><li>${icon('coin')}<b>${getInv().coins}</b></li><li>${icon('star')}<b>${stars}</b></li><li>${icon('gem')}<b>${fragmentCount()}</b></li></ul>
    ${head('#/menu', 'Garderobe', '')}
    <button class="spin-fab" id="spin" type="button" aria-label="Glücksrad öffnen"><i></i><b>${getSpins()}x</b></button>
    ${msg ? `<p class="code-msg sg-won">${esc(msg)}</p>` : ''}
    <div id="sel"></div>`;
  // Emote in 36 Bildern: winken, zweimal hüpfen, einmal umdrehen
  const paint = (id) => (cv, s = -1) => {
    const hop = s >= 16 && s < 24 ? [0, -2, -4, -5, -4, -2, 0, 0][s - 16] : 0, dir = s >= 24 ? [2, 1, 0, 3][Math.floor((s - 24) / 3)] : 2, wave = s >= 0 && s < 16;
    const pr = Object.create(PixelRenderer.prototype), keep = getSettings().skin;
    pr.ctx = cv.getContext('2d'); pr.ctx.save(); pr.ctx.translate(4, 8 + hop);
    const shown = getPreview(); setPreview(id);
    pr.player({ x: 0, y: 0, dir, walk: null, stamina: 1, hat: '' }, 0);
    if (wave) { const up = Math.floor(s / 3) % 2, body = getSkin().color.stops[1]; pr.r(13, 7, 2, 4, body); pr.r(13 + up, 4, 2, 3, getLook().tone.color); }
    setPreview(shown); pr.ctx.restore();
  };
  el.querySelector('#spin').addEventListener('click', () => {
    const have = getSpins();
    if (!have && !isAdmin() && getInv().coins < SPIN_PRICE) { play('bump'); location.hash = '#/menu/echtshop'; return; }
    const c = rollSkin();
    if (!c) { wardrobePage(el, 'Du hast schon alle Skins!'); return; }
    if (have) addSpins(-1); else if (!isAdmin()) addCoins(-SPIN_PRICE);
    const twice = ownedHeroes().includes(c.id);
    if (twice) addDupe(c.id); else buyHero(c.id);
    // Bekomm-Animation: Kiste bebt und platzt auf, dann kommt der Skin in der Farbe seiner Seltenheit
    const r = rarityOf(c), o = document.createElement('div');
    o.className = `spin-show r-${r}`;
    o.innerHTML = `<div class="spin-glow"></div><div class="spin-wheel-box"><span class="spin-pin"></span><div class="spin-wheel" id="wheel"></div><em>?</em></div><div class="spin-card"><div class="spin-back">?</div><div class="spin-front"><small>${twice ? 'Doppelt · ' : ''}${RARITY[r].name}</small><canvas width="24" height="28"></canvas><b>${esc(c.name)}</b></div></div><p>Antippen</p>${Array.from({ length: 28 }, (_, i) => `<i style="--a:${i * 49}deg;--d:${120 + (i * 37) % 240}px;--s:${i % 3 * 3 + 5}px;--t:${(i % 5) * 0.08}s"></i>`).join('')}`;
    document.body.append(o);
    paint(c.id)(o.querySelector('canvas'));
    // Rad dreht und bremst aus, bis der Zeiger im Feld der gezogenen Seltenheit steht
    const SECT = { common: [0, 252], rare: [252, 338.4], epic: [338.4, 356.4], legend: [356.4, 360] }[r];
    const stop = SECT[0] + (SECT[1] - SECT[0]) * (0.2 + Math.random() * 0.6), wheel = o.querySelector('#wheel');
    requestAnimationFrame(() => requestAnimationFrame(() => { wheel.style.transform = `rotate(${360 * 7 - stop}deg)`; }));
    let tick = 60, at = 0;
    while (at < 3400) { const when = at; setTimeout(() => { if (o.isConnected) play('ui'); }, when); at += tick; tick *= 1.12; }
    setTimeout(() => { o.classList.add('open'); play('chapter'); fxNs.flash(); }, 3800);
    o.addEventListener('pointerdown', () => { if (o.classList.contains('open')) { o.remove(); wardrobePage(el, `${RARITY[r].name}: ${c.name}`); } });
  });
  const active = getSkin().color.id;
  selectGrid(el.querySelector('#sel'), {
    title: 'Dein Skin', action: 'Anziehen', more: '#/menu/kit', onShow: (it) => setPreview(it.owned ? it.id : null),
    items: SKIN_COLORS.filter((c) => c.hero).map((c) => {
      const u = heroState(c);
      return { id: c.id, name: c.name, dupes: dupes(c.id), sell: () => { addDupe(c.id, -1); const n = SELL_PRICE[rarityOf(c)]; addCoins(n); play('target', 7); wardrobePage(el, `Verkauft: +${n} Münzen`); }, rarity: rarityOf(c), sub: RARITY[rarityOf(c)].name, owned: !!u.free, price: u.price || 0, lockText: u.text, active: active === c.id, paint: paint(c.id), tint: { labels: ['Akzent', 'Körper'], get: () => skinTint(c.id) || [c.stops[0], c.stops[1]], set: (t) => setSkinTint(c.id, t) }, pick: () => {
        if (!heroState(c).free) { if (!isAdmin()) { if (getInv().coins < u.price) return false; addCoins(-u.price); } buyHero(c.id); }
        setSkin({ color: c.id }); return true;
      } };
    }),
  });
}

// ---------- Echtshop: Testkauf, es fließt nie Geld und es werden keine Zahlungsdaten abgefragt ----------
function realShopPage(el) {
  const PACKS = [
    { name: '200 Münzen', price: '0,99 €', give: () => addCoins(200) }, { name: '1 200 Münzen', price: '4,99 €', give: () => addCoins(1200) },
    { name: '5 Drehungen', price: '2,99 €', give: () => addSpins(5) }, { name: '25 Drehungen', price: '11,99 €', give: () => addSpins(25) },
    { name: 'Skin Kleiner Drache', price: '2,99 €', give: () => buyHero('h-drache') }, { name: 'Starterpaket', price: '3,99 €', give: () => { addCoins(600); addSpins(3); } },
  ];
  const render = (done = '') => {
    el.innerHTML = `
      ${head('#/menu', 'Echtshop', `${icon('coin')} ${getInv().coins} · ${getSpins()}x`)}
      <div class="rd">${done ? `<p class="code-msg sg-won">${esc(done)}</p>` : ''}
        <div class="rs-grid">${PACKS.map((p, i) => `<button class="parch rs-pack" type="button" data-p="${i}"><b>${esc(p.name)}</b><span>${p.price}</span></button>`).join('')}</div>
</div>`;
    el.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => checkout(PACKS[+b.dataset.p])));
  };
  const checkout = (p) => {
    const o = document.createElement('div'); o.className = 'pay';
    o.innerHTML = `<div class="pay-card"><h2>Bestellung prüfen</h2><div class="pay-row"><span>${esc(p.name)}</span><b>${p.price}</b></div><div class="pay-row"><span>Gesamt</span><b>${p.price}</b></div><small>Testkauf ohne echte Zahlung</small>
      <button class="pay-go" type="button">Jetzt kaufen</button><button class="pay-no" type="button">Abbrechen</button></div>`;
    document.body.append(o);
    o.querySelector('.pay-no').addEventListener('click', () => o.remove());
    o.querySelector('.pay-go').addEventListener('click', (e) => {
      e.target.textContent = 'Wird bearbeitet …'; e.target.disabled = true;
      setTimeout(() => { p.give(); o.remove(); play('chapter'); render(`Danke! ${p.name} gehört dir.`); }, 1300);
    });
  };
  render();
}

// ---------- Magie: Zauberbuch mit Q W E R, Stufen, Talenten, Presets und Farbe ----------
function magicPage(el) {
  let slot = 0;
  const KEYS = ['Q', 'E', 'R', 'F'];
  const render = (msg = '') => {
    const slots = spellSlots(), ult = slot === 3;
    el.innerHTML = `
      ${head('#/menu', 'Magie', `${icon('coin')} ${getInv().coins}`)}
      <div class="sg">
        <h2 class="sg-title">Zauberleiste</h2>
        ${hasMagic() ? '' : '<p class="sg-info">Magie wird mit dem ersten besiegten Boss frei.</p>'}
        <p class="sg-info">Mana ${manaMax()} · +${manaRegen()} pro Sekunde. Jeder Zauber kostet Mana und hat eine Abklingzeit. F ist dein Ultimate.</p>
        ${msg ? `<p class="sg-info"><b>${esc(msg)}</b></p>` : ''}
        <div class="mg-slots">${slots.map((id, i) => `<button class="mg-slot${i === slot ? ' on' : ''}" type="button" data-slot="${i}"><small>Taste ${KEYS[i]}</small><b>${esc(spellOf(id).name)}</b><small>Stufe ${spellStats(id).lv}</small></button>`).join('')}</div>
        <div class="mg-list">${SPELLS.filter((sp) => !!sp.ult === ult).map((sp) => { const st = spellStats(sp.id), cost = spellCost(sp.id); return `<div class="mg-spell${slots[slot] === sp.id ? ' on' : ''}"><button type="button" data-spell="${sp.id}"><b>${esc(sp.name)} · Stufe ${st.lv}/${MAX_SPELL_LV}</b><small>${esc(sp.info)}</small><small>Stärke ${st.power} · ${(st.cd / 1000).toFixed(1)} s Pause · ${st.mana} Mana</small></button><button class="wbtn sm" type="button" data-lv="${sp.id}" ${cost == null ? 'disabled' : ''}>${cost == null ? 'MAX' : `${icon('coin')} ${cost}`}</button></div>`; }).join('')}</div>
        <h2 class="sg-title">Talente</h2>
        <div class="mg-list">${Object.entries(TALENTS).map(([id, t]) => { const c = talentCost(id); return `<div class="mg-spell"><span><b>${esc(t.name)} · ${talentLv(id)}/${t.costs.length}</b><small>${esc(t.info)}</small></span><button class="wbtn sm" type="button" data-tal="${id}" ${c == null ? 'disabled' : ''}>${c == null ? 'MAX' : `${icon('coin')} ${c}`}</button></div>`; }).join('')}</div>
        <h2 class="sg-title">Presets</h2>
        <div class="mg-pre">${presets().map((p, i) => `<div><b>Preset ${i + 1}</b><small>${p ? p.map((x) => esc(spellOf(x).name)).join(' · ') : 'leer'}</small><span><button class="wbtn sm" type="button" data-load="${i}" ${p ? '' : 'disabled'}>Laden</button><button class="wbtn sm" type="button" data-save="${i}">Speichern</button></span></div>`).join('')}</div>
        <h2 class="sg-title">Farbe</h2>
        <div class="mg-col">${MAGIC_COLORS.map((c) => `<button class="kit-swatch${magicColor().id === c.id ? ' active' : ''}" type="button" data-col="${c.id}"><span class="ks-dot" style="background:${c.color}"></span><small>${esc(c.name)}${ownsMagic(c.id) ? '' : ` ${c.price}`}</small></button>`).join('')}</div>
      </div>`;
    const on = (sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => { const m = fn(b); play('ui'); render(typeof m === 'string' ? m : ''); }));
    on('[data-slot]', (b) => { slot = +b.dataset.slot; });
    on('[data-spell]', (b) => { const s = spellSlots(), i = s.indexOf(b.dataset.spell); if (i >= 0) s[i] = s[slot]; s[slot] = b.dataset.spell; setSlots(s); });
    on('[data-lv]', (b) => (levelSpell(b.dataset.lv) ? `${spellOf(b.dataset.lv).name} ist jetzt stärker!` : 'Dafür fehlen Münzen.'));
    on('[data-tal]', (b) => (levelTalent(b.dataset.tal) ? `${TALENTS[b.dataset.tal].name} verbessert!` : 'Dafür fehlen Münzen.'));
    on('[data-load]', (b) => setSlots(presets()[+b.dataset.load]));
    on('[data-save]', (b) => savePreset(+b.dataset.save));
    on('[data-col]', (b) => pickMagic(b.dataset.col));
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
        <div class="parch shop-keeper"><span class="shop-face" aria-hidden="true">${icon('hero')}</span><p>${msg || 'Willkommen, Lichtläufer! Münzen findest du in Räumen und Truhen – und fürs Entkommen gibt’s auch welche.'}</p></div>
        <ul class="shop-list">${Object.entries(ITEMS).map(([id, it]) => {
          const have = inv.items[id] || 0;
          const sold = it.permanent && have;
          return `<li class="parch shop-item${sold ? ' sold' : ''}"><span class="si-icon">${icon(id)}</span>
            <span class="si-text"><b>${esc(it.name)}</b><small>${esc(it.info)}</small>${it.permanent ? '<em>dauerhaft</em>' : `<em>im Beutel: ${have}</em>`}</span>
            <button class="wbtn sm" data-buy="${id}" ${sold ? 'disabled' : ''}>${sold ? '✓ gekauft' : isAdmin() ? 'GRATIS' : `🪙 ${it.price}`}</button></li>`;
        }).join('')}</ul>
        <div class="parch shop-keeper"><span class="shop-face" aria-hidden="true">${icon('crown')}</span><p>Der Hutmacher nimmt keine Münzen – nur Kristalle 💎 aus den Räumen. Du hast <b>${fragmentCount() - crystalsSpent()}</b> übrig.</p></div>
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
      if (!ITEMS[id].permanent || !getInv().items[id]) { if (!isAdmin() && getInv().coins < ITEMS[id].price) { location.hash = '#/menu/echtshop'; return; } } // zu wenig Münzen: ab in den Echtshop
      if (buy(id)) { play('target', 7); render(`${ITEMS[id].icon} ${ITEMS[id].name} – gute Wahl! ${ITEMS[id].permanent ? 'Wirkt ab sofort.' : 'Benutze ihn im Raum mit der Inventarleiste.'}`); }
      else { play('bump'); render('Da fehlen dir leider noch ein paar Münzen.'); }
      el.querySelector(`[data-buy="${id}"]`)?.focus();
    }));
  };
  render();
}

// Freischalten: how-Text aus den Skin-Daten auswerten
function heroState(c) {
  const [kind, arg] = c.how.split(':'), own = isFull() || ownedHeroes().includes(c.id), m = new Date().getMonth() + 1;
  if (own || kind === 'start') return { free: true };
  if (kind === 'endless') return (getSettings().endlessBest || 0) >= +arg ? { free: true } : { text: `Endlos: Raum ${arg}` };
  if (kind === 'real') return { text: 'Nur im Echtshop' };
  if (isAdmin()) return { price: 1, text: 'Gratis kaufen' }; // Code „debug“
  if (kind === 'world') return worldDone(+arg) ? { free: true } : { text: `Welt ${+arg + 1} schaffen` };
  if (kind === 'boss') return bossBeaten(+arg) ? { free: true } : { text: `Boss ${foeOf(themeOf(+arg)).boss}` };
  if (kind === 'allboss') return CHAPTERS.every((_, i) => bossBeaten(i)) ? { free: true } : { text: 'Alle 11 Bosse' };
  if (kind === 'coins') return { price: +arg, text: `${arg} Münzen` };
  if (kind === 'season') { const [a, b = a] = arg.split('-').map(Number); if (m >= a && m <= b) { buyHero(c.id); return { free: true }; } return { text: 'Saison-Skin' }; } // einmal gesehen, bleibt er erhalten
  return { text: arg };
}
const updateSettingsQuiet = (skin) => updateSettings({ skin });

// ---------- Held: Umhangfarbe und Hut – Vorschau ist der echte Pixel-Held aus dem Spiel ----------
function kitPage(el, scene) {
  let kitTab = 0;
  const { stars } = totals();
  const render = () => {
    const skin = getSkin(), worn = hat(), look = getLook();
    const owned = Object.entries(HATS).filter(([id]) => ownsHat(id));
    el.innerHTML = `
      ${head('#/menu/garderobe', 'Anpassen', `${icon('star')} ${stars}`)}
      <div class="kit parch">
        <div class="kit-stage"><canvas class="kit-big" width="48" height="48" aria-label="Vorschau deines Helden: Umhang ${esc(skin.color.name)}${worn ? `, ${esc(HATS[worn].name)}` : ''}"></canvas></div>
        <div>
          <h3>Umhang</h3>
          <div class="kit-cape"><button class="wbtn sm" type="button" data-cape="-1" aria-label="Vorheriger Umhang">◀</button><b>${esc(look.cape.name)}</b><button class="wbtn sm" type="button" data-cape="1" aria-label="Nächster Umhang">▶</button></div>
          <h3>Hut</h3>
          <div class="kit-row">
            <button class="kit-swatch${worn ? '' : ' active'}" data-hat="" aria-pressed="${!worn}"><canvas class="ks-hat" data-hat="" width="24" height="28"></canvas><small>Ohne</small></button>
            ${owned.map(([id, h]) => `<button class="kit-swatch${worn === id ? ' active' : ''}" data-hat="${id}" aria-pressed="${worn === id}"><canvas class="ks-hat" data-hat="${id}" width="24" height="28"></canvas><small>${esc(h.name)}</small></button>`).join('')}
          </div>
          <h3>Hautton</h3>
          <div class="kit-row">${SKIN_TONES.map((t) => `<button class="kit-swatch${look.tone.id === t.id ? ' active' : ''}" data-tone="${t.id}" aria-pressed="${look.tone.id === t.id}"><span class="ks-dot" style="background:${t.color}"></span><small>${esc(t.name)}</small></button>`).join('')}</div>
          <h3>Tor-Animation</h3>
          <div class="kit-row">${GOALS.map((t) => { const locked = !isAdmin() && stars < t.stars, on = look.goal.id === t.id; return `<button class="kit-swatch${on ? ' active' : ''}" ${locked ? 'disabled' : `data-goal="${t.id}"`} aria-pressed="${on}"><span class="ks-dot" style="background:${t.color || 'var(--gold)'}"></span><small>${locked ? `★${t.stars}` : esc(t.name)}</small></button>`; }).join('')}</div>
          <h3>Spur</h3>
          <div class="kit-row">${TRAILS.map((t) => { const locked = !isAdmin() && stars < t.stars, on = look.trail.id === t.id; return `<button class="kit-swatch${on ? ' active' : ''}" ${locked ? 'disabled' : `data-trail="${t.id}"`} aria-pressed="${on}"><span class="ks-dot" style="background:${t.color || 'transparent'}"></span><small>${locked ? `★${t.stars}` : esc(t.name)}</small></button>`; }).join('')}</div>
          <h3>Aura</h3>
          <div class="kit-row">${AURAS.map((t) => { const have = isAdmin() || ownsAura(t.id), on = look.aura.id === t.id; return `<button class="kit-swatch${on ? ' active' : ''}" data-aura="${t.id}" aria-pressed="${on}"><span class="ks-dot" style="background:${t.color || 'transparent'}"></span><small>${have ? esc(t.name) : `🪙 ${t.price}`}</small></button>`; }).join('')}</div>
          <h3>Laterne</h3>
          <div class="kit-row">${LANTERNS.map((t) => `<button class="kit-swatch${look.lantern.id === t.id ? ' active' : ''}" data-lantern="${t.id}" aria-pressed="${look.lantern.id === t.id}"><span class="ks-dot" style="background:${t.color};box-shadow:0 0 0 3px ${t.glow}"></span><small>${esc(t.name)}</small></button>`).join('')}</div>
          <p class="small">Neue Umhänge schaltest du mit Sternen frei, Hüte gibt es im Shop gegen Kristalle 💎.</p>
        </div>
      </div>`;
    el.querySelectorAll('.ks-cloak').forEach((c) => drawCloak(c, SKIN_COLORS.find((s) => s.id === c.dataset.color)));
    el.querySelectorAll('.ks-hat').forEach((c) => drawHatPreview(c, c.dataset.hat)); // '' = ohne Hut
    // Reiter: immer nur ein Bereich sichtbar statt einer langen Liste
    const heads = [...el.querySelectorAll('.kit h3')];
    const bar = document.createElement('div'); bar.className = 'kit-tabs';
    heads.forEach((h, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = `wbtn sm${i === kitTab ? ' on' : ''}`; b.textContent = h.textContent.replace('Anpassung: ', '');
      b.addEventListener('click', () => { kitTab = i; play('ui'); render(); });
      bar.append(b); h.hidden = true; if (h.nextElementSibling) h.nextElementSibling.hidden = i !== kitTab;
    });
    heads[0]?.before(bar);
    el.querySelectorAll('.ks-hero').forEach((cv) => {
      const pr = Object.create(PixelRenderer.prototype), keep = getSettings().skin;
      pr.ctx = cv.getContext('2d'); pr.ctx.save(); pr.ctx.translate(4, 8);
      updateSettingsQuiet({ color: cv.dataset.color });
      pr.player({ x: 0, y: 0, dir: 2, walk: null, stamina: 1, hat: '' }, 0);
      updateSettingsQuiet(keep); pr.ctx.restore();
    });
    el.querySelectorAll('[data-hero]').forEach((b) => b.addEventListener('click', () => {
      const c = SKIN_COLORS.find((x) => x.id === b.dataset.hero), u = heroState(c);
      if (!u.free) { if (getInv().coins < u.price) { play('bump'); return; } addCoins(-u.price); buyHero(c.id); }
      setSkin({ color: c.id }); play('ui'); render();
    }));
    el.querySelectorAll('[data-cape]').forEach((b) => b.addEventListener('click', () => {
      const i = CAPES.indexOf(getLook().cape), next = CAPES[(i + +b.dataset.cape + CAPES.length) % CAPES.length];
      setLook({ cape: next.id }); play('ui'); render();
    }));
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
    pick('goal', (id) => setLook({ goal: id }));
    pick('aura', (id) => {
      const a = AURAS.find((x) => x.id === id);
      if (!isAdmin() && !ownsAura(id)) { if (getInv().coins < a.price) { play('bump'); return; } addCoins(-a.price); buyAura(id); }
      setLook({ aura: id });
    });
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
