// Jumpscare für den Code „halloween“: ein Kürbis-Dämon springt bildschirmfüllend heran und schreit.
// Liegt direkt am body, läuft also auch weiter, wenn man die Seite inzwischen gewechselt hat.
import { prefersReducedMotion } from '../settings.js';
import { scream } from '../game/sound.js';
import { stopMusic } from '../game/music.js';

const S = 80; // Pixelraster des Gesichts

function drawFace(g, open) {
  g.fillStyle = '#050205'; g.fillRect(0, 0, S, S);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // Kopf: Ellipse mit Rippen, oben heller, unten fast schwarz
  for (let y = 10; y < 76; y++) for (let x = 2; x < 78; x++) {
    const nx = (x - 40) / 38, ny = (y - 43) / 33;
    if (nx * nx + ny * ny >= 1) continue;
    const rib = Math.abs(Math.sin(nx * 7.5));
    const shade = (y - 10) / 66 + (rib < 0.3 ? 0.28 : 0);
    R(x, y, 1, 1, shade < 0.3 ? '#c9c2a8' : shade < 0.55 ? '#8f8870' : shade < 0.8 ? '#4e4436' : '#1c1412'); // bleich und faulig
  }
  // Böse Brauen und glühende Dreiecksaugen
  for (let side = -1; side <= 1; side += 2) {
    const cx = 40 + side * 16;
    for (let i = 0; i < 16; i++) R(cx - side * 8 + side * i, 19 + Math.floor(i / 2), 1, 3, '#1a0804');
    for (let y = 0; y < 14; y++) {
      const half = 1 + Math.floor(y * 0.62);
      R(cx - half, 25 + y, half * 2, 1, '#020102'); // leere schwarze Höhlen
    }
    R(cx - 1, 33, 2, 2, '#ffffff'); R(cx, 34, 1, 1, '#ff2010'); // winzige starrende Pupille
    R(cx - 2, 39, 2, 12, '#5a0a0c'); // Blutspur
  }
  // Nase
  for (let y = 0; y < 5; y++) R(39 - y, 41 + y, 2 + y * 2, 1, '#1a0804');
  // Maul mit Zähnen, offen viel größer
  const depth = open ? 21 : 10;
  for (let x = 13; x < 67; x++) {
    const k = (x - 40) / 27, top = Math.round(54 - k * k * 8), h = Math.round(depth * (1 - k * k)) + 2;
    R(x, top, 1, h, x % 6 < 3 ? '#1a0206' : '#3c060c');
    const fang = 5 - Math.abs((x % 9) - 4); // obere Reißzähne
    if (fang > 0) R(x, top, 1, fang + 1, '#fff2d0');
    const low = 4 - Math.abs(((x + 4) % 9) - 4); // untere Zähne
    if (low > 0 && h > 6) R(x, top + h - low, 1, low, '#e8d8b0');
  }
}

let active = false;
/** Zeigt den Jumpscare für ms Millisekunden; Klick oder Taste beendet ihn früher. */
export function jumpscare(ms = 1600) {
  if (active) return;
  active = true;
  const box = document.createElement('div');
  box.className = 'scare' + (prefersReducedMotion() ? ' calm' : '');
  box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Ein schreiender Kürbis-Dämon');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  box.append(canvas);
  document.body.append(box);
  const g = canvas.getContext('2d');
  let open = true;
  drawFace(g, open);
  const chew = setInterval(() => { open = !open; drawFace(g, open); }, 170);
  stopMusic();
  scream();
  const close = () => {
    clearInterval(chew); clearTimeout(timer);
    box.classList.add('out');
    removeEventListener('keydown', close, true);
    setTimeout(() => { box.remove(); active = false; }, 260);
  };
  const timer = setTimeout(close, ms);
  box.addEventListener('pointerdown', close);
  addEventListener('keydown', close, true);
}
