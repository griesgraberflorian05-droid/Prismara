// Gehirnkarte in 3D: wachsendes Netzwerk aus dokumentierten Entwicklungsereignissen.
// Eigene kleine 3D-Projektion auf Canvas 2D (keine Abhängigkeiten): Kräftesimulation im Raum,
// Arbeitsschritte bilden zwei "Hemisphären" um das Spielziel. Ziehen dreht, Umschalt+Ziehen
// verschiebt, Mausrad zoomt, Klick wählt aus.
//
// Leistung (für 400+ Knoten): Knoten werden einmal als Bild vorgerendert (Form, Glanz, Ring,
// Abzeichen) und danach nur noch gestempelt; Verbindungen werden nach Farbe gebündelt in wenigen
// Pfaden gezeichnet; gezeichnet wird nur, was im Bild liegt – und gar nichts, solange die Karte
// versteckt ist (Listenansicht, anderer Browser-Tab).

export const NODE_TYPES = {
  goal:        { label: 'Spielziel',       shape: 'star',     color: '#ffd166', r: 15 },
  idea:        { label: 'Idee/Hypothese',  shape: 'circle',   color: '#c792ea', r: 9 },
  decision:    { label: 'Entscheidung',    shape: 'diamond',  color: '#5ec8ff', r: 10 },
  mechanic:    { label: 'Mechanik',        shape: 'hexagon',  color: '#ff7ab6', r: 11 },
  level:       { label: 'Level',           shape: 'square',   color: '#7ee787', r: 9 },
  file:        { label: 'Datei/Funktion',  shape: 'roundrect',color: '#9aa4bf', r: 8 },
  test:        { label: 'Test',            shape: 'triangle', color: '#ffa657', r: 10 },
  observation: { label: 'Beobachtung',     shape: 'pentagon', color: '#79e2f2', r: 9 },
  improvement: { label: 'Verbesserung',    shape: 'chevron',  color: '#a5f3a0', r: 10 },
  issue:       { label: 'Offenes Problem', shape: 'octagon',  color: '#ff5f6d', r: 10 },
  // nur in "Alle Knoten" (aus Projektdaten erzeugt)
  object:      { label: 'Spielobjekt',     shape: 'cube',     color: '#e0c3ff', r: 8 },
  color:       { label: 'Farbe',           shape: 'circle',   color: '#ffffff', r: 8 },
  animation:   { label: 'Animation',       shape: 'star4',    color: '#ffe08a', r: 8 },
  texture:     { label: 'Textur/Stil',     shape: 'tridown',  color: '#8fd3ff', r: 7 },
  step:        { label: 'Arbeitsschritt',  shape: 'octagon',  color: '#ffb86b', r: 13 },
  tier:        { label: 'Schwierigkeit',   shape: 'diamond',  color: '#ff9fb2', r: 9 },
  logsrc:      { label: 'Live-Log-Quelle', shape: 'chevron',  color: '#b6ff3d', r: 8 },
};

export const FORMATIONS = {
  brain: 'Gehirn',
  dna: 'DNA-Strang',
  cube: 'Würfel',
  sphere: 'Kugel',
  helix: 'Doppelhelix',
  galaxy: 'Galaxie',
  clusters: 'Cluster',
};

