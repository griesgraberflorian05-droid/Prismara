// Bildschirmfüllende Effekte: Siegesfeuerwerk und kleine Funken, wenn ein Ziel aufleuchtet.
// Ein gemeinsames Canvas über allem (pointer-events: none), das sich selbst entfernt.
import { prefersReducedMotion } from '../settings.js';

const NEON = ['#ff4fd8', '#4ff0ff', '#ffe14f', '#7dff6a', '#ff7a4f', '#a07bff', '#ffffff'];
let layer = null;

function getLayer() {
  if (layer) return layer;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  layer = { canvas, ctx, parts: [], rings: [], flash: 0, running: false };
  return layer;
}

function resize(L) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  if (L.canvas.width !== Math.round(w * dpr) || L.canvas.height !== Math.round(h * dpr)) {
    L.canvas.width = Math.round(w * dpr); L.canvas.height = Math.round(h * dpr);
  }
  L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  L.w = w; L.h = h;
}

function spawn(L, x, y, n, colors, speed = 7, life = 1.4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.75);
    L.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5,
      life, max: life, size: 2 + Math.random() * 3.5,
      color: colors[(Math.random() * colors.length) | 0],
      shape: (Math.random() * 3) | 0, spin: Math.random() * 6,
    });
  }
}

function loop(t) {
  const L = layer;
  if (!L) return;
  resize(L);
  const { ctx } = L;
  const dt = 1 / 60;
  ctx.clearRect(0, 0, L.w, L.h);
  if (L.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${L.flash * 0.35})`;
    ctx.fillRect(0, 0, L.w, L.h);
    L.flash = Math.max(0, L.flash - dt * 2.2);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const r of L.rings) {
    r.age += dt;
    const k = r.age / r.dur;
    if (k >= 1) continue;
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.shadowColor = r.color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.max * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  L.rings = L.rings.filter((r) => r.age < r.dur);
  for (const p of L.parts) {
    p.life -= dt;
    p.vy += 0.12; p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx; p.y += p.vy; p.spin += 0.2;
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const s = p.size * (0.6 + a * 0.6);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
    ctx.beginPath();
    if (p.shape === 0) { ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); }
    else if (p.shape === 1) ctx.arc(0, 0, s, 0, Math.PI * 2);
    else ctx.rect(-s, -s, s * 2, s * 2);
    ctx.fill();
    ctx.restore();
  }
  L.parts = L.parts.filter((p) => p.life > 0 && p.y < L.h + 40);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (L.parts.length || L.rings.length || L.flash > 0 || L.pending) requestAnimationFrame(loop);
  else { L.running = false; ctx.clearRect(0, 0, L.w, L.h); }
}

function start(L) {
  if (!L.running) { L.running = true; requestAnimationFrame(loop); }
}

/** Kleiner Funkenregen an einer Bildschirmposition (z. B. Ziel erfüllt). */
export function sparkle(x, y, color) {
  if (prefersReducedMotion()) return;
  const L = getLayer();
  spawn(L, x, y, 26, [color, '#ffffff'], 5, 0.9);
  L.rings.push({ x, y, color, age: 0, dur: 0.7, max: 70 });
  start(L);
}

/** Siegesfeuerwerk über den ganzen Bildschirm. origins: [{x, y, color}] (z. B. die Ziele). */
export function celebrate(origins = []) {
  if (prefersReducedMotion()) return;
  const L = getLayer();
  resize(L);
  L.flash = 1;
  for (const o of origins) {
    spawn(L, o.x, o.y, 70, [o.color, '#ffffff', ...NEON], 9, 1.8);
    L.rings.push({ x: o.x, y: o.y, color: o.color, age: 0, dur: 1.4, max: Math.max(L.w, L.h) });
  }
  // Raketen über den ganzen Bildschirm verteilt
  L.pending = true;
  let n = 0;
  const burst = () => {
    if (!layer) return;
    const x = L.w * (0.1 + Math.random() * 0.8), y = L.h * (0.12 + Math.random() * 0.5);
    const c = NEON[(Math.random() * NEON.length) | 0];
    spawn(L, x, y, 55, [c, '#ffffff', NEON[(n * 3) % NEON.length]], 8, 1.6);
    L.rings.push({ x, y, color: c, age: 0, dur: 0.9, max: 160 });
    if (++n < 9) setTimeout(burst, 140 + Math.random() * 160);
    else L.pending = false;
  };
  burst();
  start(L);
}
