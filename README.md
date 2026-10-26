<div align="center">
  <img src="assets/prismara-banner.svg" alt="Prismara — Licht in neuer Ordnung" width="100%">
  <br><br>
  <strong>PIXEL-ABENTEUER</strong>
  &nbsp;·&nbsp;
  <strong>LICHT-RÄTSEL</strong>
  &nbsp;·&nbsp;
  <strong>GEHIRN LAB</strong>
  &nbsp;·&nbsp;
  <strong>VON FLORIAN</strong>
</div>

## Prismara

Prismara ist ein verwunschenes Licht-Abenteuer im Browser. Jeder Raum ist ein Escape-Rätsel: Schiebe Kisten und Spiegel, lass Ranken aus Licht zu den Blumentöpfen wachsen – blühen alle, öffnet sich die Tür in den nächsten Raum. Dazu kommt das **Gehirn Lab**, eine 3D-Karte mit hunderten Knoten, die zeigt, wie das Projekt gewachsen ist.

### Im Spiel

- **52 Räume in 11 Welten** – vom Sommerstrand über Burgverlies und Nebelmoor bis ins Schattenreich, jede Welt mit Meisterprüfung.
- **Viele Elemente:** Spiegel, Prismen, Farbfilter, Eis, Strahlteiler, Portale, Lichtschlösser, Wanderlampen, Druckplatten, Farbwandler, Strömungen, Schlüssel & Gittertore, Schattenläufer, Moorgruben und morsches Holz.
- **Pixel-Look mit Licht:** Lichtstufen breiten sich feldweise aus, Wände werfen Schatten, Fackeln und Laternen leuchten.
- **Tagesrätsel**, Lehrzimmer mit Eule, Fragmente, Münzen, Truhen und Krämerladen.
- Jedes Rätsel ist vom eingebauten Löser (Breitensuche) geprüft: Das Zugziel ist immer das echte Minimum.

### Gehirn Lab

- Projektknoten als 3D-Karte oder Liste, sieben Anordnungen (Gehirn, DNA, Würfel, Kugel …), Farbpaletten, Wichtigkeitsfilter.
- „Wachstum abspielen“ zeigt Knoten für Knoten, wie Prismara entstanden ist.
- Zeichnet nur, was im Bild liegt – flüssig auch bei 400+ Knoten.

### Aufbau

| Ordner | Aufgabe |
| --- | --- |
| `src/game/` | Spielregeln, Löser, Levelschmiede, Pixel-Renderer, Raumausstattung |
| `src/adventure/` | Escape-Raum: Bewegung, Tür, Fundstücke, Ingame-HUD |
| `src/ui/` | Startseite, Menü, Tagesrätsel |
| `src/lab/` | Gehirn Lab und 3D-Karte |
| `lab/` | Gespeicherte Knoten, Verbindungen und Arbeitsschritte |
| `assets/` | Symbol und Banner |

### Lokal ansehen

Reine statische Dateien, kein Build-Schritt: den Ordner mit einem beliebigen lokalen Webserver ausliefern (z. B. `python -m http.server`) oder per GitHub Pages veröffentlichen. Die Domain steht in `CNAME`.

Der Quellcode ist öffentlich einsehbar. Eine separate Lizenzdatei ist derzeit nicht enthalten; daraus sollte keine weitergehende Nutzungserlaubnis abgeleitet werden.
