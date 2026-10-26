// Seite #/daily: zeigt die arbeitende Levelschmiede (Pergament am Amboss) und startet dann das
// Tagesrätsel als Escape-Raum im Pixel-Abenteuer. Die Welt wechselt jeden Tag.
// Gebaut wird im Web Worker (Animation läuft weiter); ohne Worker-Unterstützung im Hauptthread.
import { cachedDaily, storeDaily, dailyLevel, todayKey } from '../game/daily.js';
import { mountAdventure } from '../adventure/adventure.js';

const DAILY_WORLDS = ['beach', 'cherry', 'jungle', 'castle', 'moor', 'night', 'volcano', 'temple', 'aurora', 'reef', 'shadow'];

export function mountDaily(root) {
  const key = todayKey();
  const theme = DAILY_WORLDS[[...key].reduce((n, c) => n + c.charCodeAt(0), 0) % DAILY_WORLDS.length];
  let unmount = null;
  let cancelled = false;
  let worker = null;
  const start = (def) => {
    if (cancelled) return;
    if (!def) {
      root.querySelector('.daily-forge').innerHTML = '<p>Heute hat die Schmiede kein Rätsel gefunden.</p><a class="wbtn" href="#/menu">Zum Menü</a>';
      return;
    }
    root.innerHTML = '';
    unmount = mountAdventure(root, ['daily'], { def: { ...def, name: def.name || 'Tagesrätsel' }, theme });
  };
  const cached = cachedDaily(key);
  if (cached) { start(cached); return () => { cancelled = true; unmount?.(); }; }

  root.innerHTML = `
    <section class="tm sub"><div class="tm-ui" style="justify-content:center">
      <div class="parch daily-forge" style="padding:22px;text-align:center;max-width:520px">
        <div class="forge-anvil" aria-hidden="true" style="font-size:3rem">⚒️</div>
        <h2 style="font-size:0.8rem;line-height:1.8">Die Levelschmiede baut dein Tagesrätsel …</h2>
        <p style="font-family:var(--font)">Blöcke werden verteilt und vom Löser geprüft – jeden Tag ein neuer Raum, für alle derselbe.</p>
      </div></div></section>`;
  try {
    worker = new Worker(new URL('../game/dailyWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { if (e.data.def) storeDaily(e.data.def); start(e.data.def); worker.terminate(); };
    worker.onerror = () => { worker.terminate(); start(dailyLevel(key)); };
    worker.postMessage({ key });
  } catch {
    setTimeout(() => start(dailyLevel(key)), 60);
  }
  return () => { cancelled = true; worker?.terminate(); unmount?.(); };
}
