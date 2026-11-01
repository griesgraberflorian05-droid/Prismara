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
  // Nur über den Code „halloween“, bis dahin in der Auswahl unsichtbar
  { id: 'halloween', name: 'Halloween', stops: ['#2a1a30', '#e8701a', '#7a2f0a'], glow: '#ff8a2a', stars: 0, secret: true },
];
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
  return {
    color: SKIN_COLORS.find((c) => c.id === s.color) || SKIN_COLORS[0],
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
