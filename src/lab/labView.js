// Prismara Lab: Entwicklungsstand, Arbeitsschritte, Gehirnkarte (Karte oder Liste) und Live-Log –
// im Holz-/Pergament-Pixel-Stil des Spiels. Vereint die lokale Fassung (Schritte, Live-Log,
// Live-Aktualisierung) mit der GitHub-Fassung (Paletten, Wichtigkeit, Liste, Wachstumsregler).
import { ENV, ENV_LABEL, ENV_SOURCE, IS_DEV } from '../config.js';
import { prefersReducedMotion } from '../settings.js';
import { BrainMap, NODE_TYPES, NODE_STATUS, FORMATIONS, PALETTES, IMPORTANCE_LEVELS, DEFAULT_PALETTE, nodeColor, nodeImportance } from './brainMap.js';
import { buildProjectGraph, mergeGraphs, loadLevelsFresh } from './projectGraph.js';

const PREF_KEY = 'prismara.brain.view.v3';
const DEFAULT_PREF = { mode: 'all', view: 'brain', formation: 'brain', palette: DEFAULT_PALETTE, importance: [1, 2, 3, 4, 5] };
function loadPref() {
  try { return { ...DEFAULT_PREF, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
  catch { return { ...DEFAULT_PREF }; }
}
function savePref(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* blockiert */ } }

// Lokal (Dev-Server) alle 3 s neu laden, auf der statischen Seite gemächlicher.
const POLL_MS = IS_DEV ? 3000 : 20000;

const STEP_STATUS = {
  passed: { label: 'Bestanden', icon: '✓' },
  in_progress: { label: 'In Arbeit', icon: '●' },
  planned: { label: 'Geplant', icon: '○' },
  failed: { label: 'Nicht bestanden', icon: '!' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const list = (items) => (items && items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p class="muted">–</p>');

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function ensureLabStyle() {
  if (document.getElementById('lab-css')) return;
  const l = document.createElement('link');
  l.id = 'lab-css'; l.rel = 'stylesheet'; l.href = 'src/lab/lab.css';
  document.head.appendChild(l);
}

export function mountLab(root, params = []) {
  ensureLabStyle();
  document.body.classList.add('lab-wood');
  const standalone = params[1] === 'standalone';
  root.innerHTML = `
    <section class="lab">
      <div class="lab-head">
        <a class="lab-back btn btn-sm" href="#/menu" title="Zurück zum Spiel">◀ Spiel</a>
        <div class="lab-title">
          <h1>Prismara Lab</h1>
          <p class="muted">Wie das Spiel wächst: Schritte, Prüfungen, Entscheidungen – und die Gehirnkarte.</p>
        </div>
        <div class="lab-head-meta">
          <span class="live-dot" title="Aktualisiert sich automatisch alle ${POLL_MS / 1000} s"></span>
          <span class="muted small" id="lab-updated">lädt …</span>
          <span class="env-badge env-${esc(ENV)}" title="PRISMARA_ENV=${esc(ENV)} (Quelle: ${esc(ENV_SOURCE)})">${esc(ENV_LABEL)}</span>
        </div>
      </div>
      <div class="lab-grid">
        <aside class="lab-side">
          <article class="card now" id="lab-now" aria-live="polite"></article>
          <article class="card steps">
            <h2>Arbeitsschritte</h2>
            <ol class="step-list" id="step-list"></ol>
          </article>
        </aside>
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
              <section class="map-tool-section map-node-tools" aria-label="Knoten und Darstellung">
                <span class="map-tool-heading">Knoten &amp; Darstellung</span>
                <div class="map-tool-row">
                  <div class="seg" role="group" aria-label="Knotenauswahl">
                    <button class="seg-btn" type="button" data-mode="main" title="Nur die wichtigsten, kuratierten Knoten">Hauptknoten</button>
                    <button class="seg-btn" type="button" data-mode="all" title="Zusätzlich jedes Level, Objekt, jede Farbe, Animation, Textur und Datei">Alle Knoten</button>
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
                </div>
              </section>
              <section class="map-tool-section map-growth-tools brain-only" aria-label="Kartenansicht und Wachstum">
                <span class="map-tool-heading">Ansicht &amp; Wachstum</span>
                <div class="map-tool-row map-growth-row">
                  <button class="btn btn-sm" type="button" data-act="out" aria-label="Verkleinern">−</button>
                  <button class="btn btn-sm" type="button" data-act="in" aria-label="Vergrößern">+</button>
                  <button class="btn btn-sm" type="button" data-act="fit" title="Alle Knoten in die Karte einpassen">Einpassen</button>
                  <div class="growth-stack">
                    <button class="btn btn-sm" type="button" data-act="replay" id="growth-play">Wachstum abspielen</button>
                    <div class="growth-controls" aria-label="Wachstumsanimation steuern">
                      <label class="growth-control" for="growth-speed"><span>Tempo <output id="growth-speed-value">1,0×</output></span><input id="growth-speed" type="range" min="0.35" max="2.5" step="0.05" value="1" aria-label="Wachstumstempo"></label>
                      <label class="growth-control growth-seek" for="growth-position"><span>Verlauf <output id="growth-position-value">Bereit</output></span><input id="growth-position" type="range" min="0" max="0" step="1" value="0" disabled aria-label="Position im Wachstumsverlauf"></label>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-full" type="button" data-act="full" aria-pressed="false">⤢ Vollansicht</button>
                </div>
              </section>
            </div>
            <div class="importance-controls" aria-label="Knoten nach Wichtigkeit filtern">
              <div class="importance-heading"><strong>Wichtigkeit</strong><span class="muted small">Mehrere Stufen gleichzeitig anzeigen</span><button id="importance-all" type="button" aria-label="Alle Wichtigkeitsstufen anzeigen">Alle Stufen</button></div>
              <div class="importance-options" id="importance-options" role="group" aria-label="Wichtigkeitsstufen"></div>
            </div>
            <button class="btn btn-sm map-legend-toggle" id="map-legend-toggle" type="button" aria-expanded="false" aria-controls="map-legend">Legende anzeigen</button>
          </div>
          <div class="map-wrap">
            <canvas id="brain" tabindex="0" aria-label="Gehirnkarte in 3D. Ziehen oder Pfeiltasten drehen, Umschalt+Ziehen verschiebt, Mausrad oder Plus/Minus zoomt, Klick wählt einen Knoten."></canvas>
            <div class="map-growth-caption" id="map-growth-caption" aria-hidden="true" hidden>
              <div class="growth-caption-layer"><span class="growth-caption-count"></span><strong></strong><small></small></div>
              <div class="growth-caption-layer"><span class="growth-caption-count"></span><strong></strong><small></small></div>
            </div>
            <div class="map-node-list" id="map-node-list-view" aria-label="Knotenliste" hidden></div>
            <div class="map-hint muted small">Ziehen: drehen · Umschalt+Ziehen: verschieben · Rad: zoomen</div>
            <div class="map-legend" id="map-legend"></div>
            <div class="map-detail" id="map-detail" hidden></div>
            <div class="map-toast" id="map-toast" hidden></div>
          </div>
          <aside class="livelog" id="livelog" aria-label="Live-Log" ${IS_DEV ? '' : 'hidden'}>
            <button class="livelog-toggle" id="livelog-toggle" type="button" aria-expanded="false" title="Live-Log ein-/ausblenden">
              <span class="live-dot"></span><span class="livelog-tab">Live-Log</span>
            </button>
            <div class="livelog-body">
              <div class="livelog-head"><strong>Live-Log</strong><span class="muted small" id="livelog-count"></span></div>
              <ol class="livelog-list" id="livelog-list" aria-live="polite"></ol>
            </div>
          </aside>
        </section>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const detail = $('#map-detail');
  const mapCard = root.querySelector('.map-card');
  let activeCaptionLayer = null, captionRaf = 0;

  const map = new BrainMap($('#brain'), {
    reducedMotion: prefersReducedMotion,
    onSelect: (node, relations) => { renderDetail(node, relations); renderNodeList(); },
    onReplayLabel: (node, index, total) => renderGrowthLabel(node, index, total),
    onReplayProgress: (index, total, playing, complete) => renderReplayProgress(index, total, playing, complete),
  });

  // Testzugriff auf die Karte (z. B. Knotenpositionen für Klicktests, Messwerte)
  if (IS_DEV || location.hostname === 'localhost') window.__prismaraBrain = map;

  const pref = loadPref();
  if (!['main', 'all'].includes(pref.mode)) pref.mode = 'all';
  if (!['brain', 'list'].includes(pref.view)) pref.view = 'brain';
  if (!FORMATIONS[pref.formation]) pref.formation = 'brain';
  if (!PALETTES[pref.palette]) pref.palette = DEFAULT_PALETTE;
  if (!Array.isArray(pref.importance)) pref.importance = [1, 2, 3, 4, 5];
  pref.importance = [...new Set(pref.importance.map(Number).filter((n) => IMPORTANCE_LEVELS.some((level) => level.id === n)))];
  map.setFormation(pref.formation);
  map.setPalette(pref.palette);
  map.setImportanceFilter(pref.importance);
  let currentBrain = null;

  function renderReplayProgress(index, total, playing, complete = false) {
    const slider = $('#growth-position');
    const play = $('#growth-play');
    const safeTotal = Math.max(0, total || 0);
    slider.max = String(Math.max(0, safeTotal - 1));
    slider.disabled = safeTotal === 0;
    if (safeTotal) slider.value = String(Math.max(0, Math.min(safeTotal - 1, index)));
    $('#growth-position-value').textContent = safeTotal ? `${String(Math.max(0, index + 1)).padStart(3, '0')} / ${safeTotal}` : 'Bereit';
    play.textContent = playing ? 'Wachstum pausieren' : complete ? 'Nochmal abspielen' : 'Wachstum abspielen';
  }
  function syncControls() {
    root.querySelectorAll('.seg-btn[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === pref.mode)));
    $('#formation').value = pref.formation;
    $('#palette').value = pref.palette;
    root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === pref.view)));
    mapCard.classList.toggle('view-list', pref.view === 'list');
    $('#brain').hidden = pref.view === 'list';
    $('#map-node-list-view').hidden = pref.view !== 'list';
    $('.map-hint').hidden = pref.view === 'list';
    root.querySelectorAll('[data-importance]').forEach((b) => b.setAttribute('aria-pressed', String(pref.importance.includes(Number(b.dataset.importance)))));
    $('#importance-all').setAttribute('aria-pressed', String(pref.importance.length === IMPORTANCE_LEVELS.length));
  }
  function renderNodeList() {
    const listEl = $('#map-node-list-view');
    if (!listEl || !currentBrain || listEl.hidden) return;
    const nodes = currentBrain.nodes
      .filter((node) => pref.importance.includes(node.importance) && map.matches(node))
      .sort((a, b) => a.importance - b.importance || a.label.localeCompare(b.label, 'de'));
    listEl.innerHTML = nodes.length ? nodes.map((node) => {
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
  function renderGrowthLabel(node, index = 0, total = 0) {
    const caption = $('#map-growth-caption');
    const layers = [...caption.querySelectorAll('.growth-caption-layer')];
    if (!node) {
      caption.hidden = true;
      layers.forEach((layer) => layer.classList.remove('is-active'));
      activeCaptionLayer = null;
      return;
    }
    const next = activeCaptionLayer === 0 ? 1 : 0;
    cancelAnimationFrame(captionRaf);
    layers.forEach((layer) => layer.classList.remove('is-active'));
    const type = NODE_TYPES[node.type] || {};
    layers[next].querySelector('.growth-caption-count').textContent = `KNOTEN ${String(index + 1).padStart(3, '0')} / ${total}`;
    layers[next].querySelector('strong').textContent = node.label;
    layers[next].querySelector('small').textContent = `${type.label || 'Projektknoten'} · Wichtigkeit ${node.importance}`;
    caption.hidden = false;
    captionRaf = requestAnimationFrame(() => layers[next].classList.add('is-active'));
    activeCaptionLayer = next;
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
  $('#map-legend-toggle').addEventListener('click', (event) => {
    const open = $('#map-legend').classList.toggle('is-open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
    event.currentTarget.textContent = open ? 'Legende schließen' : 'Legende anzeigen';
  });
  $('#importance-all').addEventListener('click', () => {
    pref.importance = IMPORTANCE_LEVELS.map(({ id }) => id);
    savePref(pref);
    map.setImportanceFilter(pref.importance);
    syncControls();
    updateMapCount();
    renderNodeList();
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
    renderNodeList();
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
  $('#formation').addEventListener('change', (e) => {
    pref.formation = e.target.value;
    savePref(pref);
    map.setFormation(pref.formation);
  });
  $('#palette').addEventListener('change', (e) => {
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
    if (act === 'replay') {
      if (map.replayActive) map.pauseReplay();
      else if (map.replayOrder.length && map.replayIndex < map.replayOrder.length) map.resumeReplay();
      else map.replayGrowth();
    }
    if (act === 'full') setFull(!mapCard.classList.contains('is-full'));
  });
  $('#growth-speed').addEventListener('input', (event) => {
    const speed = Number(event.target.value);
    map.setReplaySpeed(speed);
    $('#growth-speed-value').textContent = `${speed.toFixed(1).replace('.', ',')}×`;
  });
  $('#growth-position').addEventListener('input', (event) => map.seekGrowth(Number(event.target.value)));

  // Vollansicht: Karte füllt das ganze Fenster; Esc oder erneuter Klick schließt.
  const fullBtn = root.querySelector('[data-act="full"]');
  function setFull(on) {
    mapCard.classList.toggle('is-full', on);
    document.body.classList.toggle('no-scroll', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.textContent = on ? '✕ Schließen' : '⤢ Vollansicht';
    requestAnimationFrame(() => map.fit());
    if (on) $('#brain').focus();
    // Adresse merkt sich die Vollansicht (übersteht Neuladen, lässt sich verlinken)
    if (!standalone) history.replaceState(null, '', on ? '#/lab/full' : '#/lab');
  }
  if (standalone) { fullBtn.hidden = true; root.querySelector('.lab-back').hidden = true; }
  if (params[0] === 'full' || standalone) setFull(true);
  const onKey = (e) => { if (e.key === 'Escape' && mapCard.classList.contains('is-full') && !map.selected && !standalone) setFull(false); };
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
      <div class="detail-kicker"><i class="lg-shape lg-${type.shape}" style="--c:${nodeColor(node.type, pref.palette)}"></i>${esc(type.label)} · Schritt ${esc(node.step)} · Wichtigkeit ${esc(node.importance)}</div>
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
  let firstLoad = true, disposed = false;
  let prevStepStatus = null;
  async function refresh() {
    try {
      const [lab, curated, levels] = await Promise.all([
        fetchJson('lab/lab.json'),
        fetchJson('lab/brain.json'),
        pref.mode === 'all' ? loadLevelsFresh() : Promise.resolve(null),
      ]);
      if (disposed) return; // Lab wurde während des Ladens verlassen
      // Prüfsumme über alle Inhalte: jede Änderung an Protokoll, Karte oder Leveln wird erkannt.
      const raw = JSON.stringify([lab, curated, levels]);
      let sum = 0;
      for (let i = 0; i < raw.length; i++) sum = (sum * 31 + raw.charCodeAt(i)) | 0;
      const stamp = pref.mode + ':' + sum;
      if (stamp !== lastStamp) {
        lastStamp = stamp;
        renderNow(lab);
        renderSteps(lab);
        let brain = curated;
        if (pref.mode === 'all') brain = mergeGraphs(curated, buildProjectGraph(levels), lab);
        brain.nodes.forEach((node) => { node.importance = nodeImportance(node); });
        currentBrain = brain;
        const added = map.setData(brain);
        if (!firstLoad && added.length) {
          toast(`${added.length} neue${added.length === 1 ? 'r Knoten' : ' Knoten'}: ${added.map((n) => n.label).join(', ')}`);
          added.forEach((n) => logLine('node', `${n.label}`, `${NODE_TYPES[n.type]?.label || n.type} · ${NODE_STATUS[n.status]?.label || n.status}`));
        }
        const stepStatus = Object.fromEntries(lab.steps.map((s) => [s.id, s.status]));
        if (prevStepStatus) {
          for (const s of lab.steps) {
            if (prevStepStatus[s.id] !== s.status) logLine('step', `Schritt ${s.id}: ${s.title}`, STEP_STATUS[s.status]?.label || s.status);
          }
        }
        prevStepStatus = stepStatus;
        renderImportanceControls(brain);
        syncControls();
        updateMapCount();
        $('#map-node-list').innerHTML = brain.nodes.map((n) => `<option value="${esc(n.label)}">`).join('');
        renderNodeList();
        firstLoad = false;
      }
      $('#lab-updated').textContent = `Stand: ${lab.updated || '–'}`;
    } catch (err) {
      if (disposed) return;
      $('#lab-updated').textContent = IS_DEV ? 'Lab-Daten nicht erreichbar – läuft der Server (start.bat)?' : 'Lab-Daten konnten nicht geladen werden';
    }
  }

  // ---------- Live-Log: echte Dateiereignisse vom Server + Ereignisse der Karte (nur lokal) ----------
  const LOG_KEY = 'prismara.livelog.open';
  const logEl = $('#livelog');
  const logList = $('#livelog-list');
  let logCount = 0;
  let lastEventId = 0;
  const setLogOpen = (open) => {
    logEl.classList.toggle('open', open);
    $('#livelog-toggle').setAttribute('aria-expanded', String(open));
    try { localStorage.setItem(LOG_KEY, open ? '1' : '0'); } catch { /* blockiert */ }
  };
  let initialOpen = false;
  try { initialOpen = localStorage.getItem(LOG_KEY) === '1'; } catch { /* blockiert */ }
  setLogOpen(initialOpen);
  $('#livelog-toggle').addEventListener('click', () => setLogOpen(!logEl.classList.contains('open')));

  const KIND = {
    created: { icon: '＋', label: 'neu', cls: 'k-new' },
    modified: { icon: '✎', label: 'geändert', cls: 'k-mod' },
    deleted: { icon: '－', label: 'gelöscht', cls: 'k-del' },
    node: { icon: '◆', label: 'Knoten', cls: 'k-node' },
    step: { icon: '★', label: 'Schritt', cls: 'k-step' },
    log: { icon: '›', label: 'live.log', cls: 'k-log' },
    pulse: { icon: '∿', label: 'Messung', cls: 'k-pulse' },
  };
  // Farbe je Art des Eintrags (Quelle in live.log bzw. Ereignistyp) – warme, natürliche Töne
  const TAG_COLOR = {
    SCHRITT: '#ffd166', BEFEHL: '#f4a259', LESEN: '#a8c6e0', DATEI: '#7fb7be', TEST: '#8cd17d',
    INFO: '#c9b2e6', SPIEL: '#ff9f80', LOESER: '#b5d16e', 'LÖSER': '#b5d16e', KARTE: '#e8a3c8',
    FEHLER: '#ff7b5c', SICHERUN: '#f2d69a', LAB: '#a6d8d0',
  };
  const KIND_COLOR = { created: '#8cd17d', modified: '#7fb7be', deleted: '#ff7b5c', node: '#e8a3c8', step: '#ffd166', pulse: '#a6d8d0', log: '#c9b2e6' };
  // Einträge laufen gestaffelt ein (bei vollem Stau schneller), damit das Log sichtbar fließt.
  const logQueue = [];
  let drainTimer = null;
  function logLine(kind, text, detailText = '', ts = Date.now() / 1000, href = '') {
    if (!IS_DEV) return;
    logQueue.push({ kind, text, detail: detailText, ts, href });
    if (!drainTimer) drain();
  }
  function drain() {
    const item = logQueue.shift();
    if (!item) { drainTimer = null; return; }
    showLine(item);
    drainTimer = setTimeout(drain, logQueue.length > 60 ? 12 : logQueue.length > 15 ? 35 : 90);
  }
  function showLine({ kind, text, detail: d, ts, href }) {
    const k = KIND[kind];
    const time = new Date(ts * 1000).toLocaleTimeString('de-DE');
    const li = document.createElement('li');
    li.className = `log-item ${k.cls}`;
    li.style.setProperty('--tc', (kind === 'log' && TAG_COLOR[d]) || KIND_COLOR[kind]);
    li.innerHTML = `<span class="log-time">${time}</span><span class="log-icon" title="${k.label}">${k.icon}</span>
      <span class="log-text">${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text)}${d ? `<small>${esc(d)}</small>` : ''}</span>`;
    logList.prepend(li);
    while (logList.children.length > 400) logList.lastChild.remove();
    $('#livelog-count').textContent = `${++logCount} Einträge`;
  }
  let pollMs = 0;
  async function pollActivity() {
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/activity?since=${lastEventId}`, { cache: 'no-store' });
      const data = await res.json();
      pollMs = performance.now() - t0;
      for (const e of data.events) {
        lastEventId = Math.max(lastEventId, e.id);
        if (e.kind === 'log') {
          // "[12:34:56] QUELLE   Text" → Uhrzeit kommt aus dem Eintrag selbst
          const m = /^\[[^\]]*\]\s*(\S+)\s+(.*)$/.exec(e.text);
          logLine('log', m ? m[2] : e.text, m ? m[1] : '', e.ts);
          continue;
        }
        const delta = e.kind === 'deleted' ? '' : `${e.size.toLocaleString('de-DE')} Bytes (${e.delta >= 0 ? '+' : ''}${e.delta.toLocaleString('de-DE')})`;
        logLine(e.kind, e.path, delta, e.ts, e.kind === 'deleted' ? '' : '/' + e.path);
      }
    } catch { /* Server ohne Live-Log */ }
  }
  let activityTimer = 0, pulseTimer = 0, rafId = 0;
  if (IS_DEV) {
    pollActivity();
    activityTimer = setInterval(pollActivity, 250);
    // Systempuls: echte Messwerte der laufenden Karte (Bildrate, Zeichenzeit, Knoten, Serverantwort).
    let frames = 0, fpsT0 = performance.now(), fps = 0, pulseIdx = 0;
    const countFrame = () => { frames++; rafId = requestAnimationFrame(countFrame); };
    rafId = requestAnimationFrame(countFrame);
    pulseTimer = setInterval(() => {
      const now = performance.now();
      fps = Math.round((frames * 1000) / (now - fpsT0)); frames = 0; fpsT0 = now;
      if (logQueue.length > 4) return; // echte Ereignisse haben Vorrang
      const nodes = [...map.nodes.values()];
      const sample = nodes.length ? nodes[Math.floor(Math.random() * nodes.length)] : null;
      const edges = map.edges || [];
      const e = edges.length ? edges[Math.floor(Math.random() * edges.length)] : null;
      const lbl = (id) => map.nodes.get(id)?.label || id;
      const degree = (id) => edges.filter((x) => x.from === id || x.to === id).length;
      const pulses = [
        () => ['Bildrate Gehirnkarte', `${fps} fps · ${map.stats.ms.toFixed(1)} ms pro Bild · ${map.stats.nodes} Knoten / ${map.stats.edges} Verbindungen im Bild`],
        () => sample && [`Knoten: ${sample.label}`, `${NODE_TYPES[sample.type]?.label || sample.type} · Schritt ${sample.step} · ${degree(sample.id)} Verbindungen`],
        () => e && [`${lbl(e.from)} → ${lbl(e.to)}`, `Verbindung „${e.rel}"`],
        () => ['Karte', $('#map-count').textContent],
        () => sample && [`Knoten: ${sample.label}`, (sample.summary || '').slice(0, 90)],
        () => ['Serverantwort /api/activity', `${pollMs.toFixed(1)} ms · Ereignis #${lastEventId}`],
      ];
      const p = pulses[pulseIdx++ % pulses.length]();
      if (p) logLine('pulse', p[0], p[1]);
    }, 600);
  }

  let toastTimer;
  function toast(text) {
    const el = $('#map-toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }

  function renderNow(lab) {
    const c = lab.current || {};
    const st = STEP_STATUS[c.status] || STEP_STATUS.in_progress;
    $('#lab-now').innerHTML = `
      <div class="now-head">
        <span class="kicker">Aktueller Abschnitt</span>
        <span class="status-chip st-${esc(c.status)}">${st.icon} ${st.label}</span>
      </div>
      <h2>${esc(c.phase)}</h2>
      <dl class="now-list">
        <dt>Woran gearbeitet wird</dt><dd>${esc(c.workingOn)}</dd>
        <dt>Geprüfte Frage / Annahme</dt><dd>${esc(c.question)}</dd>
        <dt>Als Nächstes</dt><dd>${esc(c.next)}</dd>
      </dl>`;
  }

  function renderSteps(lab) {
    const open = new Set([...root.querySelectorAll('.step-list details[open]')].map((d) => d.dataset.id));
    $('#step-list').innerHTML = lab.steps.map((s) => {
      const st = STEP_STATUS[s.status] || STEP_STATUS.planned;
      const isOpen = open.size ? open.has(String(s.id)) : s.status === 'in_progress';
      const q = s.quality || {};
      return `
        <li class="step st-${esc(s.status)}">
          <details data-id="${esc(s.id)}" ${isOpen ? 'open' : ''}>
            <summary>
              <span class="step-icon" aria-hidden="true">${st.icon}</span>
              <span class="step-title">${esc(s.id)}. ${esc(s.title)}</span>
              <span class="status-chip st-${esc(s.status)}">${st.label}</span>
            </summary>
            <div class="step-body">
              <p><strong>Ziel:</strong> ${esc(s.goal)}</p>
              ${q.problem ? `<div class="quality">
                <h4>Qualitätsziel (vorher festgelegt)</h4>
                <dl>
                  <dt>Problem / Erlebnis</dt><dd>${esc(q.problem)}</dd>
                  <dt>Passung</dt><dd>${esc(q.fit)}</dd>
                  <dt>Erfolgskriterium</dt><dd>${esc(q.success)}</dd>
                  <dt>Prüfung</dt><dd>${esc(q.check)}</dd>
                </dl></div>` : ''}
              ${s.tried ? `<h4>Ausprobiert</h4>${list(s.tried)}` : ''}
              ${s.observed ? `<h4>Beobachtet</h4>${list(s.observed)}` : ''}
              ${s.decision ? `<h4>Entscheidung</h4><p>${esc(s.decision)}</p>` : ''}
              ${s.open && s.open.length ? `<h4>Offen</h4>${list(s.open)}` : ''}
              ${s.next ? `<p><strong>Nächster Schritt:</strong> ${esc(s.next)}</p>` : ''}
              ${s.backup ? `<p class="muted small">Sicherung: <code>backups/${esc(s.backup)}</code></p>` : ''}
            </div>
          </details>
        </li>`;
    }).join('');
  }

  refresh();
  const timer = setInterval(refresh, POLL_MS);
  return () => {
    disposed = true;
    clearInterval(timer);
    clearInterval(activityTimer);
    clearInterval(pulseTimer);
    clearTimeout(drainTimer);
    clearTimeout(toastTimer);
    cancelAnimationFrame(rafId);
    map.destroy();
    window.removeEventListener('keydown', onKey);
    document.body.classList.remove('no-scroll', 'lab-wood');
  };
}
