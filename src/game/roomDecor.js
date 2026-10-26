// Raumausstattung: macht aus dem nackten Rätselraster einen bewohnten Raum. Alles ist rein optisch –
// kein Feld wird blockiert oder freigegeben, die geprüften Rätsel bleiben 1:1 lösbar.
// • hohe Rückwand mit Fenstern (Lichtschacht), Fackeln, Bildern, Regalen, Wimpeln, Efeu, Masken
// • kleine Innenwand-Gruppen werden zu Möbeln (Bücherregal, Theke, Fass, Topfpflanze, Truhe, Statue …)
// • Teppich je Welt, Streugut (Blätter, Blüten, Muscheln, Schnee, Glutrisse), Grasbüschel, Spinnweben
// • Kerzen auf den Seitenwänden, Außenwelt rund um den Raum (Bäume, Palmen, Kakteen, Korallen …)
// • schwebende Teilchen je Welt (Staub, Blütenblätter, Glühwürmchen, Glut, Schnee, Blasen, Falter)
const T = 16;
const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/** Rand um den Raum in Feldern (Außenwelt). Oben ist Platz für die hohe Rückwand. */
export const MARGIN = { x: 6, top: 6, bottom: 5 };
const BACK = 2; // Felder Rückwand über Zeile 0

// Ausstattung je Welt: Außenboden, Außen-Requisiten (Art, Häufigkeit), Streugut, Teppich, Lichtfarbe der
// Fackeln, Himmel im Fenster, Wanddeko, schwebende Teilchen und Ersatz-Möbel.
export const DECOR = {
  default: { ground: ['#3f6b34', '#4a7a3c', '#2f5528'], props: [['tree', 0.16], ['bush', 0.12], ['rock', 0.07], ['flowers', 0.2]], scatter: 'leaves', rug: ['rug', '#7a2e2e', '#c9963f'], torch: '#ffb060', sky: ['#7fb8e8', '#d8eefa'], wall: ['window', 'painting', 'shelf', 'banner'], motes: 'dust', furn: {} },
  beach: { ground: ['#e8cf96', '#f2dcaa', '#cfb27a'], props: [['palm', 0.12], ['shell', 0.18], ['rock', 0.06], ['grass', 0.16]], scatter: 'shells', rug: ['stripes', '#e85d5d', '#fff1d6'], torch: '#ffc070', sky: ['#58c4f0', '#c9f0ff'], wall: ['window', 'window', 'painting', 'shelf'], motes: 'butterflies', furn: { bigplant: 'palm' } },
  cherry: { ground: ['#4d7a3a', '#5a8a44', '#3a6230'], props: [['cherry', 0.15], ['bush', 0.1], ['stonelantern', 0.05], ['flowers', 0.22]], scatter: 'petals', rug: ['rug', '#8c3a5c', '#f2b7cf'], torch: '#ffb878', sky: ['#f7b7d2', '#ffe8f1'], wall: ['window', 'painting', 'banner', 'ivy'], ivy: ['#4f8a3a', '#ff9cc8'], motes: 'petals', furn: { bigplant: 'cherry' } },
  jungle: { ground: ['#2f5a24', '#3a6a2c', '#244a1c'], props: [['jtree', 0.17], ['fern', 0.16], ['flowers', 0.12], ['rock', 0.05]], scatter: 'leaves', leaf: ['#5aa047', '#3f7d34'], rug: ['mat', '#8a6b3a', '#c9a35a'], torch: '#ffb060', sky: ['#9fd8a0', '#e0f7d0'], wall: ['ivy', 'window', 'mask', 'ivy', 'shelf'], ivy: ['#3f8a2e', '#ffd166'], motes: 'fireflies', furn: { statue: 'idol', bigplant: 'fern' } },
  night: { ground: ['#1f3a34', '#284840', '#17302a'], props: [['pine', 0.15], ['mushroom', 0.09], ['rock', 0.07], ['grass', 0.14]], scatter: 'mushrooms', rug: ['moss', '#2d4a3e', '#6fa58a'], torch: '#ffcf8a', sky: ['#14204a', '#34467e'], moon: true, wall: ['window', 'ivy', 'painting', 'shelf'], ivy: ['#2f6a4a', '#9ad1ff'], motes: 'fireflies', furn: { bigplant: 'pine' } },
  volcano: { ground: ['#2a2224', '#3a3034', '#1a1416'], props: [['spire', 0.12], ['deadtree', 0.07], ['lava', 0.1], ['rock', 0.08]], scatter: 'cracks', rug: ['grate', '#231c1e', '#5a4a4e'], torch: '#ff8a3a', sky: ['#ff6a1a', '#ffcf6b'], wall: ['shelf', 'weapons', 'banner', 'window'], motes: 'embers', furn: { bigplant: 'spire', statue: 'anvil' } },
  temple: { ground: ['#d4ab6c', '#e0bb80', '#b89058'], props: [['cactus', 0.1], ['rock', 0.08], ['ruin', 0.06], ['grass', 0.06]], scatter: 'sand', rug: ['rug', '#7a4a1e', '#ffd166'], torch: '#ffb060', sky: ['#ffb070', '#ffe6b0'], wall: ['banner', 'painting', 'shelf', 'mask'], motes: 'dust', furn: { barrel: 'urn', bigplant: 'cactus' } },
  aurora: { ground: ['#dde8f4', '#eef4fb', '#c3d2e3'], props: [['snowpine', 0.18], ['icerock', 0.08], ['rock', 0.04]], scatter: 'snow', rug: ['fur', '#e8e4dc', '#b9b0a2'], torch: '#ffc890', sky: ['#0d2a4a', '#4fffb0'], aurora: true, wall: ['window', 'shelf', 'painting', 'banner'], motes: 'snow', furn: { bigplant: 'snowpine', statue: 'icerock' } },
  reef: { ground: ['#16566c', '#1d6880', '#0f4456'], props: [['coral', 0.13], ['seaweed', 0.16], ['rock', 0.06], ['shell', 0.06]], scatter: 'shells', rug: ['sandpatch', '#c9b07a', '#e8d6a8'], torch: '#7ff0ff', sky: ['#0f5a78', '#5fd0e8'], porthole: true, wall: ['window', 'shelf', 'ivy', 'window'], ivy: ['#2f8a6a', '#ff7a8f'], motes: 'bubbles', furn: { barrel: 'coral', bigplant: 'seaweed' } },
  castle: { ground: ['#3a5a34', '#466a3c', '#2c4a28'], props: [['pine', 0.1], ['rock', 0.12], ['ruin', 0.06], ['grass', 0.1]], scatter: 'bones', rug: ['rug', '#5a1e22', '#c9963f'], torch: '#ffa040', sky: ['#1a2440', '#4a5a88'], moon: true, wall: ['banner', 'weapons', 'shelf', 'banner'], motes: 'dust', furn: { bigplant: 'statue', barrel: 'barrel' } },
  shadow: { ground: ['#2a2236', '#332a42', '#1f1a28'], props: [['deadtree', 0.1], ['crystal', 0.08], ['rock', 0.07]], scatter: 'bones', rug: ['rune', '#2a1f38', '#b46bff'], torch: '#c58bff', sky: ['#1a0f2a', '#5a3a8a'], moon: true, wall: ['banner', 'painting', 'shelf', 'mask'], motes: 'motes', furn: { bigplant: 'crystal' } },
  // Nebelmoor: torfiger Boden, knorrige Bäume, Schilf und Pilze, Nebelschwaden mit Irrlichtern
  moor: { ground: ['#3a4a2c', '#455634', '#2c3a22'], props: [['deadtree', 0.09], ['grass', 0.22], ['mushroom', 0.08], ['rock', 0.05]], scatter: 'mushrooms', rug: ['moss', '#3a4a2c', '#8aa86a'], torch: '#ffd08a', sky: ['#5a6a66', '#b8c4b4'], wall: ['window', 'ivy', 'shelf', 'painting'], ivy: ['#4f6a3a', '#d8e6a0'], motes: 'fog', furn: { bigplant: 'deadtree' } },
};

