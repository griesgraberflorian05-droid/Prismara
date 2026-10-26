// Community (#/community): Räume, die Spieler im Level-Bauer gebaut und veröffentlicht haben.
// Ohne eigenen Server: Veröffentlichen öffnet ein vorausgefülltes GitHub-Issue „[Level] …“ im
// Prismara-Repo; diese Seite liest die offenen Issues über die öffentliche GitHub-API (ohne Schlüssel),
// zeigt jeden gültigen Level-Code als Karte und sortiert nach 👍. Geschlossene Issues verschwinden.
// Spielen: #/community/play/<code> (zurück in die Liste).
import { decodeRoom, toDefFromRoom } from './builderView.js';
import { parsePushLevel, solvePush } from '../game/push.js';
import { mountAdventure } from '../adventure/adventure.js';
import { roomThumb } from './menuScene.js';
import { isUnlocked, lockedHtml } from '../game/unlocks.js';

export const REPO = 'griesgraberflorian/Prismara';
const CACHE_KEY = 'prismara.community.cache.v1';
const CACHE_MS = 5 * 60 * 1000; // API-Grenze ohne Anmeldung: 60 Abfragen pro Stunde → 5 Minuten zwischenspeichern
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** GitHub-Link, der ein Issue mit dem Level vorausfüllt (Veröffentlichen aus dem Bauer). */
export function publishUrl(room, code, par) {
  const title = `[Level] ${room.name || 'Mein Raum'}${par ? ` (${par} Züge)` : ''}`;
  const body = `Ein Raum aus dem Prismara-Level-Bauer.\n\n` +
    `Spielen: https://g2studio.net/#/community/play/${code}\n\n` +
    `Welt: ${room.theme} · Größe ${room.w}×${room.h}${par ? ` · Zugziel ${par}` : ''}\n\n` +
    '```prismara-level\n' + code + '\n```\n\n' +
    '_Bitte den Code-Block nicht verändern. Mit 👍 kannst du Räume anderer empfehlen._';
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** Level-Code aus einem Issue-Text lesen. */
function codeOf(body) {
  const m = /```prismara-level\s+([A-Za-z0-9_-]{20,4000})\s*```/.exec(body || '');
  return m ? m[1] : null;
}

async function fetchLevels(force = false) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!force && c && Date.now() - c.t < CACHE_MS) return c.list;
  } catch { /* kaputter Cache */ }
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues?state=open&per_page=100&sort=created&direction=desc&_=${Math.floor(Date.now() / 60000)}`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-cache' }); // immer bei GitHub nachfragen (304 kostet kein Kontingent)
  if (!res.ok) throw new Error(res.status === 403 ? 'GitHub-Abfragegrenze erreicht – in ein paar Minuten nochmal.' : `GitHub antwortet nicht (${res.status}).`);
  const issues = await res.json();
  const list = issues
    .filter((i) => !i.pull_request && /^\[Level\]/i.test(i.title))
    .map((i) => {
      const code = codeOf(i.body), room = code && decodeRoom(code);
      return room && { code, room, title: i.title.replace(/^\[Level\]\s*/i, ''), author: i.user?.login || '?', likes: i.reactions?.['+1'] || 0, url: i.html_url, date: i.created_at };
    })
    .filter(Boolean)
    .sort((a, b) => b.likes - a.likes || b.date.localeCompare(a.date));
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), list })); } catch { /* voll */ }
  return list;
}

export function mountCommunity(root, params = []) {
  document.body.classList.add('wood');
  if (!isUnlocked('community')) {
    root.innerHTML = `<section class="tm sub"><div class="tm-ui" style="justify-content:center">${lockedHtml('community')}</div></section>`;
    return () => {};
  }
  if (params[0] === 'play' && params[1]) {
    const room = decodeRoom(params[1]);
    if (!room) { location.replace('#/community'); return () => {}; }
    const def = toDefFromRoom(room);
    const r = solvePush(parsePushLevel(def), { limit: 300000 });
    return mountAdventure(root, ['custom'], { def: { ...def, par: r.solvable ? r.minMoves : null }, theme: room.theme, back: '#/community', backLabel: '🌍 Zurück zur Community' });
  }
  root.innerHTML = `
    <section class="tm sub"><div class="tm-ui">
      <div class="tm-head"><a class="wbtn sm" href="#/menu">← Zurück</a><h2 class="tm-plank">🌍 Community</h2><span class="tm-purse"><a href="#/build" class="cm-build">🔨 Bauen</a></span></div>
      <p class="tm-tip">Räume von Spielern für Spieler · veröffentlicht im Level-Bauer über GitHub · sortiert nach 👍</p>
      <div class="cm-grid" id="cm-grid"><div class="parch cm-msg">Lade Räume von GitHub …</div></div>
      <button class="wbtn sm" id="cm-reload">↻ Neu laden</button>
    </div></section>`;
  const grid = root.querySelector('#cm-grid');
  let alive = true;
  async function load(force) {
    grid.innerHTML = '<div class="parch cm-msg">Lade Räume von GitHub …</div>';
    try {
      const list = await fetchLevels(force);
      if (!alive) return;
      if (!list.length) { grid.innerHTML = '<div class="parch cm-msg">Noch keine Räume veröffentlicht. Bau den ersten im Level-Bauer und klick dort auf „Veröffentlichen“!</div>'; return; }
      grid.innerHTML = list.map((l, i) => `
        <article class="cm-card parch">
          <canvas class="cm-thumb" data-i="${i}" aria-hidden="true"></canvas>
          <div class="cm-body">
            <h3>${esc(l.title)}</h3>
            <p class="cm-meta">von ${esc(l.author)} · ${l.room.w}×${l.room.h} · 👍 ${l.likes}</p>
            <div class="cm-actions"><a class="wbtn sm big" href="#/community/play/${l.code}">▶ Spielen</a><a class="wbtn sm" href="${esc(l.url)}" target="_blank" rel="noopener">👍 Bewerten</a></div>
          </div>
        </article>`).join('');
      grid.querySelectorAll('.cm-thumb').forEach((c) => { const l = list[+c.dataset.i]; try { roomThumb(c, toDefFromRoom(l.room), l.room.theme, 2); } catch { /* Vorschau optional */ } });
    } catch (err) {
      if (alive) grid.innerHTML = `<div class="parch cm-msg">${esc(err.message || 'GitHub ist gerade nicht erreichbar.')}</div>`;
    }
  }
  root.querySelector('#cm-reload').addEventListener('click', () => load(true));
  load(false);
  return () => { alive = false; };
}
