// Zauber-Effekte im Kampf: jeder Zauber hat seine eigene, große Animation in Pixeln.
// add(kind, data) legt einen Effekt an, draw(r, now, T) zeichnet alle laufenden in Raum-Pixeln.
// r(x, y, w, h, Farbe) ist der Rechteck-Zeichner der Arena (ein Feld = T Pixel).
const list = [];
const rnd = (a, b) => a + Math.random() * (b - a);

export function addSpellFx(kind, data) {
  const now = performance.now();
  const e = { kind, t0: now, dur: 700, ...data };
  if (kind === 'nova') { e.dur = 650; e.bits = Array.from({ length: 36 }, (_, i) => ({ a: (i / 36) * Math.PI * 2 + rnd(-0.1, 0.1), v: rnd(3.2, 4.4) })); }
  if (kind === 'blitz') { e.dur = 420; e.paths = (data.pts || []).map(() => Array.from({ length: 9 }, () => rnd(-5, 5))); }
  if (kind === 'lanze') e.dur = 520;
  if (kind === 'frost') { e.dur = 1600; e.shards = (data.pts || []).flatMap(([x, y]) => Array.from({ length: 6 }, (_, i) => ({ x, y, a: (i / 6) * Math.PI * 2, l: rnd(5, 9) }))); }
  if (kind === 'schild') e.dur = data.dur || 6000;
  if (kind === 'heil') { e.dur = 1200; e.bits = Array.from({ length: 14 }, () => ({ dx: rnd(-10, 10), v: rnd(10, 22), d: rnd(0, 300) })); }
  if (kind === 'sprung') e.dur = 500;
  if (kind === 'meteor') { e.dur = 1700; e.hit = 1100; e.debris = Array.from({ length: 60 }, () => ({ a: rnd(0, Math.PI * 2), v: rnd(30, 140), s: rnd(2, 5) })); }
  if (kind === 'sonne') e.dur = 6000;
  if (kind === 'num') e.dur = 800;
  list.push(e);
  return e;
}

export function clearSpellFx() { list.length = 0; }

