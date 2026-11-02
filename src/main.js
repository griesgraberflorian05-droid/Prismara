// Einstieg: einfacher Hash-Router zwischen Spiel- und Lab-Ansichten. Ohne Adresse geht es direkt ins Hauptmenü.
import { mountMenu } from './ui/menu.js';
import { mountLab } from './lab/labView.js';
import { mountPush } from './ui/pushView.js';
import { mountDaily } from './ui/dailyView.js';
import { mountAdventure } from './adventure/adventure.js';
import { mountArena } from './adventure/arena.js';
import { mountTextures } from './adventure/textureSheet.js';
import { setFavicon } from './ui/logo.js';
import { stopMusic } from './game/music.js';
import { startUpdateCheck } from './ui/updater.js';
import { applyFx } from './game/codes.js';
import { FX } from './game/fx.js';
import { startSplash } from './ui/splash.js';

setFavicon();
startUpdateCheck();
applyFx();
startSplash();
// F9: Regler für alle Effektwerte
addEventListener('keydown', (e) => {
  if (e.key !== 'F9') return;
  e.preventDefault();
  const old = document.getElementById('fx-panel');
  if (old) { old.remove(); return; }
  const box = document.createElement('div'); box.id = 'fx-panel';
  for (const k of ['hitstopLamp', 'hitstopBoss', 'shakePx', 'shakeDecay', 'sparksMin', 'sparksMax']) {
    const l = document.createElement('label'); l.textContent = k;
    const i = document.createElement('input'); i.type = 'number'; i.step = '0.1'; i.value = FX[k];
    i.addEventListener('input', () => { FX[k] = +i.value; });
    l.append(i); box.append(l);
  }
  document.body.append(box);
});
// Rechtsklick gesperrt (in Eingabefeldern bleibt er für Einfügen & Co.)
addEventListener('contextmenu', (e) => { if (!e.target.closest?.('input, textarea')) e.preventDefault(); });

const routes = {
  menu: { tab: 'game', mount: mountMenu },
  run: { tab: 'game', mount: mountPush },
  daily: { tab: 'game', mount: mountDaily },
  adv: { tab: 'game', mount: mountAdventure },
  arena: { tab: 'game', mount: mountArena },
  textures: { tab: 'game', mount: mountTextures },
  play: { tab: 'game', mount: mountPush }, // alte Links des entfernten Setz-Modus
  // Eigenständige Seite nur mit der Gehirnkarte (für ein zweites Fenster)
  brain: { tab: 'lab', mount: (root) => mountLab(root, ['full', 'standalone']) },
  lab: { tab: 'lab', mount: mountLab },
};
const DEFAULT_ROUTE = 'menu'; // alte Links auf #/home landen auch hier

const view = document.getElementById('view');
let unmount = null;

function parseHash() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: routes[name] ? name : DEFAULT_ROUTE, params: rest };
}

function render() {
  const { name, params } = parseHash();
  const route = routes[name];
  if (unmount) unmount();
  view.innerHTML = '';
  view.className = `view view-${name}`;
  document.body.classList.toggle('standalone', name === 'brain');
  // Spielseiten im einheitlichen Holz-/Pergament-Pixel-Stil (das Lab setzt seinen eigenen)
  document.body.classList.toggle('wood', route.tab === 'game');
  if (route.tab !== 'game') stopMusic();
  unmount = route.mount(view, params) || null;
  document.querySelectorAll('.tabs a').forEach((a) => {
    a.toggleAttribute('aria-current', a.dataset.tab === route.tab);
  });
}

export function registerRoute(name, tab, mount) {
  routes[name] = { tab, mount };
}

window.addEventListener('hashchange', render);
render();