// ---------- Möbel aus kleinen Innenwand-Gruppen ----------
const LONG = ['bookshelf', 'counter', 'planter'];
const SINGLE = ['barrel', 'bigplant', 'chest', 'statue', 'crates', 'pillar'];

function planFurniture(level, cfg) {
  const { w, h } = level;
  const isInner = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && level.cells[y * w + x].type === 'wall';
  const seen = new Set();
  const plan = new Map();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (seen.has(i) || !isInner(x, y)) continue;
    // Gruppe einsammeln; Gruppen, die die Außenwand berühren, bleiben Mauer
    const comp = []; const stack = [[x, y]]; seen.add(i); let touches = false;
    while (stack.length) {
      const [cx, cy] = stack.pop(); comp.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, j = ny * w + nx;
        if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) { if (level.cells[j]?.type === 'wall') touches = true; continue; }
        if (!seen.has(j) && isInner(nx, ny)) { seen.add(j); stack.push([nx, ny]); }
      }
    }
    if (touches || comp.length > 6) continue;
    const inComp = new Set(comp.map(([a, b]) => b * w + a));
    const longKind = LONG[Math.floor(hash(x, y, 51) * LONG.length)];
    for (const [cx, cy] of comp) {
      const l = inComp.has(cy * w + cx - 1), r = inComp.has(cy * w + cx + 1);
      let kind, seg = 's';
      if (l || r) { kind = longKind; seg = l && r ? 'm' : l ? 'r' : 'l'; }
      else { kind = SINGLE[Math.floor(hash(cx, cy, 53) * SINGLE.length)]; kind = cfg.furn[kind] || kind; }
      plan.set(cy * w + cx, { kind, seg });
    }
  }
  return plan;
}

