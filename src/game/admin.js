// Admin-Modus: Der Code „freeadmin“ im Menü schaltet alles frei (alle Räume, Welten, Modi, Umhänge,
// Hüte, Shop kostenlos). Liegt nur im Browser des Spielers und lässt sich wieder ausschalten.
const KEY = 'prismara.admin.v1';
const CODE = 'freeadmin';

export function isAdmin() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
export function setAdmin(on) { try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* blockiert */ } }
/** Prüft einen eingegebenen Code; true = richtig, Admin-Modus ist jetzt an. */
export function redeem(code) {
  if (code.trim().toLowerCase() !== CODE) return false;
  setAdmin(true);
  return true;
}
