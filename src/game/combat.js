// Kampf: Glut-Schwert mit teuren Verbesserungen, Waffen-Skins, Gegner und Boss je Welt.
// Die Teaser-Monster in den Räumen und die Kampflevel am Weltende nutzen dieselben Wesen.
import { CHAPTERS } from './pushLevels.js';
import { isSolved } from './progress.js';
import { CHAPTER_WORLD } from './worlds.js';
import { getInv, addCoins } from './inventory.js';
import { isAdmin, isFull } from './admin.js';
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
export const ownsPart = (id) => isFull() || !PARTS.blade.list.concat(PARTS.guard.list, PARTS.grip.list).find((p) => p.id === id)?.price || (load().ownedParts || []).includes(id);
/** Kauft ein Teil, falls nötig, und baut es ins Schwert ein. */
export function pickPart(slot, id) {
  const p = PARTS[slot].list.find((x) => x.id === id), d = load();
  if (!ownsPart(id)) {
    if (!pay(p.price)) return false; d.ownedParts = [...(d.ownedParts || []), id];
  }
  d.parts = { ...(d.parts || {}), [slot]: id }; save(d);
  return true;
}

// Magie nach klaren Regeln (harte Magie): jeder Zauber kostet Mana UND hat eine Abklingzeit.
// Vier Plätze wie in League of Legends: Q, E, R für normale Zauber, F nur für einen Ultimate (W ist Laufen).
// Jeder Zauber hat 5 Stufen (mehr Wirkung, weniger Pause, weniger Mana); Talente verbessern alles.
export const SPELLS = [
  { id: 'nova', name: 'Lichtnova', info: 'Lichtring um dich, trifft alles in 3 Feldern.', cd: 7000, mana: 30, power: 2, grow: 1 },
  { id: 'blitz', name: 'Kettenblitz', info: 'Springt auf bis zu 3 Gegner, starker Einzelschaden.', cd: 5000, mana: 25, power: 3, grow: 1 },
  { id: 'lanze', name: 'Lichtlanze', info: 'Strahl in Blickrichtung bis zur Wand, durchbohrt alles.', cd: 4000, mana: 20, power: 2, grow: 1 },
  { id: 'frost', name: 'Frostbann', info: 'Friert Gegner und Boss ein (länger mit jeder Stufe).', cd: 11000, mana: 35, power: 1, grow: 0.5 },
  { id: 'schild', name: 'Lichtschild', info: 'Fängt die nächsten Treffer ab.', cd: 14000, mana: 30, power: 1, grow: 0.5 },
  { id: 'heil', name: 'Heillicht', info: 'Heilt Herzen.', cd: 16000, mana: 45, power: 1, grow: 0.34 },
  { id: 'sprung', name: 'Lichtsprung', info: 'Teleport 3 Felder in Blickrichtung.', cd: 6000, mana: 15, power: 3, grow: 0.25 },
  { id: 'meteor', name: 'Sternenfall', info: 'ULTIMATE: Nach kurzer Warnung trifft ein Stern den ganzen Raum.', cd: 45000, mana: 80, power: 6, grow: 2, ult: true },
  { id: 'sonne', name: 'Zweite Sonne', info: 'ULTIMATE: 6 s lang lädt jeder Treffer Mana zurück und Zauber kühlen doppelt so schnell ab.', cd: 60000, mana: 60, power: 6, grow: 1, ult: true },
];
export const MAX_SPELL_LV = 5;
const LV_COST = [0, 150, 400, 900, 1800]; // Preis für Stufe 2..5
export const spellOf = (id) => SPELLS.find((s) => s.id === id) || SPELLS[0];
export const spellLv = (id) => (isFull() ? MAX_SPELL_LV : Math.max(1, load().spellLv?.[id] || 1));
export const spellCost = (id) => (spellLv(id) >= MAX_SPELL_LV ? null : isAdmin() ? 0 : LV_COST[spellLv(id)] * (spellOf(id).ult ? 2 : 1));
export function levelSpell(id) { const c = spellCost(id); if (c == null || !pay(c)) return false; const d = load(); d.spellLv = { ...(d.spellLv || {}), [id]: spellLv(id) + 1 }; save(d); return true; }
// Talente: dauerhafte Werte für das ganze System
export const TALENTS = {
  pool: { name: 'Manavorrat', info: '+20 maximales Mana je Stufe.', costs: [200, 600, 1400], per: 20 },
  flow: { name: 'Manafluss', info: '+3 Mana pro Sekunde je Stufe.', costs: [250, 700, 1600], per: 3 },
  focus: { name: 'Fokus', info: '-8 % Abklingzeit je Stufe.', costs: [300, 900, 2000], per: 0.08 },
};
export const talentLv = (id) => (isFull() ? TALENTS[id].costs.length : load().talents?.[id] || 0);
export const talentCost = (id) => (talentLv(id) >= TALENTS[id].costs.length ? null : isAdmin() ? 0 : TALENTS[id].costs[talentLv(id)]);
export function levelTalent(id) { const c = talentCost(id); if (c == null || !pay(c)) return false; const d = load(); d.talents = { ...(d.talents || {}), [id]: talentLv(id) + 1 }; save(d); return true; }
export const manaMax = () => 100 + talentLv('pool') * TALENTS.pool.per;
export const manaRegen = () => 6 + talentLv('flow') * TALENTS.flow.per;
/** Fertige Werte eines Zaubers auf seiner Stufe: Stärke, Abklingzeit, Manakosten. */
export function spellStats(id) {
  const sp = spellOf(id), lv = spellLv(id) - 1;
  return { ...sp, lv: lv + 1, power: sp.power + sp.grow * lv, cd: Math.round(sp.cd * (1 - lv * 0.07) * (1 - talentLv('focus') * TALENTS.focus.per)), mana: Math.round(sp.mana * (1 - lv * 0.06)) };
}
export const spellSlots = () => { const s = load().slots || []; const q = (i, d) => (SPELLS.some((x) => x.id === s[i] && !x.ult) ? s[i] : d); return [q(0, 'nova'), q(1, 'blitz'), q(2, 'lanze'), SPELLS.some((x) => x.id === s[3] && x.ult) ? s[3] : 'meteor']; };
export const setSlots = (slots) => { const d = load(); d.slots = slots; save(d); };
export const presets = () => load().presets || [null, null, null];
export const savePreset = (i) => { const d = load(); d.presets = presets().map((p, k) => (k === i ? spellSlots() : p)); save(d); };