// ---------- Außen-Requisiten (Fußpunkt = Feld px,py) ----------
function shadow(p, px, py, w = 14) { p.r(px + 8 - w / 2, py + 13, w, 3, 'rgba(0,0,0,0.22)'); }
const PROPS = {
  tree(p, px, py, leaf = ['#4a8a3a', '#2f6428', '#6cb455'], trunk = '#5a3a22') {
    shadow(p, px, py, 18);
    p.r(px + 6, py + 4, 4, 11, trunk); p.r(px + 6, py + 4, 1, 11, '#3a2414');
    p.r(px - 1, py - 10, 18, 13, '#1f3a18'); p.r(px + 1, py - 13, 14, 2, '#1f3a18');
    p.r(px, py - 9, 16, 11, leaf[0]); p.r(px + 2, py - 12, 12, 3, leaf[0]);
    p.r(px, py - 1, 16, 3, leaf[1]); p.r(px + 3, py - 11, 5, 3, leaf[2]); p.r(px + 2, py - 8, 3, 2, leaf[2]);
    p.r(px + 11, py - 6, 2, 2, leaf[2]);
  },
  cherry(p, px, py) { PROPS.tree(p, px, py, ['#f2a7c8', '#c9708f', '#ffd6e8'], '#4a2c22'); p.r(px + 4, py - 5, 1, 1, '#ffffff'); p.r(px + 10, py - 9, 1, 1, '#ffffff'); },
  jtree(p, px, py) {
    PROPS.tree(p, px, py, ['#2f7a2a', '#1d5a1c', '#5ab845'], '#4a3018');
    for (let k = 0; k < 3; k++) { const vx = px + 2 + k * 5, len = 6 + Math.floor(hash(px, py, k) * 7); p.r(vx, py + 1, 1, len, '#3f8a2e'); p.r(vx + 1, py + len - 1, 1, 1, '#5ab845'); }
  },
  pine(p, px, py, snow = false) {
    shadow(p, px, py, 14);
    p.r(px + 7, py + 9, 2, 6, '#3a2414');
    const g = ['#1f4a3a', '#2a5e48', '#173a2e'];
    p.r(px + 6, py - 12, 4, 4, g[0]); p.r(px + 4, py - 8, 8, 5, g[0]); p.r(px + 2, py - 3, 12, 6, g[0]); p.r(px, py + 3, 16, 6, g[0]);
    p.r(px + 4, py - 4, 8, 1, g[2]); p.r(px + 2, py + 2, 12, 1, g[2]); p.r(px, py + 8, 16, 1, g[2]);
    p.r(px + 6, py - 11, 1, 2, g[1]); p.r(px + 4, py - 7, 2, 1, g[1]); p.r(px + 3, py - 2, 2, 1, g[1]);
    if (snow) { p.r(px + 6, py - 12, 4, 1, '#ffffff'); p.r(px + 4, py - 8, 8, 1, '#f2f7ff'); p.r(px + 2, py - 3, 12, 1, '#f2f7ff'); p.r(px, py + 3, 16, 1, '#ffffff'); }
  },
  snowpine(p, px, py) { PROPS.pine(p, px, py, true); },
  palm(p, px, py) {
    shadow(p, px, py, 16);
    for (let k = 0; k < 7; k++) { const tx = px + 7 + Math.round(Math.sin(k / 3) * 3); p.r(tx, py + 13 - k * 3, 3, 3, k % 2 ? '#8a6438' : '#a57a48'); }
    const cx = px + 10, cy = py - 8;
    for (const [dx, dy] of [[-9, 2], [-6, -3], [0, -5], [6, -3], [9, 2], [-4, 4], [5, 4]]) {
      const n = 4;
      for (let k = 1; k <= n; k++) p.r(cx + Math.round(dx * k / n), cy + Math.round(dy * k / n) + (k === n ? 1 : 0), 2, 2, k % 2 ? '#3f9a3a' : '#5ab845');
    }
    p.r(cx - 1, cy, 3, 3, '#6b4a22'); p.r(cx + 1, cy + 2, 2, 2, '#5a3a18');
  },
  bush(p, px, py, c = ['#3f7d34', '#2a5a24', '#6cb455']) {
    shadow(p, px, py, 14);
    p.r(px + 1, py + 6, 14, 9, '#1f3a18'); p.r(px + 2, py + 6, 12, 8, c[0]); p.r(px + 4, py + 4, 8, 2, c[0]);
    p.r(px + 2, py + 12, 12, 2, c[1]); p.r(px + 4, py + 6, 3, 2, c[2]);
    if (hash(px, py, 3) > 0.5) { p.r(px + 9, py + 8, 1, 1, '#e8475d'); p.r(px + 6, py + 10, 1, 1, '#e8475d'); }
  },
  fern(p, px, py) {
    for (let k = 0; k < 6; k++) { const a = -1.2 + k * 0.48; for (let s = 1; s < 7; s++) p.r(px + 8 + Math.round(Math.cos(a) * s * 1.2), py + 12 - Math.round(Math.abs(Math.sin(a)) * s * 1.1 + s * 0.6), 2, 1, s % 2 ? '#2f7a2a' : '#4fa83d'); }
  },
  rock(p, px, py) {
    shadow(p, px, py, 12);
    p.r(px + 3, py + 8, 10, 7, '#4a4a52'); p.r(px + 4, py + 7, 8, 7, '#7a7a84'); p.r(px + 5, py + 7, 4, 1, '#a0a0aa'); p.r(px + 4, py + 13, 8, 1, '#5a5a62');
  },
  flowers(p, px, py) {
    for (let k = 0; k < 4; k++) {
      const fx = px + 2 + Math.floor(hash(px, py, k) * 12), fy = py + 4 + Math.floor(hash(py, px, k) * 9);
      const col = ['#ff9cc8', '#fff6b0', '#ffffff', '#c9a7ff', '#ffb36b'][Math.floor(hash(px, k, py) * 5)];
      p.r(fx, fy + 1, 1, 2, '#2f6b2a'); p.r(fx - 1, fy, 3, 1, col); p.r(fx, fy - 1, 1, 3, col); p.r(fx, fy, 1, 1, '#ffd166');
    }
  },
  grass(p, px, py) { for (let k = 0; k < 3; k++) { const gx = px + 2 + Math.floor(hash(px, py, k) * 12), gy = py + 6 + Math.floor(hash(py, px, k) * 8); p.r(gx, gy, 1, 3, '#5a9a3a'); p.r(gx - 1, gy + 1, 1, 2, '#4a8a2e'); p.r(gx + 1, gy + 1, 1, 2, '#6cb455'); } },
  shell(p, px, py) {
    const sx = px + 4 + Math.floor(hash(px, py, 1) * 8), sy = py + 6 + Math.floor(hash(py, px, 1) * 6);
    if (hash(px, py, 2) > 0.5) { p.r(sx, sy, 4, 3, '#ffd6c0'); p.r(sx + 1, sy, 1, 3, '#e8a090'); p.r(sx + 3, sy, 1, 3, '#e8a090'); }
    else { p.r(sx + 1, sy, 1, 5, '#ff8a4a'); p.r(sx - 1, sy + 2, 5, 1, '#ff8a4a'); p.r(sx, sy + 3, 1, 1, '#ff8a4a'); p.r(sx + 2, sy + 3, 1, 1, '#ff8a4a'); }
  },
  stonelantern(p, px, py, glows) {
    shadow(p, px, py, 10);
    p.r(px + 6, py + 8, 4, 7, '#8a8a90'); p.r(px + 4, py + 2, 8, 6, '#9a9aa0'); p.r(px + 6, py + 4, 4, 3, '#ffcf6b'); p.r(px + 3, py, 10, 2, '#7a7a80'); p.r(px + 6, py - 1, 4, 1, '#7a7a80');
    glows?.push({ x: px + 8, y: py + 5, r: 18, c: '#ffcf6b', a: 0.5 });
  },
  mushroom(p, px, py, glows) {
    for (let k = 0; k < 3; k++) {
      const mx = px + 3 + Math.floor(hash(px, py, k) * 10), my = py + 6 + Math.floor(hash(py, px, k) * 7);
      p.r(mx, my, 1, 3, '#e8e8f0'); p.r(mx - 1, my - 1, 3, 1, '#4ff0d0'); p.r(mx, my - 2, 1, 1, '#9ffff0');
      glows?.push({ x: mx, y: my, r: 7, c: '#4ff0d0', a: 0.5 });
    }
  },
  spire(p, px, py, glows) {
    shadow(p, px, py, 12);
    p.r(px + 5, py - 4, 6, 19, '#2a2224'); p.r(px + 3, py + 4, 10, 11, '#2a2224'); p.r(px + 7, py - 7, 2, 3, '#3a3034');
    p.r(px + 6, py - 3, 1, 10, '#4a4044'); p.r(px + 8, py + 2, 1, 4, '#ff6a1a'); p.r(px + 9, py + 5, 1, 3, '#ffb040');
    glows?.push({ x: px + 8, y: py + 5, r: 8, c: '#ff6a1a', a: 0.45 });
  },
  lava(p, px, py, glows) {
    p.r(px + 2, py + 6, 12, 7, '#1a1416'); p.r(px + 3, py + 7, 10, 5, '#ff6a1a'); p.r(px + 5, py + 8, 4, 2, '#ffcf6b'); p.r(px + 10, py + 10, 2, 1, '#ffcf6b');
    glows?.push({ x: px + 8, y: py + 9, r: 16, c: '#ff6a1a', a: 0.55 });
  },
  deadtree(p, px, py) {
    shadow(p, px, py, 10);
    const c = '#2a2026';
    p.r(px + 7, py - 4, 2, 19, c); p.r(px + 3, py - 2, 4, 1, c); p.r(px + 2, py - 4, 1, 2, c); p.r(px + 9, py + 1, 4, 1, c); p.r(px + 12, py - 2, 1, 3, c); p.r(px + 5, py - 7, 1, 3, c); p.r(px + 6, py - 5, 1, 1, c);
  },
  cactus(p, px, py) {
    shadow(p, px, py, 10);
    p.r(px + 6, py - 4, 4, 19, '#3f8a3a'); p.r(px + 6, py - 4, 1, 19, '#2a6a28'); p.r(px + 7, py - 5, 2, 1, '#3f8a3a');
    p.r(px + 2, py + 2, 4, 2, '#3f8a3a'); p.r(px + 2, py - 2, 2, 4, '#3f8a3a'); p.r(px + 10, py + 5, 4, 2, '#3f8a3a'); p.r(px + 12, py + 1, 2, 4, '#3f8a3a');
    p.r(px + 7, py - 6, 1, 1, '#ff9cc8');
  },
  ruin(p, px, py) {
    shadow(p, px, py, 12);
    p.r(px + 4, py + 1, 8, 14, '#c9a066'); p.r(px + 4, py + 1, 2, 14, '#e0bb80'); p.r(px + 10, py + 1, 2, 14, '#9c7a4a');
    p.r(px + 3, py + 13, 10, 2, '#9c7a4a'); p.r(px + 4, py, 3, 1, '#c9a066'); p.r(px + 8, py - 1, 4, 2, '#c9a066'); p.r(px + 13, py + 12, 3, 3, '#b89058');
  },
  icerock(p, px, py) {
    shadow(p, px, py, 12);
    p.r(px + 3, py + 5, 10, 10, '#7fb8e0'); p.r(px + 5, py + 2, 6, 3, '#a8d8f5'); p.r(px + 5, py + 5, 2, 8, '#e8f8ff'); p.r(px + 10, py + 8, 2, 6, '#5a90c0');
  },
  coral(p, px, py) {
    const c = hash(px, py, 4) > 0.5 ? ['#ff7a8f', '#ffb0bc'] : ['#ffa040', '#ffd08a'];
    p.r(px + 7, py + 6, 2, 9, c[0]); p.r(px + 4, py + 3, 2, 7, c[0]); p.r(px + 4, py + 9, 4, 2, c[0]); p.r(px + 10, py + 1, 2, 8, c[0]); p.r(px + 8, py + 8, 3, 2, c[0]);
    p.r(px + 4, py + 2, 2, 1, c[1]); p.r(px + 10, py, 2, 1, c[1]); p.r(px + 7, py + 5, 2, 1, c[1]);
  },
  seaweed(p, px, py) {
    for (let k = 0; k < 3; k++) { const sx = px + 3 + k * 4; for (let s = 0; s < 12; s++) p.r(sx + Math.round(Math.sin(s / 2 + k) * 1.5), py + 14 - s, 2, 1, s % 3 ? '#2f8a5a' : '#4fb87a'); }
  },
  crystal(p, px, py, glows) {
    shadow(p, px, py, 10);
    p.r(px + 6, py - 2, 4, 16, '#7a3fc0'); p.r(px + 7, py - 4, 2, 2, '#b46bff'); p.r(px + 6, py - 1, 1, 14, '#d0a0ff');
    p.r(px + 2, py + 6, 3, 8, '#6a2fa8'); p.r(px + 3, py + 5, 1, 1, '#b46bff'); p.r(px + 11, py + 4, 3, 10, '#6a2fa8'); p.r(px + 12, py + 3, 1, 1, '#b46bff');
    glows?.push({ x: px + 8, y: py + 4, r: 14, c: '#b46bff', a: 0.5 });
  },
};

