// Kampf: Glut-Schwert mit teuren Verbesserungen, Waffen-Skins, Gegner und Boss je Welt.
// Die Teaser-Monster in den Räumen und die Kampflevel am Weltende nutzen dieselben Wesen.
import { CHAPTERS } from './pushLevels.js';
import { isSolved } from './progress.js';
import { CHAPTER_WORLD } from './worlds.js';
import { getInv, addCoins } from './inventory.js';
import { isAdmin } from './admin.js';
import { hasHalloween } from './skins.js';

const KEY = 'prismara.combat.v1';

// Preise steigen steil: Münzen reichen nur für die wichtigste Verbesserung, wer alles will, muss Räume wiederholen
export const UPGRADES = {
  sword: { name: 'Klinge', info: 'Mehr Schaden je Treffer.', values: [1, 2, 3, 4, 6], costs: [120, 320, 800, 1800], unit: 'Schaden' },
  armor: { name: 'Rüstung', info: 'Mehr Herzen im Kampf.', values: [3, 4, 5, 6], costs: [200, 600, 1500], unit: 'Herzen' },
  magic: { name: 'Magie', info: 'Stärkere Lichtnova. Erst nach dem ersten Boss nutzbar.', values: [0, 2, 4, 7], costs: [300, 900, 2200], unit: 'Bonus' },
  reach: { name: 'Reichweite', info: 'Der Rundumschlag reicht ein Feld weiter.', values: [1, 2], costs: [1000], unit: 'Felder' },
};

// Schwerter aus Einzelteilen: Klinge = Schaden, Parier = Abklingzeit, Griff = Magie-Stärke
export const PARTS = {
  blade: { name: 'Klinge', list: [{ id: 'rost', name: 'Rostklinge', price: 0, v: 0 }, { id: 'stahl', name: 'Stahlklinge', price: 250, v: 1 }, { id: 'glut', name: 'Glutklinge', price: 900, v: 2 }, { id: 'stern', name: 'Sternenklinge', price: 2500, v: 3 }], unit: 'Schaden' },
  guard: { name: 'Parier', list: [{ id: 'holz', name: 'Holzparier', price: 0, v: 1 }, { id: 'eisen', name: 'Eisenparier', price: 300, v: 0.85 }, { id: 'gold', name: 'Goldparier', price: 1000, v: 0.7 }], unit: 'Tempo' },
  grip: { name: 'Griff', list: [{ id: 'leder', name: 'Ledergriff', price: 0, v: 0 }, { id: 'rune', name: 'Runengriff', price: 700, v: 1 }, { id: 'kristall', name: 'Kristallgriff', price: 2000, v: 2 }], unit: 'Magie' },
};
export const partOf = (slot) => { const d = load().parts?.[slot]; return PARTS[slot].list.find((p) => p.id === d) || PARTS[slot].list[0]; };
export const ownsPart = (id) => isAdmin() || !PARTS.blade.list.concat(PARTS.guard.list, PARTS.grip.list).find((p) => p.id === id)?.price || (load().ownedParts || []).includes(id);
/** Kauft ein Teil, falls nötig, und baut es ins Schwert ein. */
export function pickPart(slot, id) {
  const p = PARTS[slot].list.find((x) => x.id === id), d = load();
  if (!ownsPart(id)) {
    if (getInv().coins < p.price) return false;
    addCoins(-p.price); d.ownedParts = [...(d.ownedParts || []), id];
  }
  d.parts = { ...(d.parts || {}), [slot]: id }; save(d);
  return true;
}

export const SWORD_SKINS = [
  { id: 'redstone', name: 'Glutstein', blade: '#e0342c', edge: '#ff8a70', grip: '#5a2a1a', price: 0 },
  { id: 'gold', name: 'Gold', blade: '#e8b04a', edge: '#fff0a8', grip: '#6b4426', price: 500 },
  { id: 'ice', name: 'Eis', blade: '#7fc8ea', edge: '#e4f8ff', grip: '#2e5a7a', price: 800 },
  { id: 'emerald', name: 'Smaragd', blade: '#3fae6a', edge: '#b8f2c4', grip: '#23502e', price: 1200 },
  { id: 'ember', name: 'Glut', blade: '#ff7a2a', edge: '#ffe08a', grip: '#3a1a10', price: 2000 },
  { id: 'night', name: 'Nachtstahl', blade: '#4a3f7a', edge: '#b8a8f0', grip: '#1a1630', price: 4000 },
  { id: 'pumpkin', name: 'Kürbis', blade: '#e8701a', edge: '#ffd166', grip: '#2a1a30', price: 0, secret: true },
];

