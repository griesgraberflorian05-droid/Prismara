// Welten: Jedes Kapitel spielt an einem eigenen Ort. Eine Welt zeichnet Wände, Boden,
// Rahmen, Hintergrund-Teilchen und liefert Farben für die Seite. Alles prozedural (Canvas),
// keine Bilddateien. Varianten je Feld über hash(x, y), damit Texturen nicht flackern.

const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

// ---------- Teilchen (zustandslos aus der Zeit berechnet) ----------
function particles(ctx, w, h, t, n, seed, draw) {
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed, 1), b = hash(i, seed, 2), c = hash(i, seed, 3);
    draw(a, b, c, i);
  }
}

function petals(ctx, w, h, t, color = '#ffb7d5') {
  particles(ctx, w, h, t, 26, 7, (a, b, c) => {
    const speed = 18 + c * 22;
    const y = ((t / 1000) * speed + b * h * 1.2) % (h * 1.2) - h * 0.1;
    const x = (a * w + Math.sin(t / 900 + c * 9) * 40 + (t / 1000) * 12) % w;
    const rot = t / (600 + c * 600) + a * 6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, 5 + c * 3, 2.6 + c * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath(); ctx.ellipse(-1.5, -0.6, 2, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function fireflies(ctx, w, h, t, color = '#d8ff6a', n = 22) {
  particles(ctx, w, h, t, n, 11, (a, b, c, i) => {
    const x = a * w + Math.sin(t / (1500 + c * 900) + i) * 40;
    const y = b * h + Math.cos(t / (1300 + a * 800) + i * 2) * 30;
    const glow = 0.35 + 0.65 * Math.max(0, Math.sin(t / (500 + c * 700) + i * 3));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.globalAlpha = glow;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function leaves(ctx, w, h, t) {
  particles(ctx, w, h, t, 10, 5, (a, b, c) => {
    const y = ((t / 1000) * (14 + c * 14) + b * h * 1.2) % (h * 1.2) - h * 0.1;
    const x = a * w + Math.sin(t / 700 + c * 7) * 30;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t / 500 + a * 9) * 0.9);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = c > 0.5 ? '#7bd65a' : '#3fa34d';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(6, 0, 0, 7); ctx.quadraticCurveTo(-6, 0, 0, -7); ctx.fill();
    ctx.strokeStyle = '#1e5a2a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
    ctx.restore();
  });
}

function rising(ctx, w, h, t, colors, n = 30, speedBase = 30) {
  particles(ctx, w, h, t, n, 17, (a, b, c) => {
    const y = h - (((t / 1000) * (speedBase + c * 40) + b * h * 1.2) % (h * 1.2));
    const x = a * w + Math.sin(t / 600 + c * 11) * 14;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + 0.5 * c;
    ctx.fillStyle = colors[Math.floor(c * colors.length) % colors.length];
    ctx.beginPath(); ctx.arc(x, y, 1.2 + c * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function snow(ctx, w, h, t) {
  particles(ctx, w, h, t, 45, 23, (a, b, c) => {
    const y = ((t / 1000) * (16 + c * 26) + b * h * 1.2) % (h * 1.2) - h * 0.1;
    const x = (a * w + Math.sin(t / 1100 + c * 13) * 25) % w;
    ctx.globalAlpha = 0.55 + c * 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, 1 + c * 2.4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function sparkles(ctx, w, h, t) {
  particles(ctx, w, h, t, 18, 3, (a, b, c, i) => {
    const tw = Math.max(0, Math.sin(t / (400 + c * 500) + i * 2.1));
    if (tw < 0.2) return;
    const x = a * w, y = b * h, r = 2 + tw * 5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = tw * 0.8;
    ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    ctx.restore();
  });
}

function aurora(ctx, w, h, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    ctx.globalAlpha = 0.16;
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.3, k === 1 ? '#a07bff' : '#4fffb0'); g.addColorStop(0.7, '#4ff0ff'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 20) {
      const y = h * (0.12 + k * 0.07) + Math.sin(x / 120 + t / 2200 + k * 2) * 22;
      ctx[x ? 'lineTo' : 'moveTo'](x, y);
    }
    for (let x = w; x >= 0; x -= 20) ctx.lineTo(x, h * (0.12 + k * 0.07) + 60 + Math.sin(x / 90 + t / 1800 + k) * 18);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function bubbles(ctx, w, h, t) {
  particles(ctx, w, h, t, 28, 29, (a, b, c) => {
    const y = h - (((t / 1000) * (20 + c * 35) + b * h * 1.2) % (h * 1.2));
    const x = a * w + Math.sin(t / 500 + c * 10) * 8;
    const r = 2 + c * 4;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#d6fbff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7); ctx.fill();
    ctx.restore();
  });
}

function caustics(ctx, w, h, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 6;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 24) {
      const y = (k / 7) * h + Math.sin(x / 70 + t / 1300 + k * 1.7) * 18 + Math.sin(x / 31 - t / 900) * 6;
      ctx[x ? 'lineTo' : 'moveTo'](x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function wisps(ctx, w, h, t) {
  particles(ctx, w, h, t, 16, 41, (a, b, c, i) => {
    const x = (a * w + (t / 1000) * (8 + c * 10)) % w;
    const y = b * h + Math.sin(t / 900 + i) * 20;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t / 600 + i * 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 18 + c * 14);
    g.addColorStop(0, '#c49bff'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 18 + c * 14, 0, 7); ctx.fill();
    ctx.restore();
  });
}

// ---------- Welten ----------
export const WORLDS = {
  shadow: {
    name: 'Schattenreich', icon: '🌑',
    page: ['#05020c', '#1a0b2e', '#3d1a5c'], frame: ['#b46bff', '#ff5cf0', '#6f4bff'], board: 'rgba(5,0,15,0.65)',
    floor(ctx, px, py, s, x, y, t) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#1c1426', '#120c1a']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.08); ctx.fill();
      // Nebelschleier
      const fog = 0.06 + 0.05 * Math.sin(t / 1500 + x * 0.8 + y * 0.6);
      ctx.fillStyle = `rgba(180,140,255,${fog})`;
      ctx.beginPath(); ctx.ellipse(px + s / 2, py + s * 0.6, s * 0.45, s * 0.2, 0, 0, 7); ctx.fill();
      if (hash(x, y) > 0.8) { ctx.strokeStyle = 'rgba(120,90,160,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + s * 0.2, py + s * 0.3); ctx.lineTo(px + s * 0.5, py + s * 0.45); ctx.lineTo(px + s * 0.45, py + s * 0.8); ctx.stroke(); }
    },
    wall(ctx, px, py, s, x, y, t) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#3a3048', '#1d1726']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.06); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2;
      ctx.strokeRect(px + 3, py + 3, s - 6, s * 0.45); ctx.strokeRect(px + 3, py + s * 0.5, s - 6, s * 0.45);
      if (hash(x, y, 3) > 0.6) { // leuchtende Rune
        const glow = 0.45 + 0.4 * Math.sin(t / 800 + x + y * 3);
        ctx.strokeStyle = `rgba(200,120,255,${glow})`; ctx.lineWidth = 1.6; ctx.shadowColor = '#b46bff'; ctx.shadowBlur = 8;
        const cx = px + s / 2, cy = py + s / 2, k = s * 0.16;
        ctx.beginPath(); ctx.moveTo(cx, cy - k); ctx.lineTo(cx, cy + k); ctx.moveTo(cx - k * 0.7, cy - k * 0.3); ctx.lineTo(cx, cy); ctx.lineTo(cx + k * 0.7, cy - k * 0.3); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    },
    fx(ctx, w, h, t) { wisps(ctx, w, h, t); },
  },
  reef: {
    name: 'Korallenriff', icon: '🐠',
    page: ['#021b2e', '#04506b', '#14a3b8'], frame: ['#ff7a8f', '#4ff0ff', '#ffd166'], board: 'rgba(0,30,50,0.55)',
    floor(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#0f4d63', '#0a3a4d']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.14); ctx.fill();
      ctx.fillStyle = 'rgba(230,210,160,0.18)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(px + s * hash(x, y, k), py + s * (0.7 + hash(y, x, k) * 0.25), 1.4, 0, 7); ctx.fill(); }
    },
    wall(ctx, px, py, s, x, y, t) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#3c4f6b', '#25334a']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.22); ctx.fill();
      // Korallen: Fächer oder Äste in Riffarben
      const col = ['#ff7a8f', '#ffb347', '#c792ea', '#ff5ce1'][Math.floor(hash(x, y) * 4)];
      const sway = Math.sin(t / 1200 + x * 0.7 + y) * 2;
      ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.06;
      const bx = px + s * (0.3 + hash(x, y, 2) * 0.4), by = py + s * 0.88;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + k * s * 0.08 + sway, by - s * 0.3, bx + k * s * 0.14 + sway, by - s * (0.5 + hash(x, y, k + 5) * 0.2));
        ctx.stroke();
      }
      if (hash(x, y, 8) > 0.7) { ctx.fillStyle = '#ffe6f0'; ctx.beginPath(); ctx.arc(px + s * 0.2, py + s * 0.25, s * 0.06, 0, 7); ctx.fill(); }
    },
    fx(ctx, w, h, t) { caustics(ctx, w, h, t); bubbles(ctx, w, h, t); },
  },
  beach: {
    name: 'Sommerstrand', icon: '🏖️',
    page: ['#2fb5e8', '#7fd8f0', '#f4d58d'], frame: ['#ffd166', '#4ff0ff', '#ff9f5a'], board: 'rgba(20,70,90,0.45)',
    floor(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#b8894c', '#a87a40']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.12); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.18)';
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(px + hash(x, y, k) * s, py + hash(y, x, k) * s, 1 + hash(x, k, y) * 1.2, 0, 7); ctx.fill(); }
      // Wellenlinie im Sand
      ctx.strokeStyle = 'rgba(255,230,180,0.18)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); const wy = py + s * (0.3 + hash(x, y, 9) * 0.4);
      ctx.moveTo(px + s * 0.1, wy); ctx.quadraticCurveTo(px + s * 0.5, wy - 5, px + s * 0.9, wy); ctx.stroke();
    },
    wall(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#e9b97a', '#b9773d']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.14); ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,30,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px + 3, py + s * 0.5); ctx.lineTo(px + s - 3, py + s * 0.5);
      ctx.moveTo(px + s * (hash(x, y) > 0.5 ? 0.35 : 0.65), py + 3); ctx.lineTo(px + s * (hash(x, y) > 0.5 ? 0.35 : 0.65), py + s * 0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px + s * 0.12, py + 3, s * 0.76, 2);
      if (hash(x, y, 4) > 0.8) { // Muschel
        const cx = px + s * 0.7, cy = py + s * 0.75;
        ctx.fillStyle = '#ffe3d1'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.1, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#d99a7a'; ctx.lineWidth = 1;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + k * s * 0.04, cy - s * 0.09); ctx.stroke(); }
      }
    },
    fx(ctx, w, h, t) { sparkles(ctx, w, h, t); },
  },
  cherry: {
    name: 'Kirschblüte', icon: '🌸',
    page: ['#3a1d4a', '#7a3d6e', '#f2a7c3'], frame: ['#ffb7d5', '#ffffff', '#ff7ab6'], board: 'rgba(40,20,40,0.5)',
    floor(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#30503a', '#26402f']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.12); ctx.fill();
      // Trittstein
      ctx.fillStyle = 'rgba(200,190,180,0.35)';
      ctx.beginPath(); ctx.ellipse(px + s * (0.4 + hash(x, y) * 0.2), py + s * (0.4 + hash(y, x) * 0.2), s * 0.22, s * 0.16, hash(x, y, 2) * 3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,183,213,0.55)';
      if (hash(x, y, 5) > 0.55) { ctx.beginPath(); ctx.ellipse(px + s * hash(x, y, 6), py + s * hash(x, y, 7), 3, 1.6, 1, 0, 7); ctx.fill(); }
    },
    wall(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#6b3f35', '#4a2a24']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.12); ctx.fill();
      ctx.strokeStyle = 'rgba(30,15,10,0.45)'; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(px + s * k / 4, py + 3); ctx.lineTo(px + s * k / 4 + (hash(x, y, k) - 0.5) * 4, py + s - 3); ctx.stroke(); }
      // Blütenbüschel oben
      for (let k = 0; k < 4; k++) {
        const bx = px + s * (0.15 + hash(x, y, k + 10) * 0.7), by = py + s * (0.08 + hash(x, y, k + 20) * 0.3);
        ctx.fillStyle = k % 2 ? '#ffb7d5' : '#ffd6e7';
        for (let p = 0; p < 5; p++) { const a = (p * Math.PI * 2) / 5; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 3, by + Math.sin(a) * 3, 2.6, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#ff7ab6'; ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, 7); ctx.fill();
      }
    },
    fx(ctx, w, h, t) { petals(ctx, w, h, t); },
  },
  jungle: {
    name: 'Dschungel', icon: '🌴',
    page: ['#06240f', '#0f4a26', '#2f7a3a'], frame: ['#7bd65a', '#ffe14f', '#2fbf71'], board: 'rgba(5,25,10,0.55)',
    floor(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#2c3a1e', '#1f2c16']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.12); ctx.fill();
      for (let k = 0; k < 3; k++) {
        if (hash(x, y, k) < 0.45) continue;
        const lx = px + s * hash(x, y, k + 3), ly = py + s * hash(x, y, k + 6);
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(hash(x, y, k + 9) * 6);
        ctx.fillStyle = 'rgba(90,160,60,0.35)';
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.quadraticCurveTo(4, 0, 0, 5); ctx.quadraticCurveTo(-4, 0, 0, -5); ctx.fill();
        ctx.restore();
      }
    },
    wall(ctx, px, py, s, x, y, t) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#5b6b4a', '#36422c']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.16); ctx.fill();
      // Moospolster
      ctx.fillStyle = 'rgba(80,170,60,0.65)';
      ctx.beginPath(); ctx.ellipse(px + s * 0.5, py + s * 0.12, s * 0.42, s * 0.14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(120,210,80,0.5)';
      ctx.beginPath(); ctx.ellipse(px + s * (0.3 + hash(x, y) * 0.4), py + s * 0.16, s * 0.18, s * 0.08, 0, 0, 7); ctx.fill();
      // Liane mit Blättern
      if (hash(x, y, 3) > 0.45) {
        const vx = px + s * (0.25 + hash(x, y, 4) * 0.5);
        const sway = Math.sin(t / 1400 + x + y) * 3;
        ctx.strokeStyle = '#2f7a2f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(vx, py + s * 0.15);
        ctx.quadraticCurveTo(vx + sway + 6, py + s * 0.6, vx + sway, py + s * 0.95); ctx.stroke();
        ctx.fillStyle = '#5cc24a';
        for (let k = 1; k <= 3; k++) {
          const ly = py + s * (0.25 + k * 0.2), lx = vx + sway * (k / 3) + (k % 2 ? 5 : -5);
          ctx.beginPath(); ctx.ellipse(lx, ly, 4.5, 2.2, k % 2 ? 0.6 : -0.6, 0, 7); ctx.fill();
        }
      }
    },
    fx(ctx, w, h, t) { leaves(ctx, w, h, t); fireflies(ctx, w, h, t, '#d8ff6a', 14); },
  },
  temple: {
    name: 'Wüstentempel', icon: '🏜️',
    page: ['#3b1d0b', '#a2531c', '#f0b45a'], frame: ['#ffd166', '#ff8a3d', '#fff0b3'], board: 'rgba(40,20,5,0.5)',
    floor(ctx, px, py, s) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#5a4123', '#46321b']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.06); ctx.fill();
      ctx.strokeStyle = 'rgba(200,150,80,0.22)'; ctx.lineWidth = 1;
      ctx.strokeRect(px + s * 0.12, py + s * 0.12, s * 0.76, s * 0.76);
    },
    wall(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#c9974f', '#8a5f2a']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.06); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,10,0.6)'; ctx.lineWidth = 1.6;
      const g = Math.floor(hash(x, y) * 4); const cx = px + s / 2, cy = py + s / 2, k = s * 0.18;
      ctx.beginPath();
      if (g === 0) { ctx.arc(cx, cy - k * 0.3, k * 0.6, 0, 7); ctx.moveTo(cx, cy + k * 0.3); ctx.lineTo(cx, cy + k * 1.3); ctx.moveTo(cx - k * 0.6, cy + k * 0.7); ctx.lineTo(cx + k * 0.6, cy + k * 0.7); }
      else if (g === 1) { ctx.ellipse(cx, cy, k * 1.1, k * 0.6, 0, 0, 7); ctx.moveTo(cx + k * 0.3, cy); ctx.arc(cx, cy, k * 0.3, 0, 7); }
      else if (g === 2) { ctx.moveTo(cx - k, cy + k); ctx.lineTo(cx, cy - k); ctx.lineTo(cx + k, cy + k); ctx.closePath(); }
      else { for (let i = -1; i <= 1; i++) { ctx.moveTo(cx + i * k * 0.7, cy - k); ctx.lineTo(cx + i * k * 0.7, cy + k); } }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,190,0.3)'; ctx.fillRect(px + 2, py + 2, s - 4, 2);
    },
    fx(ctx, w, h, t) { rising(ctx, w, h, t, ['#ffe0a0', '#f0b45a'], 22, 8); },
  },
  night: {
    name: 'Nachtwald', icon: '🌙',
    page: ['#020814', '#0b1d3a', '#1d3b4a'], frame: ['#d8ff6a', '#6fd3e8', '#a07bff'], board: 'rgba(0,5,15,0.6)',
    floor(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#13241f', '#0c1915']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.12); ctx.fill();
      if (hash(x, y) > 0.7) { ctx.fillStyle = 'rgba(120,200,255,0.25)'; ctx.beginPath(); ctx.arc(px + s * hash(x, y, 2), py + s * hash(x, y, 3), 2, 0, 7); ctx.fill(); }
    },
    wall(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py, ['#3a2a1f', '#5a4030', '#3a2a1f']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,5,0.6)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) { const bx = px + s * (0.2 + k * 0.3 + (hash(x, y, k) - 0.5) * 0.1); ctx.beginPath(); ctx.moveTo(bx, py + 4); ctx.bezierCurveTo(bx + 4, py + s * 0.4, bx - 4, py + s * 0.6, bx, py + s - 4); ctx.stroke(); }
      if (hash(x, y, 7) > 0.75) { ctx.fillStyle = '#9ad1ff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(px + s * 0.7, py + s * 0.35, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    },
    fx(ctx, w, h, t) { fireflies(ctx, w, h, t, '#f4ff8a', 30); },
  },
  volcano: {
    name: 'Vulkanschmiede', icon: '🌋',
    page: ['#120303', '#4a0c06', '#b8320f'], frame: ['#ff6a1a', '#ffd166', '#ff2a2a'], board: 'rgba(15,3,2,0.6)',
    floor(ctx, px, py, s, x, y, t) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#2a2224', '#1b1517']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.08); ctx.fill();
      if (hash(x, y) > 0.5) {
        const glow = 0.45 + 0.35 * Math.sin(t / 700 + x * 1.7 + y);
        ctx.strokeStyle = `rgba(255,${100 + Math.round(60 * glow)},30,${glow})`; ctx.lineWidth = 1.6;
        ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(px + s * 0.15, py + s * hash(x, y, 2)); ctx.lineTo(px + s * 0.5, py + s * hash(x, y, 3)); ctx.lineTo(px + s * 0.85, py + s * hash(x, y, 4)); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    },
    wall(ctx, px, py, s, x, y, t) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#3b3236', '#151012']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.1); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(px + s * 0.2, py + s * 0.15); ctx.lineTo(px + s * 0.55, py + s * 0.1); ctx.lineTo(px + s * 0.35, py + s * 0.45); ctx.closePath(); ctx.fill();
      const glow = 0.3 + 0.25 * Math.sin(t / 900 + x + y * 2);
      ctx.fillStyle = `rgba(255,90,20,${glow})`; ctx.fillRect(px + 2, py + s - 5, s - 4, 3);
    },
    fx(ctx, w, h, t) { rising(ctx, w, h, t, ['#ff6a1a', '#ffd166', '#ff2a2a'], 34, 30); },
  },
  aurora: {
    name: 'Polarlicht', icon: '❄️',
    page: ['#020a1e', '#0b2a4a', '#2c6b8a'], frame: ['#4fffb0', '#4ff0ff', '#a07bff'], board: 'rgba(5,15,35,0.55)',
    floor(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px + s, py + s, ['#3b5a7a', '#2c4664']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(px + s * hash(x, y, k), py + s * hash(y, x, k), 1.3, 0, 7); ctx.fill(); }
    },
    wall(ctx, px, py, s, x, y) {
      ctx.fillStyle = grad(ctx, px, py, px, py + s, ['#6a7f99', '#3c4d63']);
      rr(ctx, px + 1, py + 1, s - 2, s - 2, s * 0.14); ctx.fill();
      // Schneehaube
      ctx.fillStyle = '#f2f8ff';
      ctx.beginPath(); ctx.moveTo(px + 2, py + s * 0.28);
      for (let k = 0; k <= 4; k++) ctx.quadraticCurveTo(px + s * (k / 4 - 0.12), py + s * (0.06 + hash(x, y, k) * 0.08), px + s * (k / 4), py + s * (0.22 + hash(x, y, k + 5) * 0.1));
      ctx.lineTo(px + s - 2, py + 3); ctx.lineTo(px + 2, py + 3); ctx.closePath(); ctx.fill();
      if (hash(x, y, 9) > 0.6) { ctx.fillStyle = 'rgba(200,240,255,0.8)'; ctx.beginPath(); ctx.moveTo(px + s * 0.4, py + s * 0.25); ctx.lineTo(px + s * 0.45, py + s * 0.55); ctx.lineTo(px + s * 0.5, py + s * 0.25); ctx.fill(); }
    },
    fx(ctx, w, h, t) { aurora(ctx, w, h, t); snow(ctx, w, h, t); },
  },
};

// Kapitel → Welt (Reihenfolge = Reise durch die Orte)
// Burgverlies nutzt im alten Brett-Renderer die Tempelwände; im Abenteuer hat es eigene Farben (castle).
WORLDS.castle = { ...WORLDS.temple, name: 'Burgverlies', icon: '🏰', page: ['#0e0c10', '#2a2630', '#5a5468'], frame: ['#ffd166', '#c0c0c8', '#8a8a98'] };
// Nebelmoor nutzt im alten Brett-Renderer die Nachtwald-Optik; im Abenteuer hat es eigene Farben (moor).
WORLDS.moor = { ...WORLDS.night, name: 'Nebelmoor', icon: '🌫️', page: ['#060a06', '#1e2a1c', '#4a5a44'], frame: ['#c8d68a', '#9fd8b8', '#e8e0c0'] };
export const CHAPTER_WORLD = { c10: 'castle', c1: 'beach', c2: 'cherry', c3: 'jungle', c11: 'moor', c4: 'temple', c5: 'night', c6: 'volcano', c7: 'aurora', c8: 'reef', c9: 'shadow' };
export const worldForChapter = (chapterId) => WORLDS[CHAPTER_WORLD[chapterId]] || null;
