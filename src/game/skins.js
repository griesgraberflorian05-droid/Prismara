// Lichtblock-Kit: Farbe und Symbol des Spielerblocks. Werden mit gesammelten Sternen
// freigeschaltet; die Wahl liegt in den Einstellungen (localStorage).
import { getSettings, updateSettings } from '../settings.js';

export const SKIN_COLORS = [
  // Umhangfarben des Pixel-Helden: erdig statt Neon (Körper = stops[1], Saum/Brosche = stops[0])
  { id: 'gold', name: 'Sonnengold', stops: ['#fff6d6', '#e8b04a', '#b8742a'], glow: '#ffe9a8', stars: 0 },
  { id: 'cyan', name: 'Seeblau', stops: ['#d8f0f8', '#3f8ab0', '#24587a'], glow: '#9ff6ff', stars: 6 },
  { id: 'pink', name: 'Kirschrosa', stops: ['#ffe6f0', '#d0708f', '#8a3a5a'], glow: '#ff9ce9', stars: 12 },
  { id: 'lime', name: 'Moosgrün', stops: ['#e8f4d8', '#5a9a44', '#2f5e2a'], glow: '#c4ff9f', stars: 20 },
  { id: 'ruby', name: 'Rubinrot', stops: ['#fff0f2', '#ff4d6d', '#c2185b'], glow: '#ff9fb0', stars: 30 },
  { id: 'linen', name: 'Leinen', stops: ['#fff8e8', '#d8c8a8', '#a8926e'], glow: '#fff2d0', stars: 0 },
  { id: 'oak', name: 'Eiche', stops: ['#e8c89a', '#8a5a32', '#5a3a1e'], glow: '#e8c89a', stars: 0 },
  { id: 'midnight', name: 'Mitternacht', stops: ['#c8d4f0', '#2e3f6e', '#1a2444'], glow: '#c8d4f0', stars: 3 },
  { id: 'plum', name: 'Pflaume', stops: ['#f0d8f0', '#7a3f7a', '#4a2448'], glow: '#f0d8f0', stars: 9 },
  { id: 'coral', name: 'Koralle', stops: ['#ffe0d8', '#e8806a', '#a84a3a'], glow: '#ffc0b0', stars: 15 },
  { id: 'ash', name: 'Asche', stops: ['#d8d8dc', '#5a5a64', '#2e2e36'], glow: '#d8d8dc', stars: 24 },
  { id: 'prism', name: 'Regenbogen', stops: ['#ff4d6d', '#ffd166', '#3ddc97', '#4da3ff', '#b18cff'], glow: '#ffffff', stars: 45 },
  // Skins als Daten: stops = Akzent, Körper; how = Freischaltung; acc = Accessoires. Neuer Skin = neue Zeile.
  { id: "h-laterne", name: "Laternenträgerin", stops: ["#d94040", "#3f6fb0", "#3f6fb0"], glow: "#d94040", stars: 0, secret: true, hero: true, how: "start", acc: [] },
  { id: "h-surfer", name: "Strandsurfer", stops: ["#ff5a9a", "#2ab8c8", "#2ab8c8"], glow: "#ff5a9a", stars: 0, secret: true, hero: true, how: "world:0", acc: ["stirnband"] },
  { id: "h-ninja", name: "Kirschblüten-Ninja", stops: ["#ff7ab0", "#2a1a30", "#2a1a30"], glow: "#ff7ab0", stars: 0, secret: true, hero: true, how: "never:Welt 2 mit allen Sternen", acc: ["maske", "stirnband"] },
  { id: "h-forscher", name: "Dschungelforscher", stops: ["#c8a66a", "#6b7a34", "#6b7a34"], glow: "#c8a66a", stars: 0, secret: true, hero: true, how: "never:Alle Splitter im Dschungel", acc: ["muetze"] },
  { id: "h-ritter", name: "Burgritter", stops: ["#c0342c", "#9a98a8", "#9a98a8"], glow: "#c0342c", stars: 0, secret: true, hero: true, how: "boss:3", acc: ["visier", "umhang"] },
  { id: "h-lehrling", name: "Moorlehrling", stops: ["#d8ff5a", "#4e7a4a", "#4e7a4a"], glow: "#d8ff5a", stars: 0, secret: true, hero: true, how: "boss:4", acc: ["zauberhut"] },
  { id: "h-eule", name: "Eulenkind", stops: ["#fff0c8", "#8a6a4a", "#8a6a4a"], glow: "#fff0c8", stars: 0, secret: true, hero: true, how: "boss:5", acc: ["ohren", "fluegel"] },
  { id: "h-schmied", name: "Schmiedemeister", stops: ["#ff7a1a", "#5a2a14", "#5a2a14"], glow: "#ff7a1a", stars: 0, secret: true, hero: true, how: "boss:6", acc: ["stirnband"] },
  { id: "h-pharao", name: "Wüstenpharao", stops: ["#5fd0ff", "#f0e6c8", "#f0e6c8"], glow: "#5fd0ff", stars: 0, secret: true, hero: true, how: "boss:7", acc: ["krone"] },
  { id: "h-schatten", name: "Schattenläufer", stops: ["#7a5ab0", "#2a1f48", "#2a1f48"], glow: "#7a5ab0", stars: 0, secret: true, hero: true, how: "boss:8", acc: ["kapuze"] },
  { id: "h-polar", name: "Polarforscherin", stops: ["#e8f2ff", "#2fb7a0", "#2fb7a0"], glow: "#e8f2ff", stars: 0, secret: true, hero: true, how: "boss:9", acc: ["kapuze"] },
  { id: "h-taucher", name: "Riff-Taucher", stops: ["#ffc84a", "#0e6a78", "#0e6a78"], glow: "#ffc84a", stars: 0, secret: true, hero: true, how: "boss:10", acc: ["schnorchel"] },
  { id: "h-magier", name: "Prisma-Magier", stops: ["#5fd0ff", "#4a22a0", "#4a22a0"], glow: "#5fd0ff", stars: 0, secret: true, hero: true, how: "allboss", acc: ["zauberhut"] },
  { id: "h-legende", name: "Goldene Legende", stops: ["#fff0a0", "#f0b83a", "#f0b83a"], glow: "#fff0a0", stars: 0, secret: true, hero: true, how: "never:Alle Räume mit allen Sternen", acc: ["krone", "umhang"] },
  { id: "h-glutritter", name: "Glutritter", stops: ["#ff4a3a", "#44434b", "#44434b"], glow: "#ff4a3a", stars: 0, secret: true, hero: true, how: "coins:2000", acc: ["visier"] },
  { id: "h-kristall", name: "Kristallwächter", stops: ["#d9f2fc", "#2f86b0", "#2f86b0"], glow: "#d9f2fc", stars: 0, secret: true, hero: true, how: "coins:2500", acc: ["hoerner"] },
  { id: "h-astronaut", name: "Pixel-Astronaut", stops: ["#ff7a5a", "#e4e6f0", "#e4e6f0"], glow: "#ff7a5a", stars: 0, secret: true, hero: true, how: "coins:3000", acc: ["antenne", "visier"] },
  { id: "h-robot", name: "Roboter R-16", stops: ["#ffc84a", "#6a7480", "#6a7480"], glow: "#ffc84a", stars: 0, secret: true, hero: true, how: "coins:1500", acc: ["antenne"] },
  { id: "h-piratin", name: "Piratin", stops: ["#c0342c", "#f0e6c8", "#f0e6c8"], glow: "#c0342c", stars: 0, secret: true, hero: true, how: "coins:1200", acc: ["stirnband"] },
  { id: "h-frosch", name: "Froschkostüm", stops: ["#ffb7c8", "#4f9446", "#4f9446"], glow: "#ffb7c8", stars: 0, secret: true, hero: true, how: "coins:800", acc: ["ohren"] },
  { id: "h-drache", name: "Kleiner Drache", stops: ["#ffc84a", "#c0342c", "#c0342c"], glow: "#ffc84a", stars: 0, secret: true, hero: true, how: "real:Drache", acc: ["hoerner", "fluegel"] },
  { id: "h-geist", name: "Geisterchen", stops: ["#c8cce4", "#e8eaf6", "#e8eaf6"], glow: "#c8cce4", stars: 0, secret: true, hero: true, how: "endless:25", acc: ["heiligenschein"] },
  { id: "h-speed", name: "Speedrunner", stops: ["#ffffff", "#e84030", "#e84030"], glow: "#ffffff", stars: 0, secret: true, hero: true, how: "endless:10", acc: ["stirnband"] },
  { id: "h-tagesheld", name: "Tagesheld", stops: ["#ff5a4a", "#ffc84a", "#ffc84a"], glow: "#ff5a4a", stars: 0, secret: true, hero: true, how: "never:30 Tagesrätsel", acc: ["muetze"] },
  { id: "h-regenbogen", name: "Regenbogen-Kind", stops: ["#ffd166", "#ff4a3a", "#ff4a3a"], glow: "#ffd166", stars: 0, secret: true, hero: true, how: "never:Jede Farbe mischen", acc: ["stirnband"] },
  { id: "h-kuerbis", name: "Kürbiskopf", stops: ["#ff7a1a", "#2a1a30", "#2a1a30"], glow: "#ff7a1a", stars: 0, secret: true, hero: true, how: "season:10", acc: ["kuerbis"] },
  { id: "h-wichtel", name: "Weihnachtswichtel", stops: ["#c0342c", "#2f7a3a", "#2f7a3a"], glow: "#c0342c", stars: 0, secret: true, hero: true, how: "season:12", acc: ["muetze"] },
  { id: "h-fee", name: "Frühlingsfee", stops: ["#ffb7d0", "#8fd86a", "#8fd86a"], glow: "#ffb7d0", stars: 0, secret: true, hero: true, how: "season:3-5", acc: ["fluegel", "heiligenschein"] },
  { id: "h-spiegel", name: "Schattenkönig (Spiegel)", stops: ["#ff3a6a", "#0c0814", "#0c0814"], glow: "#ff3a6a", stars: 0, secret: true, hero: true, how: "never:Das Erste Prisma besiegen", acc: ["krone", "kapuze"] },
  { id: "h-licht", name: "Lichtgestalt", stops: ["#5fd0ff", "#ffffff", "#ffffff"], glow: "#5fd0ff", stars: 0, secret: true, hero: true, how: "never:100 % des Spiels", acc: ["heiligenschein", "fluegel"] },
  // Nur über den Code „halloween“, bis dahin in der Auswahl unsichtbar
  { id: 'halloween', name: 'Halloween', stops: ['#2a1a30', '#e8701a', '#7a2f0a'], glow: '#ff8a2a', stars: 0, secret: true },
];
// Eigene Farben je Skin: [Akzent, Körper]
export const skinTint = (id) => (getSettings().skinTint || {})[id] || null;
export const setSkinTint = (id, tint) => updateSettings({ skinTint: { ...(getSettings().skinTint || {}), [id]: tint } });
// Seltenheit je Skin: Grundlage ist die Freischaltung, Gewicht gilt für den Spin
export const RARITY = { common: { name: 'Gewöhnlich', weight: 70 }, rare: { name: 'Selten', weight: 24 }, epic: { name: 'Episch', weight: 5 }, legend: { name: 'Legendär', weight: 1 } };
export function rarityOf(c) {
  const [kind, arg] = c.how.split(':');
  if (kind === 'allboss' || /Prisma|100 %|Sternen/.test(arg || '')) return 'legend';
  if (kind === 'boss' || kind === 'season' || +arg >= 2500) return 'epic';
  if (kind === 'never' || +arg >= 1200) return 'rare';
  return 'common';
}
/** Zufälliger noch fehlender Skin, seltene seltener. */
export function rollSkin() {
  const pool = SKIN_COLORS.filter((c) => c.hero && !/^(start|endless|real)/.test(c.how));
  const weight = (c) => RARITY[rarityOf(c)].weight * (ownedHeroes().includes(c.id) ? 0.25 : 1); // schon Besessenes kommt seltener, aber es kommt
  let n = Math.random() * pool.reduce((s, c) => s + weight(c), 0);
  return pool.find((c) => (n -= weight(c)) < 0) || pool[0] || null;
}
// Gewonnene Drehungen fürs Glücksrad
export const getSpins = () => getSettings().spins || 0;
export const addSpins = (n) => updateSettings({ spins: getSpins() + n });
// Doppelte Skins: zählen hoch und lassen sich je nach Seltenheit zu Münzen machen
export const SELL_PRICE = { common: 50, rare: 150, epic: 500, legend: 2000 };
export const dupes = (id) => (getSettings().dupes || {})[id] || 0;
export const addDupe = (id, n = 1) => updateSettings({ dupes: { ...(getSettings().dupes || {}), [id]: dupes(id) + n } });
export const ownedHeroes = () => getSettings().heroSkins || [];
export const buyHero = (id) => updateSettings({ heroSkins: [...ownedHeroes(), id] });
export const hasHalloween = () => !!getSettings().halloween;
export function setHalloween(on) {
  updateSettings({ halloween: on });
  if (on) setSkin({ color: 'halloween' });
  else if (getSkin().color.id === 'halloween') setSkin({ color: 'gold' });
}
export const isDinnerbone = () => !!getSettings().dinnerbone;
export const setDinnerbone = (on) => updateSettings({ dinnerbone: on });

