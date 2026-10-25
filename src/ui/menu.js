// Startmenü: Lichtläufer mit Fortschritt, Level-Auswahl und Lab-Zugang.
import { PUSH_LEVELS } from '../game/pushLevels.js';
import { isSolved, bestMoves, starsFor } from '../game/progress.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Freigeschaltet sind alle gelösten Level und das erste ungelöste.
function levelGrid() {
  const firstOpen = PUSH_LEVELS.findIndex((l) => !isSolved(l.id));
  return PUSH_LEVELS.map((l, i) => {
    const solved = isSolved(l.id);
    const open = solved || i === firstOpen;
    const stars = solved ? starsFor(bestMoves(l.id), l.par) : 0;
    const w = Math.max(...l.rows.map((r) => r.length)), h = l.rows.length;
    const inner = `
      <span class="lt-num">${i + 1}</span>
      <span class="lt-name">${esc(l.name)}</span>
      <span class="lt-meta">${w}×${h} · Ziel ≤ ${l.par}</span>
      <span class="lt-stars" aria-label="${stars} von 3 Sternen">${[1, 2, 3].map((k) => `<b class="${k <= stars ? 'on' : ''}">★</b>`).join('')}</span>`;
    return open
      ? `<li><a class="level-tile${solved ? ' solved' : ' next'}" href="#/run/${i}">${inner}</a></li>`
      : `<li><span class="level-tile locked" aria-disabled="true" title="Erst die vorherigen Level lösen">${inner}<span class="lt-lock" aria-hidden="true">🔒</span></span></li>`;
  }).join('');
}

export function mountMenu(root) {
  const solved = PUSH_LEVELS.filter((l) => isSolved(l.id)).length;
  const firstOpen = PUSH_LEVELS.findIndex((l) => !isSolved(l.id));
  const allDone = firstOpen < 0;
  const next = allDone ? 0 : firstOpen;
  const label = solved === 0 ? 'Spielen' : allDone ? 'Nochmal spielen' : `Weiter mit Level ${next + 1}`;
  root.innerHTML = `
    <section class="menu">
      <div class="menu-hero">
        <div class="prism-logo" aria-hidden="true">
          <span class="ray ray-in"></span>
          <span class="tri"></span>
          <span class="ray ray-r"></span><span class="ray ray-g"></span><span class="ray ray-b"></span>
        </div>
        <h1 class="menu-title">Prismara</h1>
        <p class="menu-sub">Steuere deinen Lichtblock, schiebe Spiegel und Prismen – und bring jede Farbe ans Ziel.</p>
      </div>
      <nav class="menu-actions" aria-label="Startmenü">
        <a class="btn btn-primary" href="#/run/${next}" id="play">${label}</a>
        <p class="menu-progress muted">${solved} / ${PUSH_LEVELS.length} Level gelöst</p>
        <a class="btn" href="#/lab">Prismara Lab ansehen</a>
      </nav>
      <section class="level-select" aria-labelledby="ls-title">
        <h2 id="ls-title" class="kicker">Level-Auswahl</h2>
        <ol class="level-grid">${levelGrid()}</ol>
      </section>
    </section>`;
  root.querySelector('#play').focus();
}