// ---------- Möbel (Feld px,py; dürfen bis 8 px ins Feld darüber ragen) ----------
const FURN = {
  bookshelf(p, px, py, seg) {
    p.r(px, py - 8, T, 22, '#4a2f1c'); p.r(px, py - 8, T, 2, '#7a5233');
    if (seg === 'l' || seg === 's') p.r(px, py - 8, 2, 22, '#3a2414');
    if (seg === 'r' || seg === 's') p.r(px + T - 2, py - 8, 2, 22, '#3a2414');
    for (const sy of [py - 6, py + 2]) {
      let bx = px + (seg === 'l' || seg === 's' ? 2 : 0);
      const end = px + T - (seg === 'r' || seg === 's' ? 2 : 0);
      let k = 0;
      while (bx < end - 1) {
        const bw = 1 + Math.floor(hash(bx, sy, 1) * 2), bh = 5 + Math.floor(hash(bx, sy, 2) * 3);
        p.r(bx, sy + 7 - bh, bw, bh, ['#a83a3a', '#3a6aa8', '#4a8a3a', '#c9963f', '#7a3fa0', '#d8c8a8'][Math.floor(hash(bx, sy, k++) * 6)]);
        bx += bw + (hash(bx, sy, 5) > 0.8 ? 2 : 0);
      }
      p.r(px, sy + 7, T, 1, '#2a1a10');
    }
    p.r(px, py + 13, T, 1, 'rgba(0,0,0,0.4)');
  },
  counter(p, px, py, seg, out) {
    p.r(px, py + 2, T, 12, '#5a3e26'); p.r(px, py - 2, T, 5, '#9b6a3e'); p.r(px, py - 2, T, 1, '#c99766'); p.r(px, py + 3, T, 1, '#3a2414');
    if (seg === 'l' || seg === 's') p.r(px, py - 2, 1, 16, '#3a2414');
    if (seg === 'r' || seg === 's') p.r(px + T - 1, py - 2, 1, 16, '#3a2414');
    p.r(px + 3, py + 6, 10, 1, '#4a3020'); p.r(px + 7, py + 7, 2, 1, '#c9963f');
    const it = hash(px, py, 9);
    if (it > 0.66) { p.r(px + 6, py - 6, 3, 5, '#efe6d0'); out.flames.push({ x: px + 7, y: py - 7, s: 0.7 }); out.lights.push({ x: px / T + 0.5, y: py / T + 0.5, level: 7, color: out.torch, i: 0.7 }); }
    else if (it > 0.33) { p.r(px + 4, py - 5, 4, 4, '#7fb8a8'); p.r(px + 5, py - 6, 2, 1, '#5a3a22'); p.r(px + 9, py - 4, 3, 3, '#c94f4f'); }
    else { p.r(px + 3, py - 3, 9, 1, '#e8e0d0'); p.r(px + 5, py - 4, 4, 1, '#d8a050'); }
  },
  planter(p, px, py, seg) {
    p.r(px, py + 3, T, 11, '#6b4426'); p.r(px, py + 3, T, 1, '#9b6a3e'); p.r(px, py + 8, T, 1, '#4a2e18');
    for (let k = 0; k < 4; k++) { const lx = px + 1 + k * 4; p.r(lx, py - 3 + (k % 2) * 2, 3, 7, '#3f7d34'); p.r(lx + 1, py - 4 + (k % 2) * 2, 1, 2, '#6cb455'); }
    if (hash(px, py, 7) > 0.5) { p.r(px + 5, py - 5, 2, 2, '#ff9cc8'); p.r(px + 11, py - 3, 2, 2, '#fff6b0'); }
  },
  barrel(p, px, py) {
    p.r(px + 3, py + 13, 10, 2, 'rgba(0,0,0,0.3)');
    p.r(px + 3, py - 2, 10, 15, '#7a4f2c'); p.r(px + 2, py + 1, 12, 9, '#7a4f2c'); p.r(px + 4, py - 3, 8, 2, '#9b6a3e');
    p.r(px + 2, py + 1, 12, 1, '#3a2a1c'); p.r(px + 2, py + 9, 12, 1, '#3a2a1c'); p.r(px + 5, py - 2, 1, 15, '#9b6a3e'); p.r(px + 11, py - 2, 1, 15, '#5a3a22');
  },
  urn(p, px, py) {
    p.r(px + 3, py + 13, 10, 2, 'rgba(0,0,0,0.3)');
    p.r(px + 4, py + 1, 8, 12, '#b0623a'); p.r(px + 3, py + 3, 10, 7, '#b0623a'); p.r(px + 5, py - 2, 6, 3, '#9a5230'); p.r(px + 4, py - 3, 8, 1, '#c9783f');
    p.r(px + 3, py + 5, 10, 1, '#ffd166'); p.r(px + 5, py + 7, 1, 1, '#2a1a10'); p.r(px + 8, py + 7, 1, 1, '#2a1a10'); p.r(px + 11, py + 7, 1, 1, '#2a1a10'); p.r(px + 4, py + 2, 1, 9, '#d8884f');
  },
  bigplant(p, px, py) {
    p.r(px + 4, py + 6, 8, 8, '#b0623a'); p.r(px + 3, py + 5, 10, 2, '#c9783f'); p.r(px + 5, py + 8, 1, 5, '#d8884f');
    for (const [dx, h] of [[2, 9], [5, 13], [8, 15], [11, 12], [13, 8]]) { p.r(px + dx, py + 5 - h, 2, h, '#3f8a3a'); p.r(px + dx, py + 5 - h, 1, 2, '#6cc455'); }
  },
  chest(p, px, py) {
    p.r(px + 2, py + 13, 12, 2, 'rgba(0,0,0,0.3)');
    p.r(px + 2, py + 3, 12, 10, '#6b4426'); p.r(px + 2, py, 12, 4, '#9b6a3e'); p.r(px + 2, py, 12, 1, '#c99766');
    p.r(px + 4, py, 1, 13, '#c9963f'); p.r(px + 11, py, 1, 13, '#c9963f'); p.r(px + 7, py + 4, 2, 3, '#ffd166'); p.r(px + 2, py + 4, 12, 1, '#3a2414');
  },
  statue(p, px, py) {
    p.r(px + 3, py + 8, 10, 6, '#6a6a72'); p.r(px + 3, py + 8, 10, 1, '#9a9aa2');
    p.r(px + 5, py - 3, 6, 11, '#8a8a92'); p.r(px + 6, py - 7, 4, 4, '#9a9aa2'); p.r(px + 4, py - 1, 2, 6, '#7a7a82'); p.r(px + 10, py - 1, 2, 6, '#7a7a82'); p.r(px + 6, py - 3, 1, 10, '#b0b0b8');
  },
  idol(p, px, py) {
    p.r(px + 4, py - 4, 8, 18, '#5a6a4a'); p.r(px + 3, py - 6, 10, 3, '#6b7d55'); p.r(px + 5, py, 2, 2, '#ffd166'); p.r(px + 9, py, 2, 2, '#ffd166'); p.r(px + 6, py + 5, 4, 1, '#2a3020');
    p.r(px + 3, py + 8, 2, 4, '#3f8a2e'); p.r(px + 11, py - 2, 1, 6, '#3f8a2e');
  },
  anvil(p, px, py) {
    p.r(px + 5, py + 8, 6, 6, '#3a3034'); p.r(px + 2, py + 3, 12, 5, '#4a4044'); p.r(px + 1, py + 3, 3, 2, '#4a4044'); p.r(px + 2, py + 3, 12, 1, '#7a7074'); p.r(px + 9, py + 1, 2, 2, '#ff6a1a');
  },
  crates(p, px, py) {
    const box = (x, y, s) => { p.r(x, y, s, s, '#3a2416'); p.r(x + 1, y + 1, s - 2, s - 2, '#9b6a3e'); p.r(x + 1, y + 1, s - 2, 1, '#c99766'); p.r(x + 1, y + s / 2, s - 2, 1, '#6b4426'); };
    p.r(px + 1, py + 13, 14, 2, 'rgba(0,0,0,0.3)');
    box(px + 1, py + 4, 10); box(px + 9, py + 6, 7); box(px + 4, py - 4, 8);
  },
  pillar(p, px, py) {
    p.r(px + 3, py + 11, 10, 3, '#7a7a82'); p.r(px + 4, py - 6, 8, 17, '#9a9aa2'); p.r(px + 3, py - 8, 10, 3, '#b0b0b8');
    p.r(px + 6, py - 5, 1, 16, '#c0c0c8'); p.r(px + 9, py - 5, 1, 16, '#7a7a82');
  },
};

