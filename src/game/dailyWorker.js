// Web Worker: baut das Tagesrätsel abseits des Hauptthreads, damit Animationen weiterlaufen.
import { buildDaily } from './daily.js';

self.onmessage = (e) => {
  const def = buildDaily(e.data.key);
  self.postMessage({ def });
};
