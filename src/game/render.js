// Darstellung des Spielfelds auf Canvas. Farben werden zusätzlich über Formen kodiert:
// Rot ▲, Grün ●, Blau ■ – damit nichts allein von der Farbwahrnehmung abhängt.
import { COLOR_INFO, COMPONENTS, DIRS } from './engine.js';

const COMP_HEX = { 1: '#ff4d6d', 2: '#3ddc97', 4: '#4da3ff' };

export function drawGlyph(ctx, comp, x, y, r, { fill = true, color } = {}) {
  ctx.beginPath();
  if (comp === 1) {
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.95, y + r * 0.75); ctx.lineTo(x - r * 0.95, y + r * 0.75); ctx.closePath();
  } else if (comp === 2) {
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  } else {
    ctx.rect(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5);
  }
  const c = color || COMP_HEX[comp];
  if (fill) { ctx.fillStyle = c; ctx.fill(); }
  else { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.2, r * 0.22); ctx.stroke(); }
}

function glyphRow(ctx, mask, cx, cy, r, opts) {
  const comps = COMPONENTS.filter((c) => mask & c);
  const gap = r * 2.3;
  comps.forEach((c, i) => drawGlyph(ctx, c, cx + (i - (comps.length - 1) / 2) * gap, cy, r, typeof opts === 'function' ? opts(c) : opts));
}

