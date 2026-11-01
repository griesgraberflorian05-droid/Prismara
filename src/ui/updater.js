// Updates: Die Seite fragt jede Minute version.json ab. Liegt auf GitHub eine neuere Version, erscheint
// unten rechts über den Steuerknöpfen eine Nachricht. „Später“ blendet sie nur kurz aus – sie kommt nach
// 2 Minuten wieder, bis aktualisiert ist. Geladen wird über eine neue Adresse (?u=…), damit weder Browser
// noch GitHub die alte Seite aus dem Zwischenspeicher liefern. Der Spielstand bleibt erhalten.
import { VERSION } from '../version.js';
import { play } from '../game/sound.js';

const EVERY_MS = 60 * 1000, SNOOZE_MS = 2 * 60 * 1000;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let snoozeUntil = 0;

/** Liefert { version, build, note }, wenn online etwas Neueres liegt, sonst null. */
export async function checkUpdate() {
  if (VERSION === 'dev') return null;
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const info = await r.json();
    return String(info.version) > VERSION ? info : null;
  } catch { return null; } // offline: einfach weiterspielen
}

export function applyUpdate(version = Date.now()) {
  location.replace(`${location.pathname}?u=${version}${location.hash}`);
}

export function showUpdate(info) {
  if (document.querySelector('.upd-note') || Date.now() < snoozeUntil) return;
  const el = document.createElement('div');
  el.className = 'upd-note';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div><b>✨ Update${info.build ? ` v1.${esc(info.build)}` : ''} ist da!</b>${info.note ? `<span>${esc(info.note)}</span>` : ''}</div>
    <div class="upd-btns"><button class="wbtn sm" data-a="now">Aktualisieren</button><button class="wbtn sm" data-a="later">Später</button></div>`;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'now') applyUpdate(info.version);
    if (a === 'later') { snoozeUntil = Date.now() + SNOOZE_MS; el.remove(); }
  });
  document.body.appendChild(el);
  play('ui');
}

export function startUpdateCheck() {
  if (location.hostname === 'localhost') window.__showUpdate = showUpdate; // zum Ausprobieren
  const run = async () => { const info = await checkUpdate(); if (info) showUpdate(info); };
  setTimeout(run, 3000);
  setInterval(run, EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
}