// ---------- Rückwand ----------
function backWall(p, level, th, cfg, exit, out) {
  const { w } = level;
  const top = -BACK * T;
  let n = 0;
  for (let x = 0; x < w; x++) {
    const px = x * T;
    const floorBelow = level.cells[w + x]?.type !== 'wall';
    if (x === 0 || x === w - 1 || !floorBelow) {
      p.r(px, top, T, BACK * T, th.top); p.r(px, top, T, 1, th.trim);
      if (x === 0) p.r(px + T - 1, top + 4, 1, BACK * T - 4, th.dark);
      if (x === w - 1) p.r(px, top + 4, 1, BACK * T - 4, th.dark);
      continue;
    }
    const capH = 5, faceTop = top + capH, faceBot = T;
    p.r(px, top, T, capH, th.top); p.r(px, top, T, 1, th.trim); p.r(px, top + capH - 1, T, 1, th.dark);
    p.r(px, faceTop, T, faceBot - faceTop, th.face);
    for (let k = 0, yy = faceTop + 4; yy < faceBot - 3; yy += 5, k++) {
      p.r(px, yy, T, 1, th.dark);
      p.r(px + ((k + x) % 2 ? 4 : 11), yy - 4, 1, 4, th.dark);
      if (hash(x, k, 61) > 0.7) p.r(px + 1 + Math.floor(hash(x, k, 62) * 10), yy - 3, 3, 1, th.top);
    }
    p.r(px, faceBot - 3, T, 3, th.dark); p.r(px, faceBot - 3, T, 1, th.trim);
    if (exit && exit.y === 0 && exit.x === x) continue;
    // Deko: Fackeln im Takt, dazwischen Fenster, Bilder, Regale …
    const torch = x % 4 === 2;
    const kind = torch ? 'torch' : hash(x, 0, 71) < 0.18 ? null : cfg.wall[(n++ + Math.floor(hash(x, 1, 72) * 3)) % cfg.wall.length];
    WALL[kind]?.(p, px, th, cfg, out, x);
  }
}

const WALL = {
  torch(p, px, th, cfg, out, x) {
    p.r(px + 7, -8, 2, 6, '#2a1a10'); p.r(px + 5, -10, 6, 2, '#6b4a2a'); p.r(px + 6, -9, 4, 1, '#3a2414');
    out.flames.push({ x: px + 8, y: -11, s: 1 });
    out.glows.push({ x: px + 8, y: -12, r: 26, c: cfg.torch, a: 0.4, flicker: true });
    out.lights.push({ x: x + 0.5, y: 0.2, level: 12, color: cfg.torch, reflect: 0.6 });
  },
  window(p, px, th, cfg, out, x) {
    const [s0, s1] = cfg.sky;
    if (cfg.porthole) {
      p.r(px + 3, -21, 10, 12, '#b08a3a'); p.r(px + 2, -19, 12, 8, '#b08a3a');
      p.r(px + 4, -20, 8, 10, s0); p.r(px + 3, -18, 10, 6, s0); p.r(px + 5, -19, 3, 2, s1); p.r(px + 9, -14, 1, 1, '#ffffff');
    } else {
      p.r(px + 2, -23, 12, 15, '#2a1a10');
      for (let k = 0; k < 11; k++) p.r(px + 3, -22 + k, 10, 1, k < 6 ? s0 : s1);
      if (cfg.moon) { p.r(px + 9, -21, 3, 3, '#fff6d8'); p.r(px + 4, -19, 1, 1, '#ffffff'); p.r(px + 6, -15, 1, 1, '#ffffff'); }
      else if (cfg.aurora) { p.r(px + 3, -19, 10, 1, '#4fffb0'); p.r(px + 5, -18, 6, 1, '#9f7aff'); }
      else { p.r(px + 4, -20, 3, 1, '#ffffff'); p.r(px + 9, -18, 2, 1, '#ffffff'); }
      p.r(px + 3, -13, 10, 2, '#3f6b34');
      p.r(px + 7, -22, 2, 13, '#2a1a10'); p.r(px + 3, -17, 10, 1, '#2a1a10');
      p.r(px + 1, -9, 14, 2, th.trim); p.r(px + 1, -7, 14, 1, th.dark);
    }
    out.lights.push({ x: x + 0.5, y: 0.4, level: 9, color: s1, i: 0.55 });
    out.shafts.push({ x: px + 3, c: s1 });
  },
  painting(p, px, th) {
    p.r(px + 2, -22, 12, 10, '#6b4a1e'); p.r(px + 2, -22, 12, 1, '#c9963f');
    p.r(px + 3, -21, 10, 4, '#8ac0e8'); p.r(px + 3, -17, 10, 4, '#4a7a3c'); p.r(px + 6, -19, 4, 2, '#5a8a44');
    p.r(px + 10, -20, 2, 2, '#ffd166'); p.r(px + 7, -11, 2, 1, '#2a1a10');
  },
  shelf(p, px) {
    p.r(px + 1, -20, 14, 2, '#5a3a22'); p.r(px + 1, -9, 14, 2, '#5a3a22'); p.r(px + 2, -18, 1, 2, '#3a2414'); p.r(px + 13, -18, 1, 2, '#3a2414');
    p.r(px + 3, -25, 3, 5, '#7fb8a8'); p.r(px + 3, -26, 3, 1, '#5a3a22'); p.r(px + 8, -23, 4, 3, '#b0623a');
    for (let k = 0; k < 5; k++) p.r(px + 2 + k * 2, -15 + (k % 2), 2, 6 - (k % 2), ['#a83a3a', '#3a6aa8', '#c9963f', '#4a8a3a', '#7a3fa0'][k]);
    p.r(px + 12, -12, 2, 3, '#efe6d0');
  },
  banner(p, px, th) {
    p.r(px + 3, -24, 10, 1, '#3a2a1c'); p.r(px + 2, -25, 1, 2, '#c9963f'); p.r(px + 13, -25, 1, 2, '#c9963f');
    p.r(px + 4, -23, 8, 13, th.trim); p.r(px + 4, -23, 1, 13, 'rgba(0,0,0,0.25)');
    p.r(px + 4, -10, 3, 2, th.trim); p.r(px + 9, -10, 3, 2, th.trim);
    p.r(px + 7, -20, 2, 6, 'rgba(255,255,255,0.7)'); p.r(px + 6, -18, 4, 2, 'rgba(255,255,255,0.7)');
  },
  ivy(p, px, th, cfg) {
    const [g, b] = cfg.ivy || ['#3f8a2e', '#ffd166'];
    for (let k = 0; k < 4; k++) {
      const vx = px + 1 + k * 4, len = 10 + Math.floor(hash(px, k, 81) * 22);
      for (let s = 0; s < len; s++) {
        const yy = -27 + s, xx = vx + Math.round(Math.sin(s / 3 + k) * 1);
        p.r(xx, yy, 1, 1, g);
        if (s % 4 === 2) p.r(xx + (s % 8 === 2 ? 1 : -2), yy, 2, 2, g);
        if (s % 9 === 5 && hash(px, s, k) > 0.4) p.r(xx, yy, 2, 2, b);
      }
    }
  },
  mask(p, px) {
    p.r(px + 4, -22, 8, 12, '#8a5a2a'); p.r(px + 5, -23, 6, 1, '#8a5a2a'); p.r(px + 5, -19, 2, 2, '#1a0f08'); p.r(px + 9, -19, 2, 2, '#1a0f08');
    p.r(px + 6, -14, 4, 2, '#e8e0d0'); p.r(px + 4, -22, 8, 1, '#c9963f'); p.r(px + 3, -21, 1, 4, '#c94f4f'); p.r(px + 12, -21, 1, 4, '#4a8a3a');
  },
  weapons(p, px) {
    for (let k = 0; k < 12; k++) { p.r(px + 3 + k, -22 + k, 1, 1, '#c0c0c8'); p.r(px + 12 - k, -22 + k, 1, 1, '#c0c0c8'); }
    p.r(px + 2, -11, 3, 2, '#6b4a2a'); p.r(px + 11, -11, 3, 2, '#6b4a2a'); p.r(px + 6, -18, 4, 4, '#7a2e2e'); p.r(px + 7, -17, 2, 2, '#c9963f');
  },
};