export class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
  }

  resize() {
    const r = { width: this.canvas.clientWidth, height: this.canvas.clientHeight }; // transformunabhängig
    this.dpr = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
  }

  layout(level) {
    const pad = 12;
    this.size = Math.floor(Math.min((this.w - pad * 2) / level.w, (this.h - pad * 2) / level.h, 84));
    this.ox = Math.round((this.w - this.size * level.w) / 2);
    this.oy = Math.round((this.h - this.size * level.h) / 2);
  }

  cellAt(px, py, level) {
    const x = Math.floor((px - this.ox) / this.size), y = Math.floor((py - this.oy) / this.size);
    return x >= 0 && y >= 0 && x < level.w && y < level.h ? { x, y } : null;
  }

  cellCenter(x, y) {
    return { x: this.ox + (x + 0.5) * this.size, y: this.oy + (y + 0.5) * this.size };
  }

  /**
   * opts: { tr, cursor, hover, reduced, solvedAt, showCursor, beamGrow }
   */
  draw(state, t, opts) {
    const { ctx } = this;
    const { level } = state;
    const s = this.size;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // Neon-Rahmen ums Spielfeld mit wanderndem Farbverlauf
    {
      const bx = this.ox - 6, by = this.oy - 6, bw = level.w * s + 12, bh = level.h * s + 12;
      const ph = opts.reduced ? 0 : (t / 3000) % 1;
      const ang = ph * Math.PI * 2;
      const cx = bx + bw / 2, cy = by + bh / 2, R = Math.max(bw, bh);
      const g = ctx.createLinearGradient(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, cx - Math.cos(ang) * R, cy - Math.sin(ang) * R);
      g.addColorStop(0, '#f2f2f2'); g.addColorStop(0.5, '#999'); g.addColorStop(1, '#555');
      ctx.save();
      ctx.fillStyle = 'rgba(18,18,18,0.8)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, s * 0.25); ctx.fill();
      ctx.shadowColor = '#bbb'; ctx.shadowBlur = 18;
      ctx.strokeStyle = g; ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Kacheln
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        const c = state.cells[y * level.w + x];
        const px = this.ox + x * s, py = this.oy + y * s;
        if (c.type === 'wall') {
          const g = ctx.createLinearGradient(px, py, px, py + s);
          g.addColorStop(0, '#555'); g.addColorStop(1, '#262626');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.roundRect(px + 1, py + 1, s - 2, s - 2, s * 0.14); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillRect(px + s * 0.14, py + 3, s * 0.72, 2);
          continue;
        }
        const buildable = c.type === 'empty' && c.build;
        const noBuild = c.type === 'empty' && c.build === false;
        ctx.fillStyle = noBuild ? '#101010' : '#191919';
        ctx.beginPath(); ctx.roundRect(px + 2, py + 2, s - 4, s - 4, s * 0.12); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        ctx.stroke();
        if (c.ice) {
          // Eis: hellblau mit Glanzstreifen
          const g = ctx.createLinearGradient(px, py, px + s, py + s);
          g.addColorStop(0, 'rgba(235,235,235,0.28)'); g.addColorStop(1, 'rgba(120,120,120,0.14)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.roundRect(px + 2, py + 2, s - 4, s - 4, s * 0.12); ctx.fill();
          ctx.strokeStyle = 'rgba(245,245,245,0.4)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(px + s * 0.2, py + s * 0.45); ctx.lineTo(px + s * 0.45, py + s * 0.2);
          ctx.moveTo(px + s * 0.35, py + s * 0.75); ctx.lineTo(px + s * 0.75, py + s * 0.35); ctx.stroke();
        } else if (buildable) {
          ctx.fillStyle = 'rgba(210,210,210,0.2)';
          ctx.beginPath(); ctx.arc(px + s / 2, py + s / 2, Math.max(1.5, s * 0.03), 0, Math.PI * 2); ctx.fill();
        } else if (noBuild) {
          // nicht bebaubar: feine Schraffur
          ctx.save();
          ctx.beginPath(); ctx.roundRect(px + 2, py + 2, s - 4, s - 4, s * 0.12); ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
          for (let k = -s; k < s; k += 8) { ctx.beginPath(); ctx.moveTo(px + k, py + s); ctx.lineTo(px + k + s, py); ctx.stroke(); }
          ctx.restore();
        }
      }
    }

    // Schiebe-Modus: Blocksockel unter den Strahlen
    for (const b of opts.blocks || []) this._drawBlockBase(b, s);

    // Strahlen
    this._drawBeams(opts.tr.beams, t, opts);

    for (const b of opts.blocks || []) {
      const c = this.cellCenter(b.x, b.y);
      if (b.kind === 'mirror') this._drawMirror({ orient: b.orient }, c.x, c.y, s, 1, true);
      if (b.kind === 'splitter') this._drawSplitter(b.orient, c.x, c.y, s);
      if (b.kind === 'prism') this._drawPrism(c.x, c.y, s);
      if (b.kind === 'filter') this._drawFilter(b.pass, c.x, c.y, s);
    }

    // Objekte
    const targetInfo = new Map(opts.tr.targets.map((tg) => [tg.y * level.w + tg.x, tg]));
    state.cells.forEach((c, i) => {
      const x = i % level.w, y = Math.floor(i / level.w);
      const { x: cx, y: cy } = this.cellCenter(x, y);
      if (c.type === 'emitter') this._drawEmitter(c, cx, cy, s);
      if (c.type === 'portal') this._drawPortal(c, cx, cy, s, t, opts);
      if (c.type === 'mirror') this._drawMirror(c, cx, cy, s, 1);
      if (c.type === 'target') this._drawTarget(c, targetInfo.get(i), cx, cy, s, t, opts);
    });

    if (opts.player) this._drawPlayer(opts.player, s, t, opts);

    // Tastatur-Cursor
    if (opts.showCursor && opts.cursor) {
      const px = this.ox + opts.cursor.x * s, py = this.oy + opts.cursor.y * s;
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = opts.reduced ? 0 : -t / 60;
      ctx.beginPath(); ctx.roundRect(px + 3, py + 3, s - 6, s - 6, s * 0.14); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _beamLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    return len;
  }

  _pointAt(points, d) {
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1], [x1, y1] = points[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      if (d <= seg) return [x0 + ((x1 - x0) * d) / seg, y0 + ((y1 - y0) * d) / seg];
      d -= seg;
    }
    return points[points.length - 1];
  }

  _drawBeams(beams, t, opts) {
    const { ctx } = this;
    const s = this.size;
    const toPx = ([x, y]) => [this.ox + x * s, this.oy + y * s];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const beam of beams) {
      const hex = COLOR_INFO[beam.color]?.hex || '#fff';
      const total = this._beamLength(beam.points);
      const shown = opts.beamGrow != null ? Math.min(total, (beam.prefix || 0) + opts.beamGrow) : total;
      // sichtbare Teilstrecke
      const pts = [beam.points[0]];
      let acc = 0;
      for (let i = 1; i < beam.points.length; i++) {
        const seg = Math.hypot(beam.points[i][0] - beam.points[i - 1][0], beam.points[i][1] - beam.points[i - 1][1]);
        if (acc + seg >= shown) { pts.push(this._pointAt(beam.points, shown)); break; }
        pts.push(beam.points[i]); acc += seg;
      }
      const px = pts.map(toPx);
      const stroke = (width, color, alpha) => {
        ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.beginPath(); px.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.stroke();
      };
      const flicker = opts.reduced ? 1 : 0.9 + Math.sin(t / 140 + beam.points[0][0]) * 0.1;
      stroke(s * 0.5, hex, 0.1 * flicker);
      stroke(s * 0.26, hex, 0.3 * flicker);
      stroke(s * 0.12, hex, 0.75);
      stroke(s * 0.045, '#ffffff', 0.95);

      // Lichtteilchen mit Formsymbol wandern den Strahl entlang (Richtung + Farbe ohne Farbsinn)
      ctx.globalCompositeOperation = 'source-over';
      const spacing = 1.1;
      const offset = opts.reduced ? 0.55 : ((t / 1000) * 2.2) % spacing;
      const comps = COMPONENTS.filter((c) => beam.color & c);
      for (let d = offset; d < shown - 0.2; d += spacing) {
        const [gx, gy] = toPx(this._pointAt(beam.points, d));
        ctx.globalAlpha = 0.95;
        comps.forEach((c, k) => drawGlyph(ctx, c, gx + (k - (comps.length - 1) / 2) * s * 0.13, gy, s * 0.065, { color: '#ffffff' }));
      }
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.restore();
  }

  // Schiebbarer Block (x/y dürfen für Animation Zwischenwerte sein)
  _drawBlockBase(b, s) {
    const { ctx } = this;
    const { x: cx, y: cy } = this.cellCenter(b.x, b.y);
    const r = s * 0.42;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = s * 0.15; ctx.shadowOffsetY = s * 0.05;
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    if (b.kind === 'stone') { g.addColorStop(0, '#555'); g.addColorStop(1, '#292929'); }
    else { g.addColorStop(0, '#777'); g.addColorStop(1, '#383838'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(cx - r, cy - r, r * 2, r * 2, s * 0.12); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = b.kind !== 'stone' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (b.kind !== 'stone') {
      // Ecknieten: erkennbar als schiebbarer Spiegelblock
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath(); ctx.arc(cx + ox * r * 0.72, cy + oy * r * 0.72, s * 0.025, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.2); ctx.lineTo(cx + r * 0.1, cy + r * 0.3); ctx.lineTo(cx + r * 0.5, cy - r * 0.1); ctx.stroke();
    }
    ctx.restore();
  }

  _drawPrism(cx, cy, s) {
    const { ctx } = this;
    const r = s * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 1.05, cy + r * 0.8); ctx.lineTo(cx - r * 1.05, cy + r * 0.8); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    g.addColorStop(0, '#ff4d6d'); g.addColorStop(0.5, '#3ddc97'); g.addColorStop(1, '#4da3ff');
    ctx.strokeStyle = g; ctx.lineWidth = s * 0.05; ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = s * 0.12;
    ctx.stroke();
    ctx.restore();
  }

  // Strahlteiler: halbdurchlässiges Glas – gestrichelte Spiegelfläche mit Durchlass-Pfeilen.
  _drawSplitter(orient, cx, cy, s) {
    const { ctx } = this;
    const d = s * 0.32;
    const [x0, y0, x1, y1] = orient === '/' ? [cx - d, cy + d, cx + d, cy - d] : [cx - d, cy - d, cx + d, cy + d];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(220,220,220,0.35)'; ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.shadowColor = '#ccc'; ctx.shadowBlur = s * 0.12;
    ctx.strokeStyle = '#eee'; ctx.lineWidth = s * 0.06;
    ctx.setLineDash([s * 0.09, s * 0.07]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  // Portal: wirbelnder Ring; Paare teilen Farbe und Buchstaben (ohne Farbsinn erkennbar).
  _drawPortal(c, cx, cy, s, t, opts) {
    const { ctx } = this;
    const hue = { A: '#eee', B: '#aaa', C: '#666' }[c.pair] || '#bbb';
    const r = s * 0.36;
    const spin = opts.reduced ? 0 : t / 600;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, '#080808'); g.addColorStop(0.65, 'rgba(40,40,40,0.9)'); g.addColorStop(1, hue);
    ctx.fillStyle = g;
    ctx.shadowColor = hue; ctx.shadowBlur = s * 0.35;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hue; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a = spin + (k * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, a, a + 1.2); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(s * 0.26)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.pair, cx, cy + 1);
    ctx.restore();
  }

  _drawFilter(pass, cx, cy, s) {
    const { ctx } = this;
    const hex = COLOR_INFO[pass]?.hex || '#fff';
    const r = s * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = hex;
    ctx.beginPath(); ctx.roundRect(cx - r, cy - r, r * 2, r * 2, s * 0.06); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hex; ctx.lineWidth = 2;
    ctx.stroke();
    glyphRow(ctx, pass, cx, cy, s * 0.09, { fill: true, color: '#ffffff' });
    ctx.restore();
  }

  _drawPlayer(p, s, t, opts) {
    const { ctx } = this;
    const { x: cx, y: cy } = this.cellCenter(p.x, p.y);
    const bob = opts.reduced ? 0 : Math.sin(t / 380) * s * 0.015;
    const r = s * 0.36;
    ctx.save();
    ctx.shadowColor = '#ddd'; ctx.shadowBlur = s * 0.35;
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#bbb'); g.addColorStop(1, '#666');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(cx - r, cy - r + bob, r * 2, r * 2, s * 0.14); ctx.fill();
    ctx.shadowBlur = 0;
    // Prisma-Symbol
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.45 + bob); ctx.lineTo(cx + r * 0.45, cy + r * 0.35 + bob); ctx.lineTo(cx - r * 0.45, cy + r * 0.35 + bob); ctx.closePath();
    ctx.stroke();
    // Blickrichtung: leuchtende Kerbe auf der Seite, in die der Block schaut
    const [dx, dy] = DIRS[p.dir];
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx + dx * r * 0.8, cy + dy * r * 0.8 + bob, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawEmitter(c, cx, cy, s) {
    const { ctx } = this;
    const hex = COLOR_INFO[c.color]?.hex || '#fff';
    const r = s * 0.34;
    ctx.save();
    ctx.shadowColor = hex; ctx.shadowBlur = s * 0.25;
    ctx.fillStyle = '#1f2547';
    ctx.beginPath(); ctx.roundRect(cx - r, cy - r, r * 2, r * 2, s * 0.12); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hex; ctx.lineWidth = 2.5;
    ctx.stroke();
    // Austrittsrichtung
    const [dx, dy] = DIRS[c.dir];
    ctx.fillStyle = hex;
    ctx.beginPath();
    const tip = r + s * 0.1;
    ctx.moveTo(cx + dx * tip, cy + dy * tip);
    ctx.lineTo(cx + dx * r * 0.55 - dy * s * 0.12, cy + dy * r * 0.55 + dx * s * 0.12);
    ctx.lineTo(cx + dx * r * 0.55 + dy * s * 0.12, cy + dy * r * 0.55 - dx * s * 0.12);
    ctx.closePath(); ctx.fill();
    glyphRow(ctx, c.color, cx - dx * s * 0.05, cy - dy * s * 0.05, s * 0.09, { fill: true });
    ctx.restore();
  }

  _drawMirror(c, cx, cy, s, alpha, ghost = false) {
    const { ctx } = this;
    ctx.save();
    if (!ghost) {
      if (c.rotatable) {
        // runder Sockel mit Drehpfeilen = drehbar
        ctx.strokeStyle = 'rgba(235,235,235,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.36, 0.3, 1.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.36, Math.PI + 0.3, Math.PI + 1.3); ctx.stroke();
        ctx.fillStyle = 'rgba(235,235,235,0.1)';
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.33, 0, Math.PI * 2); ctx.fill();
      } else if (c.placed) {
        // gesetzter Spiegel: violette Ecken
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.roundRect(cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, s * 0.1); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(190,190,190,0.1)';
        ctx.beginPath(); ctx.roundRect(cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, 2); ctx.fill();
      }
    }
    const d = s * 0.32;
    const [x0, y0, x1, y1] = c.orient === '/' ? [cx - d, cy + d, cx + d, cy - d] : [cx - d, cy - d, cx + d, cy + d];
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#888'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#aaa');
    ctx.globalAlpha *= alpha;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ddd'; ctx.shadowBlur = ghost ? 0 : s * 0.1;
    ctx.strokeStyle = g; ctx.lineWidth = s * 0.085;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  _drawTarget(c, info, cx, cy, s, t, opts) {
    const { ctx } = this;
    const hex = COLOR_INFO[c.need]?.hex || '#fff';
    const r = s * 0.34;
    const okNow = info?.ok;
    const wrong = info && info.got && !info.ok;
    ctx.save();
    if (okNow) {
      const pulse = opts.reduced ? 1 : 1 + Math.sin(t / 220) * 0.08;
      ctx.shadowColor = hex; ctx.shadowBlur = s * 0.5 * pulse;
      ctx.fillStyle = hex;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = wrong ? '#ff5f6d' : hex;
    if (wrong) ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // äußerer Ring = Zielmarkierung
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r + s * 0.08, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    // benötigte Farbbestandteile: gefüllt, wenn sie ankommen, sonst nur Umriss
    const got = info?.got || 0;
    glyphRow(ctx, c.need, cx, cy - (okNow || wrong ? s * 0.06 : 0), s * 0.085, (comp) =>
      okNow ? { fill: true, color: '#0a0c16' } : (got & comp) ? { fill: true } : { fill: false });
    if (okNow) {
      ctx.strokeStyle = '#0a0c16'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.08, cy + s * 0.12); ctx.lineTo(cx - s * 0.02, cy + s * 0.18); ctx.lineTo(cx + s * 0.1, cy + s * 0.06);
      ctx.stroke();
    } else if (wrong) {
      ctx.fillStyle = '#ddd';
      ctx.font = `700 ${Math.round(s * 0.16)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('≠', cx, cy + s * 0.14);
    }
    ctx.restore();
  }
}

