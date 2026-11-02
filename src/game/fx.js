// Zentrales Effekt-System: Hitstop, Screenshake über Trauma, Funken aus einem Pool, Lichtringe, Weißblitz.
// Rein darstellend: ändert nie Spielregeln. Koordinaten in Feldern, „Weniger Bewegung“ schaltet Wackeln und Blitze ab.
import { prefersReducedMotion, getSettings } from '../settings.js';

export const FX = { hitstopLamp: 40, hitstopBoss: 70, shakePx: 4, shakeDecay: 1.8, sparksMin: 12, sparksMax: 20, sparkMs: [300, 600], maxSparks: 600 };

const pool = Array.from({ length: FX.maxSparks }, () => ({ on: false })), rings = [];
let trauma = 0, stopUntil = 0, flashUntil = 0, last = 0, quality = 1, slow = 0;

// Grafik-Regler der Einstellungen (0–100 %) mal Leistungs-Automatik
export const fxQuality = () => quality * ((getSettings().gfx ?? 100) / 100);
/** Vibration am Handy, in den Einstellungen abschaltbar. */
export function buzz(ms = 15) { if (getSettings().vibrate !== false) navigator.vibrate?.(ms); }
// Squash & Stretch: 1,2 × 0,8 für 90 ms, dann mit easeOutBack zurück
let squashAt = -1e9;
export function squash(now = performance.now()) { if (!prefersReducedMotion()) squashAt = now; }
export function squashScale(now = performance.now()) {
  const d = now - squashAt;
  if (d > 260) return null;
  if (d < 90) return [1.2, 0.8];
  const k = (d - 90) / 170 - 1, e = 1 + 2.7 * k * k * k + 1.7 * k * k; // easeOutBack
  return [1.2 - 0.2 * e, 0.8 + 0.2 * e];
}
/** Staub im Strahl: ein langsam treibendes Teilchen. */
export function mote(x, y, color, now = performance.now()) {
  const p = pool.find((o) => !o.on);
  if (p && Math.random() < fxQuality()) Object.assign(p, { on: true, x: x + Math.random() - 0.5, y: y + Math.random() - 0.5, vx: (Math.random() - 0.5) * 0.4, vy: -0.3, t0: now, life: 900, color });
}
export function hitstop(ms, now = performance.now()) { if (!prefersReducedMotion()) stopUntil = Math.max(stopUntil, now + ms); }
export const stopped = (now) => now < stopUntil;
export function addTrauma(v) { trauma = Math.min(1, trauma + v); }
export function flash(now = performance.now()) { if (!prefersReducedMotion()) flashUntil = now + 34; }

export function sparks(x, y, color, now = performance.now()) {
  const n = Math.round((FX.sparksMin + Math.random() * (FX.sparksMax - FX.sparksMin)) * fxQuality());
  for (let k = 0, i = 0; k < n && i < pool.length; i++) {
    const p = pool[i];
    if (p.on) continue;
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.5;
    Object.assign(p, { on: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: now, life: FX.sparkMs[0] + Math.random() * (FX.sparkMs[1] - FX.sparkMs[0]), color });
    k++;
  }
}
// Blitz in der Farbe der Welt schlägt von oben ins Feld
const bolts = [];
export function bolt(x, y, color, now = performance.now()) { if (fxQuality() > 0 && !prefersReducedMotion()) bolts.push({ x, y, color, t0: now }); }
export function ring(x, y, color, now = performance.now(), small = false) { if (fxQuality() > 0) rings.push({ x, y, color, t0: now, small }); }

/** Tor-Animation in Pixel-Art: Aufschlag, Ringwellen und Funken je Stil. */
export function goalBurst(id, x, y, color, now = performance.now()) {
  addTrauma(0.75); hitstop(110, now); flash(now);
  const rainbow = ['#ff4a4a', '#ffd166', '#7dff6a', '#4f9fff', '#c07cff'];
  const pick = (k) => (id === 'prisma' ? rainbow[k % 5] : color);
  for (let k = 0; k < 4; k++) { ring(x, y, pick(k), now + k * 90); sparks(x, y, pick(k), now); }
  if (id === 'feuerwerk') for (let k = 0; k < 5; k++) { const a = k * 1.26, sx = x + Math.cos(a) * 3, sy = y + Math.sin(a) * 2.4; setTimeout(() => { const t = performance.now(); sparks(sx, sy, rainbow[k], t); ring(sx, sy, rainbow[k], t, true); }, 180 + k * 110); }
  if (id === 'blitz') for (let k = 0; k < 5; k++) setTimeout(() => { bolt(x + (k - 2) * 1.5, y, color); addTrauma(0.2); }, k * 80);
  if (id === 'glut') for (let k = 0; k < 3; k++) setTimeout(() => { const t = performance.now(); ring(x, y, '#ffd166', t); sparks(x, y, color, t); sparks(x, y, '#ffd166', t); addTrauma(0.3); }, 140 + k * 140);
}

/** Bildversatz in Bildschirm-Pixeln (Trauma² × Stärke). */
export function shake(scale, now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  // Leistungs-Automatik: bleibt das Bild länger unter 50 fps, gibt es weniger Partikel
  slow = dt > 0.02 ? slow + dt : Math.max(0, slow - dt);
  if (slow > 2) { quality = Math.max(0.3, quality - 0.2); slow = 0; }
  trauma = Math.max(0, trauma - FX.shakeDecay * dt);
  if (prefersReducedMotion() || !trauma) return [0, 0];
  const k = FX.shakePx * trauma * trauma * scale;
  return [Math.round((Math.random() * 2 - 1) * k), Math.round((Math.random() * 2 - 1) * k)];
}

/** Zeichnet in das Spielbild; g ist auf Raum-Pixel verschoben, T = Pixel je Feld. */
export function drawFx(g, T, now) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i], k = (now - r.t0) / 500;
    if (k >= 1) { rings.splice(i, 1); continue; }
    if (k < 0) continue; // Lichtwelle: Ring startet später
    g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = 2;
    g.beginPath(); g.arc((r.x + 0.5) * T, (r.y + 0.5) * T, 4 + k * T * (r.small ? 0.5 : 3), 0, Math.PI * 2); g.stroke();
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    if (now - b.t0 > 180) { bolts.splice(i, 1); continue; }
    g.strokeStyle = b.color; g.lineWidth = 2; g.beginPath();
    let px = (b.x + 0.5) * T, py = (b.y + 0.5) * T; g.moveTo(px, py);
    for (let k = 0; k < 7; k++) { px += (k % 2 ? 5 : -5); py -= 9; g.lineTo(px, py); }
    g.stroke();
  }
  for (const p of pool) {
    if (!p.on) continue;
    const k = (now - p.t0) / p.life;
    if (k >= 1) { p.on = false; continue; }
    const s = (now - p.t0) / 1000;
    g.globalAlpha = 1 - k; g.fillStyle = p.color;
    g.fillRect(Math.round((p.x + 0.5 + p.vx * s) * T), Math.round((p.y + 0.5 + p.vy * s + 3 * s * s) * T), 2, 2);
  }
  g.globalAlpha = 1;
  if (now < flashUntil) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-2000, -2000, 4000, 4000); }
}
