// Live-Log-Bus (nur Entwicklung): sammelt Ereignisse aus Spiel, Löser und Tests und schreibt
// sie gebündelt über POST /api/log in live.log. Der Server meldet jede Zeile an das Live-Log
// der Gehirnkarte weiter. In Produktion tut devlog() nichts.
import { IS_DEV } from './config.js';

const pending = new Map(); // Quelle → Zeilen
let timer = null;

export function devlog(source, text) {
  if (!IS_DEV) return;
  if (!pending.has(source)) pending.set(source, []);
  pending.get(source).push(text);
  if (!timer) timer = setTimeout(flush, 120);
}

export function flush() {
  timer = null;
  for (const [source, lines] of pending) {
    if (!lines.length) continue;
    const body = JSON.stringify({ source, lines: lines.splice(0) });
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
}