// Farben der Magie
export const MAGIC_COLORS = [
  { id: 'licht', name: 'Lichtgold', color: '#ffd166', price: 0 }, { id: 'glut', name: 'Glutrot', color: '#ff4a3a', price: 400 }, { id: 'frost', name: 'Frostblau', color: '#7fe0ff', price: 700 },
  { id: 'gift', name: 'Giftgrün', color: '#7dff6a', price: 1000 }, { id: 'nacht', name: 'Nachtviolett', color: '#b48cff', price: 1500 }, { id: 'prisma', name: 'Prisma', color: '#ffffff', price: 3000 },
];
export const magicColor = () => MAGIC_COLORS.find((m) => m.id === load().magicColor) || MAGIC_COLORS[0];
export const ownsMagic = (id) => isFull() || !MAGIC_COLORS.find((m) => m.id === id)?.price || (load().magics || []).includes(id);
export function pickMagic(id) {
  const m = MAGIC_COLORS.find((x) => x.id === id), d = load();
  if (!ownsMagic(id)) {
    if (!pay(m.price)) return false; d.magics = [...(d.magics || []), id];
  }
  d.magicColor = id; save(d);
  return true;
}

// Bezahlen: mit Code „debug“ gratis, gekauft wird trotzdem von Hand
const pay = (n) => { if (isAdmin()) return true; if (getInv().coins < n) return false; addCoins(-n); return true; };

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
  beach: { critter: 'Sandkrabbe', minion: 'crab', colors: ['#e0704a', '#8a3020'], boss: 'Krabbenkönig Klack', shape: 'crab', moves: ['cross', 'charge'] },
  cherry: { critter: 'Blütenling', minion: 'sprout', colors: ['#f0a0c0', '#a04870'], boss: 'Blütengeist Hanami', shape: 'bloom', moves: ['ring', 'rain'] },
  jungle: { critter: 'Rankenschleim', minion: 'slime', colors: ['#6cb455', '#2f5e2a'], boss: 'Rankenschlund', shape: 'tree', moves: ['shots', 'summon', 'cross'] },
  castle: { critter: 'Kerkerratte', minion: 'rat', colors: ['#8a8794', '#45434e'], boss: 'Kerkermeister Grimbart', shape: 'knight', moves: ['charge', 'sweep'] },
  moor: { critter: 'Moorlicht', minion: 'wisp', colors: ['#9fe8c8', '#3e6c5a'], boss: 'Moorhexe Grull', shape: 'hag', moves: ['rain', 'summon', 'ring'] },
  night: { critter: 'Nachtfalter', minion: 'bat', colors: ['#4f6ea0', '#1c2434'], boss: 'Eulenfürst Nachtschwinge', shape: 'moth', moves: ['sweep', 'rain'] },
  volcano: { critter: 'Glutling', minion: 'slime', colors: ['#ff7a3a', '#84281c'], boss: 'Glutgolem', shape: 'golem', moves: ['shots', 'charge', 'cross'] },
  temple: { critter: 'Skarabäus', minion: 'crab', colors: ['#d8aa60', '#6e4818'], boss: 'Sphinx Ankhara', shape: 'pharaoh', moves: ['ring', 'sweep', 'summon'] },
  shadow: { critter: 'Schattenrest', minion: 'wisp', colors: ['#7a5ab0', '#22163a'], boss: 'Der Schattenkönig', shape: 'shade', moves: ['cross', 'sweep', 'rain'] },
  aurora: { critter: 'Frostling', minion: 'slime', colors: ['#a8d8f0', '#3a5670'], boss: 'Frostdrache Kryos', shape: 'golem', moves: ['shots', 'ring', 'charge'] },
  reef: { critter: 'Riffquappe', minion: 'bat', colors: ['#ff8aa0', '#123a48'], boss: 'Leviathan der Tiefe', shape: 'kraken', moves: ['sweep', 'summon', 'rain', 'cross'] },
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

export function swordSkin() {
  const d = load(), s = SWORD_SKINS.find((x) => x.id === d.skin) || SWORD_SKINS[0], t = d.tints?.[s.id];
  return t ? { ...s, blade: t[0], edge: t[1] } : s;
}
// Eigene Farben je Schwert-Skin: [Klinge, Schneide]
export const swordTint = (id) => load().tints?.[id] || null;
export function setSwordTint(id, tint) { const d = load(); d.tints = { ...(d.tints || {}), [id]: tint }; save(d); }
export const shownSkins = () => SWORD_SKINS.filter((s) => !s.secret || isAdmin() || hasHalloween());
export const ownsSkin = (id) => isFull() || load().skins.includes(id) || (id === 'pumpkin' && hasHalloween());
/** Kauft einen Skin, falls nötig, und legt ihn an. */
export function pickSkin(id) {
  const s = SWORD_SKINS.find((x) => x.id === id), d = load();
  if (!s) return false;
  if (!ownsSkin(id)) {
    if (!pay(s.price)) return false; d.skins.push(id);
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
