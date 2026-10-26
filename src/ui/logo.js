// Prismara-Logo in Pixel-Art: Wappen (Messing-Laterne mit leuchtendem Prisma, umrankt von einer
// blühenden Ranke) und der Schriftzug PRISMARA in eigener Pixelschrift mit Goldverlauf und Kontur.
// Wird einmal klein gezeichnet und ohne Glättung hochskaliert; das Wappen dient auch als Favicon.
const GLYPHS = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
};
const GOLD = ['#fff6d8', '#ffe9a8', '#ffd166', '#f2b94a', '#e8a317', '#c98a00', '#a86f00'];

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

/** Wappen in ein 32×40-Feld ab (ox, oy). */
export function drawEmblem(g, ox = 0, oy = 0) {
  const R = (x, y, w, h, c) => px(g, ox + x, oy + y, w, h, c);
  // Schein hinter der Laterne
  for (let r = 15; r > 0; r -= 3) { g.globalAlpha = 0.07; R(16 - r, 20 - r, r * 2, r * 2, '#ffd27a'); }
  g.globalAlpha = 1;
  // Bügel und Kappe
  R(13, 1, 6, 1, '#2a1408'); R(12, 2, 1, 3, '#2a1408'); R(19, 2, 1, 3, '#2a1408'); R(13, 2, 6, 1, '#c9963f');
  R(9, 5, 14, 4, '#2a1408'); R(10, 5, 12, 3, '#c9963f'); R(10, 5, 12, 1, '#ffe9a8'); R(11, 8, 10, 1, '#8a5a1a');
  // Glaskasten mit Rahmen
  R(8, 9, 16, 21, '#2a1408'); R(9, 10, 14, 19, '#3a2a40');
  R(9, 10, 1, 19, '#c9963f'); R(22, 10, 1, 19, '#c9963f'); R(15, 10, 2, 19, '#8a5a1a');
  // Prisma im Glas: Dreieck mit Facetten in Rot, Grün, Blau – leuchtet
  for (let k = 0; k < 13; k++) {
    const w = 1 + Math.floor(k * 0.9);
    R(16 - w, 13 + k, w, 1, k < 4 ? '#ffffff' : k < 8 ? '#bff8ff' : '#9fd8ff');
    R(16, 13 + k, w, 1, k < 4 ? '#f4eaff' : k < 8 ? '#c9a7ff' : '#9a7aff');
  }
  R(11, 25, 10, 1, '#6a4aa8');
  R(12, 26, 3, 1, '#ff4d6d'); R(15, 26, 3, 1, '#3ddc97'); R(18, 26, 3, 1, '#4da3ff');
  R(15, 14, 1, 3, '#ffffff'); R(13, 20, 1, 1, '#ffffff');
  // Boden der Laterne
  R(8, 30, 16, 3, '#2a1408'); R(9, 30, 14, 2, '#c9963f'); R(9, 30, 14, 1, '#ffe9a8'); R(11, 33, 10, 2, '#2a1408'); R(12, 33, 8, 1, '#8a5a1a');
  // Ranke windet sich um die Laterne, mit Blättern und Blüten
  const vine = [[5, 38], [5, 36], [6, 34], [7, 32], [7, 30], [6, 28], [6, 26], [7, 24], [7, 22], [6, 20], [7, 18], [8, 16]];
  vine.forEach(([x, y], i) => { R(x, y, 1, 2, '#2f6b2a'); if (i % 3 === 1) { R(x - 2, y, 2, 1, '#5ab845'); R(x - 3, y + 1, 2, 1, '#3f8a3a'); } });
  const vine2 = [[26, 38], [26, 36], [25, 34], [24, 32], [25, 30], [26, 28], [26, 26], [25, 24]];
  vine2.forEach(([x, y], i) => { R(x, y, 1, 2, '#2f6b2a'); if (i % 3 === 0) { R(x + 1, y, 2, 1, '#5ab845'); R(x + 2, y + 1, 2, 1, '#3f8a3a'); } });
  const bloom = (x, y, c) => { R(x - 1, y, 3, 1, c); R(x, y - 1, 1, 3, c); R(x, y, 1, 1, '#ffd166'); };
  bloom(8, 16, '#ff9cc8'); bloom(4, 27, '#fff6b0'); bloom(25, 24, '#ff9cc8'); bloom(27, 33, '#c9a7ff');
  R(3, 38, 26, 2, '#2f6b2a'); R(5, 37, 3, 1, '#5ab845'); R(23, 37, 4, 1, '#5ab845');
}

