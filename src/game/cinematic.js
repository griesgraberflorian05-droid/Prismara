// Zwei Code-Funktionen fürs Zuschauen:
// • „all full monitor“: öffnet das Spiel in einem Fenster über alle Monitore, mit Kino-Balken und Vignette.
// • „cinematic player“: das Spiel spielt sich selbst – löst Räume, sammelt ein, geht durch die Tür,
//   schaut zwischendurch ins Menü, kauft Verbesserungen und probiert freigeschaltete Seiten aus. ESC beendet.
import { codeOn } from './codes.js';
import { getSettings, updateSettings } from '../settings.js';
import { PUSH_LEVELS } from './pushLevels.js';
import { isSolved } from './progress.js';
import { PixelRenderer } from './pixelRender.js';

export const cinemaOn = () => codeOn('cinematicplayer');
export const spanOn = () => codeOn('allfullmonitor');
/** F11 mit eingelöstem „all full monitor“: über alle Monitore statt normalem Vollbild. */
export function onF11(e) {
  if (e.key !== 'F11' || !spanOn()) return;
  e.preventDefault();
  if (spanWindow()) { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); return; } // im großen Fenster: normales Vollbild umschalten
  spanAllMonitors();
}
const spanWindow = () => new URLSearchParams(location.search).has('span');

/** Öffnet ein Fenster, das alle Bildschirme abdeckt (Chrome/Edge: mit Erlaubnis zur Fensterverwaltung). */
export async function spanAllMonitors() {
  let box = { left: screen.availLeft ?? 0, top: screen.availTop ?? 0, width: screen.availWidth, height: screen.availHeight }, n = 1;
  try {
    if ('getScreenDetails' in window) { // fragt einmal nach der Erlaubnis, alle Bildschirme zu sehen
      const d = await window.getScreenDetails(), s = d.screens; n = s.length;
      const l = Math.min(...s.map((x) => x.availLeft)), t = Math.min(...s.map((x) => x.availTop));
      box = { left: l, top: t, width: Math.max(...s.map((x) => x.availLeft + x.availWidth)) - l, height: Math.max(...s.map((x) => x.availTop + x.availHeight)) - t };
    }
  } catch { /* Erlaubnis verweigert: nur dieser Bildschirm */ }
  const url = `${location.pathname}?span=1${location.hash}`;
  const w = window.open(url, 'prismara-span', `popup,left=${box.left},top=${box.top},width=${box.width},height=${box.height}`);
  if (!w) { document.documentElement.requestFullscreen?.(); return { screens: n, popup: false }; }
  return { screens: n, popup: true };
}

/** Kino-Look im Über-alle-Monitore-Fenster oder während der Cinematic Player läuft. */
export function applyCinema() {
  document.body.classList.toggle('cinema', spanWindow() || cinemaOn());
  document.body.classList.toggle('cinema-player', cinemaOn()); // nur beim Selbstspielen: Kraft-Anzeige ausblenden
}

