// Spieler-Einstellungen, lokal im Browser gespeichert.
const KEY = 'prismara.settings.v1';
const DEFAULTS = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  reducedMotion: null, // null = Systemeinstellung übernehmen
  showSymbols: true,
};

const listeners = new Set();
let state = load();

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getSettings() {
  return state;
}

export function updateSettings(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* privat/blockiert */ }
  applyMotionClass();
  listeners.forEach((fn) => fn(state));
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return state.reducedMotion === null ? mq.matches : state.reducedMotion;
}

function applyMotionClass() {
  document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion());
}

mq.addEventListener?.('change', applyMotionClass);
applyMotionClass();
