import { PUSH_LEVELS } from '../game/pushLevels.js';

const REPOSITORY = 'https://github.com/griesgraberflorian/Prismara';

export function mountHome(root) {
  root.innerHTML = `
    <section class="home-page">
      <section class="home-hero" aria-labelledby="home-title">
        <div class="home-hero-copy">
          <span class="home-eyebrow">LICHTPUZZLE · PROJEKTKARTE · BROWSER</span>
          <h1 id="home-title">Prismara</h1>
          <p class="home-owner">bei Florian</p>
          <div class="home-actions">
            <a class="btn btn-primary" href="#/menu">Spiel öffnen <span aria-hidden="true">→</span></a>
            <a class="btn" href="#/lab">Gehirn Lab ansehen <span aria-hidden="true">↗</span></a>
          </div>
          <p class="home-facts"><span>${PUSH_LEVELS.length} Level</span><i></i><span>Rot · Grün · Blau</span><i></i><span>Im Browser spielbar</span></p>
        </div>
        <div class="home-visual" aria-hidden="true">
          <div class="energy-field">
            <i class="energy-orbit energy-orbit-one"></i>
            <i class="energy-orbit energy-orbit-two"></i>
            <i class="energy-orbit energy-orbit-three"></i>
            <i class="energy-orbit energy-orbit-four"></i>
            <i class="energy-trail energy-trail-one"></i>
            <i class="energy-trail energy-trail-two"></i>
            <i class="energy-trail energy-trail-three"></i>
            <i class="energy-particle particle-one"></i>
            <i class="energy-particle particle-two"></i>
            <i class="energy-particle particle-three"></i>
            <i class="energy-particle particle-four"></i>
            <i class="energy-particle particle-five"></i>
            <i class="energy-particle particle-six"></i>
            <span class="energy-core"><b>SM</b></span>
            <i class="energy-flare flare-one"></i>
            <i class="energy-flare flare-two"></i>
          </div>
        </div>
      </section>

      <section class="home-section" aria-labelledby="home-explore-title">
        <div class="home-section-head"><span class="home-eyebrow">ZWEI SEITEN EINES PROJEKTS</span><h2 id="home-explore-title">Womit möchtest du anfangen?</h2></div>
        <div class="home-cards">
          <article class="home-card">
            <span class="home-card-index">01 · SPIEL</span>
            <h3>Lichtläufer</h3>
            <p>Bewege den Lichtblock, schiebe Spiegel und lenke Strahlen so, dass jedes Ziel genau die richtige Farbe bekommt.</p>
            <a href="#/menu" aria-label="Zum Spiel Lichtläufer">Zum Spiel <span aria-hidden="true">→</span></a>
          </article>
          <article class="home-card">
            <span class="home-card-index">02 · EINBLICKE</span>
            <h3>Gehirn Lab</h3>
            <p>Erkunde die Knoten und Verbindungen des Projekts als interaktive Karte oder sortierte Liste.</p>
            <a href="#/lab" aria-label="Zum Gehirn Lab">Projektkarte öffnen <span aria-hidden="true">→</span></a>
          </article>
          <article class="home-card">
            <span class="home-card-index">03 · QUELLCODE</span>
            <h3>Prismara auf GitHub</h3>
            <p>Der Projektcode ist öffentlich einsehbar. Sieh dir die Dateien, den Spielkern und die Entwicklung direkt im Repository an.</p>
            <a href="${REPOSITORY}" target="_blank" rel="noopener noreferrer">Repository ansehen <span aria-hidden="true">↗</span></a>
          </article>
        </div>
      </section>

      <section class="home-build" aria-labelledby="home-build-title">
        <div class="home-build-intro"><span class="home-eyebrow">WIE ES ZUSAMMENHÄNGT</span><h2 id="home-build-title">Vom Zug bis zur Projektkarte</h2><p>Prismara besteht aus kleinen Bereichen, die jeweils eine klare Aufgabe haben.</p></div>
        <div class="home-build-steps">
          <article><b>01</b><div><h3>Spielkern</h3><p><code>src/game</code> verarbeitet Züge, Spiegel, Prismen und den Weg der Lichtstrahlen.</p></div></article>
          <article><b>02</b><div><h3>Spieloberfläche</h3><p><code>src/ui</code> zeigt das Startmenü, die Level und das Spielfeld im Browser.</p></div></article>
          <article><b>03</b><div><h3>Gehirn Lab</h3><p><code>src/lab</code> verbindet Spielregeln, Dateien und Projektwissen zu einer durchsuchbaren Karte.</p></div></article>
          <article><b>04</b><div><h3>Projektwissen</h3><p><code>lab</code> enthält die gespeicherten Knoten und Entwicklungsnotizen, die das Lab darstellt.</p></div></article>
        </div>
      </section>

      <section class="home-section home-how" aria-labelledby="home-how-title">
        <div class="home-section-head"><span class="home-eyebrow">SPIELEN · ENTDECKEN · VERSTEHEN</span><h2 id="home-how-title">Ein Puzzle, viele Wege zum Ziel</h2><p>Jedes Level ist ein kleines Lichtsystem. Beobachte die Farben, plane deine Züge und finde heraus, wie sich der Strahl durch die Elemente verändert.</p></div>
        <div class="home-how-grid">
          <article class="home-how-card"><span>01</span><div><h3>Richte den Weg ein</h3><p>Schiebe den Lichtblock über das Feld und positioniere Spiegel so, dass der Strahl in die richtige Richtung läuft.</p></div></article>
          <article class="home-how-card"><span>02</span><div><h3>Mische die Farben</h3><p>Prismen und farbige Lichtquellen verändern den Strahl. Triff jedes Ziel mit genau der Farbe, die es verlangt.</p></div></article>
          <article class="home-how-card"><span>03</span><div><h3>Finde deine Lösung</h3><p>Probiere verschiedene Wege aus. Die Level werden Schritt für Schritt anspruchsvoller und belohnen vorausschauendes Denken.</p></div></article>
        </div>
      </section>

      <footer class="home-footer"><span>Prismara · ein kleines Lichtpuzzle mit offenem Einblick in seinen Aufbau</span><a href="${REPOSITORY}" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a></footer>
    </section>`;
}

