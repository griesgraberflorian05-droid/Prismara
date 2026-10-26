// Texturbogen (#/textures): zeigt für jede Welt einen Musterraum mit allen Pixel-Sprites –
// Wände in Schrägsicht, Boden, Kisten, Lichtquellen, Ziele, Tore, Gegner, Ausgang, Fragmente.
import { parsePushLevel, createPushState, pushTrace } from '../game/push.js';
import { PixelRenderer, PIXEL_THEMES } from '../game/pixelRender.js';

const SAMPLE = {
  id: 'sheet', name: 'Musterraum',
  legend: {
    a: { type: 'emitter', dir: 'E', color: 'R' }, b: { type: 'emitter', dir: 'S', color: 'B' },
    1: { type: 'target', color: 'R' }, 3: { type: 'target', color: 'B' }, 5: { type: 'target', color: 'RB' },
    S: { type: 'sensor', color: 'R', door: 'A' }, D: { type: 'door', door: 'A' },
    A: { type: 'portal', pair: 'A' }, f: { type: 'filter', color: 'G' },
    L: { type: 'lamp', dir: 'W', color: 'G' }, F: { type: 'flip', plate: 'Z', orient: '/' }, p: { type: 'plate', plate: 'Z' },
  },
  rows: [
    '##############',
    '#a....n....1.#',
    '#.b.~~..>>.A.#',
    '#..m.P.f.x.h.#',
    '#..o..@..z...#',
    '#S.D.p.F.L..3#',
    '##############',
  ],
};

export function mountTextures(root) {
  root.innerHTML = `<section class="tex-sheet"><h1 class="pixel">Texturen &amp; Sprites</h1>
    <p class="muted">Jede Welt hat eigene Wände (Schrägsicht mit Vorderkante), Böden und Lichtstimmung. Licht wie Minecraft-Shader: abgedunkelter Raum, farbiges Leuchten von Lampen, Strahlen und Zielen.</p>
    <div class="tex-grid" id="tex"></div></section>`;
  const level = parsePushLevel(SAMPLE);
  const state = createPushState(level);
  const tr = pushTrace(state);
  const grid = root.querySelector('#tex');
  const names = { default: 'Standard', beach: '🏖️ Sommerstrand', cherry: '🌸 Kirschblüte', jungle: '🌴 Dschungel', night: '🌙 Nachtwald', volcano: '🌋 Vulkanschmiede', temple: '🏜️ Wüstentempel', shadow: '🌑 Schattenreich', aurora: '❄️ Polarlicht', reef: '🐠 Korallenriff', castle: '🏰 Burgverlies', moor: '🌫️ Nebelmoor' };
  const cards = Object.entries(PIXEL_THEMES).map(([id, theme]) => {
    const fig = document.createElement('figure');
    const c = document.createElement('canvas');
    fig.appendChild(c);
    const cap = document.createElement('figcaption'); cap.textContent = names[id] || id; fig.appendChild(cap);
    grid.appendChild(fig);
    return { c, theme, pix: new PixelRenderer(level) };
  });
  let running = true;
  const exit = { x: 13, y: 3 };
  const fragments = [{ x: 4, y: 2, got: false }];
  function frame(t) {
    if (!running) return;
    for (const { c, theme, pix } of cards) {
      const img = pix.draw(t, { tr, theme, blocks: state.blocks, player: state.player, enemies: state.enemies, exit, exitOpen: Math.floor(t / 1500) % 2 === 1, fragments, dock: { x: 7, y: 4, dir: 1 } });
      if (c.width !== img.width * 2) { c.width = img.width * 2; c.height = img.height * 2; }
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, c.width, c.height);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => { running = false; };
}
