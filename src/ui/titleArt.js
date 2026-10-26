// Eigenes Pixel-Titelbild fürs Hauptmenü: Abenddämmerung am alten Laternenturm. Himmel mit
// geditherten Farbbändern, Sterne, Mondsichel, ziehende Wolken, Bergketten, ein See mit
// Mondspiegelung, Tannenhügel, der Turm mit leuchtendem Fenster und blühenden Ranken, und vorn
// der Held am Lagerfeuer zwischen wiegenden Blumen und Glühwürmchen. Alles prozedural in
// 384×216 Pixeln gezeichnet und ohne Glättung bildschirmfüllend hochskaliert.
import { prefersReducedMotion } from '../settings.js';

const W = 384, H = 216;
const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const SKY = ['#140c2a', '#1c1238', '#261648', '#341a56', '#4a2160', '#662862', '#86325e', '#a8405a', '#c95a4a', '#e07e48', '#f2a85a'];
const BAND = 12; // Höhe eines Himmelsbands

function layer() { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); return [c, g]; }
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function ridge(x, base, amp, seed, rough = 1) {
  return base - amp * (0.55 * Math.sin(x / 37 + seed) + 0.3 * Math.sin(x / 17 + seed * 2.3) + 0.15 * rough * Math.sin(x / 7 + seed * 5.1));
}