export const PALETTES = {
  laterne: { label: 'Laterne', colors: ['#ffd166', '#f4a259', '#e07a5f', '#c8553d', '#8cb369', '#5b8e7d', '#7fb7be', '#bc96e6', '#f2e8cf'] },
  wald: { label: 'Wald', colors: ['#f1e3b4', '#d9c27a', '#b5a24e', '#8cb369', '#5f9a52', '#3f7d4a', '#7aa874', '#a8c686', '#d6e2a8'] },
  bunt: { label: 'Bunt', colors: ['#ff5d73', '#ff9f43', '#ffd43b', '#a3e635', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'] },
  arctic: { label: 'Eisblau', colors: ['#f5fbff', '#dceeff', '#c2e1fa', '#a5d0f2', '#87bce6', '#6aa5d4', '#4e87b7', '#396a95', '#2d5275'] },
  silver: { label: 'Silber', colors: ['#fff', '#e4e4e4', '#ccc', '#b5b5b5', '#999', '#858585', '#707070', '#5d5d5d', '#4a4a4a'] },
  midnight: { label: 'Nachtblau', colors: ['#e6f3ff', '#c8e2f8', '#a6cdec', '#83b4dc', '#699bc6', '#5481aa', '#41688d', '#325472', '#263f58'] },
  rot: { label: 'Rot', colors: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#881337'] },
  gelb: { label: 'Gelb', colors: ['#fffde7', '#fff9c4', '#fff176', '#ffee58', '#ffeb3b', '#fdd835', '#f9a825', '#e69500', '#9a5b00'] },
  gruen: { label: 'Grün', colors: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46'] },
  orange: { label: 'Orange', colors: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#7c2d12'] },
  violett: { label: 'Violett', colors: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#581c87'] },
};

export const IMPORTANCE_LEVELS = [
  { id: 1, label: 'Kern' },
  { id: 2, label: 'Sehr wichtig' },
  { id: 3, label: 'Wichtig' },
  { id: 4, label: 'Ergänzend' },
  { id: 5, label: 'Details' },
];

// Einschätzung der kuratierten Projektknoten; 1 ist am zentralsten, 5 ist Kontext/Detail.
const CURATED_IMPORTANCE = {
  1: ['goal', 'dec-stack', 'dec-backup', 'feat-lab', 'feat-brain3d', 'feat-brainpage', 'feat-allnodes', 'feat-formations', 'feat-levelselect', 'req-push', 'mech-push', 'lvl-push', 'test-push', 'idea-light', 'mech-beam', 'mech-mix', 'dec-core', 'test-engine'],
  2: ['obs-tools', 'dec-env', 'file-serve', 'file-backup', 'file-check', 'feat-brain', 'test-lab1', 'fix-drift', 'req-3d', 'feat-full', 'fix-pivot', 'fix-labels', 'fix-core', 'feat-zoomfocus', 'fix-measure', 'mech-place', 'play-push', 'mech-prism', 'mech-filter', 'mech-ice', 'lvl-push2', 'test-s3', 'play-s3'],
  3: ['fix-livenodes', 'lvl-big1', 'fix-flicker', 'fix-rainbow', 'test-depth', 'req-more', 'idea-split-portal', 'mech-splitter', 'mech-portal', 'lvl-push3', 'fix-w15', 'test-s5', 'test-solver5', 'fix-w13', 'feat-mapgen2', 'feat-mapsize', 'doc-system', 'obs-freeze', 'fix-freeze'],
  4: ['req-neon', 'feat-neon', 'feat-fx', 'req-map200', 'bak-1'],
  5: ['file-solver', 'lvl-proto', 'dec-remove', 'play-place', 'feat-livelog', 'req-log', 'fix-testlog', 'feat-logfile', 'feat-logbus', 'feat-logtail', 'feat-logcolor', 'feat-pulse', 'obs-port', 'dec-restart', 'obs-gone'],
};
const CURATED_IMPORTANCE_BY_ID = Object.fromEntries(
  Object.entries(CURATED_IMPORTANCE).flatMap(([level, ids]) => ids.map((id) => [id, Number(level)])),
);

// Einzelzuordnungen für automatisch erzeugte Knoten aus Spielregeln und Projektdateien.
const GENERATED_IMPORTANCE_BY_ID = {
  'g-mode-run': 1,
  'g-obj-emitter': 1, 'g-obj-target': 1, 'g-obj-player': 1, 'g-obj-mirrorblock': 1, 'g-obj-beam': 1,
  'g-obj-prism': 2, 'g-obj-filter': 2, 'g-obj-ice': 2, 'g-obj-stone': 2,
  'g-obj-splitter': 3, 'g-obj-portal': 3, 'g-obj-wall': 2, 'g-obj-floor': 2,
  'g-col-1': 1, 'g-col-2': 1, 'g-col-4': 1, 'g-col-3': 2, 'g-col-5': 2, 'g-col-6': 2, 'g-col-7': 2,
  'g-file-engine': 1, 'g-file-push': 1, 'g-file-pushView': 1, 'g-file-main': 1,
  'g-file-brainMap': 1, 'g-file-labView': 1, 'g-file-projectGraph': 2,
  'g-file-pushLevels': 2, 'g-file-render': 2, 'g-file-menu': 2, 'g-file-progress': 2,
  'g-file-config': 2, 'g-file-settings': 2, 'g-file-styles': 2,
  'g-file-adventure': 1, 'g-file-pixelRender': 1,
  'g-file-celebrate': 3, 'g-file-devlog': 5, 'g-file-serve': 4, 'g-file-backup': 4,
  'g-file-check': 3, 'g-file-tests': 3, 'g-file-SYSTEM': 4, 'g-file-live': 5,
  'g-anim-beamgrow': 2, 'g-anim-nodebirth': 2, 'g-anim-photons': 2, 'g-anim-targetpulse': 2,
  'g-anim-slide': 2, 'g-anim-flicker': 3, 'g-anim-portalspin': 3, 'g-anim-framerun': 4,
  'g-anim-sparkle': 3, 'g-anim-fireworks': 3, 'g-anim-starpop': 3, 'g-anim-logflow': 5,
  'g-tex-glyphs': 2, 'g-tex-glow': 2, 'g-tex-glass': 2, 'g-tex-splitglass': 3,
  'g-tex-portalring': 3, 'g-tex-icesheen': 2, 'g-tex-rivets': 3, 'g-tex-rainbow': 3,
  'g-tex-tint': 3, 'g-tex-wallgrad': 4, 'g-tex-floordot': 4, 'g-tex-goldcube': 4,
  'g-key-arrows': 1, 'g-key-space': 2, 'g-key-undo': 2, 'g-key-reset': 2, 'g-key-esc': 2, 'g-key-click': 2, 'g-key-enter': 3,
  'g-route-menu': 1, 'g-route-run': 1, 'g-route-lab': 1, 'g-route-labfull': 2, 'g-route-brain': 2,
  'g-form-brain': 2, 'g-form-sphere': 3, 'g-form-helix': 3, 'g-form-galaxy': 3, 'g-form-clusters': 3,
  'g-test-parse': 2, 'g-test-badchar': 3, 'g-test-straight': 1, 'g-test-mirrors': 1,
  'g-test-mix': 1, 'g-test-wrongcolor': 2, 'g-test-ends': 2, 'g-test-walk': 1,
  'g-test-pushblock': 1, 'g-test-shadow': 2, 'g-test-prism': 2, 'g-test-filter': 2,
  'g-test-ice': 2, 'g-test-splitter': 3, 'g-test-portal': 3, 'g-test-portalwalk': 3,
  'g-tier-easy': 4, 'g-tier-mid': 4, 'g-tier-hard': 4,
};

const LEVEL_IMPORTANCE = { w1: 1, w2: 1, w3: 1, w4: 1, w5: 1, w6: 2, w7: 2, w8: 2, w9: 2, w10: 2, w11: 3, w12: 3, w13: 3, w14: 3, w15: 3 };
const STEP_IMPORTANCE = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 3 };

export function nodeImportance(node) {
  if (node.importance >= 1 && node.importance <= 5) return node.importance;
  if (CURATED_IMPORTANCE_BY_ID[node.id]) return CURATED_IMPORTANCE_BY_ID[node.id];
  if (GENERATED_IMPORTANCE_BY_ID[node.id]) return GENERATED_IMPORTANCE_BY_ID[node.id];
  if (node.id?.startsWith('g-lvl-')) return LEVEL_IMPORTANCE[node.id.slice(6)] || 3;
  if (node.id?.startsWith('g-step-')) return STEP_IMPORTANCE[node.id.slice(7)] || 3;
  if (node.type === 'goal' || node.type === 'step') return 1;
  if (node.type === 'mechanic') return 2;
  if (node.group === 'livelog' || node.group === 'backups') return 5;
  if (node.group === 'levels-run') return 1;
  if (node.group === 'formations' || node.group === 'tests') return 3;
  return 3;
}

export const NODE_STATUS = {
  idea:     { label: 'Idee',       dash: [3, 3] },
  built:    { label: 'Umgesetzt',  dash: [] },
  testing:  { label: 'In Prüfung', dash: [1, 3] },
  passed:   { label: 'Bestanden',  dash: [], badge: '✓', badgeColor: '#8cd17d' },
  open:     { label: 'Offen',      dash: [], badge: '!', badgeColor: '#ff7b5c' },
  rejected: { label: 'Verworfen',  dash: [2, 4], badge: '×', badgeColor: '#9a8a70', faded: true },
};

const BIRTH_MS = 1400;
const WAVE_MS = 3200; // Lichtwelle um neu entstandene Knoten
const PERSPECTIVE = 900;
const AUTO_SPIN = 0.0012; // rad pro Frame
const IDLE_BEFORE_SPIN = 4000;
const REPULSE_CUTOFF2 = 120000; // Abstoßung nur bis ~346 Einheiten
const SPRITE_R = 24;            // Radius der vorgerenderten Knotenbilder (in CSS-Pixeln)
const SPRITE_SS = 2;            // Überabtastung, damit gestempelte Knoten scharf bleiben
const MAX_LABELS = 40; // mehr Schilder machen die Karte nur unruhig (und kosten Zeit)
const INK = '#2a1a08', PARCH = '#f3e1b8', WOOD = '#3a2414';

const NODE_TYPE_ORDER = Object.keys(NODE_TYPES);
export const DEFAULT_PALETTE = 'laterne';
export function nodeColor(type, palette = DEFAULT_PALETTE) {
  const colors = PALETTES[palette]?.colors || PALETTES[DEFAULT_PALETTE].colors;
  const index = Math.max(0, NODE_TYPE_ORDER.indexOf(type));
  return colors[Math.round(index * (colors.length - 1) / Math.max(1, NODE_TYPE_ORDER.length - 1))];
}
const colorOf = (n, palette) => nodeColor(n.type, palette);
const ringColor = (status) => (status === 'open' ? '#ff7b5c' : status === 'passed' ? '#8cd17d' : 'rgba(255,240,210,0.8)');

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

export class BrainMap {
  constructor(canvas, { onSelect, onReplayLabel, onReplayProgress, reducedMotion }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelect = onSelect;
    this.onReplayLabel = onReplayLabel;
    this.onReplayProgress = onReplayProgress;
    this.reducedMotion = reducedMotion;
    this.palette = DEFAULT_PALETTE;
    this.nodes = new Map();
    this.edges = [];
    this.cam = { x: 0, y: 0, k: 1 };
    this.camTarget = { x: 0, y: 0, k: 1 }; // Kamera gleitet weich hierhin
    this.focusId = null; // Knoten, der als Drehpunkt in der Bildmitte steht
    this.rot = { yaw: -0.5, pitch: -0.25 };
    this.alpha = 1;
    this.selected = null;
    this.hover = null;
    this.filter = '';
    this.loaded = false;
    this.hidden = new Set();
    this.replayActive = false;
    this.replayFollowing = true;
    this.replayOrder = [];
    this.replayIndex = 0;
    this.replaySpeed = 1;
    this.replayLabelId = null;
    this.replayLabelStarted = 0;
    this.importanceFilter = new Set([1, 2, 3, 4, 5]);
    this.dpr = 1;
    this.running = true;
    this.lastInteract = 0;
    this.proj = new Map();
    this.pivot = { x: 0, y: 0, z: 0 }; // Drehpunkt = Schwerpunkt des Netzes
    this.sprites = new Map(); // vorgerenderte Knotenbilder
    this.textW = new Map();   // gemessene Beschriftungsbreiten
    this.stats = { nodes: 0, edges: 0, ms: 0 }; // zuletzt gezeichnet (für Live-Log/Tests)
    this._bind();
    this._resize();
    this.ro = new ResizeObserver(() => this._resize());
    this.ro.observe(canvas);
    this._frame = this._frame.bind(this);
    requestAnimationFrame(this._frame);
  }

  destroy() {
    this.running = false;
    this.ro.disconnect();
    clearTimeout(this.replayTimer);
    clearTimeout(this.pivotTimer);
    this.replayActive = false;
  }

  // ---------- Daten ----------
  setData(data) {
    const first = !this.loaded;
    const now = performance.now();
    const incoming = new Set(data.nodes.map((n) => n.id));
    const added = [];
    let removed = 0;
    for (const [id] of this.nodes) if (!incoming.has(id)) { this.nodes.delete(id); removed++; }

    this.maxStep = Math.max(1, ...data.nodes.map((n) => n.step || 1));
    this.edges = data.edges.filter((e) => incoming.has(e.from) && incoming.has(e.to));
    this._edgeHash = new Map(this.edges.map((e) => [e, hash(e.from + e.to)]));

    data.nodes.forEach((n, index) => {
      const existing = this.nodes.get(n.id);
      if (existing) {
        Object.assign(existing, n);
        return;
      }
      const node = { ...n, index, vx: 0, vy: 0, vz: 0, born: first ? -Infinity : now };
      this.nodes.set(n.id, node);
      added.push(node);
    });
    this._computeLayoutInfo();
    added.forEach((node) => this._placeNew(node));

    if (first) {
      this.loaded = true;
      for (let i = 0; i < 400; i++) this._tick(1 - i / 400);
      this.alpha = 0.02;
      this._computePivotTarget();
      this._updatePivot(1);
      this.fit(false);
    } else if (added.length || removed) {
      this.alpha = Math.max(this.alpha, 0.6);
      if (this.reducedMotion()) for (let i = 0; i < 200; i++) this._tick(0.6 * (1 - i / 200));
      // Drehpunkt erst nach dem Einschwingen neu bestimmen
      clearTimeout(this.pivotTimer);
      this.pivotTimer = setTimeout(() => { this._computePivotTarget(); if (!this.userMoved) this.fit(); }, 1500);
    }
    if (this.selected && !this.nodes.has(this.selected)) this.select(null);
    return added;
  }

  // Gruppierung: kuratierte Knoten nach Arbeitsschritt, erzeugte nach Bereich (Level, Farben …).
  _groupKey(n) { return n.group || `step-${n.step || 1}`; }

  _computeLayoutInfo() {
    const list = [...this.nodes.values()].sort((a, b) => (this._groupKey(a) < this._groupKey(b) ? -1 : this._groupKey(a) > this._groupKey(b) ? 1 : a.index - b.index));
    const groups = [...new Set(list.map((n) => this._groupKey(n)))]
      .sort((a, b) => (a.startsWith('step-') ? 0 : 1) - (b.startsWith('step-') ? 0 : 1) || a.localeCompare(b, 'de', { numeric: true }));
    const rank = new Map();
    const count = new Map();
    list.forEach((n, i) => {
      const g = this._groupKey(n);
      const r = count.get(g) || 0;
      rank.set(n.id, { i, g: groups.indexOf(g), r });
      count.set(g, r + 1);
    });
    this.layout = { N: list.length, G: groups.length, rank, count, groups };
  }

  setFormation(name) {
    if (!FORMATIONS[name] || name === this.formation) return;
    if (this.replayActive) this.stopReplay(true);
    this.formation = name;
    this.alpha = 1;
    this.focusId = null;
    this.userMoved = false;
    this.spin = null;
    clearTimeout(this.pivotTimer);
    if (this.reducedMotion()) for (let i = 0; i < 300; i++) this._tick(1 - i / 300);
    this.pivotTimer = setTimeout(() => { this._computePivotTarget(); if (!this.userMoved) this.fit(); }, this.reducedMotion() ? 0 : 1600);
  }

  setPalette(name) {
    if (PALETTES[name]) this.palette = name;
  }

  setImportanceFilter(levels) {
    this.importanceFilter = new Set(levels.map(Number).filter((level) => IMPORTANCE_LEVELS.some((item) => item.id === level)));
    if (this.selected && !this.isVisibleNode(this.nodes.get(this.selected))) this.select(null);
    if (this.importanceFilter.size) this.fit();
  }

  isVisibleNode(node) {
    return !!node && !this.hidden.has(node.id) && this.importanceFilter.has(node.importance ?? nodeImportance(node));
  }

  /** Zielpunkt eines Knotens in der aktuellen Formation und wie stark er dorthin zieht. */
  _clusterCenter(node) {
    const L = this.layout;
    const info = L && L.rank.get(node.id);
    const f = this.formation || 'brain';
    if (!info) return { x: 0, y: 0, z: 0, k: 0.012 };
    const N = Math.max(1, L.N), G = Math.max(1, L.G);
    if (f === 'sphere') {
      const R = 40 * Math.sqrt(N) + 60;
      const y = 1 - (2 * (info.i + 0.5)) / N;
      const r = Math.sqrt(1 - y * y), th = info.i * 2.39996;
      return { x: Math.cos(th) * r * R, y: y * R, z: Math.sin(th) * r * R, k: 0.06 };
    }
    if (f === 'helix') {
      const strand = info.i % 2;
      const t = Math.floor(info.i / 2);
      const a = t * 0.42 + strand * Math.PI;
      return { x: Math.cos(a) * 150, y: (t - N / 4) * 14, z: Math.sin(a) * 150, k: 0.06 };
    }
    if (f === 'dna') {
      const strand = info.i % 2;
      const pair = Math.floor(info.i / 2);
      const a = pair * 0.23 + strand * Math.PI;
      const radius = 128;
      return { x: Math.cos(a) * radius, y: (pair - (Math.ceil(N / 2) - 1) / 2) * 9, z: Math.sin(a) * radius, k: 0.055 };
    }
    if (f === 'cube') {
      const side = Math.ceil(Math.cbrt(N));
      const cells = side ** 3;
      // Affine Permutation verteilt die Knoten gleichmäßig auf alle Würfelschichten.
      const cell = (info.i * 103 + 19) % cells;
      const x = cell % side;
      const y = Math.floor(cell / side) % side;
      const z = Math.floor(cell / (side * side));
      const center = (side - 1) / 2;
      return { x: (x - center) * 76, y: (y - center) * 76, z: (z - center) * 76, k: 0.055 };
    }
    if (f === 'galaxy') {
      const a = (info.g / G) * Math.PI * 2 + info.r * 0.32;
      const rad = 70 + info.r * 26;
      return { x: Math.cos(a) * rad, y: Math.sin(info.r * 1.7) * 14, z: Math.sin(a) * rad, k: 0.05 };
    }
    if (f === 'clusters') {
      const a = (info.g / G) * Math.PI * 2;
      const R = 120 + G * 28;
      return { x: Math.cos(a) * R, y: ((info.g % 2) - 0.5) * 80, z: Math.sin(a) * R, k: 0.016 };
    }
    // Gehirn: Gruppen wechseln zwischen linker und rechter Hemisphäre, von vorn nach hinten.
    if (node.type === 'goal') return { x: 0, y: 0, z: 0, k: 0.08 };
    const s = info.g + 1;
    const side = s % 2 ? -1 : 1;
    const slot = Math.ceil(s / 2) - 1;
    const slots = Math.max(4, Math.ceil(G / 2));
    const phi = -Math.PI * 0.42 + (slot / Math.max(1, slots - 1)) * Math.PI * 0.84;
    const spread = 1 + Math.max(0, G - 8) * 0.06;
    return { x: side * 150 * spread, y: -Math.cos(phi) * 70 + 20, z: Math.sin(phi) * 230 * spread, k: 0.014 };
  }

  _placeNew(node) {
    const neighbours = this.edges
      .filter((e) => e.from === node.id || e.to === node.id)
      .map((e) => this.nodes.get(e.from === node.id ? e.to : e.from))
      .filter((m) => m && m.x !== undefined);
    const base = neighbours.length
      ? neighbours.reduce((a, m) => ({ x: a.x + m.x / neighbours.length, y: a.y + m.y / neighbours.length, z: a.z + m.z / neighbours.length }), { x: 0, y: 0, z: 0 })
      : this._clusterCenter(node);
    const a = hash(node.id) * Math.PI * 2, b = hash(node.id + '#') * Math.PI - Math.PI / 2;
    node.x = base.x + Math.cos(a) * Math.cos(b) * 40;
    node.y = base.y + Math.sin(b) * 40;
    node.z = base.z + Math.sin(a) * Math.cos(b) * 40;
  }

  // ---------- Simulation ----------
  _tick(alpha = this.alpha) {
    const list = [...this.nodes.values()].filter((n) => this.isVisibleNode(n));
    // Feste Formationen (Kugel, Helix, Galaxie): Abstoßung und Federn schwächer, damit die Form klar bleibt.
    const exact = ['sphere', 'helix', 'dna', 'cube', 'galaxy'].includes(this.formation);
    const repulse = exact ? 0.25 : 1;
    const springK = exact ? 0.006 : 0.03;
    // Abstoßung: einfache Paarschleife. Gemessen (467 Knoten, dichtes Gehirn-Layout) ist sie mit
    // ~1,5 ms schneller als ein Raumgitter, weil fast alle Knoten in Nachbarzellen liegen.
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 1) { dx = hash(a.id + b.id) - 0.5; dy = 0.5; dz = 0.3; d2 = 1; }
        if (d2 > REPULSE_CUTOFF2) continue;
        const d = Math.sqrt(d2);
        const f = (3200 / d2) * alpha * repulse;
        a.vx -= (dx / d) * f; a.vy -= (dy / d) * f; a.vz -= (dz / d) * f;
        b.vx += (dx / d) * f; b.vy += (dy / d) * f; b.vz += (dz / d) * f;
      }
    }
    for (const e of this.edges) {
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      if (!this.isVisibleNode(a) || !this.isVisibleNode(b)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const rest = a.step === b.step ? 70 : 130;
      const f = (d - rest) * springK * alpha;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f; a.vz += (dz / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; b.vz -= (dz / d) * f;
    }
    const clamp = (v) => (v > 30 ? 30 : v < -30 ? -30 : v);
    for (const n of list) {
      const c = this._clusterCenter(n);
      const k = c.k;
      n.vx += (c.x - n.x) * k * alpha;
      n.vy += (c.y - n.y) * k * alpha;
      n.vz += (c.z - n.z) * k * alpha;
      n.vx *= 0.78; n.vy *= 0.78; n.vz *= 0.78;
      n.x += clamp(n.vx); n.y += clamp(n.vy); n.z += clamp(n.vz);
    }
  }

  // ---------- Projektion / Kamera ----------
  _resize() {
    // clientWidth/-Height statt getBoundingClientRect: unabhängig von CSS-Transformationen
    // (z. B. Einblend-Animation), sonst passen Maus- und Knotenpositionen nicht zusammen.
    const r = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
    // Pixeldichte auf 2 begrenzt: 4K-/Handy-Bildschirme müssten sonst ein Vielfaches füllen.
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    if (this.loaded && !this.userMoved) this.fit(false);
  }

  /** Raumkoordinate -> Bildschirm, inkl. Tiefe und Perspektivfaktor. */
  project(n) {
    const { yaw, pitch } = this.rot;
    const c = this.pivot;
    const px = n.x - c.x, py = n.y - c.y, pz = n.z - c.z;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = px * cy - pz * sy;
    const z1 = px * sy + pz * cy;
    const y2 = py * cp - z1 * sp;
    const z2 = py * sp + z1 * cp;
    // Nenner nach unten begrenzt: Knoten nahe/hinter der Kamera (z. B. nach Zoom auf einen
    // weit hinten liegenden Knoten) bekämen sonst einen riesigen oder negativen Faktor.
    const f = PERSPECTIVE / Math.max(PERSPECTIVE * 0.3, PERSPECTIVE + z2);
    return {
      x: (x1 * f - this.cam.x) * this.cam.k + this.w / 2,
      y: (y2 * f - this.cam.y) * this.cam.k + this.h / 2,
      z: z2,
      f,
    };
  }

  fit(animate = true) {
    if (this.replayActive) this.replayFollowing = false;
    const list = [...this.nodes.values()].filter((n) => this.isVisibleNode(n));
    if (!list.length || !this.w || !this.h) return false;
    this.userMoved = false;
    this.focusId = null;
    this.spin = null;
    this._computePivotTarget();
    this.pivot = { ...this.pivotTarget };
    // Tatsächliche projizierte Grenzen verwenden, damit auch große Karten ganz ins Bild passen.
    const previousCam = this.cam;
    this.cam = { x: 0, y: 0, k: 1 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of list) {
      const p = this.project(n);
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    this.cam = previousCam;
    const pad = Math.min(64, Math.max(24, Math.min(this.w, this.h) * 0.07));
    const spanX = Math.max(1, maxX - minX + 72), spanY = Math.max(1, maxY - minY + 72);
    const k = Math.max(0.05, Math.min(5, (this.w - pad * 2) / spanX, (this.h - pad * 2) / spanY));
    this.fitK = k;
    this.camTarget = { x: (minX + maxX) / 2 - this.w / 2, y: (minY + maxY) / 2 - this.h / 2, k };
    if (!animate || this.reducedMotion()) { this.cam = { ...this.camTarget }; this._updatePivot(1); }
    return true;
  }

  /** Knoten wird Drehpunkt, gleitet in die Bildmitte und wird auf Zoomstufe k gebracht. */
  focusNode(id, k) {
    const n = this.nodes.get(id);
    if (!n) return;
    this.userMoved = true;
    this.focusId = id;
    this.spin = null;
    this.lastInteract = performance.now();
    this.camTarget = { x: 0, y: 0, k: Math.max(0.25, Math.min(5, k)) };
    if (this.reducedMotion()) { this.cam = { ...this.camTarget }; this._updatePivot(1); }
  }

  zoomBy(f, sx = this.w / 2, sy = this.h / 2) {
    if (this.replayActive && f < 1) { this.replayFollowing = false; this.focusId = null; }
    this.userMoved = true;
    const t = this.camTarget;
    const k2 = Math.max(0.05, Math.min(5, t.k * f));
    // Punkt unter dem Zeiger bleibt stehen
    const px = (sx - this.w / 2) / t.k + t.x;
    const py = (sy - this.h / 2) / t.k + t.y;
    this.camTarget = { k: k2, x: px - (sx - this.w / 2) / k2, y: py - (sy - this.h / 2) / k2 };
    if (this.reducedMotion()) this.cam = { ...this.camTarget };
  }

  panBy(dx, dy) {
    if (this.replayActive) this.stopReplay(true);
    this.userMoved = true;
    for (const c of [this.cam, this.camTarget]) {
      c.x -= dx / this.cam.k;
      c.y -= dy / this.cam.k;
    }
  }

  // Drehpunkt = Mitte der Bounding-Box aller Knoten. Wird nur bei neuen Daten neu bestimmt
  // und dann sanft angefahren, damit er beim Drehen nicht wandert.
  _computePivotTarget() {
    const list = [...this.nodes.values()].filter((n) => this.isVisibleNode(n));
    if (!list.length) return;
    const lo = { x: Infinity, y: Infinity, z: Infinity }, hi = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const n of list) for (const a of ['x', 'y', 'z']) { if (n[a] < lo[a]) lo[a] = n[a]; if (n[a] > hi[a]) hi[a] = n[a]; }
    this.pivotTarget = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
    let r = 60;
    for (const n of list) r = Math.max(r, Math.hypot(n.x - this.pivotTarget.x, n.y - this.pivotTarget.y, n.z - this.pivotTarget.z));
    this.radius = r;
  }

  _updatePivot(rate) {
    const focus = this.focusId && this.nodes.get(this.focusId);
    const target = focus || this.pivotTarget;
    if (!target) return;
    for (const axis of ['x', 'y', 'z']) this.pivot[axis] += (target[axis] - this.pivot[axis]) * rate;
  }

  rotateBy(dyaw, dpitch) {
    if (this.replayActive) this.stopReplay(true);
    this.rot.yaw += dyaw;
    this.rot.pitch = Math.max(-1.3, Math.min(1.3, this.rot.pitch + dpitch));
    this.lastInteract = performance.now();
  }

  // ---------- Auswahl ----------
  select(id, { center = false } = {}) {
    if (this.replayActive) this.stopReplay(true);
    this.selected = id;
    const node = id ? this.nodes.get(id) : null;
    if (node) this.lastInteract = performance.now();
    if (node && center) this.focusNode(id, Math.max(this.camTarget.k, 1.8));
    this.onSelect?.(node, node ? this.relationsOf(id) : []);
  }

  relationsOf(id) {
    return this.edges
      .filter((e) => e.from === id || e.to === id)
      .map((e) => ({ rel: e.rel, outgoing: e.from === id, other: this.nodes.get(e.from === id ? e.to : e.from) }));
  }

  setFilter(text) { this.filter = text.trim().toLowerCase(); }

  matches(n) {
    if (!this.filter) return true;
    return (n.label + ' ' + n.summary + ' ' + (NODE_TYPES[n.type]?.label || '')).toLowerCase().includes(this.filter);
  }

  replayGrowth() {
    clearTimeout(this.replayTimer);
    if (this.replayActive) this.stopReplay(true);
    const order = [...this.nodes.values()].filter((node) => this.isVisibleNode(node)).sort((a, b) => (a.step - b.step) || (a.index - b.index));
    if (this.reducedMotion()) { this.hidden.clear(); this.onReplayLabel?.(null); return; }
    this.replayOrder = order;
    if (!order.length) { this.replayActive = false; this.onReplayProgress?.(0, 0, false, true); return; }
    this.replayIndex = 0;
    this.replayFollowing = true;
    this.hidden.clear();
    this.select(null);
    this.replayActive = true;
    this.focusId = null;
    this.replayLabelId = null;
    this.onReplayLabel?.(null);
    order.forEach((n) => this.hidden.add(n.id));
    this.onReplayProgress?.(0, order.length, true);
    this._showReplayStep();
  }

  _showReplayStep() {
    if (!this.replayOrder.length) return;
    const index = Math.max(0, Math.min(this.replayOrder.length - 1, this.replayIndex));
    const node = this.replayOrder[index];
    this.hidden.delete(node.id);
    node.born = performance.now();
    this.alpha = Math.max(this.alpha, 0.35);
    this.replayLabelId = node.id;
    this.replayLabelStarted = performance.now();
    this.onReplayLabel?.(node, index, this.replayOrder.length);
    this.onReplayProgress?.(index, this.replayOrder.length, true);
    if (this.replayFollowing) this.focusNode(node.id, 3.2);
    this.replayIndex = index + 1;
    this._scheduleReplay();
  }

  _scheduleReplay() {
    clearTimeout(this.replayTimer);
    this.replayTimer = setTimeout(() => {
      if (this.replayIndex >= this.replayOrder.length) {
        this.replayActive = false;
        this.hidden.clear();
        this.onReplayProgress?.(this.replayOrder.length - 1, this.replayOrder.length, false, true);
        if (this.replayFollowing) this.fit();
        this.replayFollowing = false;
        return;
      }
      this._showReplayStep();
    }, 520 / this.replaySpeed);
  }

  pauseReplay() {
    if (!this.replayActive) return false;
    clearTimeout(this.replayTimer);
    this.replayActive = false;
    this.onReplayProgress?.(Math.max(0, this.replayIndex - 1), this.replayOrder.length, false);
    return true;
  }

  resumeReplay() {
    if (!this.replayOrder.length) return this.replayGrowth();
    if (this.replayIndex >= this.replayOrder.length) return this.replayGrowth();
    if (this.replayActive) return false;
    this.replayActive = true;
    this._showReplayStep();
    return true;
  }

  seekGrowth(index) {
    if (!this.replayOrder.length) this.replayOrder = [...this.nodes.values()].filter((node) => this.isVisibleNode(node)).sort((a, b) => (a.step - b.step) || (a.index - b.index));
    if (!this.replayOrder.length) return false;
    clearTimeout(this.replayTimer);
    this.replayActive = false;
    const nextIndex = Math.max(0, Math.min(this.replayOrder.length - 1, Math.round(index)));
    this.replayOrder.forEach((node, i) => (i < nextIndex ? this.hidden.delete(node.id) : this.hidden.add(node.id)));
    this.replayIndex = nextIndex;
    this.replayFollowing = false;
    this.replayLabelId = null;
    this._showReplayStep();
    this.replayActive = false;
    clearTimeout(this.replayTimer);
    this.onReplayProgress?.(nextIndex, this.replayOrder.length, false);
    return true;
  }

  setReplaySpeed(speed) {
    this.replaySpeed = Math.max(0.35, Math.min(2.5, Number(speed) || 1));
    if (this.replayActive) this._scheduleReplay();
  }

  stopReplay(restoreOverview = false) {
    if (!this.replayActive) return false;
    clearTimeout(this.replayTimer);
    this.replayActive = false;
    this.hidden.clear();
    this.focusId = null;
    this.replayLabelId = null;
    this.onReplayLabel?.(null);
    this._computePivotTarget();
    if (restoreOverview) this.fit();
    return true;
  }

  /** Bildschirmposition eines Knotens (für Tests und Tastaturfokus). */
  screenPos(id) {
    const n = this.nodes.get(id);
    return n ? this.proj.get(id) || this.project(n) : null;
  }

  // ---------- Eingabe ----------
  // tolerance: zusätzlicher Fangradius in Pixeln (beim Zoomen großzügiger, damit kleine Icons leicht zu treffen sind)
  _nodeAt(sx, sy, tolerance = 5) {
    let best = null, bestScore = Infinity;
    for (const n of this.nodes.values()) {
      if (!this.isVisibleNode(n)) continue;
      const p = this.proj.get(n.id) || this.project(n);
      const dx = p.x - sx, dy = p.y - sy;
      if (dx > 160 || dx < -160 || dy > 160 || dy < -160) continue;
      const d = Math.hypot(dx, dy);
      const r = this._radius(n, p);
      if (d < r + tolerance) {
        const score = d < r ? p.z - 1e6 : d; // direkt getroffen (vorderster) vor knapp daneben (nächster)
        if (score < bestScore) { best = n; bestScore = score; }
      }
    }
    return best;
  }

  _bind() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      // Zeilen-Modus (Firefox) in Pixel umrechnen; große Sammel-Ereignisse proportional zoomen.
      const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1);
      const f = Math.exp(-Math.max(-800, Math.min(800, dy)) * 0.002);
      if (this.replayActive && f < 1) { this.replayFollowing = false; this.focusId = null; }
      const node = this._nodeAt(sx, sy, 22);
      this.lastInteract = performance.now();
      // Hineinzoomen auf einen Knoten: Knoten gleitet in die Mitte und wird groß.
      if (f > 1 && (node || this.focusId)) {
        this.focusNode(node ? node.id : this.focusId, this.camTarget.k * f * (node && node.id !== this.focusId ? 1.25 : 1));
        if (node) this.hover = node.id;
      } else if (f < 1 && this.focusId && this.camTarget.k * f <= (this.fitK || 0.6)) {
        this.fit(); // ganz herausgezoomt: zurück zur Übersicht
      } else {
        this.zoomBy(f, sx, sy);
      }
    }, { passive: false });
    c.addEventListener('dblclick', (e) => {
      const r = c.getBoundingClientRect();
      const node = this._nodeAt(e.clientX - r.left, e.clientY - r.top);
      if (node) this.focusNode(node.id, Math.max(this.camTarget.k * 1.6, 2.2));
      else this.fit();
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      if (this.replayActive) this.stopReplay(true);
      const r = c.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      drag = { sx, sy, lastX: sx, lastY: sy, node: this._nodeAt(sx, sy), moved: false, pan: e.shiftKey || e.button === 2, spin: null };
      this.spin = null;
      this.lastInteract = performance.now();
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (!drag) {
        const n = this._nodeAt(sx, sy);
        this.hover = n ? n.id : null;
        c.style.cursor = n ? 'pointer' : 'grab';
        return;
      }
      if (Math.hypot(sx - drag.sx, sy - drag.sy) > 4) drag.moved = true;
      if (drag.moved) {
        if (drag.pan) this.panBy(sx - drag.lastX, sy - drag.lastY);
        else {
          drag.spin = { yaw: (sx - drag.lastX) * 0.008, pitch: -(sy - drag.lastY) * 0.008 };
          this.rotateBy(drag.spin.yaw, drag.spin.pitch);
        }
        c.style.cursor = 'grabbing';
      }
      drag.lastX = sx; drag.lastY = sy;
    });
    const end = () => {
      if (!drag) return;
      if (!drag.moved && drag.node) this.select(drag.node.id);
      else if (!drag.moved) { this.select(null); this.fit(); } // Hintergrund: zurück zur Gesamtmitte
      else if (!drag.pan && !this.reducedMotion()) this.spin = drag.spin; // Nachlauf
      drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', (e) => {
      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (dirs[e.key]) {
        const [dx, dy] = dirs[e.key];
        if (e.shiftKey) this.panBy(-dx * 40, dy * 40);
        else this.rotateBy(dx * 0.12, dy * 0.12);
        e.preventDefault();
      } else if (e.key === '+' || e.key === '=') this.zoomBy(1.2);
      else if (e.key === '-') this.zoomBy(1 / 1.2);
      else if (e.key === '0') this.fit();
      else if (e.key === 'Escape') { if (this.selected) this.select(null); else if (this.focusId) this.fit(); }
    });
  }

  // ---------- Darstellung ----------
  _radius(n, p) {
    const base = NODE_TYPES[n.type]?.r || 9;
    // Knoten skalieren mit dem Zoom: herausgezoomt schrumpfen kleine Knoten (Dateien, Farben,
    // Texturen …) deutlich, damit das Bild ruhig bleibt; große Ankerknoten (Ziel, Schritte,
    // Mechaniken) behalten eine Mindestgröße. Hineingezoomt wird alles richtig groß.
    const zoom = Math.min(5, this.cam.k * 0.9);
    const floor = base >= 11 ? 0.75 : base >= 10 ? 0.5 : 0.32;
    return Math.min(140, base * p.f * Math.max(floor, zoom));
  }

  _frame(t) {
    if (!this.running) return;
    requestAnimationFrame(this._frame);
    // Versteckt (Listenansicht, anderer Tab, eingeklappt): weder rechnen noch zeichnen.
    if (!this.canvas.isConnected || this.canvas.hidden || document.hidden || !this.canvas.getClientRects().length) return;
    if (this.canvas.clientWidth !== this.w || this.canvas.clientHeight !== this.h) this._resize();
    // Kamera gleitet exponentiell zum Ziel (weiches Zoomen ohne Sprünge)
    const ease = this.reducedMotion() ? 1 : this.replayActive ? 0.09 : 0.16;
    for (const key of ['x', 'y', 'k']) this.cam[key] += (this.camTarget[key] - this.cam[key]) * ease;
    // Langsames Eigendrehen, solange niemand interagiert, nichts gewählt und nichts fokussiert ist.
    if (!this.reducedMotion() && !this.selected && !this.focusId && t - this.lastInteract > IDLE_BEFORE_SPIN) this.rot.yaw += AUTO_SPIN;
    if (this.spin) {
      this.rotateBy(this.spin.yaw, this.spin.pitch);
      this.spin = { yaw: this.spin.yaw * 0.92, pitch: this.spin.pitch * 0.92 };
      if (Math.abs(this.spin.yaw) + Math.abs(this.spin.pitch) < 0.0005) this.spin = null;
    }
    if (this.alpha > 0.004) { this._tick(); this.alpha *= 0.985; }
    this._updatePivot(this.replayActive ? 0.1 : this.focusId ? 0.14 : 0.06);
    // Ein Fehler beim Zeichnen darf die Schleife nie anhalten (sonst friert die Karte ein).
    const t0 = performance.now();
    try { this._draw(t); } catch (err) { if (!this._drawErr) { this._drawErr = true; console.error('Gehirnkarte: Zeichenfehler', err); } }
    this.stats.ms = this.stats.ms * 0.9 + (performance.now() - t0) * 0.1;
  }

  /** Vorgerendertes Knotenbild (Form mit Glanz und Glühen, Statusring, Abzeichen, Objektzeichen). */
  _sprite(n, col, badge) {
    const type = NODE_TYPES[n.type] || NODE_TYPES.idea;
    const kind = n.type === 'object' ? n.id : '';
    const key = `${type.shape}|${col}|${n.status}|${badge ? 1 : 0}|${kind}`;
    let s = this.sprites.get(key);
    if (s) return s;
    const R = SPRITE_R, half = Math.ceil(R * 1.7 + 12);
    const cv = document.createElement('canvas');
    cv.width = cv.height = half * 2 * SPRITE_SS;
    const g = cv.getContext('2d');
    g.scale(SPRITE_SS, SPRITE_SS);
    g.translate(half, half);
    const status = NODE_STATUS[n.status] || NODE_STATUS.built;
    g.shadowColor = col; g.shadowBlur = 12;
    const grd = g.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R * 1.2);
    grd.addColorStop(0, '#fffaf0'); grd.addColorStop(0.35, col); grd.addColorStop(1, col);
    g.fillStyle = grd;
    this._shape(type.shape, 0, 0, R, g); g.fill();
    g.shadowBlur = 0;
    g.setLineDash(status.dash.map((d) => d * 2.4));
    g.lineWidth = 2.6; g.strokeStyle = ringColor(n.status);
    this._shape(type.shape, 0, 0, R + 3.5, g); g.stroke();
    g.setLineDash([]);
    if (kind) this._drawObjectSprite(kind, 0, 0, R, col, g);
    if (badge && status.badge) {
      const br = R * 0.42, bx = R * 0.85, by = -R * 0.85;
      g.fillStyle = status.badgeColor; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = INK; g.font = `bold ${Math.round(br * 1.5)}px system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(status.badge, bx, by + 1);
    }
    s = { img: cv, half };
    this.sprites.set(key, s);
    if (this.sprites.size > 400) this.sprites.clear(); // Palettenwechsel: alte Bilder verwerfen
    return s;
  }

  /** Knoten ohne Vorlage zeichnen (Auswahl, Zeiger, Geburt, sehr groß hineingezoomt). */
  _drawNodeDirect(n, p, r, col, emphasized, birth, reduced) {
    const { ctx } = this;
    const type = NODE_TYPES[n.type] || NODE_TYPES.idea;
    const status = NODE_STATUS[n.status] || NODE_STATUS.built;
    ctx.shadowColor = col;
    ctx.shadowBlur = emphasized ? 22 : birth < 1 && !reduced ? 26 * (1 - birth) + 8 : Math.min(8, r * 1.2);
    const grd = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r * 1.2);
    grd.addColorStop(0, '#fffaf0'); grd.addColorStop(0.35, col); grd.addColorStop(1, col);
    ctx.fillStyle = grd;
    this._shape(type.shape, p.x, p.y, r); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.setLineDash(status.dash);
    ctx.lineWidth = n.id === this.selected ? 2.5 : Math.max(0.6, Math.min(1.5, r * 0.18));
    ctx.strokeStyle = n.id === this.selected ? '#fff3d6' : ringColor(n.status);
    this._shape(type.shape, p.x, p.y, r + Math.min(3.5, r * 0.4)); ctx.stroke();
    ctx.setLineDash([]);
    if (n.type === 'object') this._drawObjectSprite(n.id, p.x, p.y, r, col);
    const badgeR = Math.min(6, r * 0.55);
    if (status.badge && badgeR >= 3) {
      const bx = p.x + r * 0.85, by = p.y - r * 0.85;
      ctx.fillStyle = status.badgeColor;
      ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI * 2); ctx.fill();
      if (badgeR >= 4.5) {
        ctx.fillStyle = INK;
        ctx.font = `bold ${Math.round(badgeR * 1.5)}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(status.badge, bx, by + 0.5);
      }
    }
  }

  _draw(t) {
    const { ctx } = this;
    const reduced = this.reducedMotion();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // Projektion einmal pro Frame
    this.proj.clear();
    let zMin = 0, zMax = 1;
    for (const n of this.nodes.values()) {
      const p = this.project(n);
      this.proj.set(n.id, p);
      if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z;
    }
    const zSpan = Math.max(1, zMax - zMin);
    const depth = (z) => 1 - 0.55 * ((z - zMin) / zSpan); // 1 vorn … 0.45 hinten

    const sel = this.selected;
    const near = new Set();
    if (sel) {
      near.add(sel);
      for (const e of this.edges) { if (e.from === sel) near.add(e.to); if (e.to === sel) near.add(e.from); }
    }
    const visible = (n) => this.isVisibleNode(n);
    const dimmed = (n) => (sel && !near.has(n.id)) || !this.matches(n);

    this._drawCore(t, reduced);

    // ---- Kanten: nur, was das Bild berührt; gebündelt nach Farbe/Deckkraft/Stärke ----
    const M = 30, W = this.w, H = this.h;
    const offscreen = (p, r = 0) => p.x < -M - r || p.y < -M - r || p.x > W + M + r || p.y > H + M + r;
    const bothOut = (pa, pb) => (pa.x < -M && pb.x < -M) || (pa.y < -M && pb.y < -M) || (pa.x > W + M && pb.x > W + M) || (pa.y > H + M && pb.y > H + M);
    const buckets = new Map();
    const pulses = new Map();
    const active = [];
    let edgeCount = 0;
    for (const e of this.edges) {
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      if (!visible(a) || !visible(b)) continue;
      const pa = this.proj.get(a.id), pb = this.proj.get(b.id);
      if (bothOut(pa, pb)) continue;
      edgeCount++;
      const grow = Math.min(this._birth(a, t), this._birth(b, t));
      if (sel && (e.from === sel || e.to === sel)) { active.push({ e, a, b, pa, pb, grow }); continue; }
      const faded = dimmed(a) || dimmed(b);
      const dz = depth((pa.z + pb.z) / 2);
      const alpha = faded ? 0.05 : Math.round(0.36 * dz * 16) / 16;
      const width = Math.round(1.2 * Math.max(0.6, (pa.f + pb.f) / 2) * 2.5) / 2.5;
      const col = colorOf(a, this.palette);
      const key = `${col}|${alpha}|${width}`;
      let bk = buckets.get(key);
      if (!bk) { bk = { col, alpha, width, pts: [] }; buckets.set(key, bk); }
      bk.pts.push(pa.x, pa.y, pa.x + (pb.x - pa.x) * grow, pa.y + (pb.y - pa.y) * grow);
      // Signalimpulse entlang der Verbindungen (kleine Pixel-Lichter)
      if (!reduced && !faded && grow >= 1) {
        const phase = ((t / 2600) + (this._edgeHash?.get(e) ?? 0)) % 1;
        const pa2 = Math.round(0.4 * dz * 8) / 8;
        let list = pulses.get(pa2);
        if (!list) { list = []; pulses.set(pa2, list); }
        list.push(pa.x + (pb.x - pa.x) * phase, pa.y + (pb.y - pa.y) * phase, Math.max(1.2, 1.6 * pa.f));
      }
    }
    ctx.lineCap = 'butt';
    for (const bk of buckets.values()) {
      ctx.globalAlpha = bk.alpha;
      ctx.strokeStyle = bk.col;
      ctx.lineWidth = bk.width;
      ctx.beginPath();
      const p = bk.pts;
      for (let i = 0; i < p.length; i += 4) { ctx.moveTo(p[i], p[i + 1]); ctx.lineTo(p[i + 2], p[i + 3]); }
      ctx.stroke();
    }
    ctx.fillStyle = '#fff3d6';
    for (const [alpha, p] of pulses) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 3) ctx.rect(p[i] - p[i + 2] / 2, p[i + 1] - p[i + 2] / 2, p[i + 2], p[i + 2]);
      ctx.fill();
    }
    // Verbindungen des gewählten Knotens: hervorgehoben, mit Farbverlauf und Pfeil
    for (const { a, b, pa, pb, grow } of active) {
      const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      grad.addColorStop(0, colorOf(a, this.palette));
      grad.addColorStop(1, colorOf(b, this.palette));
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2 * Math.max(0.6, (pa.f + pb.f) / 2);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pa.x + (pb.x - pa.x) * grow, pa.y + (pb.y - pa.y) * grow); ctx.stroke();
      if (grow >= 1) {
        const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
        const rb = this._radius(b, pb) + 4;
        const hx = pb.x - Math.cos(ang) * rb, hy = pb.y - Math.sin(ang) * rb;
        ctx.fillStyle = colorOf(b, this.palette);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(ang - 0.45) * 7, hy - Math.sin(ang - 0.45) * 7);
        ctx.lineTo(hx - Math.cos(ang + 0.45) * 7, hy - Math.sin(ang + 0.45) * 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ---- Knoten (hinten zuerst, Auswahl zuletzt), nur die im Bild ----
    const order = [];
    for (const n of this.nodes.values()) {
      if (!visible(n)) continue;
      const p = this.proj.get(n.id);
      if (n.id !== sel && offscreen(p, this._radius(n, p))) continue;
      order.push(n);
    }
    order.sort((a, b) => (a.id === sel) - (b.id === sel) || this.proj.get(b.id).z - this.proj.get(a.id).z);
    const labels = [];
    const bigPx = SPRITE_R * SPRITE_SS * 1.15 / this.dpr; // ab hier direkt zeichnen (schärfer)
    for (const n of order) {
      const status = NODE_STATUS[n.status] || NODE_STATUS.built;
      const p = this.proj.get(n.id);
      const dz = depth(p.z);
      const birth = this._birth(n, t);
      const ease = 1 - Math.pow(1 - birth, 3);
      const r = this._radius(n, p) * (reduced ? 1 : 0.4 + 0.6 * ease + (birth < 1 ? Math.sin(birth * Math.PI) * 0.25 : 0));
      const fade = (dimmed(n) ? 0.16 : status.faded ? 0.5 : 1) * (n.id === sel ? 1 : 0.35 + 0.65 * dz);
      ctx.globalAlpha = fade * (reduced ? 1 : Math.min(1, birth * 1.6));
      const col = colorOf(n, this.palette);
      const emphasized = n.id === sel || n.id === this.hover;

      if (r < 1.6 && !emphasized) {
        // winzig: ein einzelnes Farbpixel reicht
        ctx.fillStyle = col;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      } else if (emphasized || birth < 1 || r > bigPx) {
        this._drawNodeDirect(n, p, r, col, emphasized, birth, reduced);
      } else {
        const s = this._sprite(n, col, r * 0.55 >= 3);
        const k = r / SPRITE_R, size = s.half * 2 * k;
        ctx.drawImage(s.img, p.x - s.half * k, p.y - s.half * k, size, size);
      }

      // Neu entstanden: zwei Lichtwellen breiten sich aus, damit man Wachstum sofort sieht
      const age = t - n.born;
      if (!reduced && age >= 0 && age < WAVE_MS) {
        const save = ctx.globalAlpha;
        for (const off of [0, 0.35]) {
          const k = (age / WAVE_MS + off) % 1;
          ctx.globalAlpha = (1 - k) * 0.8;
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 6 + k * 46, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = save;
      }

      const important = n.type === 'goal' || n.id === sel || n.id === this.hover || near.has(n.id) || (this.filter && this.matches(n));
      const replayFocus = this.replayActive && n.id === this.replayLabelId;
      const showLabel = this.replayActive ? replayFocus : important || (this.cam.k * p.f >= 0.8 && dz > 0.62);
      if (showLabel && birth > 0.5) {
        const lf = replayFocus ? Math.min(1, (t - this.replayLabelStarted) / 180) : 1;
        labels.push({ x: p.x, y: p.y + r + 13, text: n.label, strong: replayFocus || n.id === sel || n.type === 'goal', important: replayFocus || important, z: p.z, a: ctx.globalAlpha * lf });
      }
      ctx.globalAlpha = 1;
    }
    // Beschriftungen zuletzt; überlappende werden weggelassen (Wichtiges und Vorderes zuerst).
    labels.sort((a, b) => (b.important - a.important) || (a.z - b.z));
    const placed = [];
    for (const l of labels) {
      if (placed.length >= MAX_LABELS && !l.strong) break;
      const w = this._textWidth(l.text, l.strong) + 12;
      const box = { x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y - 9, y1: l.y + 9 };
      if (box.x1 < 0 || box.x0 > W || box.y1 < 0 || box.y0 > H) continue;
      const hit = placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
      if (hit && !l.strong) continue;
      placed.push(box);
      ctx.globalAlpha = Math.max(0.6, l.a);
      this._label(l.x, l.y, l.text, { strong: l.strong, w });
    }
    if (sel) {
      ctx.globalAlpha = 1;
      for (const { e, pa, pb } of active) this._label((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, e.rel, { small: true });
    }
    ctx.globalAlpha = 1;
    this.stats.nodes = order.length;
    this.stats.edges = edgeCount;
  }

  // Drehpunkt: glimmender Kern (wie eine Laterne) in der Mitte aller Knoten plus Orbit-Ring als Lagehinweis.
  _drawCore(t, reduced) {
    const { ctx } = this;
    const c = this.project(this.pivot);
    const R = (this.radius || 200) * 0.9;
    ctx.save();
    for (const [plane, alpha] of [['xz', 0.2], ['xy', 0.08]]) {
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const p = this.project({
          x: this.pivot.x + Math.cos(a) * R,
          y: this.pivot.y + (plane === 'xy' ? Math.sin(a) * R : 0),
          z: this.pivot.z + (plane === 'xz' ? Math.sin(a) * R : 0),
        });
        ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y);
      }
      ctx.strokeStyle = `rgba(255,209,140,${alpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const pulse = reduced ? 1 : 1 + Math.sin(t / 700) * 0.15;
    const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 34 * pulse);
    glow.addColorStop(0, 'rgba(255,200,110,0.5)');
    glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(c.x, c.y, 34 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,180,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(c.x - 2, c.y - 2, 4, 4);
    ctx.restore();
  }

  _birth(n, t) {
    if (n.born === -Infinity || this.reducedMotion()) return 1;
    return Math.max(0, Math.min(1, (t - n.born) / BIRTH_MS));
  }

  _font(strong, small) { return `${strong ? 700 : 600} ${small ? 10 : 11.5}px system-ui, "Segoe UI", sans-serif`; }

  _textWidth(text, strong = false, small = false) {
    const key = `${strong ? 1 : 0}${small ? 1 : 0}${text}`;
    let w = this.textW.get(key);
    if (w == null) {
      this.ctx.font = this._font(strong, small);
      w = this.ctx.measureText(text).width;
      if (this.textW.size > 3000) this.textW.clear();
      this.textW.set(key, w);
    }
    return w;
  }

  // Beschriftung als kleines Pergament-Schild mit Holzrand (Spielstil)
  _label(x, y, text, { small = false, strong = false, w } = {}) {
    const { ctx } = this;
    w = w ?? this._textWidth(text, strong, small) + 12;
    const h = small ? 15 : 18;
    const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x0 - 2, y0 - 2, Math.round(w) + 4, h + 4);
    ctx.fillStyle = small ? '#e6cd98' : PARCH;
    ctx.fillRect(x0, y0, Math.round(w), h);
    ctx.font = this._font(strong, small);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = strong ? '#6b2f0a' : INK;
    ctx.fillText(text, x, y + 0.5);
  }

  // Kleine Vektorzeichen nach den Spielgrafiken (für Spielobjekt-Knoten).
  _drawObjectSprite(id, x, y, r, color, ctx = this.ctx) {
    const kind = id.replace(/^g-obj-/, '');
    const q = Math.max(1.5, r * 0.58);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.82)';
    ctx.fillStyle = 'rgba(0,0,0,.82)';
    ctx.lineWidth = Math.max(0.9, r * 0.15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const line = (...points) => {
      ctx.beginPath();
      points.forEach(([px, py], i) => ctx[i ? 'lineTo' : 'moveTo'](x + px * q, y + py * q));
      ctx.stroke();
    };
    if (kind === 'emitter') {
      line([-0.8, 0], [0.62, 0]); line([0.18, -0.42], [0.68, 0], [0.18, 0.42]);
    } else if (kind === 'target') {
      ctx.beginPath(); ctx.arc(x, y, q * 0.75, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, q * 0.27, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'mirrorblock') {
      line([-0.65, 0.65], [0.65, -0.65]);
    } else if (kind === 'stone') {
      ctx.strokeRect(x - q * 0.55, y - q * 0.45, q * 1.1, q * 0.9);
      line([-0.5, 0.05], [0.5, 0.05]);
    } else if (kind === 'prism') {
      line([0, -0.75], [0.7, 0.55], [-0.7, 0.55], [0, -0.75]);
      line([0, -0.45], [0, 0.4]);
    } else if (kind === 'filter') {
      ctx.strokeRect(x - q * 0.65, y - q * 0.55, q * 1.3, q * 1.1);
      line([-0.2, -0.4], [-0.2, 0.4]); line([0.2, -0.4], [0.2, 0.4]);
    } else if (kind === 'ice') {
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3;
        line([-Math.cos(a) * 0.7, -Math.sin(a) * 0.7], [Math.cos(a) * 0.7, Math.sin(a) * 0.7]);
      }
    } else if (kind === 'splitter') {
      line([0, 0.72], [0, -0.05], [-0.55, -0.65]); line([0, -0.05], [0.55, -0.65]);
    } else if (kind === 'portal') {
      ctx.beginPath(); ctx.arc(x, y, q * 0.6, 0.25, 2.45); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, q * 0.6, 3.35, 5.55); ctx.stroke();
    } else if (kind === 'player') {
      line([0, -0.72], [0.62, 0.55], [-0.62, 0.55], [0, -0.72]);
    } else if (kind === 'wall') {
      line([-0.68, -0.1], [0.68, -0.1]); line([-0.25, -0.55], [-0.25, -0.1]); line([0.3, 0.15], [0.3, 0.62]);
    } else if (kind === 'floor') {
      ctx.fillStyle = color;
      for (const [dx, dy] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.35], [0.35, 0.35]]) {
        ctx.beginPath(); ctx.arc(x + dx * q, y + dy * q, Math.max(0.7, q * 0.09), 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'beam') {
      line([-0.75, 0], [0.75, 0]);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(1, q * 0.2), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _shape(shape, x, y, r, ctx = this.ctx) {
    ctx.beginPath();
    const poly = (sides, rot = -Math.PI / 2, rr = r) => {
      for (let i = 0; i < sides; i++) {
        const a = rot + (i / sides) * Math.PI * 2;
        ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    };
    switch (shape) {
      case 'diamond': poly(4, -Math.PI / 2, r * 1.15); break;
      case 'hexagon': poly(6, 0); break;
      case 'square': poly(4, Math.PI / 4, r * 1.2); break;
      case 'triangle': poly(3, -Math.PI / 2, r * 1.2); break;
      case 'pentagon': poly(5); break;
      case 'octagon': poly(8, Math.PI / 8); break;
      case 'cube': poly(6, -Math.PI / 2, r * 1.1); break;
      case 'tridown': poly(3, Math.PI / 2, r * 1.2); break;
      case 'star4':
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
          const rr = i % 2 ? r * 0.45 : r * 1.2;
          ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath(); break;
      case 'roundrect': ctx.roundRect(x - r * 1.2, y - r * 0.85, r * 2.4, r * 1.7, 3); break;
      case 'chevron':
        ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r * 1.1, y + r * 0.2); ctx.lineTo(x + r * 0.55, y + r * 0.9);
        ctx.lineTo(x, y + r * 0.35); ctx.lineTo(x - r * 0.55, y + r * 0.9); ctx.lineTo(x - r * 1.1, y + r * 0.2);
        ctx.closePath(); break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const rr = i % 2 ? r * 0.5 : r * 1.1;
          ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath(); break;
      default: ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }
}