// ---------- Boden: Teppich, Streugut, Büschel, Spinnweben ----------
function rug(p, level, cfg, out) {
  const { w, h } = level;
  if (w < 7 || h < 6) return;
  const [kind, a, b] = cfg.rug;
  const x0 = 2 * T + 2, y0 = 2 * T + 3, x1 = (w - 2) * T - 2, y1 = (h - 2) * T - 3;
  const W = x1 - x0, H = y1 - y0;
  const { ctx } = p;
  if (kind === 'rune') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rr = Math.min(W, H) / 2;
    for (let k = 0; k < 160; k++) { const ang = (k / 160) * Math.PI * 2; p.r(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.8, 1, 1, b); p.r(cx + Math.cos(ang) * rr * 0.7, cy + Math.sin(ang) * rr * 0.56, 1, 1, rgba(b, 0.6)); }
    for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2; p.r(cx + Math.cos(ang) * rr * 0.85 - 1, cy + Math.sin(ang) * rr * 0.68 - 1, 3, 3, b); }
    out.glows.push({ x: cx, y: cy, r: rr * 1.1, c: b, a: 0.18, pulse: true });
    return;
  }
  if (kind === 'sandpatch' || kind === 'moss') {
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const dx = (x - (x0 + x1) / 2) / (W / 2), dy = (y - (y0 + y1) / 2) / (H / 2);
      const d = dx * dx + dy * dy + hash(x, y, 91) * 0.35;
      if (d < 1) p.r(x, y, 2, 2, d < 0.55 && hash(x, y, 92) > 0.6 ? b : a);
    }
    return;
  }
  p.r(x0 + 1, y0 + 2, W, H, 'rgba(0,0,0,0.25)');
  if (kind === 'stripes') { for (let x = x0; x < x1; x += 3) p.r(x, y0, Math.min(3, x1 - x), H, (Math.floor((x - x0) / 3) % 2) ? b : a); return; }
  if (kind === 'grate') {
    p.r(x0, y0, W, H, a); p.r(x0, y0, W, 1, b); p.r(x0, y1 - 1, W, 1, b); p.r(x0, y0, 1, H, b); p.r(x1 - 1, y0, 1, H, b);
    for (let x = x0 + 4; x < x1 - 1; x += 4) p.r(x, y0 + 1, 1, H - 2, b);
    for (let y = y0 + 4; y < y1 - 1; y += 4) p.r(x0 + 1, y, W - 2, 1, b);
    out.glows.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.min(W, H) * 0.6, c: '#ff6a1a', a: 0.12, pulse: true });
    return;
  }
  if (kind === 'fur') {
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      if (edge < 3 && hash(x, y, 93) > 0.5) continue;
      p.r(x, y, 2, 2, hash(x, y, 94) > 0.85 ? b : a);
    }
    return;
  }
  if (kind === 'mat') { for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) p.r(x, y, 2, 2, ((x + y) / 2) % 2 ? a : b); p.r(x0, y0, W, 1, '#5a4422'); p.r(x0, y1 - 1, W, 1, '#5a4422'); return; }
  // klassischer Teppich mit Rand, Rautenmuster und Fransen
  p.r(x0, y0, W, H, a);
  p.r(x0 + 2, y0 + 2, W - 4, 1, b); p.r(x0 + 2, y1 - 3, W - 4, 1, b); p.r(x0 + 2, y0 + 2, 1, H - 4, b); p.r(x1 - 3, y0 + 2, 1, H - 4, b);
  for (let x = x0 + 5; x < x1 - 5; x += 4) { p.r(x, y0 + 4, 2, 1, b); p.r(x, y1 - 5, 2, 1, b); }
  const cx = Math.floor((x0 + x1) / 2), cy = Math.floor((y0 + y1) / 2), rr = Math.min(W, H) / 3;
  for (let k = 0; k <= rr; k++) { p.r(cx - k, cy - (rr - k) * 0.7, 1, 1, b); p.r(cx + k, cy - (rr - k) * 0.7, 1, 1, b); p.r(cx - k, cy + (rr - k) * 0.7, 1, 1, b); p.r(cx + k, cy + (rr - k) * 0.7, 1, 1, b); }
  p.r(cx - 1, cy - 1, 3, 3, b);
  for (let y = y0 + 1; y < y1; y += 2) { p.r(x0 - 2, y, 2, 1, b); p.r(x1, y, 2, 1, b); }
  ctx.globalAlpha = 1;
}

