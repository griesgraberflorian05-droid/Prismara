// Einstieg: einfacher Hash-Router zwischen Startseite, Spiel- und Lab-Ansichten.
import { IS_DEV } from './config.js';
import { mountHome } from './ui/homeView.js';
import { mountMenu } from './ui/menu.js';
import { mountLab } from './lab/labView.js';
import { mountPush } from './ui/pushView.js';
import { mountDaily } from './ui/dailyView.js';
import { mountAdventure } from './adventure/adventure.js';
import { mountTextures } from './adventure/textureSheet.js';
import { setFavicon } from './ui/logo.js';

setFavicon();

const routes = {
  home: { tab: 'home', mount: mountHome },
  menu: { tab: 'game', mount: mountMenu },
  run: { tab: 'game', mount: mountPush },
  daily: { tab: 'game', mount: mountDaily },
  adv: { tab: 'game', mount: mountAdventure },
  textures: { tab: 'game', mount: mountTextures },
  play: { tab: 'game', mount: mountPush }, // alte Links des entfernten Setz-Modus
  // Eigenständige Seite nur mit der Gehirnkarte (für ein zweites Fenster)
  brain: { tab: 'lab', mount: (root) => mountLab(root, ['full', 'standalone']) },
  lab: { tab: 'lab', mount: mountLab },
};
// Lokal (Entwicklung) startet die App direkt im Spielmenü, die öffentliche Seite auf der Startseite.
const DEFAULT_ROUTE = IS_DEV ? 'menu' : 'home';

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
