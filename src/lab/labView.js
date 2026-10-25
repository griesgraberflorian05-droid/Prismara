// Prismara Lab: Entwicklungsstand, Arbeitsschritte und Gehirnkarte.
import { ENV, ENV_LABEL, ENV_SOURCE, IS_DEV } from '../config.js';
import { prefersReducedMotion } from '../settings.js';
import { BrainMap, NODE_TYPES, NODE_STATUS, FORMATIONS } from './brainMap.js';
import { buildProjectGraph, mergeGraphs, loadLevelsFresh } from './projectGraph.js';

// v2 ignores the old saved production default so the full graph appears once after upgrade.
const PREF_KEY = 'prismara.brain.view.v2';
function loadPref(defaultMode = 'main') {
  try { return { mode: defaultMode, formation: 'brain', ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
  catch { return { mode: defaultMode, formation: 'brain' }; }
}
function savePref(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* blockiert */ } }

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

export function mountLab(root, params = []) {
  root.innerHTML = `
    <section class="lab">
      <div class="lab-head">
        <div>
          <h1>Prismara Lab</h1>
          <p class="muted">Wie das Spiel wächst: dokumentierte Schritte, Prüfungen und Entscheidungen.</p>
        </div>
        <div class="lab-head-meta">
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
            <h2>Gehirnkarte <span class="muted small" id="map-count"></span></h2>
            <div class="map-tools">
              <div class="seg" role="group" aria-label="Knotenauswahl">
                <button class="seg-btn" data-mode="main" title="Nur die wichtigsten, kuratierten Knoten">Hauptknoten</button>
                <button class="seg-btn" data-mode="all" title="Alle Level, Objekte, Farben, Animationen, Texturen und Verbindungen">Alle Knoten</button>
              </div>
              ${IS_DEV ? `
              <label class="formation"><span class="sr-only">Formation</span>
                <select id="formation" aria-label="Formation">${Object.entries(FORMATIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
              </label>` : ''}
              <input type="search" id="map-search" placeholder="Knoten suchen …" aria-label="Knoten suchen" list="map-node-list">
              <datalist id="map-node-list"></datalist>
              <button class="btn btn-sm" data-act="out" aria-label="Verkleinern">−</button>
              <button class="btn btn-sm" data-act="in" aria-label="Vergrößern">+</button>
              <button class="btn btn-sm" data-act="fit">Einpassen</button>
              <button class="btn btn-sm" data-act="replay">Wachstum abspielen</button>
              <button class="btn btn-sm btn-full" data-act="full" aria-pressed="false">⤢ Vollansicht</button>
            </div>
          </div>
          <div class="map-wrap">
            <canvas id="brain" tabindex="0" aria-label="Gehirnkarte in 3D. Ziehen oder Pfeiltasten drehen, Umschalt+Ziehen verschiebt, Mausrad oder Plus/Minus zoomt, Klick wählt einen Knoten."></canvas>
            <div class="map-hint muted small">Ziehen: drehen · Umschalt+Ziehen: verschieben · Rad: zoomen</div>
            <div class="map-legend" id="map-legend"></div>
            <div class="map-detail" id="map-detail" hidden></div>
            <div class="map-toast" id="map-toast" hidden></div>
          </div>
          <aside class="livelog" id="livelog" aria-label="Protokoll">
            <button class="livelog-toggle" id="livelog-toggle" aria-expanded="false" title="Protokoll ein-/ausblenden">
              <span class="livelog-tab">Protokoll</span>
            </button>
            <div class="livelog-body">
              <div class="livelog-head"><strong>Protokoll</strong><span class="muted small" id="livelog-count"></span></div>
              <p class="muted small" style="padding: 0 12px">Automatische Dateiänderungen sind in dieser statischen Website ausgeschaltet.</p>
              <ol class="livelog-list" id="livelog-list" aria-live="polite"></ol>
            </div>
          </aside>
        </section>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const detail = $('#map-detail');

  const map = new BrainMap($('#brain'), {
    reducedMotion: prefersReducedMotion,
    onSelect: (node, relations) => renderDetail(node, relations),
  });

  // Nur in Development: Testzugriff auf die Karte (z. B. Knotenpositionen für Klicktests).
  if (IS_DEV) window.__prismaraBrain = map;

  // Die vollständige Karte bleibt auch auf der statischen Website verfügbar.
  const pref = loadPref(IS_DEV ? 'main' : 'all');
  map.setFormation(pref.formation);
  let projectGraph = null;
  function syncControls() {
    root.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === pref.mode)));
    const sel = root.querySelector('#formation');
    if (sel) sel.value = pref.formation;
  }
  root.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => {
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
  syncControls();

  $('#map-legend').innerHTML = `
    <div class="legend-group">${Object.entries(NODE_TYPES).map(([k, t]) =>
      `<span class="legend-item"><i class="lg-shape lg-${t.shape}" style="--c:${t.color}"></i>${esc(t.label)}</span>`).join('')}</div>
    <div class="legend-group">${Object.entries(NODE_STATUS).map(([k, s]) =>
      `<span class="legend-item"><i class="lg-ring lg-st-${k}"></i>${esc(s.label)}${s.badge ? ` <b class="lg-badge" style="--c:${s.badgeColor}">${s.badge}</b>` : ''}</span>`).join('')}</div>`;

  root.querySelector('.map-tools').addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'in') map.zoomBy(1.25);
    if (act === 'out') map.zoomBy(1 / 1.25);
    if (act === 'fit') map.fit();
    if (act === 'replay') map.replayGrowth();
    if (act === 'full') setFull(!mapCard.classList.contains('is-full'));
  });

  // Vollansicht: Karte füllt das ganze Fenster; Esc oder erneuter Klick schließt.
  const mapCard = root.querySelector('.map-card');
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
    const hit = [...map.nodes.values()].find((n) => n.label.toLowerCase() === search.value.trim().toLowerCase());
    if (hit) map.select(hit.id, { center: true });
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
      <div class="detail-kicker"><i class="lg-shape lg-${type.shape}" style="--c:${type.color}"></i>${esc(type.label)} · Schritt ${esc(node.step)}</div>
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
  let firstLoad = true;
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
        renderNow(lab);
        renderSteps(lab);
        let brain = curated;
        if (pref.mode === 'all') {
          projectGraph = buildProjectGraph(levels);
          brain = mergeGraphs(curated, projectGraph, lab);
        }
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
        $('#map-count').textContent = `${brain.nodes.length} Knoten · ${brain.edges.length} Verbindungen`;
        $('#map-node-list').innerHTML = brain.nodes.map((n) => `<option value="${esc(n.label)}">`).join('');
        firstLoad = false;
      }
      $('#lab-updated').textContent = `Stand: ${lab.updated || '–'}`;
    } catch (err) {
      $('#lab-updated').textContent = 'Lab-Daten nicht erreichbar.';
    }
  }

  // ---------- Live-Log: echte Dateiereignisse vom Server + Ereignisse der Karte ----------
  const LOG_KEY = 'prismara.livelog.open';
  const logEl = $('#livelog');
  const logList = $('#livelog-list');
  let logCount = 0;
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
  // Farbe je Art des Eintrags (Quelle in live.log bzw. Ereignistyp)
  const TAG_COLOR = {
    SCHRITT: '#ffd166', BEFEHL: '#ff9f5a', LESEN: '#8fb8ff', DATEI: '#4ff0ff', TEST: '#7dff6a',
    INFO: '#c9a7ff', SPIEL: '#ff4fd8', LOESER: '#b6ff3d', 'LÖSER': '#b6ff3d', KARTE: '#ff7af0',
    FEHLER: '#ff5f6d', SICHERUN: '#ffe08a', LAB: '#a0e7ff',
  };
  const KIND_COLOR = { created: '#7dff6a', modified: '#4ff0ff', deleted: '#ff6b8b', node: '#ff4fd8', step: '#ffd166', pulse: '#6fd3e8', log: '#c9a7ff' };
  // Einträge laufen gestaffelt ein (bei vollem Stau schneller), damit das Log sichtbar fließt.
  const logQueue = [];
  let drainTimer = null;
  function logLine(kind, text, detail = '', ts = Date.now() / 1000, href = '') {
    logQueue.push({ kind, text, detail, ts, href });
    if (!drainTimer) drain();
  }
  function drain() {
    const item = logQueue.shift();
    if (!item) { drainTimer = null; return; }
    showLine(item);
    drainTimer = setTimeout(drain, logQueue.length > 60 ? 12 : logQueue.length > 15 ? 35 : 90);
  }
  function showLine({ kind, text, detail, ts, href }) {
    const k = KIND[kind];
    const time = new Date(ts * 1000).toLocaleTimeString('de-DE');
    const li = document.createElement('li');
    li.className = `log-item ${k.cls}`;
    li.style.setProperty('--tc', (kind === 'log' && TAG_COLOR[detail]) || KIND_COLOR[kind]);
    li.innerHTML = `<span class="log-time">${time}</span><span class="log-icon" title="${k.label}">${k.icon}</span>
      <span class="log-text">${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text)}${detail ? `<small>${esc(detail)}</small>` : ''}</span>`;
    logList.prepend(li);
    while (logList.children.length > 400) logList.lastChild.remove();
    $('#livelog-count').textContent = `${++logCount} Einträge`;
  }
  let prevStepStatus = null;

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
  return () => {
    clearTimeout(drainTimer);
    map.destroy();
    window.removeEventListener('keydown', onKey);
    document.body.classList.remove('no-scroll');
  };
}

