// Spielfortschritt: gelöste Level und beste Zugzahl, lokal im Browser.
const KEY = 'prismara.progress.v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

let data = { solved: {}, ...load() };

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Speicher blockiert */ }
}

export function getProgress() { return data; }

export function isSolved(id) { return !!data.solved[id]; }

export function bestMoves(id) { return data.solved[id]?.best ?? null; }

/** Speichert ein Ergebnis; liefert true bei neuer Bestleistung. */
export function recordSolve(id, moves) {
  const prev = data.solved[id];
  const improved = !prev || moves < prev.best;
  data.solved[id] = { best: improved ? moves : prev.best, at: Date.now() };
  save();
  return improved;
}

export function starsFor(moves, par) {
  if (par == null) return 3;
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}

export function resetProgress() {
  data = { solved: {} };
  save();
}
