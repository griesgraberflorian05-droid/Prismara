// Updates: Die Seite fragt regelmäßig version.json ab. Liegt auf GitHub eine neuere Version, erscheint
// eine Nachricht mit „Aktualisieren“. Geladen wird dann über eine neue Adresse (?u=…), damit weder
// Browser noch GitHub noch die alte Seite aus dem Zwischenspeicher liefern. Der Spielstand bleibt erhalten.
import { VERSION } from '../version.js';

const EVERY_MS = 3 * 60 * 1000;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let shown = null;

/** Liefert { version, note }, wenn online etwas Neueres liegt, sonst null. */
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
  if (shown === info.version) return;
  try { if (sessionStorage.getItem('prismara.update.later') === String(info.version)) return; } catch { /* blockiert */ }
  shown = info.version;
  const el = document.createElement('div');
  el.className = 'upd-note';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div><b>✨ Neues Update!</b>${info.note ? `<span>${esc(info.note)}</span>` : ''}</div>
    <div class="upd-btns"><button class="wbtn sm" data-a="now">Aktualisieren</button><button class="wbtn sm" data-a="later">Später</button></div>`;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'now') applyUpdate(info.version);
    if (a === 'later') { try { sessionStorage.setItem('prismara.update.later', String(info.version)); } catch { /* blockiert */ } el.remove(); }
  });
  document.body.appendChild(el);
}

export function startUpdateCheck() {
  if (location.hostname === 'localhost') window.__showUpdate = showUpdate; // zum Ausprobieren
  const run = async () => { const info = await checkUpdate(); if (info) showUpdate(info); };
  setTimeout(run, 3000);
  setInterval(run, EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
}