/** Zeichnet alle Effekte. T = Feldgröße, col = Magiefarbe. Liefert true, solange etwas läuft. */
export function drawSpellFx(r, now, T, col, hero) {
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i], k = (now - e.t0) / e.dur;
    if (k >= 1) { list.splice(i, 1); continue; }
    if (k < 0) continue;
    const cx = (e.x + 0.5) * T, cy = (e.y + 0.5) * T;
    if (e.kind === 'nova') { // Schockwelle: doppelter Ring, Funkenkranz, heller Kern
      const rad = k * T * 3.4, a = 1 - k;
      for (let s = 0; s < 64; s++) { const w = (s / 64) * Math.PI * 2; r(cx + Math.cos(w) * rad - 1.5, cy + Math.sin(w) * rad - 1.5, 3, 3, col); r(cx + Math.cos(w) * rad * 0.8 - 1, cy + Math.sin(w) * rad * 0.8 - 1, 2, 2, '#ffffff'); }
      for (const b of e.bits) { const d = b.v * T * k; r(cx + Math.cos(b.a) * d - 1, cy + Math.sin(b.a) * d - 1, 2, 2, k > 0.6 ? col : '#fff6d0'); }
      if (k < 0.3) r(cx - 10 * (1 - k), cy - 10 * (1 - k), 20 * (1 - k), 20 * (1 - k), `rgba(255,255,255,${(0.9 * a).toFixed(2)})`);
    }
    if (e.kind === 'blitz') { // zackige Blitzkette von Ziel zu Ziel, flackert
      if (Math.floor(now / 40) % 3 === 2) continue;
      let px = (hero.x + 0.5) * T, py = (hero.y + 0.5) * T;
      e.pts.forEach(([tx, ty], j) => {
        const qx = (tx + 0.5) * T, qy = (ty + 0.5) * T, z = e.paths[j];
        for (let s = 0; s < 9; s++) {
          const f0 = s / 9, f1 = (s + 1) / 9, ax = px + (qx - px) * f0 + (s ? z[s - 1] : 0), ay = py + (qy - py) * f0 + (s ? z[s - 1] * 0.6 : 0);
          const bx = px + (qx - px) * f1 + (s < 8 ? z[s] : 0), by = py + (qy - py) * f1 + (s < 8 ? z[s] * 0.6 : 0);
          for (let t = 0; t <= 1; t += 0.12) { r(ax + (bx - ax) * t - 2, ay + (by - ay) * t - 2, 4, 4, col); r(ax + (bx - ax) * t - 1, ay + (by - ay) * t - 1, 2, 2, '#ffffff'); }
        }
        r(qx - 8, qy - 8, 16, 16, `rgba(255,255,255,${(0.6 * (1 - k)).toFixed(2)})`);
        px = qx; py = qy;
      });
    }
    if (e.kind === 'lanze') { // dicker Strahl bis zur Wand, Kern flackert, wird schmaler
      const [dx, dy] = e.dir, len = e.len * T, w = 10 * (1 - k) + 2, sx = cx + dx * T * 0.5, sy = cy + dy * T * 0.5;
      const bx = dx ? Math.min(sx, sx + dx * len) : sx - w / 2, by = dy ? Math.min(sy, sy + dy * len) : sy - w / 2, bw = dx ? len : w, bh = dy ? len : w;
      r(bx - (dx ? 0 : 3), by - (dy ? 0 : 3), bw + (dx ? 0 : 6), bh + (dy ? 0 : 6), `${col}55`);
      r(bx, by, bw, bh, col);
      r(bx + (dx ? 0 : w / 2 - 1), by + (dy ? 0 : w / 2 - 1), dx ? bw : 2, dy ? bh : 2, Math.floor(now / 30) % 2 ? '#ffffff' : '#fff6d0');
      for (let s = 0; s < 12; s++) { const f = (s / 12 + k) % 1; r(sx + dx * len * f + rnd(-6, 6) * !dx - 1, sy + dy * len * f + rnd(-6, 6) * !dy - 1, 2, 2, '#ffffff'); }
    }
    if (e.kind === 'frost') { // Eiskristalle wachsen aus den Zielen, blauer Hauch
      const g = Math.min(1, k * 4), fade = k > 0.8 ? (1 - k) * 5 : 1;
      for (const s of e.shards) { const px = (s.x + 0.5) * T, py = (s.y + 0.5) * T; for (let d = 0; d < s.l * g; d += 1) { r(px + Math.cos(s.a) * d - 1, py + Math.sin(s.a) * d - 1, 2, 2, d > s.l * g - 2 ? '#ffffff' : '#9fe8ff'); } }
      for (const [x, y] of e.pts) r(x * T, y * T, T, T, `rgba(159,232,255,${(0.35 * fade).toFixed(2)})`);
    }
    if (e.kind === 'schild') { // sechs kreisende Lichtplatten um den Helden
      const hx = (hero.rx ?? hero.x) * T + 8, hy = (hero.ry ?? hero.y) * T + 8, n = e.charges?.() ?? 0;
      if (n <= 0) { list.splice(i, 1); continue; }
      for (let s = 0; s < 6; s++) { const w = now / 300 + (s / 6) * Math.PI * 2; r(hx + Math.cos(w) * 13 - 2, hy + Math.sin(w) * 13 - 2, 4, 4, s < n * 2 ? '#9ff6ff' : '#4a6a7a'); r(hx + Math.cos(w) * 13 - 1, hy + Math.sin(w) * 13 - 1, 1, 1, '#ffffff'); }
    }
    if (e.kind === 'heil') { // grüne Kreuze steigen, weicher Schein
      const hx = (hero.rx ?? hero.x) * T + 8, hy = (hero.ry ?? hero.y) * T + 8;
      r(hx - 14, hy - 14, 28, 28, `rgba(125,255,106,${(0.25 * (1 - k)).toFixed(2)})`);
      for (const b of e.bits) { const q = Math.max(0, (now - e.t0 - b.d) / 900); if (q <= 0 || q >= 1) continue; const x = hx + b.dx, y = hy - q * b.v * 2; r(x - 2, y, 5, 1, '#7dff6a'); r(x, y - 2, 1, 5, '#7dff6a'); r(x, y, 1, 1, '#ffffff'); }
    }
    if (e.kind === 'sprung') { // Nachbilder entlang des Sprungs, Lichtsäule am Ziel
      const [fx, fy] = e.from, n = 6;
      for (let s = 0; s < n; s++) { const f = s / n, x = (fx + (e.x - fx) * f) * T, y = (fy + (e.y - fy) * f) * T; r(x + 4, y + 2, 8, 12, `${col}${Math.round((1 - k) * (s / n) * 200).toString(16).padStart(2, '0')}`); }
      r(cx - 3, cy - 40 * (1 - k) - 8, 6, 40 * (1 - k) + 8, '#ffffff'); r(cx - 6, cy - 6, 12, 12, `${col}aa`);
    }
    if (e.kind === 'meteor') { // Warnkreis, Stern stürzt schräg herab, Einschlag mit Splittern
      const t = now - e.t0, room = e.room;
      if (t < e.hit) {
        const q = t / e.hit, sx = room.cx + (1 - q) * 160, sy = room.cy - (1 - q) * 200;
        for (let s = 0; s < 48; s++) { const w = (s / 48) * Math.PI * 2, rr = 30 + Math.sin(now / 60) * 3; r(room.cx + Math.cos(w) * rr - 1, room.cy + Math.sin(w) * rr * 0.6 - 1, 2, 2, Math.floor(now / 90) % 2 ? '#ff3a2a' : '#ffd166'); }
        for (let s = 0; s < 10; s++) r(sx + s * 6, sy - s * 7.5, 10 - s, 10 - s, s < 2 ? '#ffffff' : s < 5 ? '#ffd166' : '#ff7a2a');
        r(sx - 6, sy - 6, 14, 14, '#fff6d0');
      } else {
        const q = (t - e.hit) / (e.dur - e.hit);
        if (q < 0.25) r(room.x0, room.y0, room.w, room.h, `rgba(255,255,255,${(0.85 - q * 3).toFixed(2)})`);
        for (let s = 0; s < 3; s++) { const rr = q * (80 + s * 50); for (let a = 0; a < 40; a++) { const w = (a / 40) * Math.PI * 2; r(room.cx + Math.cos(w) * rr - 2, room.cy + Math.sin(w) * rr * 0.7 - 2, 4, 4, s ? '#ff7a2a' : '#ffd166'); } }
        for (const d of e.debris) { const dd = d.v * q; r(room.cx + Math.cos(d.a) * dd, room.cy + Math.sin(d.a) * dd * 0.7 + q * q * 40, d.s, d.s, q > 0.5 ? '#6a3a2a' : '#ffb040'); }
      }
    }
    if (e.kind === 'sonne') { // kleine Sonne über dem Helden, Strahlen drehen sich
      const hx = (hero.rx ?? hero.x) * T + 8, hy = (hero.ry ?? hero.y) * T - 14, p = 1 + Math.sin(now / 120) * 0.15;
      for (let s = 0; s < 12; s++) { const w = now / 500 + (s / 12) * Math.PI * 2; for (let d = 8; d < 15 * p; d += 2) r(hx + Math.cos(w) * d - 1, hy + Math.sin(w) * d - 1, 2, 2, s % 2 ? '#ffd166' : '#fff6d0'); }
      r(hx - 6, hy - 6, 12, 12, '#ffd166'); r(hx - 4, hy - 4, 8, 8, '#fff6d0'); r(hx - 2, hy - 2, 4, 4, '#ffffff');
    }
    if (e.kind === 'num') { // Schadenszahl springt hoch und verblasst
      const y = cy - 10 - k * 18, s = String(e.n);
      for (let c = 0; c < s.length; c++) digit(r, cx - s.length * 3 + c * 6, y, s[c], k > 0.7 ? '#ffd16688' : e.color || '#ffd166');
    }
  }
  return list.length > 0;
}

// 3×5-Pixelziffern mit Kontur für die Schadenszahlen
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
function digit(r, x, y, ch, col) {
  const g = DIG[+ch]; if (!g) return;
  for (let i = 0; i < 15; i++) if (g[i] === '1') r(x + (i % 3) * 2 - 0.5, y + Math.floor(i / 3) * 2 - 0.5, 3, 3, '#17121f');
  for (let i = 0; i < 15; i++) if (g[i] === '1') r(x + (i % 3) * 2, y + Math.floor(i / 3) * 2, 2, 2, col);
}
