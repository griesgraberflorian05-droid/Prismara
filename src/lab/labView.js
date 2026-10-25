// Prismara Lab: interaktive, frei anpassbare Gehirnkarte.
import { prefersReducedMotion } from '../settings.js';
import { BrainMap, NODE_TYPES, NODE_STATUS, FORMATIONS, PALETTES, IMPORTANCE_LEVELS, nodeColor, nodeImportance } from './brainMap.js';
import { buildProjectGraph, mergeGraphs, loadLevelsFresh } from './projectGraph.js';

// v2 ignores the old saved production default so the full graph appears once after upgrade.
const PREF_KEY = 'prismara.brain.view.v2';
function loadPref(defaultMode = 'main') {
  try { return { mode: defaultMode, view: 'brain', formation: 'brain', palette: 'arctic', importance: [1, 2, 3, 4, 5], ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
  catch { return { mode: defaultMode, view: 'brain', formation: 'brain', palette: 'arctic', importance: [1, 2, 3, 4, 5] }; }
}
function savePref(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* blockiert */ } }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function mountLab(root, params = []) {
  root.innerHTML = `
    <section class="lab">
      <div class="lab-head">
        <div>
          <h1>Gehirn Lab</h1>
          <p class="muted">Knoten frei anordnen, einfärben und erkunden.</p>
        </div>
      </div>
      <div class="lab-grid">
        <section class="card map-card" aria-label="Gehirnkarte">
          <div class="map-toolbar">
            <div class="map-title">
              <h2>Gehirnkarte <span class="muted small" id="map-count"></span></h2>
              <div class="seg map-view-switch" role="group" aria-label="Kartenansicht">
                <button class="seg-btn" type="button" data-view="brain" aria-pressed="true">Gehirn</button>
                <button class="seg-btn" type="button" data-view="list" aria-pressed="false">Liste</button>
              </div>
            </div>
            <div class="map-tools">
              <div class="seg" role="group" aria-label="Knotenauswahl">
                <button class="seg-btn" data-mode="main" title="Nur die wichtigsten, kuratierten Knoten">Hauptknoten</button>
                <button class="seg-btn" data-mode="all" title="Alle Level, Objekte, Farben, Animationen, Texturen und Verbindungen">Alle Knoten</button>
              </div>
              <label class="map-choice brain-only">
                <span>Anordnung</span>
                <select id="formation" aria-label="Anordnung der Knoten">${Object.entries(FORMATIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
              </label>
              <label class="map-choice">
                <span>Farbpalette</span>
                <select id="palette" aria-label="Farbpalette der Knoten">${Object.entries(PALETTES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
              </label>
              <input type="search" id="map-search" placeholder="Knoten suchen …" aria-label="Knoten suchen" list="map-node-list">
              <datalist id="map-node-list"></datalist>
              <button class="btn btn-sm brain-only" data-act="out" aria-label="Verkleinern">−</button>
              <button class="btn btn-sm brain-only" data-act="in" aria-label="Vergrößern">+</button>
              <button class="btn btn-sm brain-only" data-act="fit" title="Alle Knoten in die Karte einpassen">Alles einpassen</button>
              <button class="btn btn-sm brain-only" data-act="replay">Wachstum abspielen</button>
              <button class="btn btn-sm btn-full brain-only" data-act="full" aria-pressed="false">⤢ Vollansicht</button>
            </div>
            <div class="importance-controls" aria-label="Knoten nach Wichtigkeit filtern">
              <div class="importance-heading"><strong>Wichtigkeit</strong><span class="muted small">Mehrere Stufen gleichzeitig anzeigen</span></div>
              <div class="importance-options" id="importance-options" role="group" aria-label="Wichtigkeitsstufen"></div>
            </div>
          </div>
          <div class="map-wrap">
            <canvas id="brain" tabindex="0" aria-label="Gehirnkarte in 3D. Ziehen oder Pfeiltasten drehen, Umschalt+Ziehen verschiebt, Mausrad oder Plus/Minus zoomt, Klick wählt einen Knoten."></canvas>
            <div class="map-node-list" id="map-node-list-view" aria-label="Knotenliste" hidden></div>
            <div class="map-hint muted small">Ziehen: drehen · Umschalt+Ziehen: verschieben · Rad: zoomen</div>
            <div class="map-legend" id="map-legend"></div>
            <div class="map-detail" id="map-detail" hidden></div>
          </div>
        </section>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const detail = $('#map-detail');

  const map = new BrainMap($('#brain'), {
    reducedMotion: prefersReducedMotion,
    onSelect: (node, relations) => { renderDetail(node, relations); renderNodeList(); },
  });
  const mapCard = root.querySelector('.map-card');

  // Die vollständige Karte bleibt auch auf der statischen Website verfügbar.
  const pref = loadPref('all');
  if (!['main', 'all'].includes(pref.mode)) pref.mode = 'all';
  if (!['brain', 'list'].includes(pref.view)) pref.view = 'brain';
  if (!FORMATIONS[pref.formation]) pref.formation = 'brain';
  if (!PALETTES[pref.palette]) pref.palette = 'arctic';
  if (!Array.isArray(pref.importance)) pref.importance = [1, 2, 3, 4, 5];
  pref.importance = [...new Set(pref.importance.map(Number).filter((n) => IMPORTANCE_LEVELS.some((level) => level.id === n)))];
  map.setFormation(pref.formation);
  map.setPalette(pref.palette);
  map.setImportanceFilter(pref.importance);
  let projectGraph = null;
  let currentBrain = null;
  function syncControls() {
    root.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === pref.mode)));
    $('#formation').value = pref.formation;
    $('#palette').value = pref.palette;
    root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === pref.view)));
    mapCard.classList.toggle('view-list', pref.view === 'list');
    $('#brain').hidden = pref.view === 'list';
    $('#map-node-list-view').hidden = pref.view !== 'list';
    $('.map-hint').hidden = pref.view === 'list';
    $('#map-legend').hidden = pref.view === 'list';
    root.querySelectorAll('[data-importance]').forEach((b) => b.setAttribute('aria-pressed', String(pref.importance.includes(Number(b.dataset.importance)))));
  }
  function renderNodeList() {
    const list = $('#map-node-list-view');
    if (!list || !currentBrain) return;
    const nodes = currentBrain.nodes
      .filter((node) => pref.importance.includes(node.importance) && map.matches(node))
      .sort((a, b) => a.importance - b.importance || a.label.localeCompare(b.label, 'de'));
    list.innerHTML = nodes.length ? nodes.map((node) => {
      const type = NODE_TYPES[node.type] || {};
      const status = NODE_STATUS[node.status] || {};
      return `<button class="node-list-row" type="button" data-node="${esc(node.id)}" aria-pressed="${map.selected === node.id}">
        <i class="lg-shape lg-${esc(type.shape)}" style="--c:${nodeColor(node.type, pref.palette)}" aria-hidden="true"></i>
        <span class="node-list-name">${esc(node.label)}</span>
        <span class="node-list-type">${esc(type.label)}</span>
        <span class="node-list-level">${node.importance}</span>
        <span class="node-list-status">${status.badge ? esc(status.badge) + ' ' : ''}${esc(status.label)}</span>
      </button>`;
    }).join('') : '<p class="node-list-empty">Keine Knoten passen zu Suche und Wichtigkeitsfilter.</p>';
  }
  root.querySelector('[data-view="brain"]').addEventListener('click', () => {
    pref.view = 'brain'; savePref(pref); syncControls(); requestAnimationFrame(() => map.fit());
  });
  root.querySelector('[data-view="list"]').addEventListener('click', () => {
    pref.view = 'list'; savePref(pref); syncControls(); renderNodeList();
  });
  $('#map-node-list-view').addEventListener('click', (event) => {
    const button = event.target.closest('[data-node]');
    if (button) map.select(button.dataset.node);
  });
  function renderImportanceControls(brain) {
    const counts = new Map(IMPORTANCE_LEVELS.map(({ id }) => [id, brain.nodes.filter((node) => node.importance === id).length]));
    $('#importance-options').innerHTML = IMPORTANCE_LEVELS.map(({ id, label }) =>
      `<button class="importance-btn" type="button" data-importance="${id}" aria-pressed="${pref.importance.includes(id)}" title="Stufe ${id}: ${esc(label)} ein- oder ausblenden"><span class="importance-number">${id}</span><span>${esc(label)}</span><span class="importance-count">${counts.get(id)}</span></button>`).join('');
  }
  $('#importance-options').addEventListener('click', (event) => {
    const button = event.target.closest('[data-importance]');
    if (!button) return;
    const level = Number(button.dataset.importance);
    pref.importance = pref.importance.includes(level) ? pref.importance.filter((item) => item !== level) : [...pref.importance, level].sort();
    savePref(pref);
    map.setImportanceFilter(pref.importance);
    syncControls();
    updateMapCount();
  });
  function updateMapCount() {
    if (!currentBrain) return;
    const visible = currentBrain.nodes.filter((node) => pref.importance.includes(node.importance));
    const visibleIds = new Set(visible.map((node) => node.id));
    const edges = currentBrain.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)).length;
    $('#map-count').textContent = `${visible.length} / ${currentBrain.nodes.length} Knoten · ${edges} Verbindungen`;
  }
  root.querySelectorAll('.seg-btn[data-mode]').forEach((b) => b.addEventListener('click', () => {
    pref.mode = b.dataset.mode;
    savePref(pref);
    syncControls();
    lastStamp = '';
    refresh();
  }));
  root.querySelector('#formation')?.addEventListener('change', (e) => {
    pref.formation = e.target.value;
    savePref(pref);
    map.setFormation(pref.formation);
  });
  root.querySelector('#palette')?.addEventListener('change', (e) => {
    pref.palette = e.target.value;
    savePref(pref);
    map.setPalette(pref.palette);
    renderLegend();
    renderNodeList();
    if (map.selected) map.select(map.selected);
  });
  syncControls();

  function renderLegend() {
    $('#map-legend').innerHTML = `
      <div class="legend-group">${Object.entries(NODE_TYPES).map(([k, t]) =>
        `<span class="legend-item"><i class="lg-shape lg-${t.shape}" style="--c:${nodeColor(k, pref.palette)}"></i>${esc(t.label)}</span>`).join('')}</div>
      <div class="legend-group">${Object.entries(NODE_STATUS).map(([k, s]) =>
        `<span class="legend-item"><i class="lg-ring lg-st-${k}"></i>${esc(s.label)}${s.badge ? ` <b class="lg-badge" style="--c:${s.badgeColor}">${s.badge}</b>` : ''}</span>`).join('')}</div>`;
  }
  renderLegend();

  root.querySelector('.map-tools').addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'in') map.zoomBy(1.25);
    if (act === 'out') map.zoomBy(1 / 1.25);
    if (act === 'fit') map.fit();
    if (act === 'replay') map.replayGrowth();
    if (act === 'full') setFull(!mapCard.classList.contains('is-full'));
  });

  // Vollansicht: Karte füllt das ganze Fenster; Esc oder erneuter Klick schließt.
  const fullBtn = root.querySelector('[data-act="full"]');
  function setFull(on) {
    mapCard.classList.toggle('is-full', on);
    document.body.classList.toggle('no-scroll', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.textContent = on ? '✕ Vollansicht schließen' : '⤢ Vollansicht';
    requestAnimationFrame(() => map.fit());
    if (on) $('#brain').focus();
    // Adresse merkt sich die Vollansicht (übersteht Neuladen, lässt sich verlinken)
    if (!standalone) history.replaceState(null, '', on ? '#/lab/full' : '#/lab');
  }
  const standalone = params[1] === 'standalone';
  if (standalone) fullBtn.hidden = true;
  if (params[0] === 'full') setFull(true);
  const onKey = (e) => { if (e.key === 'Escape' && mapCard.classList.contains('is-full') && !map.selected) setFull(false); };
  window.addEventListener('keydown', onKey);

  const search = $('#map-search');
  search.addEventListener('input', () => {
    map.setFilter(search.value);
    const hit = [...map.nodes.values()].find((n) => map.isVisibleNode(n) && n.label.toLowerCase() === search.value.trim().toLowerCase());
    if (hit) map.select(hit.id, { center: true });
    renderNodeList();
  });

  detail.addEventListener('click', (e) => {
    const id = e.target.closest('[data-node]')?.dataset.node;
    if (id) map.select(id, { center: true });
    if (e.target.closest('[data-close]')) map.select(null);
  });

  function areaLink(area) {
    if (!area) return '';
    if (area.startsWith('#/')) return `<a class="btn btn-sm" href="${esc(area)}">Zum Bereich im Spiel →</a>`;
    return `<a class="btn btn-sm" href="${esc(area)}" target="_blank" rel="noopener">Datei öffnen: <code>${esc(area)}</code></a>`;
  }

  function renderDetail(node, relations) {
    if (!node) { detail.hidden = true; return; }
    const type = NODE_TYPES[node.type] || {};
    const status = NODE_STATUS[node.status] || {};
    detail.hidden = false;
    detail.innerHTML = `
      <button class="close" data-close aria-label="Details schließen">×</button>
      <div class="detail-kicker"><i class="lg-shape lg-${type.shape}" style="--c:${nodeColor(node.type, pref.palette)}"></i>${esc(type.label)} · Schritt ${esc(node.step)}</div>
      <h3>${esc(node.label)}</h3>
      <span class="status-chip st-${esc(node.status)}">${status.badge ? esc(status.badge) + ' ' : ''}${esc(status.label)}</span>
      <p>${esc(node.summary)}</p>
      ${node.result ? `<p class="detail-result"><strong>Ergebnis:</strong> ${esc(node.result)}</p>` : ''}
      ${areaLink(node.area)}
      ${relations.length ? `<h4>Verbindungen</h4><ul class="rel-list">${relations.map((r) => `
        <li><button class="link" data-node="${esc(r.other.id)}">
          <span class="muted">${r.outgoing ? esc(r.rel) + ' →' : '← ' + esc(r.rel)}</span> ${esc(r.other.label)}
        </button></li>`).join('')}</ul>` : ''}`;
  }

  let lastStamp = '';
  async function refresh() {
    try {
      const [lab, curated, levels] = await Promise.all([
        fetchJson('lab/lab.json'),
        fetchJson('lab/brain.json'),
        pref.mode === 'all' ? loadLevelsFresh() : Promise.resolve(null),
      ]);
      // Prüfsumme über alle Inhalte: jede Änderung an Protokoll, Karte oder Leveln wird erkannt.
      const raw = JSON.stringify([lab, curated, levels]);
      let sum = 0;
      for (let i = 0; i < raw.length; i++) sum = (sum * 31 + raw.charCodeAt(i)) | 0;
      const stamp = pref.mode + ':' + sum;
      if (stamp !== lastStamp) {
        lastStamp = stamp;
        let brain = curated;
        if (pref.mode === 'all') {
          projectGraph = buildProjectGraph(levels);
          brain = mergeGraphs(curated, projectGraph, lab);
        }
        brain.nodes.forEach((node) => { node.importance = nodeImportance(node); });
        currentBrain = brain;
        map.setImportanceFilter(pref.importance);
        map.setData(brain);
        renderImportanceControls(brain);
        updateMapCount();
        $('#map-node-list').innerHTML = brain.nodes.map((n) => `<option value="${esc(n.label)}">`).join('');
        renderNodeList();
      }
    } catch (err) {
      $('#map-count').textContent = 'Karte konnte nicht geladen werden';
    }
  }

  refresh();
  return () => {
    map.destroy();
    window.removeEventListener('keydown', onKey);
    document.body.classList.remove('no-scroll');
  };
}

