// Einlösbare Codes: was sie schalten, ob sie an sind, und das Merken der schon eingelösten.
// Die Seite „Meine Codes“ im Menü zeigt nur eingelöste Codes, damit sie geheim bleiben.
import { getSettings, updateSettings } from '../settings.js';
import { isAdmin, setAdmin } from './admin.js';
import { addCoins } from './inventory.js';
import { hasHalloween, setHalloween, isDinnerbone, setDinnerbone } from './skins.js';

// Bildeffekte: je Code eine Klasse am body, siehe styles.css
const fxOn = (id) => (getSettings().fx || []).includes(id);
function fx(id, name, info) {
  return { id, name, info, on: () => fxOn(id), set: (on) => {
    updateSettings({ fx: on ? [...new Set([...(getSettings().fx || []), id])] : (getSettings().fx || []).filter((x) => x !== id) });
    applyFx();
  } };
}
function toggle(id, name, info) {
  return { id, name, info, on: () => fxOn(id), set: (on) => updateSettings({ fx: on ? [...new Set([...(getSettings().fx || []), id])] : (getSettings().fx || []).filter((x) => x !== id) }) };
}
export const codeOn = fxOn;
export function applyFx() { for (const id of ['retro', 'disco', 'nachtsicht', 'kopfueber']) document.body.classList.toggle(`fx-${id}`, fxOn(id)); }

export const CODES = [
  { id: 'freeadmin', name: 'Admin-Modus', info: 'Alles frei, alle Gegenstände unendlich.', on: isAdmin, set: setAdmin },
  { id: 'halloween', name: 'Halloween-Umhang', info: 'Der geheime Kürbis-Umhang.', on: hasHalloween, set: setHalloween },
  { id: 'dinnerbone', name: 'Dinnerbone', info: 'Dein Held steht auf dem Kopf.', on: isDinnerbone, set: setDinnerbone },
  toggle('replay', 'Replay', 'Nach jedem geschafften Raum kannst du deinen Lauf noch einmal ansehen.'),
  toggle('turbo', 'Turbo', 'Dein Held rennt doppelt so schnell.'),
  fx('retro', 'Retro', 'Alles in alten Grautönen.'),
  fx('disco', 'Disco', 'Die Farben tanzen durch die Welt.'),
  fx('nachtsicht', 'Nachtsicht', 'Die Welt in Grün wie durch ein Nachtsichtgerät.'),
  fx('kopfueber', 'Kopfüber', 'Das ganze Spiel steht auf dem Kopf.'),
];

export const CODE_PASSWORD = '1234';
/** Alle geheimen Codes für die Liste hinter dem Code „function“. */
export const ALL_CODES = [
  ...CODES.map((c) => [c.id, c.info]), ['moneten', 'Einmalig 250 Münzen.'], ['resetall', 'Setzt das ganze Spiel zurück.'], ['function', 'Zeigt diese Liste.'],
];

/** Löst einen Code ein; liefert seine Kennung oder null. „resetall“ löscht hier noch nichts. */
export function redeem(text) {
  const id = text.trim().toLowerCase();
  if (id === 'resetall' || id === 'function') return id;
  if (id === 'moneten') {
    if ((getSettings().usedCodes || []).includes(id)) return 'used';
    addCoins(250);
    updateSettings({ usedCodes: [...(getSettings().usedCodes || []), id] });
    return id;
  }
  const code = CODES.find((c) => c.id === id);
  if (!code) return null;
  code.set(true);
  updateSettings({ usedCodes: [...new Set([...(getSettings().usedCodes || []), id])] });
  return id;
}

export const usedCodes = () => CODES.filter((c) => c.on() || (getSettings().usedCodes || []).includes(c.id));

/** Schaltet einen eingelösten Code um; er bleibt danach in der Liste, auch wenn er aus ist. */
export function toggleCode(id) {
  const code = CODES.find((c) => c.id === id);
  updateSettings({ usedCodes: [...new Set([...(getSettings().usedCodes || []), id])] });
  code.set(!code.on());
}

/** Setzt das Spiel auf den Anfang zurück: alle Spielstände weg, die Einstellungen der Gehirnkarte bleiben. */
export function resetAll() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('prismara.') && !/^prismara\.(brain|livelog)/.test(k)).forEach((k) => localStorage.removeItem(k));
  } catch { /* blockiert */ }
  history.replaceState(null, '', location.pathname);
  location.reload();
}
