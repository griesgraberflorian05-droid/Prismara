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
export function drawMinion(raw, kind, [body, dark], px0, py0, t, { flash = false, warn = false, lunge = [0, 0], bite = false } = {}) {
  const px = px0 + lunge[0], py = py0 + lunge[1];
  // Laufzyklus in 4 Bildern: stauchen, abheben, strecken, landen; Warnen zittert, Beißen streckt nach vorn
  // Der ganze Körper bewegt sich als starrer Block auf dem Halbpixel-Raster: nichts dehnt sich, also keine Lücken oder Zittern
  const half = (v) => Math.round(v * 2) / 2, ph = t / 170 + px0 / 16 + py0 / 16, hop = half((1 + Math.sin(ph)) * 0.8);
  const shake = warn ? half(Math.sin(t / 30) * 0.5) : 0;
  const R = (x, y, w, h, c) => raw(x + shake, y - hop, w, h, c);
  const b = flash ? '#ffffff' : warn ? '#ff4a3a' : body, d = flash ? '#ffffff' : dark;
  const y = py;
  R(px + 2, py + 13, 12, 2, 'rgba(0,0,0,0.3)');
  // Erst die Form dunkel und etwas größer als Kontur, dann darüber in Farbe
  const shape = (r) => { if (kind === 'crab') {
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
    for (let k = 0; k < 4; k++) r(px + 4 + k * 2, y + 12 + (Math.floor(k + t / 180) % 2), 2, 1, d);
  } else if (kind === 'bat') {
    const up = Math.round(Math.sin(t / 70) + 1) / 2;
    r(px + 5, y + 5, 6, 7, b); r(px + 5, y + 3, 1, 2, d); r(px + 10, y + 3, 1, 2, d);
    r(px, y + 5 + up, 5, 3, d); r(px + 11, y + 5 + up, 5, 3, d);
  } else { // slime
    r(px + 2, y + 7, 12, 6, b); r(px + 4, y + 5, 8, 2, b); r(px + 3, y + 12, 10, 1, d); r(px + 4, y + 7, 2, 1, flash ? b : '#ffffff55');
  } };
  shape((x, yy, w, h) => R(x - 0.5, yy - 0.5, w + 1, h + 1, '#17121f')); shape(R);
  const r = R;
  if (!flash) r(px + 4, y + 12, 8, 0.5, 'rgba(0,0,0,0.3)'); // Schatten unten
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

/** Boss als kantiger Puzzle-Golem aus genieteten Platten, 32 × 32 groß.
 *  state: normal, hurt (Risse, Rauch), aggro (rote Augen, Glut), ghost (blauer Geist beim Zerfall). */
export function drawBoss(r, shape, [main, dark], px, py, t, { flash = false, angry = false, state = angry ? 'aggro' : 'normal' } = {}) {
  const ghost = state === 'ghost', aggro = state === 'aggro', hurt = state === 'hurt' || aggro;
  const tone = (c) => (flash ? '#ffffff' : ghost ? '#9ff0ee66' : c);
  const hi = tone(shadeHex(main, 0.32)), mid = tone(main), lo = tone(shadeHex(main, -0.3)), deep = tone(dark), line = ghost ? '#c8fffb88' : '#17121f';
  const bob = Math.round((1 + Math.sin(t / 420)) * 1.5) / 2, step = aggro ? Math.round(Math.sin(t / 100)) : 0, y = py + bob;
  // Platte: Kontur, Licht oben, Schatten unten, Nieten in den Ecken
  const plate = (x, yy, w, h, face = mid, top = hi, bottom = lo) => {
    r(px + x - 1, yy - 1, w + 2, h + 2, line); r(px + x, yy, w, h, face); r(px + x, yy, w, 1, top); r(px + x, yy + h - 1, w, 1, bottom); r(px + x, yy, 1, h, top);
    if (w > 5 && h > 4) for (const [a, b] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) { r(px + x + a, yy + b, 1, 1, bottom); r(px + x + a, yy + b, 0.5, 0.5, top); }
    if (!ghost && w > 7 && h > 6) { r(px + x + 2, yy + 2, 1.5, 0.5, top); r(px + x + w - 4, yy + h - 3, 1.5, 0.5, bottom); r(px + x + w / 2, yy + 1.5, 0.5, 2, bottom); } // Kratzer
  };
  if (!ghost) r(px + 2, py + 29, 28, 3, 'rgba(0,0,0,0.4)');
  // Beine und Füße, im Zorn stampfend
  plate(9, y + 24 - step, 5, 5, lo, mid, deep); plate(18, y + 24 + step - 1, 5, 5, lo, mid, deep);
  // Körper mit Mittelfeld
  plate(6, y + 13, 20, 12, deep, lo, tone('#120e18'));
  plate(11, y + 15, 10, 8, mid); r(px + 15, y + 17, 2, 4, line);
  // Kopf
  plate(7, y + 1, 18, 12);
  r(px + 9, y + 11, 14, 1, lo);
  // Eigenheiten je Boss
  if (shape === 'crab') { plate(-1, y + 8, 7, 8); plate(26, y + 8, 7, 8); r(px, y + 5, 2, 3, deep); r(px + 4, y + 5, 2, 3, deep); r(px + 26, y + 5, 2, 3, deep); r(px + 30, y + 5, 2, 3, deep); }
  else if (shape === 'bloom') { for (const [a, b] of [[3, -2], [13, -5], [23, -2]]) plate(a, y + b, 7, 6, hi, '#ffffff66', mid); plate(1, y + 14, 5, 8); plate(26, y + 14, 5, 8); }
  else if (shape === 'tree') { plate(3, y - 4, 26, 6, lo, mid, deep); plate(-1, y + 13, 7, 9, tone('#6b4426'), tone('#8a5a32'), tone('#3a2414')); plate(26, y + 13, 7, 9, tone('#6b4426'), tone('#8a5a32'), tone('#3a2414')); }
  else if (shape === 'knight') { r(px + 14, y - 4, 4, 5, tone('#c0342c')); plate(-2, y + 12, 8, 13); r(px + 1, y + 15, 2, 7, deep); r(px + 29, y + 2, 2, 23, tone('#e6e2d8')); plate(26, y + 15, 6, 3, tone('#6b4426')); r(px + 9, y + 8, 14, 1, line); }
  else if (shape === 'hag') { plate(4, y - 3, 24, 5, deep, lo, line); plate(12, y - 7, 8, 5, deep, lo, line); plate(0, y + 15, 6, 6); plate(26, y + 15, 6, 6); r(px - 1, y + 8, 2, 10, tone('#6b4426')); }
  else if (shape === 'moth') { const f = Math.floor(t / 170) % 2; plate(-3, y + 4 + f, 9, 16, hi, '#ffffff55', mid); plate(26, y + 4 + f, 9, 16, hi, '#ffffff55', mid); r(px + 10, y - 3, 2, 4, deep); r(px + 20, y - 3, 2, 4, deep); }
  else if (shape === 'golem') { plate(-1, y + 11, 8, 14, deep, lo, line); plate(25, y + 11, 8, 14, deep, lo, line); plate(13, y - 3, 6, 4, hi); }
  else if (shape === 'pharaoh') { for (let k = 0; k < 6; k++) { r(px + 4, y + 1 + k * 3, 4, 2, tone('#ffd166')); r(px + 24, y + 1 + k * 3, 4, 2, tone('#ffd166')); r(px + 4, y + 3 + k * 3, 4, 1, tone('#3a2414')); r(px + 24, y + 3 + k * 3, 4, 1, tone('#3a2414')); } plate(12, y - 3, 8, 4, tone('#ffd166'), tone('#fff0a0'), tone('#a87410')); r(px + 29, y + 2, 2, 25, tone('#ffd166')); plate(27, y + 1, 6, 3, tone('#ffd166'), tone('#fff0a0'), tone('#a87410')); r(px + 14, y + 18, 4, 3, line); }
  else if (shape === 'shade') { plate(1, y + 5, 6, 12, hi); plate(25, y + 5, 6, 12, hi); for (let k = 0; k < 4; k++) r(px + 10 + k * 3, y + 8, 2, 3, tone('#f0e6c8')); }
  else { for (let k = 0; k < 6; k++) { const w = (k + Math.floor(t / 220)) % 2; plate(1 + k * 5, y + 23 + w, 4, 6 + w, lo, mid, deep); } plate(1, y + 6, 6, 7); plate(25, y + 6, 6, 7); }
  // Augen: Ringe, blinzeln, im Zorn rot glühend, verletzt ein Auge zugekniffen
  const blink = !aggro && Math.floor(t / 180) % 22 === 0, eyeY = shape === 'shade' ? y + 4 : y + 4;
  for (const [i, ex] of [[0, 10], [1, 18]]) {
    if (ghost) { r(px + ex, eyeY, 4, 4, '#e8fffd99'); continue; }
    r(px + ex - 1, eyeY - 1, 6, 6, line);
    if (blink || (state === 'hurt' && i === 1)) { r(px + ex, eyeY + 1, 4, 2, lo); continue; }
    r(px + ex, eyeY, 4, 4, aggro ? '#ff3a1a' : '#e8b04a'); r(px + ex + 1, eyeY + 1, 2, 2, aggro ? (Math.floor(t / 110) % 2 ? '#fff0a0' : '#ffd166') : line);
  }
  if (hurt && !ghost) { // Risse und Rauch
    r(px + 21, y + 2, 1, 3, line); r(px + 20, y + 4, 2, 1, line); r(px + 12, y + 16, 1, 4, line); r(px + 13, y + 19, 2, 1, line);
    for (let k = 0; k < 3; k++) { const q = (t / 900 + k / 3) % 1; r(px + 25 + Math.round(Math.sin(q * 6) * 2), y - 1 - q * 12, 3 - k, 3 - k, 'rgba(190,186,180,0.7)'); }
  }
  if (aggro) for (let k = 0; k < 7; k++) { const f = (Math.floor(t / 90) + k * 3) % 4; r(px + 3 + k * 4, y + 1 - f, 2, 2 + f, f > 1 ? '#ffd166' : '#ff5a1a'); } // Flammen
  if (ghost) for (let k = 0; k < 4; k++) r(px + 2 + k * 9, y + 4 + ((Math.floor(t / 120) + k * 2) % 18), 2, 3, '#c8fffb99');
}