/** Ganzes Logo (Wappen + Schriftzug). Liefert eine Canvas in Pixelgröße 176×44. */
export function logoCanvas() {
  const c = document.createElement('canvas');
  c.width = 176; c.height = 44;
  const g = c.getContext('2d');
  drawEmblem(g, 0, 2);
  const S = 3, gap = 2, x0 = 36, y0 = 6;
  // Kontur und Schatten zuerst, dann Gold mit Verlauf pro Pixelzeile
  const letters = 'PRISMARA'.split('');
  const pass = (dx, dy, color) => letters.forEach((ch, i) => GLYPHS[ch].forEach((row, y) => [...row].forEach((b, x) => {
    if (b !== '1') return;
    const lx = x0 + i * (5 * S + gap) - (i > 0 ? i : 0);
    px(g, lx + x * S + dx, y0 + y * S + dy, S, S, typeof color === 'function' ? color(y) : color);
  })));
  pass(2, 3, '#120804');
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1]]) pass(dx, dy, '#2a1408');
  pass(0, 0, (y) => GOLD[y]);
  // Glanzpunkte oben auf jedem Buchstaben
  letters.forEach((_, i) => px(g, x0 + i * (5 * S + gap) - i + 1, y0 + 1, 2, 1, '#ffffff'));
  // Ranke als Unterstrich mit Blüten
  for (let x = x0; x < x0 + 8 * (5 * S + gap) - 10; x++) {
    const y = 34 + Math.round(Math.sin(x / 6) * 1.5);
    px(g, x, y, 1, 1, '#2f6b2a');
    if (x % 9 === 3) { px(g, x, y - 1, 2, 1, '#5ab845'); }
    if (x % 23 === 11) { const col = ['#ff9cc8', '#fff6b0', '#c9a7ff'][x % 3]; px(g, x - 1, y - 1, 3, 1, col); px(g, x, y - 2, 1, 3, col); px(g, x, y - 1, 1, 1, '#ffd166'); }
  }
  return c;
}

/** Setzt das Wappen als Favicon. */
/** Browser-Symbol: leuchtende Redstone-Lampe (wie assets/icon.svg), Kacheln in Rot, Grün, Blau, Gold.
 *  Die Kacheln glimmen abwechselnd nach, damit der Tab lebendig wirkt (alle 1,2 s, nicht auf Akkukosten). */
export function setFavicon() {
  const sq = document.createElement('canvas'); sq.width = 64; sq.height = 64;
  const g = sq.getContext('2d');
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  const tiles = [[2, 2, '#ff4d6d', '#ffb3c1'], [9, 2, '#3ddc97', '#b6f5d9'], [2, 9, '#4da3ff', '#bcdcff'], [9, 9, '#ffd166', '#fff0c2']];
  const draw = (k) => {
    const p = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * 4, y * 4, w * 4, h * 4); };
    p(0, 0, 16, 16, '#2a1a10'); p(1, 1, 14, 14, '#7a3a10'); p(1, 1, 14, 1, '#4a3424');
    tiles.forEach(([x, y, c, hi], i) => { p(x, y, 5, 5, i === k ? hi : c); p(x, y, 2, 2, hi); });
    p(7, 7, 2, 2, '#fff6d0');
    link.href = sq.toDataURL('image/png');
  };
  let k = 0;
  draw(-1);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => { if (!document.hidden) draw(k++ % 4); }, 1200);
}