function drawBack() {
  const [c, g] = layer();
  // Himmel: Farbbänder mit Schachbrett-Dithering an den Übergängen
  for (let y = 0; y < H; y++) {
    const b = Math.min(SKY.length - 1, Math.floor(y / BAND)), nb = Math.min(SKY.length - 1, b + 1), k = y % BAND;
    for (let x = 0; x < W; x++) {
      const dither = (k >= BAND - 3 && ((x + y) % 2 === 0)) || (k === BAND - 1 && x % 2 === 0);
      g.fillStyle = dither ? SKY[nb] : SKY[b];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function pine(g, x, y, s, col) {
  for (let k = 0; k < s; k++) { const w = 1 + Math.floor(k * 0.7); R(g, x - w, y - s + k, w * 2 + 1, 1, col); }
  R(g, x, y, 1, 2, col);
}

function drawFront() {
  const [c, g] = layer();
  // ferne Berge mit Schneekappen
  for (let x = 0; x < W; x++) {
    const y = Math.round(ridge(x, 112, 26, 1.7, 1.3));
    R(g, x, y, 1, H - y, '#3a2858');
    const slope = ridge(x + 1, 112, 26, 1.7, 1.3) - y;
    if (slope > 0.3) R(g, x, y + 1, 1, 10, '#47336a');
    if (y < 96) { R(g, x, y, 1, Math.min(4, 98 - y), '#e8d4ee'); if (slope > 0.2) R(g, x, y, 1, 2, '#ffffff'); }
  }
  // mittlere Bergkette
  for (let x = 0; x < W; x++) { const y = Math.round(ridge(x, 128, 14, 4.2)); R(g, x, y, 1, H - y, '#2a1f48'); if (hash(x, 3) > 0.6) R(g, x, y, 1, 1, '#3a2c5c'); }
  // See
  const lakeTop = 146;
  for (let y = lakeTop; y < H; y++) {
    const k = (y - lakeTop) / 30;
    R(g, 0, y, W, 1, k < 0.2 ? '#7a3a62' : k < 0.45 ? '#5a2e5e' : k < 0.75 ? '#3a2454' : '#241a40');
  }
  // Uferhügel links und rechts mit Tannen
  for (let x = 0; x < W; x++) {
    const left = 150 + Math.max(0, (x - 40) * 0.5) + Math.sin(x / 9) * 1.5;
    const right = 152 + Math.max(0, (250 - x) * 0.45) + Math.sin(x / 11) * 1.5;
    const y = Math.round(Math.min(left, right));
    if (y < H) R(g, x, y, 1, H - y, '#1a2a2e');
  }
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hash(i, 1) * W);
    const onLeft = x < 120, onRight = x > 250;
    if (!onLeft && !onRight) continue;
    const base = onLeft ? 150 + Math.max(0, (x - 40) * 0.5) : 152 + Math.max(0, (250 - x) * 0.45);
    pine(g, x, base + 2, 8 + Math.floor(hash(i, 2) * 10), hash(i, 3) > 0.5 ? '#122024' : '#16282c');
  }
  // Laternenturm auf dem rechten Hügel
  const tx = 318, tb = 154, tt = 74;
  R(g, tx - 11, tt, 22, tb - tt, '#4a4656');
  R(g, tx - 11, tt, 3, tb - tt, '#5e5a6c'); R(g, tx + 8, tt, 3, tb - tt, '#36323e');
  for (let y = tt + 4, k = 0; y < tb; y += 6, k++) { R(g, tx - 11, y, 22, 1, '#36323e'); R(g, tx - 11 + (k % 2 ? 5 : 13), y - 6, 1, 6, '#36323e'); }
  R(g, tx - 14, tt - 4, 28, 5, '#5e5a6c'); R(g, tx - 14, tt - 4, 28, 1, '#7a7688');
  for (let k = 0; k < 5; k++) R(g, tx - 14 + k * 6, tt - 9, 4, 5, '#5e5a6c');
  R(g, tx - 5, tt - 22, 10, 13, '#2a2030'); R(g, tx - 7, tt - 24, 14, 3, '#6b4426'); R(g, tx - 4, tt - 28, 8, 4, '#6b4426'); R(g, tx - 1, tt - 31, 2, 3, '#c9963f');
  R(g, tx - 3, tt - 20, 6, 9, '#ffcf6b'); R(g, tx - 1, tt - 20, 2, 9, '#fff3c0');
  R(g, tx - 3, tt + 30, 6, 8, '#2a1a10'); R(g, tx - 2, tt + 31, 4, 7, '#ffb050');
  R(g, tx - 4, tb - 18, 8, 18, '#2a1a10'); R(g, tx - 3, tb - 17, 6, 17, '#6b4426'); R(g, tx + 1, tb - 9, 1, 1, '#ffd166');
  // Ranken am Turm mit Blüten
  for (let v = 0; v < 3; v++) {
    const vx = tx - 9 + v * 8, len = 30 + v * 14;
    for (let s = 0; s < len; s++) {
      const y = tb - s, x = vx + Math.round(Math.sin(s / 5 + v) * 2);
      R(g, x, y, 1, 1, '#3f8a3a');
      if (s % 5 === 2) R(g, x + (s % 10 === 2 ? 1 : -2), y, 2, 1, '#5ab845');
      if (s % 11 === 6) { const col = ['#ff9cc8', '#fff6b0', '#c9a7ff'][(s + v) % 3]; R(g, x - 1, y, 3, 1, col); R(g, x, y - 1, 1, 3, col); R(g, x, y, 1, 1, '#ffd166'); }
    }
  }
  // Vordergrund: Wiese mit Klippenkante
  for (let x = 0; x < W; x++) {
    const y = Math.round(188 + Math.sin(x / 23) * 4 + Math.sin(x / 7) * 1.2 - Math.max(0, (x - 200) * 0.06));
    R(g, x, y, 1, H - y, '#24402a');
    R(g, x, y, 1, 2, '#3f6b34');
    if (hash(x, 9) > 0.55) R(g, x, y - 1 - Math.floor(hash(x, 10) * 3), 1, 2, '#4a8a3a');
    if (hash(x, 11) > 0.93) R(g, x, y + 4 + Math.floor(hash(x, 12) * 12), 2, 1, '#2f5528');
  }
  // Steine ums Feuer und Baumstamm zum Sitzen
  const fx = 238, fy = 196;
  R(g, fx - 9, fy + 3, 18, 3, '#1a1a20');
  for (let k = 0; k < 6; k++) R(g, fx - 9 + k * 3, fy + 2 + (k % 2), 3, 2, k % 2 ? '#6a6674' : '#7a7688');
  R(g, 206, 198, 22, 5, '#5a3a22'); R(g, 206, 198, 22, 1, '#7a5233'); R(g, 205, 199, 2, 3, '#c99766');
  return c;
}

/** Startet das Titelbild in canvas. Liefert { stop }. */
export function mountTitleArt(canvas) {
  const back = drawBack(), front = drawFront();
  const [buf, g] = layer();
  const ctx = canvas.getContext('2d');
  let run = true;
  function frame(tms) {
    if (!run) return;
    const t = prefersReducedMotion() ? 0 : tms;
    g.drawImage(back, 0, 0);
    // Sterne
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(hash(i, 21) * W), y = Math.floor(hash(i, 22) * 90);
      const tw = 0.5 + 0.5 * Math.sin(t / (500 + hash(i, 23) * 900) + i);
      if (tw < 0.25) continue;
      g.globalAlpha = tw * (1 - y / 110);
      R(g, x, y, 1, 1, '#fff6e0');
      if (hash(i, 24) > 0.88) { R(g, x - 1, y, 3, 1, '#fff6e0'); R(g, x, y - 1, 1, 3, '#fff6e0'); }
    }
    g.globalAlpha = 1;
    // Mondsichel mit Hof
    const mx = 172, my = 46;
    const halo = g.createRadialGradient(mx, my, 4, mx, my, 34); halo.addColorStop(0, 'rgba(255,240,200,0.25)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = halo; g.fillRect(mx - 34, my - 34, 68, 68);
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
      if (x * x + y * y > 81) continue;
      if ((x - 4) * (x - 4) + (y + 3) * (y + 3) < 64) continue;
      R(g, mx + x, my + y, 1, 1, x * x + y * y > 60 ? '#e8d8b0' : '#fff6d8');
    }
    // Wolken (ziehen langsam)
    for (let i = 0; i < 6; i++) {
      const span = W + 120, sp = 0.004 + hash(i, 31) * 0.004;
      const cx = ((hash(i, 32) * span + t * sp) % span) - 60, cy = 40 + Math.floor(hash(i, 33) * 50);
      const n = 4 + Math.floor(hash(i, 34) * 4);
      for (let k = 0; k < n; k++) {
        const w = 10 + Math.floor(hash(i, k + 40) * 14), h = 3 + Math.floor(hash(i, k + 50) * 4);
        const x = cx + k * 7 - n * 3, y = cy - h + Math.floor(hash(i, k + 60) * 3);
        R(g, x, y, w, h, '#4a2a5e'); R(g, x + 1, y + h - 1, w - 2, 1, '#c96a5a'); R(g, x + 2, y, w - 4, 1, '#5e3a70');
      }
    }
    g.drawImage(front, 0, 0);
    // Glitzern auf dem See: Mondspiegel und Schimmerstriche
    for (let k = 0; k < 14; k++) {
      const y = 148 + k * 2 + (k > 6 ? k : 0);
      if (y > 186) break;
      const w = 2 + ((Math.floor(t / 300) + k) % 4);
      g.globalAlpha = 0.65 - k * 0.04;
      R(g, mx - w / 2 + Math.sin(t / 700 + k) * 2, y, w, 1, '#fff0c8');
    }
    for (let i = 0; i < 18; i++) {
      const x = 110 + Math.floor(hash(i, 71) * 140), y = 150 + Math.floor(hash(i, 72) * 30);
      if (Math.sin(t / 400 + i * 1.7) < 0.3) continue;
      g.globalAlpha = 0.5; R(g, x, y, 3, 1, i % 2 ? '#e8846a' : '#c9a7ff');
    }
    // Spiegelung des Turmfensters im See
    g.globalAlpha = 0.35 + 0.15 * Math.sin(t / 500); R(g, 316, 160, 4, 1, '#ffcf6b'); R(g, 315, 163, 6, 1, '#ffcf6b'); R(g, 317, 166, 2, 1, '#ffcf6b');
    g.globalAlpha = 1;
    // Leuchten: Turmfenster und Lagerfeuer
    const glow = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c.replace('A', a)); gr.addColorStop(1, c.replace('A', 0)); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; };
    glow(318, 58, 30, 'rgba(255,200,110,A)', 0.35 + 0.08 * Math.sin(t / 300));
    const fx = 238, fy = 196, fl = Math.sin(t / 90) * 0.5 + Math.sin(t / 37) * 0.3;
    glow(fx, fy - 4, 46, 'rgba(255,150,60,A)', 0.42 + 0.1 * fl);
    // Lagerfeuer: Scheite und flackernde Flamme
    R(g, fx - 6, fy + 1, 12, 2, '#4a2a14'); R(g, fx - 4, fy, 8, 2, '#6b4426');
    const f = Math.floor(t / 100) % 3;
    R(g, fx - 4, fy - 4, 8, 4, '#ff6a1a'); R(g, fx - 3, fy - 7 - (f === 1), 6, 4, '#ff9a2a'); R(g, fx - 2, fy - 10 - f, 4, 4, '#ffcf4a'); R(g, fx - 1, fy - 12 - (f === 2) * 2, 2, 3, '#fff3b0');
    R(g, fx - 1 + (f - 1), fy - 4, 2, 3, '#fff3b0');
    for (let i = 0; i < 8; i++) { // Funken steigen auf
      const ph = ((t / 1000) * (0.5 + hash(i, 81) * 0.6) + hash(i, 82)) % 1;
      g.globalAlpha = 1 - ph; R(g, fx + Math.sin(ph * 9 + i) * 4, fy - 10 - ph * 40, 1, 1, ph < 0.5 ? '#ffcf4a' : '#ff6a1a');
    }
    g.globalAlpha = 1;
    // Held sitzt auf dem Baumstamm, Laterne neben sich, blinzelt und wärmt sich
    const hx = 217, hy = 186, blink = Math.floor(t / 180) % 24 === 0;
    R(g, hx - 1, hy + 2, 10, 10, '#120a1c');
    R(g, hx, hy + 3, 8, 8, '#2f6f86'); R(g, hx, hy + 3, 2, 8, '#4fa3c0'); R(g, hx + 1, hy, 6, 5, '#2f6f86'); R(g, hx + 2, hy - 1, 4, 1, '#2f6f86');
    R(g, hx + 3, hy + 2, 4, 3, '#f2c8a0'); if (!blink) { R(g, hx + 4, hy + 3, 1, 1, '#120a1c'); R(g, hx + 6, hy + 3, 1, 1, '#120a1c'); }
    R(g, hx + 7, hy + 7, 4, 2, '#2f6f86'); R(g, hx + 10, hy + 7, 2, 2, '#f2c8a0');
    R(g, hx + 1, hy + 11, 3, 2, '#3a2414'); R(g, hx + 5, hy + 11, 3, 2, '#3a2414');
    R(g, hx - 6, hy + 6, 4, 6, '#6b4426'); R(g, hx - 5, hy + 7, 2, 4, '#ffcf6b'); R(g, hx - 5, hy + 5, 2, 1, '#3a2414');
    glow(hx - 4, hy + 9, 14, 'rgba(255,210,120,A)', 0.3);
    // Blumen im Vordergrund wiegen sich
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(hash(i, 91) * W);
      if (Math.abs(x - fx) < 14 || (x > 200 && x < 232)) continue;
      const base = Math.round(188 + Math.sin(x / 23) * 4 + Math.sin(x / 7) * 1.2 - Math.max(0, (x - 200) * 0.06)) + 3 + Math.floor(hash(i, 92) * 14);
      const sway = Math.round(Math.sin(t / 900 + i) * 1.2), h = 4 + Math.floor(hash(i, 93) * 4);
      R(g, x, base - h, 1, h, '#3f8a3a'); R(g, x + sway - 1, base - h - 1, 3, 1, ['#ff9cc8', '#fff6b0', '#ffffff', '#c9a7ff', '#ffb36b'][i % 5]); R(g, x + sway, base - h - 2, 1, 3, ['#ff9cc8', '#fff6b0', '#ffffff', '#c9a7ff', '#ffb36b'][i % 5]); R(g, x + sway, base - h - 1, 1, 1, '#ffd166');
    }
    // Glühwürmchen
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const x = hash(i, 101) * W + Math.sin(t / 1400 + i * 2) * 10, y = 120 + hash(i, 102) * 80 + Math.cos(t / 1700 + i) * 6;
      const a = Math.max(0, Math.sin(t / 450 + i * 5));
      g.globalAlpha = a * 0.35; R(g, x - 1, y - 1, 3, 3, '#d8ff7a'); g.globalAlpha = a; R(g, x, y, 1, 1, '#f4ffb0');
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // bildschirmfüllend, unten bündig
    const dpr = devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const s = Math.max(1, Math.ceil(Math.max(cw / W, ch / H)));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, Math.round((cw - W * s) * 0.65), ch - H * s, W * s, H * s);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop() { run = false; } };
}
