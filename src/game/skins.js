// Lichtblock-Kit: Farbe und Symbol des Spielerblocks. Werden mit gesammelten Sternen
// freigeschaltet; die Wahl liegt in den Einstellungen (localStorage).
import { getSettings, updateSettings } from '../settings.js';

export const SKIN_COLORS = [
  { id: 'gold', name: 'Sonnengold', stops: ['#fff6d6', '#ffd166', '#ff9f5a'], glow: '#ffe9a8', stars: 0 },
  { id: 'cyan', name: 'Eiscyan', stops: ['#e9fdff', '#4ff0ff', '#2f8cff'], glow: '#9ff6ff', stars: 6 },
  { id: 'pink', name: 'Neonpink', stops: ['#fff0fb', '#ff4fd8', '#a63dff'], glow: '#ff9ce9', stars: 12 },
  { id: 'lime', name: 'Lichtgrün', stops: ['#f4ffe6', '#7dff6a', '#1fbf8f'], glow: '#c4ff9f', stars: 20 },
  { id: 'ruby', name: 'Rubinrot', stops: ['#fff0f2', '#ff4d6d', '#c2185b'], glow: '#ff9fb0', stars: 30 },
  { id: 'prism', name: 'Regenbogen', stops: ['#ff4d6d', '#ffd166', '#3ddc97', '#4da3ff', '#b18cff'], glow: '#ffffff', stars: 45 },
];

export const SKIN_SYMBOLS = [
  { id: 'prism', name: 'Prisma', stars: 0 },
  { id: 'ring', name: 'Ring', stars: 3 },
  { id: 'star', name: 'Stern', stars: 9 },
  { id: 'diamond', name: 'Raute', stars: 15 },
  { id: 'eye', name: 'Auge', stars: 25 },
  { id: 'bolt', name: 'Blitz', stars: 38 },
];

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