// ---------- Regie des Cinematic Players ----------
const KEY = 'prismara.cinema.v1';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (d) => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* blockiert */ } };
const TOUR = ['#/menu/magie', '#/menu/forge', '#/menu/garderobe', '#/menu/shop', '#/menu/chapters', '#/menu/settings'];
const firstOpen = () => Math.max(0, PUSH_LEVELS.findIndex((l) => !isSolved(l.id)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Der fliegende Held: hält einen Gleiter über dem Kopf und drückt die Knöpfe selbst ----------
let pilot = null, px = innerWidth / 2, py = innerHeight / 2;
function makePilot() {
  const el = document.createElement('div'); el.id = 'pilot';
  const c = document.createElement('canvas'); c.width = 40; c.height = 44; el.append(c);
  const g = c.getContext('2d'), R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // Gleiter: Holzstange, gespanntes Tuch in Streifen, Halteschnüre zu den Händen
  R(2, 4, 36, 2, '#17121f'); R(3, 4, 34, 1, '#9b6a3e');
  for (let k = 0; k < 9; k++) { R(4 + k * 2, 6 + k, 32 - k * 4, 1, k % 2 ? '#ff4d6d' : '#ffd166'); }
  R(4, 6, 1, 8, '#17121f'); R(35, 6, 1, 8, '#17121f');
  R(14, 14, 1, 6, '#6b4426'); R(25, 14, 1, 6, '#6b4426'); // Arme nach oben
  const pr = Object.create(PixelRenderer.prototype); pr.ctx = g; pr.rs = 2;
  g.save(); g.translate(12, 18); pr.player({ x: 0, y: 0, dir: 2, walk: null, stamina: 1, hat: '', noTrail: true }, 0); g.restore();
  document.body.append(el); return el;
}
function place() { if (pilot) pilot.style.transform = `translate(${px - 60}px, ${py - 120}px)`; }
/** Fliegt zum Element und drückt es. Liefert false, wenn es nichts zu drücken gibt. */
async function press(sel) {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el || !cinemaOn()) return false;
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); await wait(350);
  const r = el.getBoundingClientRect(); px = r.left + r.width / 2; py = r.top + r.height / 2;
  pilot.classList.add('fly'); place(); await wait(950);
  pilot.classList.add('dip'); await wait(220); // runter, drücken, wieder hoch
  if (!cinemaOn()) return false;
  el.click(); pilot.classList.remove('dip'); await wait(300); pilot.classList.remove('fly');
  return true;
}
const winVisible = () => { const w = document.querySelector('#win'); return w && !w.hidden; };

/** Kauft auf einer Menüseite das Günstigste, was klickbar ist, und drückt den Knopf dafür sichtbar. */
async function shopRound() {
  const btn = [...document.querySelectorAll('[data-lv],[data-tal],[data-up],[data-buy],[data-hero],[data-aura]')].find((b) => !b.disabled);
  if (btn) { await press(btn); await wait(900); }
}

let running = false;
async function director() {
  running = true;
  while (cinemaOn()) {
    const d = load(), h = location.hash || '#/menu';
    if (h.startsWith('#/adv/')) {
      if (winVisible()) { // Raum geschafft: zu „Nächster Raum“ fliegen; jeder dritte Raum mit Abstecher ins Menü
        await wait(1800); d.rooms = (d.rooms || 0) + 1; save(d);
        if (d.rooms % 3 === 0) { location.hash = '#/menu'; await wait(1500); continue; }
        if (!(await press('#win-next'))) { await press('#win-boss'); await wait(600); if (location.hash.startsWith('#/arena')) location.hash = `#/adv/${firstOpen()}`; }
        await wait(2500); continue;
      }
      await wait(700); continue; // der Raum spielt sich selbst
    }
    if (h.startsWith('#/arena')) { await wait(2500); await press('#pause'); await wait(500); if (!(await press('#panel a[href^="#/menu"]'))) location.hash = `#/adv/${firstOpen()}`; await wait(1500); continue; }
    if (h === '#/menu' || h === '#/' || h === '') { // Hauptmenü: eine Seite der Tour ansteuern oder „Spielen“
      await wait(1500);
      const k = d.tourIdx || 0;
      if (!d.toured) { d.toured = true; d.tourIdx = k + 1; save(d); const page = TOUR[k % TOUR.length]; if (await press(`a[href="${page}"]:not(.locked)`) || await press(`a[href^="${page}"]:not(.locked)`)) { await wait(1500); continue; } }
      d.toured = false; save(d);
      if (!(await press('#play'))) location.hash = `#/adv/${firstOpen()}`;
      await wait(2000); continue;
    }
    // Unterseite: umsehen, etwas kaufen, zurück
    await wait(1800); await shopRound(); await wait(800);
    if (!(await press('.tm-head a.wbtn'))) location.hash = '#/menu';
    await wait(1500);
  }
  running = false;
}
function onEsc(e) { if (e.key === 'Escape' && cinemaOn()) { e.stopImmediatePropagation(); updateSettings({ fx: (getSettings().fx || []).filter((x) => x !== 'cinematicplayer') }); stopCinema(); } }
export function startCinema() {
  applyCinema(); addEventListener('keydown', onEsc, true);
  if (!pilot) { pilot = makePilot(); place(); }
  if (!running) director();
}
export function stopCinema() { removeEventListener('keydown', onEsc, true); pilot?.remove(); pilot = null; applyCinema(); }
