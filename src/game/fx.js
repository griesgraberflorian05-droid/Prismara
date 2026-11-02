// Zentrales Effekt-System: Hitstop, Screenshake über Trauma, Funken aus einem Pool, Lichtringe, Weißblitz.
// Rein darstellend: ändert nie Spielregeln. Koordinaten in Feldern, „Weniger Bewegung“ schaltet Wackeln und Blitze ab.
import { prefersReducedMotion } from '../settings.js';

export const FX = { hitstopLamp: 40, hitstopBoss: 70, shakePx: 4, shakeDecay: 1.8, sparksMin: 12, sparksMax: 20, sparkMs: [300, 600], maxSparks: 600 };

const pool = Array.from({ length: FX.maxSparks }, () => ({ on: false })), rings = [];
let trauma = 0, stopUntil = 0, flashUntil = 0, last = 0, quality = 1, slow = 0;

export const fxQuality = () => quality;
export function hitstop(ms, now = performance.now()) { if (!prefersReducedMotion()) stopUntil = Math.max(stopUntil, now + ms); }
export const stopped = (now) => now < stopUntil;
export function addTrauma(v) { trauma = Math.min(1, trauma + v); }
export function flash(now = performance.now()) { if (!prefersReducedMotion()) flashUntil = now + 34; }

export function sparks(x, y, color, now = performance.now()) {
  const n = Math.round((FX.sparksMin + Math.random() * (FX.sparksMax - FX.sparksMin)) * quality);
  for (let k = 0, i = 0; k < n && i < pool.length; i++) {
    const p = pool[i];
    if (p.on) continue;
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.5;
    Object.assign(p, { on: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: now, life: FX.sparkMs[0] + Math.random() * (FX.sparkMs[1] - FX.sparkMs[0]), color });
    k++;
  }
}
export function ring(x, y, color, now = performance.now()) { rings.push({ x, y, color, t0: now }); }

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
    g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = 2;
    g.beginPath(); g.arc((r.x + 0.5) * T, (r.y + 0.5) * T, 4 + k * T * 3, 0, Math.PI * 2); g.stroke();
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
