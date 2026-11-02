// Admin-Modus: Der Code „freeadmin“ im Menü schaltet alles frei (alle Räume, Welten, Modi, Umhänge,
// Hüte, Shop kostenlos). Liegt nur im Browser des Spielers und lässt sich wieder ausschalten.
const KEY = 'prismara.admin.v1';

const DEBUG = 'prismara.debug.v1';
// isFull: alles sofort besessen (freeadmin). isAdmin: Levels und Debug frei, auch mit Code „debug“, dort wird gratis gekauft.
export function isFull() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
export function isDebug() { try { return localStorage.getItem(DEBUG) === '1'; } catch { return false; } }
export function setDebug(on) { try { if (on) localStorage.setItem(DEBUG, '1'); else localStorage.removeItem(DEBUG); } catch { /* blockiert */ } }
export const isAdmin = () => isFull() || isDebug();
export function setAdmin(on) { try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* blockiert */ } }
