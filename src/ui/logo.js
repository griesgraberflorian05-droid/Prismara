// Prismara-Logo in Pixel-Art: Wappen (Redstone-Fackel vor einer Mauer) und der Schriftzug PRISMARA
// in eigener Pixelschrift, darunter läuft die Spur von der Fackel zur leuchtenden Lampe.
// Wird einmal klein gezeichnet und ohne Glättung hochskaliert; das Wappen dient auch als Favicon.
// Fette Buchstaben mit doppelter Strichstärke, damit der Schriftzug auch auf dem Handy trägt
const GLYPHS = {
  P: ['111110', '110011', '110011', '111110', '110000', '110000', '110000'],
  R: ['111110', '110011', '110011', '111110', '110110', '110011', '110011'],
  I: ['1111', '0110', '0110', '0110', '0110', '0110', '1111'],
  S: ['011111', '110000', '110000', '011110', '000011', '000011', '111110'],
  M: ['110011', '111111', '111111', '110011', '110011', '110011', '110011'],
  A: ['011110', '110011', '110011', '111111', '110011', '110011', '110011'],
};
const GOLD = ['#fff6d8', '#ffe9a8', '#ffd166', '#f2b94a', '#e8a317', '#c98a00', '#a86f00'];

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

/** Wappen in ein 32×40-Feld ab (ox, oy). */
export function drawEmblem(g, ox = 0, oy = 0) {
  const R = (x, y, w, h, c) => px(g, ox + x, oy + y, w, h, c);
  // Mauerstück aus Ziegeln mit Holzrahmen
  R(3, 6, 26, 32, '#2a1408'); R(4, 7, 24, 30, '#6b6470');
  for (let y = 0; y < 5; y++) { R(4, 12 + y * 6, 24, 1, '#3a3440'); for (let x = 0; x < 3; x++) R(8 + x * 8 + (y % 2) * 4, 7 + y * 6, 1, 5, '#3a3440'); R(4, 7 + y * 6, 24, 1, '#8e8894'); }
  R(3, 34, 26, 4, '#8f5f36'); R(3, 34, 26, 1, '#c99766'); R(3, 37, 26, 1, '#2a1408');
  // Fackel: Holzstab, glühender Kopf, Funken
  R(13, 16, 6, 18, '#2a1408'); R(14, 16, 4, 18, '#8a5a2a'); R(14, 16, 2, 18, '#b07f4a');
  R(11, 7, 10, 10, '#2a1408'); R(12, 8, 8, 8, '#a8141e'); R(13, 9, 6, 6, '#ff3a3a'); R(14, 10, 3, 3, '#ffb0a0'); R(15, 10, 1, 1, '#ffffff');
  R(15, 2, 2, 3, '#ff5a4a'); R(7, 9, 2, 2, '#ff5a4a'); R(23, 11, 2, 2, '#ff5a4a'); R(9, 4, 1, 1, '#ffb0a0'); R(22, 5, 1, 1, '#ffb0a0');
}

/** Ganzes Logo (Wappen + Schriftzug). Liefert eine Canvas in Pixelgröße 176×44. */
export function logoCanvas() {
  const c = document.createElement('canvas');
  c.width = 186; c.height = 44;
  const g = c.getContext('2d');
  drawEmblem(g, 0, 2);
  const S = 3, gap = 1, x0 = 35, y0 = 4;
  const letters = [];
  { let lx = x0; for (const ch of 'PRISMARA') { letters.push({ ch, lx }); lx += GLYPHS[ch][0].length * S + gap; } }
  const pass = (fn) => letters.forEach(({ ch, lx }) => GLYPHS[ch].forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') fn(lx + x * S, y0 + y * S, y, ch, x); })));
  // Schlagschatten, dann Kontur, dann Metall mit Verlauf und Fase je Block
  pass((X, Y) => px(g, X + 2, Y + 3, S, S, '#120804'));
  pass((X, Y) => px(g, X - 1, Y - 1, S + 2, S + 2, '#2a1408'));
  pass((X, Y, y, ch, x) => {
    px(g, X, Y, S, S, GOLD[y]);
    const above = GLYPHS[ch][y - 1]?.[x] === '1', below = GLYPHS[ch][y + 1]?.[x] === '1';
    if (!above) px(g, X, Y, S, 1, '#ffffff');
    if (!below) px(g, X, Y + S - 1, S, 1, '#7a4a00');
  });
  // Redstone-Spur von der Fackel zur Lampe: gleich breit, mit Knoten
  px(g, 32, 31, 136, 6, '#2a1408'); px(g, 32, 32, 136, 4, '#7a1018'); px(g, 32, 33, 136, 2, '#e8303a');
  for (let x = 40; x < 165; x += 12) { px(g, x, 30, 4, 8, '#2a1408'); px(g, x + 1, 31, 2, 6, '#ff5a4a'); }
  // Lampe am Ende leuchtet in vier Kacheln
  px(g, 168, 26, 16, 16, '#2a1408'); px(g, 169, 27, 14, 14, '#7a3a10');
  for (const [x, y] of [[170, 28], [177, 28], [170, 35], [177, 35]]) { px(g, x, y, 5, 5, '#ffd166'); px(g, x, y, 2, 2, '#fff6d8'); }
  return c;
}

/** Setzt das Wappen als Favicon. */
/** Browser-Symbol: leuchtende Glutlampe (wie assets/icon.svg), Kacheln in Rot, Grün, Blau, Gold.
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
