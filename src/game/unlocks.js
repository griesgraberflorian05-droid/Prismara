// Freischalten: Jeder beginnt im Hauptmodus (Abenteuer, Raum für Raum). Weitere Spielmodi öffnen sich
// nach gelösten Räumen. Bereits gezeigte Freischaltungen werden gemerkt, damit das Menü neue feiern kann.
import { PUSH_LEVELS } from './pushLevels.js';
import { isSolved } from './progress.js';

export const MODES = [
  { id: 'worlds', name: 'Welten', icon: '🗺', need: 3, info: 'Jeden geschafften Raum erneut spielen, Welten durchblättern.' },
  { id: 'kit', name: 'Held', icon: '🎨', need: 5, info: 'Farben, Zeichen und Hüte für deinen Helden.' },
  { id: 'daily', name: 'Tagesrätsel', icon: '📅', need: 6, info: 'Jeden Tag ein neues, garantiert lösbares Rätsel.' },
  { id: 'shop', name: 'Krämer', icon: '🛒', need: 8, info: 'Münzen gegen Brot, Lupen, Dietriche und mehr.' },
  { id: 'trophies', name: 'Erfolge', icon: '🏆', need: 10, info: 'Deine Abzeichen und Rekorde.' },
  // Level-Bauer und Community auf Nutzerwunsch entfernt (2026-10-27)
];
const SEEN_KEY = 'prismara.unlocks.v1';

export const solvedCount = () => PUSH_LEVELS.filter((l) => isSolved(l.id)).length;
export const modeOf = (id) => MODES.find((m) => m.id === id) || null;
export function isUnlocked(id, solved = solvedCount()) {
  const m = modeOf(id);
  return !m || solved >= m.need;
}

function loadSeen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } }

/** Freigeschaltete, aber noch nicht gefeierte Modi; markiert sie als gesehen. */
export function takeNewUnlocks() {
  const seen = new Set(loadSeen());
  const solved = solvedCount();
  const fresh = MODES.filter((m) => solved >= m.need && !seen.has(m.id));
  if (fresh.length) { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((m) => m.id)])); } catch { /* blockiert */ } }
  return fresh;
}

/** Modi, die mit genau diesem gelösten Raum dazukommen (für die Siegeskarte). */
export const unlockedBetween = (before, after) => MODES.filter((m) => before < m.need && after >= m.need);

/** Pergament-Hinweis für eine noch gesperrte Seite. */
export function lockedHtml(id) {
  const m = modeOf(id), have = solvedCount();
  return `<div class="tm-locked parch"><div class="tl-icon" aria-hidden="true">🔒</div>
    <h2>${m.icon} ${m.name}</h2><p>${m.info}</p>
    <p class="tl-need">Schaltet sich frei, sobald du <b>${m.need} Räume</b> geschafft hast – noch ${Math.max(0, m.need - have)}.</p>
    <a class="wbtn big" href="#/menu">▶ Zurück zum Abenteuer</a></div>`;
}
