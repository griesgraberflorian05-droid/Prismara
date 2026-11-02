// Pixel-Zeichnungen der Gegner. r(x, y, w, h, Farbe) zeichnet ein Rechteck, also passt alles sowohl in
// den Raum-Renderer (Teaser) als auch in die Arena. Kleine Wesen füllen ein Feld (16 px), Bosse zwei mal zwei.

// Schwert-Sprite nach klassischem Pixel-Aufbau: dunkle Kontur, drei Klingentöne, Parier, Griff, Knauf
const SWORD = ['.............ooo', '............oeeo', '...........oeebo', '..........oeebdo', '.........oeebdo.', '........oeebdo..', '.......oeebdo...', '..o...oeebdo....', '.ogo.oeebdo.....', '.oggoeebdo......', '..oggebdo.......', '...ogggo........', '..ohoggo........', '.ohoo.oo........', 'oppo............', '.oo.............'];
export function drawSwordIcon(g, x0, y0, { blade, edge, dark = blade, guard = '#c9963f', grip = '#6b4426' }) {
  const col = { o: '#17121f', e: edge, b: blade, d: dark, g: guard, h: grip, p: guard };
  SWORD.forEach((row, y) => [...row].forEach((c, x) => { if (col[c]) { g.fillStyle = col[c]; g.fillRect(x0 + x, y0 + y, 1, 1); } }));
}

const EYE = '#fff4d0', PUPIL = '#120a1c';

/** Kleines Wesen auf Feld-Pixel (px, py). flash = weiß aufblitzen, warn = holt zum Schlag aus. */
export function drawMinion(r, kind, [body, dark], px0, py0, t, { flash = false, warn = false, lunge = [0, 0], bite = false } = {}) {
  const px = px0 + lunge[0], py = py0 + lunge[1];
  const b = flash ? '#ffffff' : warn ? '#ff4a3a' : body, d = flash ? '#ffffff' : dark;
  // Magische Aura: weicher Schein und kreisende Funken in der Farbe des Wesens
  r(px - 1, py + 1, 18, 14, `${body}26`); r(px + 1, py - 1, 14, 18, `${body}26`); r(px + 3, py + 2, 10, 12, `${body}33`);
  for (let k = 0; k < 3; k++) {
    const a = t / 420 + k * 2.09, sx = Math.round(px + 7 + Math.cos(a) * 9), sy = Math.round(py + 8 + Math.sin(a) * 7);
    r(sx, sy, 2, 2, k % 2 ? '#ffffff' : body); if (Math.floor(t / 200 + k) % 2) r(sx - 1, sy, 4, 1, `${body}aa`);
  }
  const bob = Math.floor(t / 260 + px) % 2;
  const y = py + bob;
  r(px + 2, py + 13, 12, 2, 'rgba(0,0,0,0.3)');
  if (kind === 'crab') {
    r(px + 3, y + 6, 10, 6, b); r(px + 4, y + 11, 8, 1, d);
    r(px, y + 5, 3, 3, d); r(px + 13, y + 5, 3, 3, d); r(px + 1, y + 8, 2, 2, b); r(px + 13, y + 8, 2, 2, b);
    r(px + 3, y + 12, 1, 2, d); r(px + 12, y + 12, 1, 2, d);
  } else if (kind === 'sprout') {
    r(px + 4, y + 6, 8, 7, b); r(px + 5, y + 12, 6, 1, d);
    r(px + 7, y + 2, 2, 4, d); r(px + 3, y + 1, 4, 2, b); r(px + 9, y + 1, 4, 2, b);
  } else if (kind === 'rat') {
    r(px + 3, y + 6, 9, 6, b); r(px + 11, y + 8, 3, 3, b); r(px + 4, y + 4, 2, 2, d); r(px + 8, y + 4, 2, 2, d);
    r(px, y + 9, 3, 1, d); r(px + 4, y + 12, 2, 1, d); r(px + 9, y + 12, 2, 1, d);
  } else if (kind === 'wisp') {
    r(px + 4, y + 4, 8, 8, b); r(px + 5, y + 2, 6, 2, b); r(px + 7, y, 2, 2, d);
    for (let k = 0; k < 4; k++) r(px + 4 + k * 2, y + 12 + ((k + Math.floor(t / 180)) % 2), 2, 1, d);
  } else if (kind === 'bat') {
    const up = Math.floor(t / 140) % 2;
    r(px + 5, y + 5, 6, 7, b); r(px + 5, y + 3, 1, 2, d); r(px + 10, y + 3, 1, 2, d);
    r(px, y + 5 + up, 5, 3, d); r(px + 11, y + 5 + up, 5, 3, d);
  } else { // slime
    r(px + 2, y + 7, 12, 6, b); r(px + 4, y + 5, 8, 2, b); r(px + 3, y + 12, 10, 1, d); r(px + 4, y + 7, 2, 1, flash ? b : '#ffffff55');
  }
  const ey = kind === 'crab' ? y + 7 : kind === 'wisp' || kind === 'bat' ? y + 6 : y + 8;
  // Böser Blick: schräge Brauen, glühende Augen beim Ausholen, Maul mit Zähnen
  const glow = warn || bite ? '#ffe45a' : EYE;
  r(px + 5, ey, 2, 2, glow); r(px + 9, ey, 2, 2, glow); r(px + 6, ey + 1, 1, 1, PUPIL); r(px + 9, ey + 1, 1, 1, PUPIL);
  r(px + 4, ey - 1, 2, 1, PUPIL); r(px + 6, ey, 1, 1, PUPIL); r(px + 10, ey - 1, 2, 1, PUPIL); r(px + 9, ey, 1, 1, PUPIL);
  const my = ey + 3, open = bite ? 3 : warn ? 2 : 1;
  r(px + 5, my, 6, open, '#2a0208'); r(px + 5, my, 1, 1, '#fff4d0'); r(px + 7, my, 1, 1, '#fff4d0'); r(px + 10, my, 1, 1, '#fff4d0');
  if (bite) { const c = '#ffffff'; r(px - 1, py + 2, 2, 8, c); r(px + 15, py + 2, 2, 8, c); r(px + 1, py, 14, 1, c); } // Hieb-Bogen
}

