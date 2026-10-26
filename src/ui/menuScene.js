// Lebendige Hintergrund-Szene fürs Menü: ein eingerichteter Pixel-Raum der aktuellen Welt mit
// Laternen, wachsender Ranke, blühenden Töpfen und dem Helden, der gemütlich herumschlendert.
// Gezeichnet mit demselben PixelRenderer wie das Spiel → Menü und Spiel sehen gleich aus.
import { parsePushLevel, createPushState, move, pushTrace } from '../game/push.js';
import { PixelRenderer, PIXEL_THEMES } from '../game/pixelRender.js';
import { prefersReducedMotion } from '../settings.js';

const SCENE = {
  id: 'scene', name: 'Titel',
  legend: { a: { type: 'emitter', dir: 'E', color: 'R' }, b: { type: 'emitter', dir: 'S', color: 'B' }, 1: { type: 'target', color: 'R' }, 3: { type: 'target', color: 'B' } },
  rows: [
    '#############',
    '#a...n...b..#',
    '#..#..##....#',
    '#......@....#',
    '#....1...3..#',
    '#############',
  ],
};

/** Startet die Szene in canvas. stage (optional): Element, in dessen Fläche der Raum eingepasst
 *  wird – sonst mittig. Liefert { setTheme(id), setStage(el), stop() }. */
export function mountScene(canvas, themeId = 'default', stage = null, def = SCENE) {
  const level = parsePushLevel(def);
  let state = createPushState(level);
  const tr = pushTrace(state);
  const pix = new PixelRenderer(level);
  let theme = PIXEL_THEMES[themeId] || PIXEL_THEMES.default;
  const ctx = canvas.getContext('2d');
  let run = true, anim = { t0: 0, x: state.player.x, y: state.player.y }, nextWalk = 2500, yawnAt = 0;
  const t0 = performance.now();
  function frame(t) {
    if (!run) return;
    const reduced = prefersReducedMotion();
    // Held schlendert ab und zu ein Feld weiter (nie schieben → die Szene bleibt gelöst)
    if (!reduced && t > nextWalk) {
      const d = Math.floor(Math.random() * 4);
      const n = move(state, d);
      if (n && n.pushed == null && n.moves !== state.moves && !tr.beams.some((b) => onBeam(b, n.player))) { anim = { t0: t, x: state.player.x, y: state.player.y }; state = n; }
      else state = { ...state, player: { ...state.player, dir: d } };
      nextWalk = t + 1800 + Math.random() * 2600;
      if (Math.random() < 0.3) yawnAt = t + 600;
    }
    const k = anim.t0 ? Math.min(1, (t - anim.t0) / 260) : 1;
    const e = 1 - Math.pow(1 - k, 3);
    const player = { x: anim.x + (state.player.x - anim.x) * e, y: anim.y + (state.player.y - anim.y) * e, dir: state.player.dir, walk: k < 1 ? k : null, push: 0, stamina: 1, exhausted: false, bump: 0, celebrate: 0, caught: false, yawn: yawnAt && t > yawnAt && t - yawnAt < 1800 };
    const img = pix.draw(reduced ? 0 : t, { tr, theme, blocks: state.blocks, player, enemies: [], grow: ((t - t0) / 1000) * 10 });
    const dpr = devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    // Raum in die Bühnenfläche einpassen (oder mittig, so groß dass die Außenwelt alles füllt)
    const v = pix.view;
    let scale, fx = cw / 2, fy = ch / 2;
    const r = stage?.isConnected ? stage.getBoundingClientRect() : null;
    if (r && r.width > 60 && r.height > 60) {
      const cr = canvas.getBoundingClientRect();
      fx = (r.left - cr.left + r.width / 2) * dpr; fy = (r.top - cr.top + r.height / 2) * dpr;
      scale = Math.max(1, Math.floor(Math.min((r.width * dpr) / v.w, (r.height * dpr) / v.h)));
    } else scale = Math.max(2, Math.ceil(Math.max(cw / img.width, ch / img.height)));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#120b06'; ctx.fillRect(0, 0, cw, ch);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    // Außenwelt kachelweise wiederholen, falls das Bild kleiner ist als der Bildschirm
    const ox = Math.round(fx - cx * scale), oy = Math.round(fy - cy * scale), iw = img.width * scale, ih = img.height * scale;
    ctx.drawImage(img, ox, oy, iw, ih);
    if (ox > 0 || oy > 0 || ox + iw < cw || oy + ih < ch) {
      const tile = 16 * 4 * scale; // Außenstreifen (4 Felder) als Füllung
      ctx.save(); ctx.globalAlpha = 1;
      for (let y = oy - tile; y > -tile; y -= tile) for (let x = ox; x < ox + iw; x += tile) ctx.drawImage(img, 0, 0, 64, 64, x, y, tile, tile);
      for (let y = oy + ih; y < ch; y += tile) for (let x = ox; x < ox + iw; x += tile) ctx.drawImage(img, 0, img.height - 64, 64, 64, x, y, tile, tile);
      for (let x = ox - tile; x > -tile; x -= tile) for (let y = Math.min(oy, 0) - tile; y < ch; y += tile) ctx.drawImage(img, 0, 0, 64, 64, x, y, tile, tile);
      for (let x = ox + iw; x < cw; x += tile) for (let y = Math.min(oy, 0) - tile; y < ch; y += tile) ctx.drawImage(img, 0, 0, 64, 64, x, y, tile, tile);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    setTheme(id) { theme = PIXEL_THEMES[id] || PIXEL_THEMES.default; },
    setStage(el) { stage = el; },
    stop() { run = false; },
  };
}

function onBeam(beam, p) {
  for (let i = 1; i < beam.points.length; i++) {
    const [x0, y0] = beam.points[i - 1], [x1, y1] = beam.points[i];
    const cx = p.x + 0.5, cy = p.y + 0.5;
    if (Math.min(x0, x1) - 0.01 <= cx && cx <= Math.max(x0, x1) + 0.01 && Math.min(y0, y1) - 0.01 <= cy && cy <= Math.max(y0, y1) + 0.01) return true;
  }
  return false;
}

/** Zeichnet einmalig ein Vorschaubild eines echten Raums (nur Raum + Rückwand). */
export function roomThumb(canvas, def, themeId, scale = 2) {
  const level = parsePushLevel(def);
  const state = createPushState(level);
  const tr = pushTrace(state);
  const pix = new PixelRenderer(level);
  const img = pix.draw(1200, { tr, theme: PIXEL_THEMES[themeId] || PIXEL_THEMES.default, blocks: state.blocks, player: { ...state.player, walk: null, stamina: 1 }, enemies: state.enemies });
  const v = pix.view, pad = 10;
  canvas.width = (v.w + pad * 2) * scale; canvas.height = (v.h + pad * 2) * scale;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, v.x - pad, v.y - pad, v.w + pad * 2, v.h + pad * 2, 0, 0, canvas.width, canvas.height);
}
