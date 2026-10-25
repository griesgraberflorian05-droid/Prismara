// Einstieg: einfacher Hash-Router zwischen Spiel- und Lab-Ansichten.
import { mountMenu } from './ui/menu.js';
import { mountHome } from './ui/homeView.js';
import { mountLab } from './lab/labView.js';
import { mountPush } from './ui/pushView.js';

const routes = {
  home: { tab: 'home', mount: mountHome },
  menu: { tab: 'game', mount: mountMenu },
  run: { tab: 'game', mount: mountPush },
  play: { tab: 'game', mount: mountPush }, // alte Links des entfernten Setz-Modus
  // Eigenständige Seite nur mit der Gehirnkarte (für ein zweites Fenster)
  brain: { tab: 'lab', mount: (root) => mountLab(root, ['full', 'standalone']) },
  lab: { tab: 'lab', mount: mountLab },
};

const view = document.getElementById('view');
let unmount = null;

function parseHash() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: routes[name] ? name : 'home', params: rest };
}

function render() {
  const { name, params } = parseHash();
  const route = routes[name];
  if (unmount) unmount();
  view.innerHTML = '';
  view.className = `view view-${name}`;
  document.body.classList.toggle('standalone', name === 'brain');
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

