// Startbild: erscheint beim Öffnen oder Zurückkehren, wenn das Spiel länger als eine Minute nicht offen war.
// Neu laden innerhalb dieser Minute zeigt es nicht, dafür merkt sich das Spiel, wann es zuletzt zu sehen war.
import { logoCanvas } from './logo.js';
import { prefersReducedMotion } from '../settings.js';

const KEY = 'prismara.seen', AWAY_MS = 60000;
const TIPS = ['Fackeln werden entzündet …', 'Spiegel werden poliert …', 'Glutstein wird verlegt …', 'Monster werden geweckt …'];
const lastSeen = () => { try { return +localStorage.getItem(KEY) || 0; } catch { return Date.now(); } };
const mark = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* blockiert */ } };

function show() {
  if (document.querySelector('.splash')) return;
  const o = document.createElement('div');
  o.className = 'splash'; o.setAttribute('aria-hidden', 'true');
  o.innerHTML = '<div class="sp-logo"></div><div class="sp-bar"><i></i></div><p></p>';
  o.querySelector('.sp-logo').append(logoCanvas());
  document.body.append(o);
  const text = o.querySelector('p'), ms = prefersReducedMotion() ? 700 : 2200;
  o.querySelector('.sp-bar i').style.animationDuration = `${ms}ms`;
  text.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  setTimeout(() => o.classList.add('out'), ms);
  setTimeout(() => o.remove(), ms + 450);
}

export function startSplash() {
  if (Date.now() - lastSeen() > AWAY_MS) show();
  mark();
  setInterval(() => { if (!document.hidden) mark(); }, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) mark();
    else { if (Date.now() - lastSeen() > AWAY_MS) show(); mark(); }
  });
  addEventListener('pagehide', mark);
}