function scatter(p, level, cfg, out) {
  const { w, h } = level;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const c = level.cells[y * w + x];
    if (c.type === 'wall') continue;
    const px = x * T, py = y * T, s = hash(x, y, 41);
    const at = (k) => [px + 2 + Math.floor(hash(x, y, k) * 12), py + 3 + Math.floor(hash(y, x, k) * 11)];
    switch (cfg.scatter) {
      case 'leaves': if (s > 0.62) for (let k = 0; k < 3; k++) { const [lx, ly] = at(k); p.r(lx, ly, 2, 1, (cfg.leaf || ['#b8682a', '#d8963a'])[k % 2]); p.r(lx + 1, ly + 1, 1, 1, '#7a4a1e'); } break;
      case 'petals': if (s > 0.5) for (let k = 0; k < 4; k++) { const [lx, ly] = at(k); p.r(lx, ly, 2, 1, k % 2 ? '#ff9cc8' : '#ffd6e7'); } break;
      case 'shells': if (s > 0.78) PROPS.shell(p, px, py - 3); break;
      case 'mushrooms': if (s > 0.82) { const [lx, ly] = at(1); p.r(lx, ly, 1, 2, '#e8e8f0'); p.r(lx - 1, ly - 1, 3, 1, '#4ff0d0'); out.glows.push({ x: lx, y: ly, r: 6, c: '#4ff0d0', a: 0.45 }); } break;
      case 'cracks': if (s > 0.74) { const [lx, ly] = at(1); p.r(lx, ly, 4, 1, '#1a1012'); p.r(lx + 3, ly + 1, 3, 1, '#1a1012'); p.r(lx + 1, ly, 2, 1, '#ff6a1a'); out.glows.push({ x: lx + 2, y: ly, r: 6, c: '#ff6a1a', a: 0.4, pulse: true }); } break;
      case 'sand': if (s > 0.7) { const [lx, ly] = at(1); p.r(lx, ly + 1, 6, 2, '#e0bb80'); p.r(lx + 1, ly, 4, 1, '#ecc890'); } break;
      case 'snow': if (s > 0.6) { const [lx, ly] = at(1); p.r(lx, ly, 5, 2, '#f2f7ff'); p.r(lx + 1, ly - 1, 3, 1, '#ffffff'); } break;
      case 'bones': if (s > 0.86) { const [lx, ly] = at(1); p.r(lx, ly, 5, 1, '#d8d0c0'); p.r(lx - 1, ly - 1, 1, 3, '#d8d0c0'); p.r(lx + 5, ly - 1, 1, 3, '#d8d0c0'); } break;
    }
    if (s < 0.07) { p.r(px + 4, py + 6, 3, 1, 'rgba(0,0,0,0.3)'); p.r(px + 6, py + 7, 3, 1, 'rgba(0,0,0,0.3)'); p.r(px + 8, py + 6, 1, 1, 'rgba(0,0,0,0.3)'); }
    else if (s > 0.3 && s < 0.36) { p.r(px + 3, py + 11, 2, 1, 'rgba(0,0,0,0.25)'); p.r(px + 10, py + 5, 1, 1, 'rgba(255,255,255,0.15)'); }
    // Büschel am Wandfuß
    const wallUp = level.cells[(y - 1) * w + x].type === 'wall';
    if (wallUp && hash(x, y, 43) > 0.45 && !['snow', 'cracks', 'bones'].includes(cfg.scatter)) {
      const gx = px + 2 + Math.floor(hash(x, y, 44) * 10);
      p.r(gx, py + 1, 1, 3, '#4a8a2e'); p.r(gx + 1, py, 1, 4, '#6cb455'); p.r(gx + 2, py + 2, 1, 2, '#4a8a2e');
    }
  }
  // Spinnweben in den hinteren Ecken
  if (cfg.motes !== 'bubbles') {
    const web = (x0, dir) => { for (let k = 0; k < 7; k++) { p.r(x0 + dir * k, T, 1, 1, 'rgba(235,235,240,0.45)'); p.r(x0, T + k, 1, 1, 'rgba(235,235,240,0.45)'); p.r(x0 + dir * k, T + k, 1, 1, 'rgba(235,235,240,0.35)'); } for (let k = 0; k < 4; k++) p.r(x0 + dir * (4 - k), T + k, 1, 1, 'rgba(235,235,240,0.35)'); };
    if (level.cells[w + 1].type !== 'wall') web(T, 1);
    if (level.cells[w + w - 2].type !== 'wall') web((w - 1) * T - 1, -1);
  }
}

// ---------- Außenwelt ----------
function outside(p, level, cfg, out) {
  const { w, h } = level;
  const M = MARGIN;
  const [g0, g1, g2] = cfg.ground;
  for (let y = -M.top; y < h + M.bottom; y++) for (let x = -M.x; x < w + M.x; x++) {
    if (x >= 0 && x < w && y >= -BACK && y < h) continue;
    const px = x * T, py = y * T;
    p.r(px, py, T, T, g0);
    for (let k = 0; k < 5; k++) p.r(px + Math.floor(hash(x, y, k + 100) * 15), py + Math.floor(hash(y, x, k + 100) * 15), 2, 1, k % 2 ? g1 : g2);
    if (cfg.motes === 'bubbles' && hash(x, y, 107) > 0.7) p.r(px + 2, py + 6, 8, 1, g1);
    if (cfg.scatter === 'cracks' && hash(x, y, 108) > 0.85) { p.r(px + 3, py + 8, 6, 1, '#ff6a1a'); out.glows.push({ x: px + 6, y: py + 8, r: 8, c: '#ff6a1a', a: 0.35, pulse: true }); }
  }
  // Pfad vom Ausgang? – stattdessen ein Schatten rund um das Gebäude
  p.r(-4, -BACK * T - 3, w * T + 8, 3, 'rgba(0,0,0,0.25)');
  p.r(-4, -BACK * T, 4, (h + BACK) * T + 4, 'rgba(0,0,0,0.3)'); p.r(w * T, -BACK * T, 4, (h + BACK) * T + 4, 'rgba(0,0,0,0.3)');
  p.r(0, h * T, w * T, 5, 'rgba(0,0,0,0.35)');
}

function outsideProps(p, level, cfg, out) {
  const { w, h } = level;
  const M = MARGIN;
  const list = [];
  for (let y = -M.top + 1; y < h + M.bottom; y++) for (let x = -M.x; x < w + M.x; x++) {
    const near = x >= -1 && x <= w && y >= -BACK - 2 && y <= h;
    if (near) continue;
    let acc = 0; const s = hash(x, y, 120);
    for (const [kind, prob] of cfg.props) { acc += prob; if (s < acc) { list.push({ x, y, kind }); break; } }
  }
  list.sort((a, b) => a.y - b.y).forEach(({ x, y, kind }) => PROPS[kind]?.(p, x * T, y * T, out.glows));
}

/** Ausstattung einer Welt vorbereiten. out sammelt beim Zeichnen die dynamischen Teile:
 *  Lichter, Flammen, Leuchten, Lichtschächte; dazu Teilchenart und Möbelplan. */
export function makeDecor(level, themeId) {
  const cfg = DECOR[themeId] || DECOR.default;
  return { cfg, out: { lights: [], flames: [], glows: [], shafts: [], motes: cfg.motes, torch: cfg.torch, furn: planFurniture(level, cfg) } };
}

export const DecorSteps = {
  outside, outsideProps, backWall, rug, scatter,
  furniture(p, level, x, y, f, out) { (FURN[f.kind] || PROPS[f.kind])?.(p, x * T, y * T, f.seg, out); },
  sideCandle(p, level, x, y, out) {
    const px = x * T, py = y * T;
    if (hash(x, y, 31) < 0.7) return;
    p.r(px + 5, py + 6, 6, 2, 'rgba(0,0,0,0.25)'); p.r(px + 6, py + 2, 3, 6, '#efe6d0'); p.r(px + 6, py + 2, 1, 6, '#ffffff'); p.r(px + 8, py + 4, 1, 2, '#d8d0b8');
    if (hash(x, y, 32) > 0.5) { p.r(px + 10, py + 4, 2, 4, '#efe6d0'); out.flames.push({ x: px + 11, y: py + 3, s: 0.6 }); }
    out.flames.push({ x: px + 7, y: py + 1, s: 0.7 });
    out.lights.push({ x: x + 0.5, y: y + 0.5, level: 8, color: out.torch, i: 0.8 });
  },
};

