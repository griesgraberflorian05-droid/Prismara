// Startseite (#/home): Projekt-Vorstellung im Holz-/Pergament-Pixel-Stil des Spiels. Im Hintergrund
// läuft derselbe lebendige Pixel-Raum wie im Menü; davor Schilder zu Spiel, Gehirn Lab und Quellcode.
import { PUSH_LEVELS, CHAPTERS } from '../game/pushLevels.js';
import { mountScene } from './menuScene.js';

const REPOSITORY = 'https://github.com/griesgraberflorian/Prismara';

export function mountHome(root) {
  document.body.classList.add('wood');
  root.innerHTML = `
    <section class="home-wood">
      <canvas class="home-scene" aria-hidden="true"></canvas>
      <div class="home-shade" aria-hidden="true"></div>
      <div class="home-ui">
        <header class="home-hero parch">
          <span class="home-kicker">LICHT-RÄTSEL · ESCAPE-RÄUME · PROJEKTKARTE</span>
          <h1 class="home-title">PRISMARA</h1>
          <p class="home-owner">ein verwunschenes Licht-Abenteuer von Florian</p>
          <p class="home-lead">Schiebe Kisten und Spiegel, lass Ranken aus Licht zu den Blumentöpfen wachsen und entkomme Raum für Raum – vom Sommerstrand bis ins Nebelmoor.</p>
          <div class="home-actions">
            <a class="wbtn big" href="#/menu">▶ SPIELEN</a>
            <a class="wbtn" href="#/lab">🧠 GEHIRN LAB</a>
          </div>
          <p class="home-facts"><span>${PUSH_LEVELS.length} Räume</span><i></i><span>${CHAPTERS.length} Welten</span><i></i><span>Tagesrätsel</span><i></i><span>im Browser</span></p>
        </header>

        <div class="home-cards">
          <article class="home-card parch">
            <span class="home-card-index">01 · SPIEL</span>
            <h2>Escape-Räume</h2>
            <p>Jeder Raum ist ein Licht-Rätsel. Bring jede Laterne zum richtigen Topf – dann öffnet sich die Tür. Fragmente, Münzen und Truhen warten in den Ecken.</p>
            <a href="#/menu">Zum Spiel →</a>
          </article>
          <article class="home-card parch">
            <span class="home-card-index">02 · EINBLICK</span>
            <h2>Gehirn Lab</h2>
            <p>Hunderte Knoten zeigen, wie Prismara gewachsen ist: jede Idee, jedes Level, jede Datei und jede Entscheidung – als 3D-Karte oder Liste.</p>
            <a href="#/lab">Karte öffnen →</a>
          </article>
          <article class="home-card parch">
            <span class="home-card-index">03 · QUELLCODE</span>
            <h2>Auf GitHub</h2>
            <p>Der ganze Code ist offen: Spielregeln, Löser, Pixel-Renderer und die Gehirnkarte – ohne Build-Schritt, reine ES-Module.</p>
            <a href="${REPOSITORY}" target="_blank" rel="noopener noreferrer">Repository ansehen ↗</a>
          </article>
        </div>

        <section class="home-how parch" aria-labelledby="home-how-title">
          <h2 id="home-how-title">So wird gespielt</h2>
          <ol>
            <li><b>Laufen &amp; schieben</b> – WASD oder Pfeiltasten, Feld für Feld. Kisten, Spiegel und Lampen rücken weiter.</li>
            <li><b>Drehen</b> – Leertaste dreht den Spiegel vor dir. Licht wächst als Ranke weiter.</li>
            <li><b>Farben mischen</b> – Prismen teilen weißes Licht, Filter lassen nur eine Farbe durch.</li>
            <li><b>Entkommen</b> – blühen alle Töpfe, geht die Tür auf. Z nimmt Züge zurück, R startet neu.</li>
          </ol>
        </section>

        <footer class="home-footer"><span>Prismara · ein kleines Licht-Abenteuer mit offenem Blick in seinen Aufbau</span><a href="${REPOSITORY}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer>
      </div>
    </section>`;
  const scene = mountScene(root.querySelector('.home-scene'), 'cherry');
  return () => { scene?.stop?.(); };
}