const shadeHex = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/** Boss auf Feld-Pixel (px, py), 32 × 32 groß. */
export function drawBoss(r, shape, [main, dark], px, py, t, { flash = false, angry = false } = {}) {
  const b = flash ? '#ffffff' : main, d = flash ? '#ffffff' : dark, l = flash ? '#ffffff' : shadeHex(main, 0.3);
  const s = Math.floor(t / 300) % 2, y = py + s;
  const eye = angry ? '#ff3a2a' : '#ffe45a';
  r(px + 3, py + 28, 26, 4, 'rgba(0,0,0,0.35)');
  if (shape === 'crab') {
    r(px + 6, y + 12, 20, 13, b); r(px + 8, y + 10, 16, 2, l); r(px + 6, y + 24, 20, 2, d);
    r(px - 1, y + 6, 7, 7, d); r(px + 26, y + 6, 7, 7, d); r(px, y + 8 - s, 5, 2, '#120a1c'); r(px + 27, y + 8 - s, 5, 2, '#120a1c');
    for (let k = 0; k < 3; k++) { r(px + 2 + k * 2, y + 22 + k, 4, 2, d); r(px + 26 - k * 2, y + 22 + k, 4, 2, d); }
  } else if (shape === 'bloom') {
    for (const [ox, oy] of [[2, 2], [20, 2], [2, 18], [20, 18]]) r(px + ox, y + oy, 10, 10, l);
    r(px + 7, y + 7, 18, 18, b); r(px + 12, y - 2, 8, 6, d); r(px + 7, y + 24, 18, 2, d);
    r(px + 4, y + 26, 2, 4, '#3a7a3a'); r(px + 26, y + 26, 2, 4, '#3a7a3a');
  } else if (shape === 'tree') {
    r(px + 2, y + 1, 28, 12, d); r(px + 5, y - 2, 22, 4, l); r(px + 8, y + 12, 16, 16, '#6b4426'); r(px + 8, y + 12, 3, 16, '#3a2414');
    r(px, y + 13, 8, 4, '#6b4426'); r(px + 24, y + 13, 8, 4, '#6b4426'); r(px + 6, y + 27, 6, 3, '#3a2414'); r(px + 20, y + 27, 6, 3, '#3a2414');
    r(px + 10, y + 4, 4, 3, b); r(px + 20, y + 2, 4, 3, b);
  } else if (shape === 'knight') {
    r(px + 8, y + 2, 16, 12, b); r(px + 8, y + 2, 16, 2, l); r(px + 14, y - 3, 4, 6, '#c0342c'); r(px + 8, y + 9, 16, 1, d);
    r(px + 5, y + 14, 22, 12, d); r(px + 5, y + 14, 22, 2, b); r(px + 15, y + 15, 2, 11, l);
    r(px - 1, y + 13, 8, 12, b); r(px + 1, y + 15, 4, 8, d); r(px + 28, y + 2, 3, 22, '#e6e2d8'); r(px + 25, y + 18, 9, 2, '#6b4426');
    r(px + 8, y + 26, 6, 4, d); r(px + 18, y + 26, 6, 4, d);
  } else if (shape === 'hag') {
    r(px + 6, y + 10, 20, 18, d); r(px + 3, y + 26, 26, 3, d); r(px + 9, y + 3, 14, 12, b); r(px + 6, y + 1, 20, 4, d); r(px + 12, y - 4, 8, 5, d);
    r(px + 1, y + 13, 6, 3, d); r(px + 25, y + 13, 6, 3, d); r(px, y + 8, 3, 8, l);
  } else if (shape === 'moth') {
    const f = Math.floor(t / 150) % 2;
    r(px - 1, y + 3 + f, 13, 18, b); r(px + 20, y + 3 + f, 13, 18, b); r(px + 2, y + 7 + f, 5, 5, l); r(px + 25, y + 7 + f, 5, 5, l);
    r(px + 11, y + 4, 10, 22, d); r(px + 12, y - 2, 2, 6, d); r(px + 18, y - 2, 2, 6, d);
  } else if (shape === 'golem') {
    r(px + 7, y, 18, 12, b); r(px + 3, y + 11, 26, 13, d); r(px + 5, y + 12, 22, 2, b); r(px - 1, y + 10, 8, 15, b); r(px + 25, y + 10, 8, 15, b);
    r(px + 8, y + 24, 6, 6, d); r(px + 18, y + 24, 6, 6, d); r(px + 13, y + 15, 6, 6, l);
  } else if (shape === 'pharaoh') {
    r(px + 5, y + 1, 22, 15, b); for (let k = 0; k < 5; k++) r(px + 5, y + 2 + k * 3, 22, 1, d);
    r(px + 9, y + 4, 14, 11, '#c98f5e'); r(px + 14, y - 3, 4, 5, '#ffd166'); r(px + 7, y + 15, 18, 13, d); r(px + 7, y + 15, 18, 3, b); r(px + 28, y + 3, 2, 25, '#ffd166');
  } else if (shape === 'shade') {
    r(px + 4, y + 4, 24, 22, d); r(px + 7, y, 18, 4, d); for (let k = 0; k < 6; k++) r(px + 4 + k * 4, y + 26 + ((k + Math.floor(t / 170)) % 2) * 2, 4, 3, d);
    r(px + 8, y + 18, 16, 5, '#120a1c'); for (let k = 0; k < 4; k++) r(px + 9 + k * 4, y + 18, 2, 3, EYE);
    r(px + 1, y + 10, 4, 10, b); r(px + 27, y + 10, 4, 10, b);
  } else { // kraken
    r(px + 7, y, 18, 18, b); r(px + 10, y - 2, 12, 3, l); r(px + 7, y + 16, 18, 3, d);
    for (let k = 0; k < 6; k++) { const w = (k + Math.floor(t / 200)) % 2; r(px + 2 + k * 5, y + 18, 3, 8 + w * 2, d); r(px + 1 + k * 5 + w, y + 26 + w * 2, 3, 2, b); }
  }
  const ey = { crab: y + 15, bloom: y + 13, tree: y + 17, knight: y + 6, hag: y + 8, moth: y + 8, golem: y + 5, pharaoh: y + 7, shade: y + 10, kraken: y + 8 }[shape] ?? y + 10;
  r(px + 10, ey, 4, 3, eye); r(px + 18, ey, 4, 3, eye); r(px + 11, ey + 1, 2, 1, PUPIL); r(px + 19, ey + 1, 2, 1, PUPIL);
}