export const SKIN_SYMBOLS = [
  { id: 'prism', name: 'Prisma', stars: 0 },
  { id: 'ring', name: 'Ring', stars: 3 },
  { id: 'star', name: 'Stern', stars: 9 },
  { id: 'diamond', name: 'Raute', stars: 15 },
  { id: 'eye', name: 'Auge', stars: 25 },
  { id: 'bolt', name: 'Blitz', stars: 38 },
];

// Weitere Anpassung des Pixel-Helden: Hautton und Laternenlicht (color = Glas, glow = Lichtschein im Raum)
export const SKIN_TONES = [
  { id: 'light', name: 'Hell', color: '#ffe0bd' }, { id: 'warm', name: 'Warm', color: '#eab98a' },
  { id: 'tan', name: 'Gebräunt', color: '#c98f5e' }, { id: 'deep', name: 'Dunkel', color: '#8a5a38' },
];
export const LANTERNS = [
  { id: 'warm', name: 'Warm', color: '#ffe9a8', glow: '#ffcf8a' }, { id: 'ember', name: 'Glut', color: '#ffb36b', glow: '#ff9a55' },
  { id: 'moon', name: 'Mond', color: '#cfe6ff', glow: '#a8d0ff' }, { id: 'moss', name: 'Moos', color: '#c4ffb0', glow: '#9fe88a' },
  { id: 'rose', name: 'Rose', color: '#ffc4dc', glow: '#ff9fc4' },
  { id: 'violet', name: 'Violett', color: '#d8b8ff', glow: '#b48cff' }, { id: 'ice', name: 'Eis', color: '#d8fbff', glow: '#a0f0ff' },
];
// Spur hinter dem Helden, mit Sternen freigeschaltet
export const TRAILS = [
  { id: 'none', name: 'Keine', color: null, stars: 0 }, { id: 'steps', name: 'Fußspuren', color: '#4a3020', stars: 2 }, { id: 'petals', name: 'Blüten', color: '#f0a0c0', stars: 8 },
  { id: 'sparks', name: 'Funken', color: '#ffd166', stars: 14 }, { id: 'frost', name: 'Frost', color: '#bfe8ff', stars: 22 }, { id: 'ember', name: 'Glut', color: '#ff7a3a', stars: 32 },
];
export function getLook() {
  const l = getSettings().look || {};
  return { tone: SKIN_TONES.find((t) => t.id === l.tone) || SKIN_TONES[0], lantern: LANTERNS.find((t) => t.id === l.lantern) || LANTERNS[0], trail: TRAILS.find((t) => t.id === l.trail) || TRAILS[0] };
}
export function setLook(patch) { updateSettings({ look: { ...(getSettings().look || {}), ...patch } }); }

