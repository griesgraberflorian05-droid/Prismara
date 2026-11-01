// Einlösbare Codes: was sie schalten, ob sie an sind, und das Merken der schon eingelösten.
// Die Seite „Meine Codes“ im Menü zeigt nur eingelöste Codes, damit sie geheim bleiben.
import { getSettings, updateSettings } from '../settings.js';
import { isAdmin, setAdmin } from './admin.js';
import { hasHalloween, setHalloween, isDinnerbone, setDinnerbone } from './skins.js';

export const CODES = [
  { id: 'freeadmin', name: 'Admin-Modus', info: 'Alles frei, alle Gegenstände unendlich.', on: isAdmin, set: setAdmin },
  { id: 'halloween', name: 'Halloween-Umhang', info: 'Der geheime Kürbis-Umhang.', on: hasHalloween, set: setHalloween },
  { id: 'dinnerbone', name: 'Dinnerbone', info: 'Dein Held steht auf dem Kopf.', on: isDinnerbone, set: setDinnerbone },
];

/** Löst einen Code ein; liefert seine Kennung oder null. „resetall“ löscht hier noch nichts. */
export function redeem(text) {
  const id = text.trim().toLowerCase();
  if (id === 'resetall') return id;
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