// ---------- dynamisch: Flammen, Leuchten, Lichtschächte, Teilchen ----------
export function drawFlames(p, flames, t) {
  const { ctx } = p;
  flames.forEach((f, i) => {
    const k = Math.floor(t / 90 + i * 3) % 3, s = f.s;
    p.r(f.x - 2 * s, f.y - 1, Math.max(2, 4 * s), 3, '#ff7a1a');
    p.r(f.x - 1, f.y - 2 - (k % 2), 2, 3, '#ffcf4a');
    p.r(f.x - (k === 2 ? 0 : 1), f.y - 4 - (k === 1 ? 1 : 0), 1, 2, '#ff9a2a');
    p.r(f.x - 1 + (k === 0 ? 1 : 0), f.y - 1, 1, 2, '#fff6c0');
    ctx.globalAlpha = 0.25; p.r(f.x - 3, f.y - 3, 6, 6, '#ffcf4a'); ctx.globalAlpha = 1;
  });
}

export function drawGlows(p, glows, t) {
  const { ctx } = p;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glows.forEach((g, i) => {
    let a = g.a;
    if (g.flicker) a *= 0.8 + 0.2 * Math.sin(t / 70 + i * 2.3) * Math.sin(t / 130 + i);
    if (g.pulse) a *= 0.6 + 0.4 * Math.sin(t / 600 + i);
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grad.addColorStop(0, rgba(g.c, a)); grad.addColorStop(1, rgba(g.c, 0));
    ctx.fillStyle = grad; ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
  });
  ctx.restore();
}

/** Lichtschächte aus den Fenstern: schräge, schwach leuchtende Bahnen auf dem Boden. */
export function drawShafts(p, shafts, level, t) {
  const { ctx } = p;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of shafts) {
    const a = 0.07 + 0.02 * Math.sin(t / 1500 + s.x);
    ctx.fillStyle = rgba(s.c.length === 7 ? s.c : '#ffffff', a);
    ctx.beginPath();
    ctx.moveTo(s.x, -9); ctx.lineTo(s.x + 10, -9); ctx.lineTo(s.x + 18, T * 3.2); ctx.lineTo(s.x + 4, T * 3.2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawMotes(p, kind, t, b) {
  const { ctx } = p;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  const mod = (v, m) => ((v % m) + m) % m;
  const n = kind === 'butterflies' ? 7 : 42;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const hx = hash(i, 7, 201), hy = hash(i, 9, 202), sp = 0.6 + hash(i, 3, 203) * 0.8;
    let x, y;
    switch (kind) {
      case 'petals':
        x = b.x0 + mod(hx * W + t * 0.008 * sp + Math.sin(t / 700 + i) * 8, W); y = b.y0 + mod(hy * H + t * 0.014 * sp, H);
        ctx.globalAlpha = 0.85; p.r(x, y, 2, 1, i % 2 ? '#ff9cc8' : '#ffd6e7'); if (Math.floor(t / 300 + i) % 2) p.r(x + 1, y + 1, 1, 1, '#ff7ab6'); break;
      case 'snow':
        x = b.x0 + mod(hx * W + Math.sin(t / 900 + i) * 6, W); y = b.y0 + mod(hy * H + t * 0.012 * sp, H);
        ctx.globalAlpha = 0.9; p.r(x, y, i % 4 ? 1 : 2, i % 4 ? 1 : 2, '#ffffff'); break;
      case 'embers':
        x = b.x0 + mod(hx * W + Math.sin(t / 500 + i) * 4, W); y = b.y0 + mod(hy * H - t * 0.016 * sp, H);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 200 + i); p.r(x, y, 1, 1, i % 3 ? '#ffb040' : '#ff6a1a'); ctx.globalCompositeOperation = 'source-over'; break;
      case 'bubbles':
        x = b.x0 + mod(hx * W + Math.sin(t / 600 + i) * 3, W); y = b.y0 + mod(hy * H - t * 0.012 * sp, H);
        ctx.globalAlpha = 0.55; p.r(x, y - 1, 2, 1, '#bff8ff'); p.r(x - 1, y, 1, 2, '#bff8ff'); p.r(x + 2, y, 1, 2, '#bff8ff'); p.r(x, y + 2, 2, 1, '#bff8ff'); p.r(x, y, 1, 1, '#ffffff'); break;
      case 'fireflies': case 'motes': {
        x = b.x0 + hx * W + Math.sin(t / 1300 * sp + i * 2) * 14; y = b.y0 + hy * H + Math.cos(t / 1700 * sp + i) * 10;
        const a = Math.max(0, Math.sin(t / 400 * sp + i * 5));
        const c = kind === 'motes' ? '#c58bff' : '#d8ff7a';
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.35; p.r(x - 1, y - 1, 3, 3, c); ctx.globalAlpha = a; p.r(x, y, 1, 1, c); ctx.globalCompositeOperation = 'source-over'; break;
      }
      case 'fog': {
        // Nebelschwaden ziehen langsam quer; jedes siebte Teilchen ist ein Irrlicht, das sanft pulsiert
        x = b.x0 + mod(hx * W + t * 0.004 * sp, W); y = b.y0 + hy * H + Math.sin(t / 2600 + i) * 4;
        if (i % 7 === 0) {
          const a = 0.4 + 0.4 * Math.sin(t / 650 * sp + i);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.3; p.r(x - 2, y - 2, 5, 5, '#c8ff9a'); ctx.globalAlpha = a; p.r(x, y, 1, 1, '#eaffd0'); ctx.globalCompositeOperation = 'source-over';
        } else {
          const len = 10 + Math.floor(hash(i, 5, 204) * 18);
          ctx.globalAlpha = 0.06 + 0.06 * Math.sin(t / 1800 + i * 2); p.r(x, y, len, 2, '#dfe8d8'); p.r(x + 3, y - 1, len - 6, 1, '#dfe8d8');
        }
        break;
      }
      case 'butterflies': {
        x = b.x0 + mod(hx * W + t * 0.01 * sp, W); y = b.y0 + hy * H + Math.sin(t / 500 + i) * 12;
        const c = ['#ffd166', '#ff9cc8', '#9ad1ff', '#ffffff'][i % 4];
        ctx.globalAlpha = 1;
        if (Math.floor(t / 120 + i) % 2) { p.r(x - 2, y, 2, 2, c); p.r(x + 1, y, 2, 2, c); } else { p.r(x - 1, y - 1, 1, 3, c); p.r(x + 1, y - 1, 1, 3, c); }
        p.r(x, y, 1, 2, '#2a1a10'); break;
      }
      default: // Staub im Licht
        x = b.x0 + mod(hx * W + Math.sin(t / 3000 + i) * 10, W); y = b.y0 + mod(hy * H - t * 0.003 * sp, H);
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t / 900 + i * 3); p.r(x, y, 1, 1, '#fff3d6');
    }
  }
  ctx.restore();
}

/** Abdunkeln der Außenwelt/Rückwand im selben Grundton wie die Raum-Lichtkarte. */
export function shadeMargin(p, level, th, rgb) {
  const { ctx } = p;
  const M = MARGIN;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgb;
  ctx.beginPath();
  ctx.rect(-M.x * T, -M.top * T, (level.w + 2 * M.x) * T, (level.h + M.top + M.bottom) * T);
  ctx.rect(0, 0, level.w * T, level.h * T);
  ctx.fill('evenodd');
  ctx.restore();
}