export function getSkin() {
  const s = getSettings().skin || {};
  const base = SKIN_COLORS.find((c) => c.id === s.color) || SKIN_COLORS[0], t = (getSettings().skinTint || {})[base.id];
  return {
    color: t ? { ...base, stops: [t[0], t[1], t[1]], glow: t[0] } : base,
    symbol: SKIN_SYMBOLS.find((c) => c.id === s.symbol) || SKIN_SYMBOLS[0],
  };
}

export function setSkin(patch) {
  updateSettings({ skin: { color: getSkin().color.id, symbol: getSkin().symbol.id, ...patch } });
}

/** Zeichnet den Lichtblock (Spieler) – genutzt im Spiel und als Vorschau im Menü. */
export function drawPlayerBlock(ctx, cx, cy, s, { dir = 1, t = 0, reduced = false, skin = getSkin() } = {}) {
  const bob = reduced ? 0 : Math.sin(t / 380) * s * 0.015;
  const r = s * 0.36;
  const { color, symbol } = skin;
  ctx.save();
  ctx.shadowColor = color.glow; ctx.shadowBlur = s * 0.45;
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  color.stops.forEach((c, i) => g.addColorStop(i / (color.stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(cx - r, cy - r + bob, r * 2, r * 2, s * 0.14); ctx.fill();
  ctx.shadowBlur = 0;
  // Symbol
  const y = cy + bob;
  ctx.strokeStyle = 'rgba(40,20,10,0.72)'; ctx.fillStyle = 'rgba(40,20,10,0.72)';
  ctx.lineWidth = Math.max(1.5, s * 0.035); ctx.lineJoin = 'round';
  ctx.beginPath();
  const k = r * 0.45;
  if (symbol.id === 'prism') { ctx.moveTo(cx, y - k); ctx.lineTo(cx + k, y + k * 0.78); ctx.lineTo(cx - k, y + k * 0.78); ctx.closePath(); ctx.stroke(); }
  else if (symbol.id === 'ring') { ctx.arc(cx, y, k * 0.85, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, y, k * 0.3, 0, Math.PI * 2); ctx.fill(); }
  else if (symbol.id === 'star') {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? k * 0.45 : k; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  } else if (symbol.id === 'diamond') { ctx.moveTo(cx, y - k); ctx.lineTo(cx + k * 0.75, y); ctx.lineTo(cx, y + k); ctx.lineTo(cx - k * 0.75, y); ctx.closePath(); ctx.stroke(); }
  else if (symbol.id === 'eye') { ctx.ellipse(cx, y, k, k * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, y, k * 0.28, 0, Math.PI * 2); ctx.fill(); }
  else if (symbol.id === 'bolt') { ctx.moveTo(cx + k * 0.2, y - k); ctx.lineTo(cx - k * 0.5, y + k * 0.1); ctx.lineTo(cx, y + k * 0.1); ctx.lineTo(cx - k * 0.2, y + k); ctx.lineTo(cx + k * 0.5, y - k * 0.1); ctx.lineTo(cx, y - k * 0.1); ctx.closePath(); ctx.fill(); }
  // Blickrichtung: leuchtende Kerbe auf der Seite, in die der Block schaut
  const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir];
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx + dx * r * 0.8, cy + dy * r * 0.8 + bob, s * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
