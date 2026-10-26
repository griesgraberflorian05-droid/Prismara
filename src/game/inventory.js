// Inventar und Münzen (Spielstand im Browser). Münzen findet man in Räumen und Truhen und
// bekommt sie fürs Entkommen; ausgeben kann man sie beim Krämer. Gegenstände liegen in Räumen
// oder werden gekauft und im Raum über die Inventarleiste (Tasten 1–4) benutzt.
const KEY = 'prismara.inventory.v1';

/** Alle Gegenstände: Symbol (Pixel-Emoji im HUD), Name, Erklärung, Preis beim Krämer. */
export const ITEMS = {
  bread: { icon: '🍞', name: 'Kraftbrot', info: 'Füllt die Kraftleiste sofort ganz auf.', price: 15 },
  scroll: { icon: '📜', name: 'Wegrolle', info: 'Zeigt dir den nächsten richtigen Zug (der Löser rechnet mit).', price: 40 },
  lens: { icon: '🔍', name: 'Lupe', info: 'Zeigt eine Runde lang, wo Kristalle, Münzen und Schlüssel liegen.', price: 25 },
  pick: { icon: '🔧', name: 'Dietrich', info: 'Öffnet eine Schatztruhe in der Wand (lauf gegen die Truhe). Wird dabei verbraucht.', price: 30 },
  boots: { icon: '🥾', name: 'Wanderstiefel', info: 'Dauerhaft: Laufen lädt doppelt so viel Kraft auf.', price: 120, permanent: true },
  gloves: { icon: '🧤', name: 'Kletterhandschuhe', info: 'Dauerhaft: Schieben kostet weniger Kraft (4 statt 3 Schübe am Stück).', price: 160, permanent: true },
  lantern: { icon: '🏮', name: 'Große Laterne', info: 'Dauerhaft: Deine Laterne leuchtet heller und weiter.', price: 90, permanent: true },
};
export const SLOTS = ['bread', 'scroll', 'lens', 'pick'];

/** Raumführer: Erklärung jedes Elements, das in einem Raum vorkommt (für die Hinweisschilder). */
export const GUIDE = {
  emitter: '🔥 Redstone-Fackel – von ihr läuft eine Redstone-Leitung in Pfeilrichtung.',
  target: '💡 Redstone-Lampe – leuchtet, wenn eine Leitung in ihrer Farbe ankommt. Leuchten alle Lampen, geht die Tür auf.',
  mirror: '🪞 Spiegel – dagegenlaufen schiebt ihn, Leertaste dreht ihn. Er lenkt die Leitung um 90°.',
  stone: '🪨 Steinblock – unterbricht Leitungen. Schieb ihn aus dem Weg oder nutze ihn als Schutz.',
  prism: '🔺 Prisma – teilt weißes Licht in Rot, Grün und Blau.',
  filter: '🟩 Farbglas – lässt nur seine eigene Farbe durch.',
  splitter: '◩ Strahlteiler – halb durch, halb abgelenkt: aus einer Leitung werden zwei.',
  portal: '🌀 Portale – die Leitung läuft in eins hinein und kommt aus dem mit gleichem Buchstaben heraus.',
  sensor: '👁 Auge und Gitter – ein richtig beleuchtetes Auge öffnet sein Tor.',
  plate: '⬛ Druckplatte – Kippspiegel kippen, solange etwas darauf steht.',
  ice: '🧊 Eis – du und Kisten rutschen, bis etwas im Weg ist.',
  flow: '➡ Strömung – nur in Pfeilrichtung betretbar.',
  enemy: '👻 Schattenläufer – laufen bei jedem Zug mit. Berührung heißt erwischt; im Licht lösen sie sich auf.',
  lamp: '🔦 Wanderlampe – eine schiebbare Redstone-Fackel, Leertaste dreht ihre Richtung.',
  shifter: '🌈 Farbwandler – färbt die Leitung in die nächste Farbe um.',
  key: '🗝 Schlüssel – lauf drüber, um ihn einzustecken.',
  lock: '⛓ Gittertor – gesperrt. Mit einem Schlüssel lauf dagegen, dann schwingt es auf.',
  hole: '🕳 Moorgrube – hinein kannst du nicht. Schieb einen Block hinein: Er versinkt und wird zum Trittstein.',
  crumble: '🪵 Brüchiger Boden – trägt dich genau einmal. Verlässt du ihn, bricht er ein und wird zur Grube.',
};

// Zwischenspeicher: der Renderer fragt jedes Bild nach dem Hut – nicht jedes Mal JSON lesen
let cache = null;
function load() {
  if (cache) return structuredClone(cache);
  try { cache = { coins: 0, items: {}, found: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { cache = { coins: 0, items: {}, found: {} }; }
  return structuredClone(cache);
}
function save(d) { cache = structuredClone(d); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* blockiert */ } }
addEventListener('storage', (e) => { if (e.key === KEY) cache = null; });

export const getInv = () => load();
export const coins = () => load().coins;
export const count = (id) => load().items[id] || 0;
export const owns = (id) => count(id) > 0;

export function addCoins(n) { const d = load(); d.coins += n; if (n > 0) d.earned = (d.earned || 0) + n; save(d); return d.coins; }
export function addItem(id, n = 1) { const d = load(); d.items[id] = (d.items[id] || 0) + n; save(d); return d.items[id]; }
export function useItem(id) {
  const d = load();
  if (!d.items[id]) return false;
  if (!ITEMS[id]?.permanent) d.items[id]--;
  save(d); return true;
}
export function buy(id) {
  const it = ITEMS[id], d = load();
  if (!it || d.coins < it.price || (it.permanent && d.items[id])) return false;
  d.coins -= it.price; d.items[id] = (d.items[id] || 0) + 1; save(d); return true;
}
// ---------- Hüte: mit gesammelten Kristallen (💎) beim Hutmacher kaufen, einer ist aufgesetzt ----------
export const HATS = {
  straw: { icon: '👒', name: 'Strohhut', price: 2 },
  flowers: { icon: '🌼', name: 'Blumenkranz', price: 3 },
  leaf: { icon: '🌿', name: 'Blatthut', price: 3 },
  mushroom: { icon: '🍄', name: 'Pilzkappe', price: 4 },
  pirate: { icon: '🏴‍☠️', name: 'Piratenhut', price: 5 },
  wizard: { icon: '🧙', name: 'Zauberhut', price: 6 },
  crown: { icon: '👑', name: 'Krone', price: 10 },
};
export const hat = () => (cache || load()) && cache.hat || null;
export const ownsHat = (id) => (load().hats || []).includes(id);
export const crystalsSpent = () => load().crystalsSpent || 0;
export function buyHat(id, crystalsHave) {
  const d = load(), it = HATS[id];
  if (!it || (d.hats || []).includes(id) || crystalsHave - (d.crystalsSpent || 0) < it.price) return false;
  d.crystalsSpent = (d.crystalsSpent || 0) + it.price; d.hats = [...(d.hats || []), id]; d.hat = id; save(d); return true;
}
export function wearHat(id) { const d = load(); d.hat = id && (d.hats || []).includes(id) ? id : null; save(d); }

/** Merkt, welche Fundstücke eines Raums schon eingesammelt sind (z. B. 'coin2', 'chest'). */
export function isFound(room, what) { return (load().found[room] || []).includes(what); }
export function markFound(room, what) { const d = load(); d.found[room] = [...new Set([...(d.found[room] || []), what])]; save(d); }