// Gegner und Boss je Welt: shape wählt die Zeichnung in monsters.js, moves die Angriffe des Bosses
export const FOES = {
  beach: { critter: 'Sandkrabbe', minion: 'crab', colors: ['#e0704a', '#8a3020'], boss: 'Zangor der Gezeitenkrebs', shape: 'crab', moves: ['cross', 'charge'] },
  cherry: { critter: 'Blütenling', minion: 'sprout', colors: ['#f0a0c0', '#a04870'], boss: 'Sakura, die Dornenhexe', shape: 'bloom', moves: ['ring', 'rain'] },
  jungle: { critter: 'Rankenschleim', minion: 'slime', colors: ['#6cb455', '#2f5e2a'], boss: 'Mokar der Baumwächter', shape: 'tree', moves: ['shots', 'summon', 'cross'] },
  castle: { critter: 'Kerkerratte', minion: 'rat', colors: ['#8a8794', '#45434e'], boss: 'Ritter Eisenriegel', shape: 'knight', moves: ['charge', 'sweep'] },
  moor: { critter: 'Moorlicht', minion: 'wisp', colors: ['#9fe8c8', '#3e6c5a'], boss: 'Die Nebelmutter', shape: 'hag', moves: ['rain', 'summon', 'ring'] },
  night: { critter: 'Nachtfalter', minion: 'bat', colors: ['#4f6ea0', '#1c2434'], boss: 'Fürst Mondschatten', shape: 'moth', moves: ['sweep', 'rain'] },
  volcano: { critter: 'Glutling', minion: 'slime', colors: ['#ff7a3a', '#84281c'], boss: 'Ignor der Schmiedefürst', shape: 'golem', moves: ['shots', 'charge', 'cross'] },
  temple: { critter: 'Skarabäus', minion: 'crab', colors: ['#d8aa60', '#6e4818'], boss: 'Pharao Sonnenschwur', shape: 'pharaoh', moves: ['ring', 'sweep', 'summon'] },
  shadow: { critter: 'Schattenrest', minion: 'wisp', colors: ['#7a5ab0', '#22163a'], boss: 'Der Lichtfresser', shape: 'shade', moves: ['cross', 'sweep', 'rain'] },
  aurora: { critter: 'Frostling', minion: 'slime', colors: ['#a8d8f0', '#3a5670'], boss: 'Glazius der Eiskoloss', shape: 'golem', moves: ['shots', 'ring', 'charge'] },
  reef: { critter: 'Riffquappe', minion: 'bat', colors: ['#ff8aa0', '#123a48'], boss: 'Krakia, Herrin der Tiefe', shape: 'kraken', moves: ['sweep', 'summon', 'rain', 'cross'] },
};
export const foeOf = (world) => FOES[world] || FOES.beach;

function load() {
  try { return { sword: 0, armor: 0, reach: 0, magic: 0, skin: 'redstone', skins: ['redstone'], beaten: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { sword: 0, armor: 0, reach: 0, magic: 0, skin: 'redstone', skins: ['redstone'], beaten: [] }; }
}
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* blockiert */ } }

export const getCombat = () => load();
export const stat = (id) => UPGRADES[id].values[load()[id]];
export const nextCost = (id) => (isAdmin() ? (load()[id] < UPGRADES[id].costs.length ? 0 : null) : UPGRADES[id].costs[load()[id]] ?? null);
export function upgrade(id) {
  const cost = nextCost(id), d = load();
  if (cost == null || getInv().coins < cost) return false;
  addCoins(-cost); d[id]++; save(d);
  return true;
}

export const swordSkin = () => SWORD_SKINS.find((s) => s.id === load().skin) || SWORD_SKINS[0];
export const shownSkins = () => SWORD_SKINS.filter((s) => !s.secret || isAdmin() || hasHalloween());
export const ownsSkin = (id) => isAdmin() || load().skins.includes(id) || (id === 'pumpkin' && hasHalloween());
/** Kauft einen Skin, falls nötig, und legt ihn an. */
export function pickSkin(id) {
  const s = SWORD_SKINS.find((x) => x.id === id), d = load();
  if (!s) return false;
  if (!ownsSkin(id)) {
    if (getInv().coins < s.price) return false;
    addCoins(-s.price); d.skins.push(id);
  }
  d.skin = id; save(d);
  return true;
}

export const bossBeaten = (ci) => load().beaten.includes(CHAPTERS[ci]?.id);
export function markBoss(ci) { const d = load(); d.beaten = [...new Set([...d.beaten, CHAPTERS[ci].id])]; save(d); }
export const hasMagic = () => isAdmin() || load().beaten.length > 0; // Magie erspielt man sich mit dem ersten Boss
export const worldDone = (ci) => CHAPTERS[ci].levels.every((id) => isSolved(id));
/** Erste fertige Welt mit unbesiegtem Boss oder -1. Alle Welten dahinter bleiben gesperrt. */
export function bossPending() {
  if (isAdmin()) return -1;
  return CHAPTERS.findIndex((c, i) => worldDone(i) && !bossBeaten(i));
}
export const worldOf = (ci) => CHAPTER_WORLD[CHAPTERS[ci]?.id] || 'beach';
