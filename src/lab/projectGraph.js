// "Alle Knoten": erzeugt Knoten aus den tatsächlichen Projektinhalten (Level, Objekte,
// Farben, Animationen, Texturen, Dateien, Arbeitsschritte, Live-Log-Quellen) und verknüpft
// sie mit der kuratierten Gehirnkarte. Nichts wird erfunden: Level und Farben werden aus den
// Leveldaten gelesen, Objekte/Animationen/Texturen entsprechen den Zeichenfunktionen in
// src/game/render.js, Schritte kommen aus lab/lab.json, Dateien aus dem Projektordner.
import { COLOR_INFO, parseColor } from '../game/engine.js';
import { CHAPTERS } from '../game/pushLevels.js';
import { WORLDS, CHAPTER_WORLD } from '../game/worlds.js';

/** Lädt die Leveldatei jedes Mal frisch (Cache umgangen), damit neue Level sofort als Knoten erscheinen. */
export async function loadLevelsFresh() {
  const mod = await import(`../game/pushLevels.js?v=${Date.now()}`);
  return mod.PUSH_LEVELS;
}

// step = Arbeitsschritt, in dem das Objekt dazukam (für Verknüpfung mit den Schritt-Knoten)
const OBJECTS = [
  { id: 'emitter', step: 2, label: 'Emitter', summary: 'Sendet einen farbigen Strahl in eine Richtung; Pfeil + Formsymbol zeigen Richtung und Farbe.' },
  { id: 'target', step: 2, label: 'Ziel', summary: 'Sammelt eintreffende Farben; erfüllt nur bei exakter Farbe (gefüllt + ✓), falsche Farbe = gestrichelt + ≠.' },
  { id: 'mirrorblock', step: 2, label: 'Spiegelblock', summary: 'Schiebbarer Block mit Spiegel; Leertaste dreht ihn.' },
  { id: 'stone', step: 2, label: 'Steinblock', summary: 'Schiebbarer Block, der Licht schluckt.' },
  { id: 'prism', step: 3, label: 'Prismablock', summary: 'Zerlegt Licht: Rot knickt links, Grün geradeaus, Blau rechts ab.' },
  { id: 'filter', step: 3, label: 'Farbfilter', summary: 'Schiebbarer Block, der nur seine eigene Farbe durchlässt.' },
  { id: 'ice', step: 3, label: 'Eisfeld', summary: 'Spieler und geschobene Blöcke rutschen, bis etwas im Weg ist.' },
  { id: 'splitter', step: 5, label: 'Strahlteiler', summary: 'Schiebbarer, drehbarer Halbspiegel: ein Teil des Lichts läuft geradeaus weiter, ein Teil wird um 90° gespiegelt.' },
  { id: 'portal', step: 5, label: 'Lichtportal', summary: 'Fester Ring mit Buchstabe; Licht tritt am Partnerportal (gleicher Buchstabe) in derselben Richtung aus. Nicht begehbar.' },
  { id: 'sensor', step: 6, label: 'Lichtschloss-Sensor', summary: 'Feste Raute mit Schlüsselloch: Fällt Licht in genau ihrer Farbe darauf, öffnet sich das Tor mit demselben Buchstaben. Zählt nicht als Ziel.' },
  { id: 'door', step: 6, label: 'Lichttor', summary: 'Geschlossen massiv für Licht und Bewegung (Gitterstäbe). Offen, solange sein Sensor leuchtet – oder solange etwas darin steht (verklemmt).' },
  { id: 'lamp', step: 7, label: 'Wanderlampe', summary: 'Schiebbare Lichtquelle; die Leertaste dreht ihre Leuchtrichtung um 90° im Uhrzeigersinn. Gezeichnet wie ein Emitter auf einem Block.' },
  { id: 'enemy', step: 12, label: 'Schattenläufer', summary: 'Gegner: dunkle Geistgestalt mit leuchtenden Augen; geht mit jedem Zug einen Schritt (z waagrecht, y senkrecht), kehrt an Hindernissen um. Berührung = erwischt, Licht löst ihn auf.' },
  { id: 'flow', step: 11, label: 'Strömung', summary: 'Einbahnfeld mit wandernden Chevrons: nur in Pfeilrichtung betretbar – für Spieler und Blöcke. Licht fließt frei darüber.' },
  { id: 'shifter', step: 10, label: 'Farbwandler', summary: 'Schiebbarer Glaskreis: schaltet jede Farbe eins weiter (Rot→Grün→Blau→Rot), Weiß bleibt Weiß, Magenta wird Gelb.' },
  { id: 'plate', step: 8, label: 'Druckplatte', summary: 'Runder Knopf im Boden mit Buchstabe; gedrückt, solange der Spieler oder ein Block darauf steht (leuchtet türkis).' },
  { id: 'flip', step: 8, label: 'Kippspiegel', summary: 'Fest verankerter Spiegel mit Buchstabe; kippt, solange seine Druckplatte gedrückt ist. Massiv für Bewegung.' },
  { id: 'player', step: 2, label: 'Lichtblock (Spieler)', summary: 'Vom Spieler gesteuerter Block; wirft Schatten und zeigt die Blickrichtung.' },
  { id: 'wall', step: 2, label: 'Wand', summary: 'Stoppt Strahlen und Bewegung.' },
  { id: 'floor', step: 2, label: 'Boden', summary: 'Begehbares Feld.' },
  { id: 'beam', step: 2, label: 'Lichtstrahl', summary: 'Polylinie mit Glühen, Kern und wandernden Formsymbolen.' },
];

const ANIMATIONS = [
  { id: 'beamgrow', label: 'Strahl wächst', summary: 'Nach jeder Änderung läuft der neue Teil des Strahls mit 45 Feldern/s nach; der unveränderte Teil bleibt stehen.', objects: ['beam'] },
  { id: 'photons', label: 'Lichtteilchen', summary: 'Formsymbole wandern den Strahl entlang (Richtung + Farbe ohne Farbsinn).', objects: ['beam'] },
  { id: 'flicker', label: 'Strahl-Pulsieren', summary: 'Leichtes Pulsieren des äußeren Glühens.', objects: ['beam'] },
  { id: 'targetpulse', label: 'Ziel-Puls', summary: 'Erfüllte Ziele pulsieren und leuchten.', objects: ['target'] },
  { id: 'slide', label: 'Block-Gleiten', summary: 'Spieler und Blöcke gleiten in 110 ms zum neuen Feld.', objects: ['player', 'mirrorblock', 'stone', 'prism', 'filter', 'splitter'] },
  { id: 'bob', label: 'Spieler-Schweben', summary: 'Der Lichtblock schwebt sanft auf und ab.', objects: ['player'] },
  { id: 'herowalk', label: 'Held: Laufzyklus', summary: '4-Phasen-Schritt, schwingende Arme, Neigung in Laufrichtung.', objects: ['player'], file: 'pixelRender' },
  { id: 'heropush', label: 'Held: Schiebe-Pose', summary: 'Lehnt sich in den Block, Arme gestreckt, hinteres Bein stemmt, Zittern, Staubwölkchen.', objects: ['player', 'mirrorblock'], file: 'pixelRender' },
  { id: 'herosweat', label: 'Held: Schweiß & Keuchen', summary: 'Schweißtropfen beim Schieben, Atemwölkchen und „~“-Blase bei Erschöpfung.', objects: ['player'], file: 'pixelRender' },
  { id: 'heroidle', label: 'Held: Atmen, Blinzeln, Gähnen', summary: 'Im Stand atmet die Figur, blinzelt; nach 8 s Warten gähnt sie mit „?“.', objects: ['player'], file: 'pixelRender' },
  { id: 'herobump', label: 'Held: Rückstoß', summary: 'Gegen eine Wand: kurzer Rückprall mit Staub.', objects: ['player', 'wall'], file: 'pixelRender' },
  { id: 'herojoy', label: 'Held: Freudensprung', summary: 'Springt am Ausgang dreimal vor Freude.', objects: ['player'], file: 'pixelRender' },
  { id: 'mclight', label: 'Minecraft-Licht', summary: 'Lichtstufen 0–15 breiten sich feldweise aus, Wände werfen Schatten, weich hochskaliert + Bloom.', objects: ['beam', 'emitter', 'lamp', 'target'], file: 'pixelRender' },
  { id: 'reflect', label: 'Boden-Reflexionen', summary: 'Glänzende Böden spiegeln Lichtquellen und Strahlen als gerasterte Streifen.', objects: ['floor', 'beam'], file: 'pixelRender' },
  { id: 'enemywobble', label: 'Schatten-Wabern', summary: 'Schattenläufer schweben, ihre Unterkante wabert, die Augen blinzeln und schauen in Laufrichtung.', objects: ['enemy'] },
  { id: 'dissolve', label: 'Auflösen im Licht', summary: 'Funkenring und verblassende Fetzen, wenn ein Schattenläufer in einen Strahl gerät.', objects: ['enemy', 'beam'] },
  { id: 'dock', label: 'Andock-Klammern', summary: 'Steht der Lichtblock vor einem Block, schnappen leuchtende Klammern an dessen Seite (mit Klick-Ton und Welle).', objects: ['player', 'mirrorblock'] },
  { id: 'squash', label: 'Schub-Stauchen', summary: 'Geschobene Blöcke federn kurz in Schubrichtung.', objects: ['mirrorblock', 'stone', 'prism', 'filter'] },
  { id: 'trail', label: 'Leuchtspur', summary: 'Verblassende Lichtpunkte hinter dem Lichtblock.', objects: ['player'] },
  { id: 'sensorpulse', label: 'Sensor-Puls', summary: 'Beleuchtete Sensoren pulsieren in ihrer Farbe.', objects: ['sensor'] },
  { id: 'plateglow', label: 'Platten-Leuchten', summary: 'Gedrückte Druckplatten leuchten türkis, ihre Kippspiegel bekommen einen türkisen Rahmen.', objects: ['plate', 'flip'] },
  { id: 'chapterbar', label: 'Kapitel-Fortschritt', summary: 'Pink-Cyan-Balken und Sterne je Kapitel im Menü.', objects: [], file: 'menu' },
  { id: 'portalspin', label: 'Portal-Wirbel', summary: 'Drei Bögen kreisen um den Portalbuchstaben.', objects: ['portal'] },
  { id: 'framerun', label: 'Neon-Rahmen', summary: 'Pink-Violett-Cyan-Verlauf wandert um das Spielfeld (3 s pro Runde).', objects: ['wall'] },
  { id: 'sparkle', label: 'Ziel-Funken', summary: 'Funken, sobald ein einzelnes Ziel neu aufleuchtet.', objects: ['target'], file: 'celebrate' },
  { id: 'fireworks', label: 'Siegesfeuerwerk', summary: 'Blitz, Lichtwellen von jedem Ziel und Raketen über den ganzen Bildschirm.', objects: ['target'], file: 'celebrate' },
  { id: 'vinegrow', label: 'Redstone-Leitung', summary: 'Der Lichtweg breitet sich als Redstone-Staub aus (16 Felder/s): breite Staubspur, Körner am Rand, Signalpuls läuft von der Quelle weg, Knoten an Spiegeln – ersetzt die Ranken.', objects: ['beam', 'emitter'], file: 'pixelRender' },
  { id: 'potbloom', label: 'Redstone-Lampe', summary: 'Ziel als Redstone-Lampe: dunkles Glas mit Wunschfarbe als Symbol, leuchtet in der Signalfarbe, flackert matt bei falscher Farbe – ersetzt den Blumentopf.', objects: ['target'], file: 'pixelRender' },
  { id: 'lanternflicker', label: 'Redstone-Fackel', summary: 'Quelle als Redstone-Fackel: Holzstiel, glühender Kopf in der Signalfarbe, aufsteigende Funken – ersetzt die Laterne.', objects: ['emitter'], file: 'pixelRender' },
  { id: 'meadow', label: 'Redstone-Welle', summary: 'Beim Entkommen schalten Staubfunken wellenartig ab der Tür an, rote Redstone-Partikel steigen von Lampen und Tür auf – ersetzt das Blütenmeer.', objects: ['target'], file: 'pixelRender' },
  { id: 'torchflicker', label: 'Fackeln & Kerzen', summary: 'Flammen an Rückwand, Seitenwänden und Theken flackern in 3 Bildern, warmes Leuchten und echtes Licht in den Raum.', objects: ['wall'], file: 'roomDecor' },
  { id: 'motes', label: 'Schwebende Teilchen', summary: 'Je Welt: Staub im Licht, Blütenblätter, Glühwürmchen, Glut, Schnee, Blasen, Falter, Schattenfunken.', objects: ['floor'], file: 'roomDecor' },
  { id: 'windowshaft', label: 'Lichtschacht', summary: 'Durch die Fenster fällt eine schräge, sanft pulsierende Lichtbahn auf den Boden.', objects: ['wall', 'floor'], file: 'roomDecor' },
  { id: 'tutarrow', label: 'Tutorial-Pfeil', summary: 'Hüpfender Pfeil mit blinkendem Rahmen über dem nächsten Ziel; die Eule wippt, Schritt-Punkte füllen sich.', objects: ['player'], file: 'adventure' },
  { id: 'starpop', label: 'Sterne-Pop', summary: 'Sterne springen nacheinander ins Siegfenster.', objects: [], file: 'pushView' },
  { id: 'logflow', label: 'Live-Log-Fluss', summary: 'Einträge gleiten gestaffelt ins Live-Log (90 ms, bei Stau 12–35 ms), farbig nach Art.', objects: [], file: 'labView' },
  { id: 'nodebirth', label: 'Knoten-Geburt', summary: 'Neue Knoten wachsen ein und senden eine Lichtwelle aus.', objects: [], file: 'brainMap' },
];

const TEXTURES = [
  { id: 'wallgrad', label: 'Wand-Verlauf', summary: 'Violetter Verlauf mit heller Oberkante und pinkem Rand.', objects: ['wall'] },
  { id: 'floordot', label: 'Boden-Kachel', summary: 'Abgerundete dunkelviolette Kachel mit feinem Rand.', objects: ['floor'] },
  { id: 'glow', label: 'Glühen (additiv)', summary: 'Strahlen mit Mischmodus "lighter": Farben addieren sich sichtbar.', objects: ['beam', 'emitter'] },
  { id: 'glass', label: 'Spiegelglas', summary: 'Silberner Verlauf mit Schein auf der Spiegelfläche.', objects: ['mirrorblock'] },
  { id: 'splitglass', label: 'Teilerglas', summary: 'Gestrichelte, cyan leuchtende Glasfläche = halbdurchlässig.', objects: ['splitter'] },
  { id: 'portalring', label: 'Portalring', summary: 'Radialer Verlauf mit Paarfarbe (A pink, B mint, C orange) und Buchstabe.', objects: ['portal'] },
  { id: 'keyhole', label: 'Schlüsselloch-Raute', summary: 'Sensor als Raute mit Schlüsselloch, Torbuchstabe und Farbsymbol.', objects: ['sensor'] },
  { id: 'bars', label: 'Leuchtgitter', summary: 'Geschlossenes Tor: drei goldene Gitterstäbe; offen: gestrichelter Rahmen.', objects: ['door'] },
  { id: 'rivets', label: 'Block-Nieten', summary: 'Vier Eckpunkte kennzeichnen schiebbare Lichtblöcke.', objects: ['mirrorblock', 'prism', 'filter', 'splitter'] },
  { id: 'rainbow', label: 'Regenbogenkante', summary: 'Prisma-Dreieck mit Rot-Grün-Blau-Verlauf.', objects: ['prism'] },
  { id: 'tint', label: 'Farbglas', summary: 'Halbtransparente Filterfläche mit Formsymbol.', objects: ['filter'] },
  { id: 'icesheen', label: 'Eisglanz', summary: 'Hellblauer Verlauf mit Glanzstreifen.', objects: ['ice'] },
  { id: 'goldcube', label: 'Gold-Verlauf', summary: 'Warmer Verlauf mit Prisma-Symbol für den Spielerblock.', objects: ['player'] },
  { id: 'glyphs', label: 'Formsymbole ▲●■', summary: 'Rot ▲, Grün ●, Blau ■ – Farben ohne Farbsinn erkennbar.', objects: ['emitter', 'target', 'beam'] },
];

// [Pfad, Beschreibung, implementierte Objekte, Schritt]
const FILES = [
  ['src/game/engine.js', 'Strahlverfolgung, Farben, Prisma, Filter, Strahlteiler, Portale, Sensoren', ['beam', 'emitter', 'target', 'prism', 'filter', 'splitter', 'portal', 'sensor'], 2],
  ['src/game/push.js', 'Lichtläufer: Bewegen, Schieben, Drehen, Eis, Lichttore, Wanderlampen, Druckplatten, Löser (Breitensuche)', ['player', 'mirrorblock', 'stone', 'ice', 'splitter', 'door', 'lamp', 'plate', 'flip'], 2],
  ['src/game/pushLevels.js', 'Alle Level als Textraster + Legende + Zugziel', [], 2],
  ['src/game/render.js', 'Zeichnen aller Objekte, Strahlen, Animationen', ['beam', 'player', 'wall', 'floor', 'ice', 'portal', 'splitter'], 2],
  ['src/game/progress.js', 'Fortschritt und Bestleistungen (localStorage)', [], 2],
  ['src/game/forge.js', 'Levelschmiede: forge() verteilt Blöcke zufällig, climb() verbessert per Bergsteigen – Löser bewertet', [], 11],
  ['src/game/daily.js', 'Tagesrätsel: Datum → Startwert → Grundriss + Schmiede; Zwischenspeicher je Tag', [], 11],
  ['src/game/dailyWorker.js', 'Web Worker: baut das Tagesrätsel abseits des Hauptthreads', [], 11],
  ['src/ui/dailyView.js', 'Seite #/daily: Amboss-Animation, dann das Rätsel', [], 11],
  ['src/game/worlds.js', 'Welten: Strand, Kirschblüte, Dschungel, Nachtwald, Vulkan, Tempel, Polarlicht – Wände, Böden, Rahmen, Teilchen', ['wall', 'floor'], 10],
  ['src/game/pixelRender.js', 'Pixel-Renderer: Schrägsicht-Wände, Böden je Welt, Sprites, Minecraft-Licht, Reflexionen, animierter Held', ['wall', 'floor', 'player', 'beam'], 13],
  ['src/adventure/adventure.js', 'Escape-Raum: Raster-Bewegung, Ausgangstür, Fragmente, Kraftleiste, Animationen, Handy-Steuerung, Tutorial-Eule (#/adv/tutorial)', ['player'], 13],
  ['src/game/roomDecor.js', 'Raumausstattung: hohe Rückwand (Fenster, Fackeln, Bilder, Regale), Möbel aus Innenwänden, Teppiche, Streugut, Außenwelt, Teilchen je Welt', ['wall', 'floor'], 15],
  ['src/adventure/textureSheet.js', 'Texturbogen #/textures: alle Sprites in jeder Welt', [], 13],
  ['src/game/sound.js', 'Klang-System: alle Geräusche live mit Web Audio synthetisiert, Ton an/aus', [], 9],
  ['src/game/skins.js', 'Lichtblock-Kit: Farben/Symbole, Freischaltung mit Sternen, drawPlayerBlock()', ['player'], 8],
  ['src/ui/pushView.js', 'Spielansicht Lichtläufer: Eingabe, HUD, Sieg, Live-Log der Züge', [], 2],
  ['src/ui/menu.js', 'Arcade-Menü: Play-Knopf, Kapitel-Karussell, Kapitelseite, Lichtblock-Kit', [], 2],
  ['src/ui/celebrate.js', 'Siegesfeuerwerk und Ziel-Funken', [], 4],
  ['src/main.js', 'Router: #/menu, #/run/N, #/lab, #/brain', [], 1],
  ['src/config.js', 'Umgebung aus /env.js (IS_DEV)', [], 1],
  ['src/settings.js', 'Einstellungen, reduzierte Bewegung', [], 1],
  ['src/devlog.js', 'Live-Log-Bus: Spiel/Löser/Tests schreiben über POST /api/log in live.log', [], 5],
  ['src/styles.css', 'Neon-Design, Layout, Live-Log-Farben', [], 1],
  ['src/lab/labView.js', 'Lab-Seite: Status, Schritte, Karte, Live-Log-Panel mit Systempuls', [], 1],
  ['src/lab/lab.css', 'Lab im Holz-/Pergament-Stil des Spiels', [], 2],
  ['src/game/unlocks.js', 'Freischalten: Modi öffnen sich nach gelösten Räumen', [], 1],
  ['src/lab/brainMap.js', '3D-Gehirnkarte: Kräfte, Formationen, Zoom, Knotengeburt', [], 1],
  ['src/lab/projectGraph.js', 'Erzeugt "Alle Knoten" aus Projektdaten (diese Datei)', [], 2],
  ['tools/serve.py', 'Dev-Server: Dateien, /env.js, /api/activity, POST /api/log, live.log-Nachlesen', [], 1],
  ['tools/backup.py', 'Nummerierte ZIP-Sicherungen', [], 1],
  ['tools/check.py', 'Statische Prüfung der Lab-Daten', [], 1],
  ['tests/tests.js', 'Browser-Tests + Löser für alle Level', [], 2],
  ['lab/brain.json', 'Kuratierte Gehirnkarte (Entscheidungen, Tests, Ideen …)', [], 1],
  ['lab/lab.json', 'Arbeitsschritte mit Qualitätszielen und Ergebnissen', [], 1],
  ['live.log', 'Live-Protokoll aller Befehle, Dateien, Züge, Löser- und Testläufe', [], 5],
  ['docs/SYSTEM.md', 'Systembeschreibung für neue Sitzungen', [], 5],
];
const fileId = (path) => `g-file-${path.split('/').pop().replace(/\.(js|json|py|css|md|log)$/, '')}`;

// Klänge aus src/game/sound.js (live synthetisiert) und die Objekte, die sie auslösen
const SOUNDS = [
  ['step', 'Schritt', 'Kurzer Dreiecks-Tick mit leicht zufälliger Tonhöhe.', ['player']],
  ['bump', 'Anstoßen', 'Dumpfer Rechteck-Ton beim Laufen gegen Wand oder blockierten Block.', ['wall']],
  ['push', 'Schieben', 'Gefiltertes Rauschen + tiefer Ton.', ['mirrorblock', 'stone', 'prism', 'filter', 'splitter', 'lamp']],
  ['slide', 'Rutschen', 'Helles Rauschen, wenn Spieler oder Block über Eis gleitet.', ['ice']],
  ['rotate', 'Drehen', 'Zwei kurze hohe Klicks.', ['mirrorblock', 'splitter', 'lamp']],
  ['target', 'Ziel-Akkord', 'Rot = C, Grün = E, Blau = G; Mischfarben erklingen als Akkord.', ['target']],
  ['door', 'Tor öffnet', 'Aufsteigender Sägezahn-Sweep mit Rauschen.', ['door', 'sensor']],
  ['plate', 'Platte', 'Zwei Töne, wenn sich gedrückte Platten ändern.', ['plate', 'flip']],
  ['win', 'Sieg-Fanfare', 'C-E-G-C aufsteigend, Kapitelende mit längerer Fanfare.', ['target']],
  ['ui', 'Menü-Klänge', 'Blip, Wisch-Geräusch im Karussell, Start-Akkord am Play-Knopf.', []],
];

// Quellen im Live-Log (Spalte nach der Uhrzeit) und wer sie schreibt
const LOG_SOURCES = [
  ['SPIEL', 'Jeder Zug, Schub, Dreh, Ziel an/aus, Sieg', 'pushView'],
  ['LOESER', 'Fortschritt der Breitensuche (Zustände, Tiefe) und Ergebnis', 'push'],
  ['TEST', 'Jedes Testergebnis der Testseite', 'tests'],
  ['DATEI', 'Geänderte Dateien (Server-Beobachter + Claude)', 'serve'],
  ['BEFEHL', 'Ausgeführte Befehle', 'live'],
  ['SCHRITT', 'Arbeitsschritte und Pläne', 'lab'],
  ['KARTE', 'Neue Knoten der Gehirnkarte', 'brainMap'],
];

function levelUses(def, rows) {
  const chars = new Set(rows.join(''));
  const used = new Set(['wall', 'floor', 'beam']);
  const colors = new Set();
  for (const [ch, e] of Object.entries(def.legend || {})) {
    if (!chars.has(ch)) continue;
    used.add(e.type);
    if (!e.color) continue;
    colors.add(parseColor(e.color));
    if (e.type === 'emitter') for (const c of [1, 2, 4]) if (parseColor(e.color) & c) colors.add(c);
  }
  if (chars.has('m') || chars.has('n')) used.add('mirrorblock');
  if (chars.has('h') || chars.has('k')) used.add('splitter');
  if (chars.has('x')) used.add('shifter');
  if (['>', '<', '^', 'v'].some((c) => chars.has(c))) used.add('flow');
  if (chars.has('z') || chars.has('y')) used.add('enemy');
  if (chars.has('o')) used.add('stone');
  if (chars.has('P')) used.add('prism');
  if (chars.has('~')) used.add('ice');
  if (chars.has('@')) used.add('player');
  return { used, colors };
}

// Steuerung (aus pushView.js) und Seiten (aus main.js/labView.js)
const CONTROLS = [
  ['arrows', 'Pfeiltasten / WASD', 'Laufen und Blöcke schieben; gegen eine Wand nur umdrehen (kein Zug).', ['player', 'mirrorblock']],
  ['space', 'Leertaste / E', 'Dreht den Spiegel oder Strahlteiler direkt vor dem Block.', ['mirrorblock', 'splitter']],
  ['undo', 'Z – Zurück', 'Nimmt den letzten Zug zurück.', []],
  ['reset', 'R – Neustart', 'Setzt das Level auf den Anfang.', []],
  ['esc', 'Esc – Menü', 'Zurück ins Startmenü.', []],
  ['click', 'Klick / Tippen', 'Ein Schritt in Richtung des angeklickten Feldes; Rechtsklick auf den Block davor dreht.', ['player']],
  ['enter', 'Enter – Weiter', 'Im Siegfenster: nächstes Level.', []],
];
const ROUTES = [
  ['menu', '#/menu', 'Startmenü', 'Arcade-Hauptseite: Play-Knopf, Lichtblock, Lab, Statistik.', 'menu'],
  ['chapters', '#/menu/chapters', 'Kapitel-Karussell', 'Große Kapitelkarten zum Durchblättern.', 'menu'],
  ['chapter', '#/menu/chapter/N', 'Kapitelseite', 'Große Level-Kacheln eines Kapitels.', 'menu'],
  ['kit', '#/menu/kit', 'Lichtblock-Kit', 'Farbe und Symbol des Spielerblocks wählen.', 'menu'],
  ['adv', '#/adv/N', 'Escape-Raum', 'Pixel-Abenteuer: Raum N mit Ausgangstür und Fragmenten.', 'adventure'],
  ['textures', '#/textures', 'Texturbogen', 'Alle Pixel-Sprites in jeder Welt.', 'textureSheet'],
  ['daily', '#/daily', 'Tagesrätsel', 'Jeden Tag ein neues Rätsel aus der Levelschmiede.', 'dailyView'],
  ['run', '#/run/N', 'Spielseite', 'Level N im Modus Lichtläufer.', 'pushView'],
  ['lab', '#/lab', 'Lab-Seite', 'Aktueller Abschnitt, Arbeitsschritte, Gehirnkarte, Live-Log.', 'labView'],
  ['labfull', '#/lab/full', 'Lab Vollansicht', 'Gehirnkarte über das ganze Fenster mit Live-Log rechts.', 'labView'],
  ['brain', '#/brain', 'Nur Gehirnkarte', 'Karte allein im Vollbild, z. B. für ein zweites Fenster.', 'labView'],
];
const FORMATION_LIST = [
  ['brain', 'Formation Gehirn', 'Gruppen abwechselnd links/rechts wie zwei Hemisphären.'],
  ['sphere', 'Formation Kugel', 'Knoten gleichmäßig auf einer Kugel (Fibonacci-Verteilung).'],
  ['helix', 'Formation Doppelhelix', 'Zwei verdrehte Stränge.'],
  ['galaxy', 'Formation Galaxie', 'Spiralarme je Gruppe.'],
  ['clusters', 'Formation Cluster', 'Jede Gruppe als eigene Wolke im Ring.'],
];
// Einzeltests aus tests/tests.js mit geprüften Objekten
const UNIT_TESTS = [
  ['parse', 'Test: Level einlesen', ['wall', 'floor']],
  ['badchar', 'Test: unbekanntes Zeichen', []],
  ['straight', 'Test: Strahl geradeaus', ['beam', 'target']],
  ['mirrors', 'Test: Spiegelrichtungen', ['mirrorblock']],
  ['mix', 'Test: Rot + Blau = Magenta', ['target']],
  ['wrongcolor', 'Test: falsche Zusatzfarbe', ['target']],
  ['ends', 'Test: Strahl endet', ['beam', 'emitter']],
  ['walk', 'Test: Schritt / Wand / Umdrehen', ['player', 'wall']],
  ['pushblock', 'Test: Block schieben', ['mirrorblock', 'stone']],
  ['shadow', 'Test: Drehen + Schatten', ['player', 'mirrorblock']],
  ['prism', 'Test: Prisma zerlegt Weiß', ['prism']],
  ['filter', 'Test: Farbfilter', ['filter']],
  ['ice', 'Test: Eis-Rutschen', ['ice']],
  ['splitter', 'Test: Strahlteiler', ['splitter']],
  ['portal', 'Test: Portal-Durchgang', ['portal']],
  ['portalwalk', 'Test: Portal blockiert Bewegung', ['portal', 'player']],
  ['lock', 'Test: Lichtschloss', ['sensor', 'door', 'player']],
  ['lamp', 'Test: Wanderlampe', ['lamp', 'player']],
  ['plate', 'Test: Druckplatte', ['plate', 'flip', 'player']],
  ['shift', 'Test: Farbwandler', ['shifter']],
  ['flow', 'Test: Strömung', ['flow', 'player', 'mirrorblock']],
  ['daily', 'Test: Tagesrätsel', []],
  ['enemy', 'Test: Schattenläufer', ['enemy', 'player', 'beam']],
];
const BACKUPS = [
  [1, 'step-01-grundlage-lab.zip'], [2, 'step-02-prototyp-lichtlaeufer.zip'], [3, 'step-03-lichtlaeufer-ausbau.zip'],
  [4, 'step-04-neon-teiler-portale-schloesser.zip'], [5, 'step-05-wanderlampen.zip'], [6, 'step-06-schaltwerk-menue-sound.zip'], [7, 'step-07-welten-meister.zip'], [8, 'step-08-riff-tagesraetsel.zip'], [9, 'step-09-schatten-gegner.zip'], [10, 'step-10-pixel-abenteuer.zip'], [11, 'step-11-ranken-hud.zip'], [12, 'step-12-raeume-tutorial.zip'],
];

const TIERS = [
  { id: 'easy', label: 'Leicht (≤ 7 Züge)', max: 7 },
  { id: 'mid', label: 'Mittel (8–17 Züge)', max: 17 },
  { id: 'hard', label: 'Schwer (≥ 18 Züge)', max: Infinity },
];

export function buildProjectGraph(PUSH_LEVELS) {
  const nodes = [];
  const edges = [];
  const add = (n) => nodes.push({ status: 'built', step: 2, auto: true, ...n });
  const link = (from, to, rel) => edges.push({ from, to, rel });

  // Modus als Knotenpunkt
  add({ id: 'g-mode-run', type: 'mechanic', group: 'levels-run', label: 'Modus Lichtläufer', summary: `Spieler steuert einen Lichtblock und schiebt Blöcke. ${PUSH_LEVELS.length} Level.`, area: '#/run/0', status: 'passed' });

  // Objekte
  for (const o of OBJECTS) add({ id: `g-obj-${o.id}`, type: 'object', group: 'objects', label: o.label, summary: o.summary, step: o.step });
  // Farben
  for (const [mask, info] of Object.entries(COLOR_INFO)) {
    add({ id: `g-col-${mask}`, type: 'color', group: 'colors', label: info.name, color: info.hex, summary: `Farbmaske ${mask} (${['Rot', 'Grün', 'Blau'].filter((_, i) => mask & (1 << i)).join(' + ')}).` });
  }
  for (const mask of [3, 5, 6, 7]) for (const c of [1, 2, 4]) if (mask & c) link(`g-col-${c}`, `g-col-${mask}`, 'mischt zu');
  link('g-obj-prism', 'g-col-7', 'zerlegt');
  link('g-obj-filter', 'g-col-7', 'filtert');
  link('g-obj-splitter', 'g-obj-beam', 'teilt');
  link('g-obj-portal', 'g-obj-beam', 'versetzt');
  link('g-obj-player', 'g-obj-beam', 'wirft Schatten auf');
  link('g-obj-ice', 'g-obj-player', 'lässt rutschen');
  link('g-obj-emitter', 'g-obj-beam', 'sendet');
  link('g-obj-beam', 'g-obj-target', 'trifft');
  link('g-obj-beam', 'g-obj-sensor', 'beleuchtet');
  link('g-obj-sensor', 'g-obj-door', 'öffnet');
  link('g-obj-beam', 'g-obj-enemy', 'löst auf');
  link('g-obj-enemy', 'g-obj-player', 'jagt');
  link('g-obj-plate', 'g-obj-flip', 'kippt');
  link('g-obj-flip', 'g-obj-beam', 'lenkt um');
  link('g-obj-player', 'g-obj-plate', 'drückt');
  link('g-obj-stone', 'g-obj-plate', 'beschwert');
  link('g-obj-lamp', 'g-obj-beam', 'sendet');
  link('g-obj-lamp', 'g-obj-emitter', 'bewegliche Form von');
  link('g-obj-player', 'g-obj-lamp', 'schiebt/dreht');
  link('g-obj-player', 'g-obj-sensor', 'beschattet');
  link('g-obj-door', 'g-obj-player', 'sperrt/lässt durch');

  // Dateien
  for (const [path, summary, objs, step] of FILES) {
    const id = fileId(path);
    add({ id, type: 'file', group: 'files', label: path.split('/').pop(), summary, area: path, step });
    for (const o of objs) link(id, `g-obj-${o}`, 'implementiert');
  }
  const F = (name) => `g-file-${name}`;
  [
    ['push', 'engine', 'nutzt'], ['render', 'engine', 'nutzt'], ['pushView', 'push', 'nutzt'], ['pushView', 'render', 'zeichnet mit'],
    ['pushView', 'pushLevels', 'lädt'], ['pushView', 'progress', 'speichert in'], ['pushView', 'celebrate', 'feiert mit'],
    ['pushView', 'devlog', 'meldet an'], ['menu', 'pushLevels', 'listet'], ['menu', 'progress', 'liest'],
    ['menu', 'skins', 'wählt'], ['forge', 'push', 'löst mit'], ['daily', 'forge', 'baut mit'], ['dailyWorker', 'daily', 'rechnet'],
    ['dailyView', 'dailyWorker', 'startet'], ['dailyView', 'pushView', 'spielt in'], ['main', 'dailyView', 'zeigt'], ['menu', 'daily', 'zeigt Status'],
    ['tests', 'daily', 'prüft'],
    ['adventure', 'push', 'Regeln aus'], ['adventure', 'pixelRender', 'zeichnet mit'], ['pixelRender', 'skins', 'färbt Held mit'],
    ['pixelRender', 'worlds', 'Welt-Paletten wie'], ['main', 'adventure', 'zeigt'], ['main', 'textureSheet', 'zeigt'], ['menu', 'adventure', 'startet'],
    ['adventure', 'sound', 'spielt ab mit'], ['textureSheet', 'pixelRender', 'zeigt'], ['render', 'skins', 'zeichnet Spieler mit'], ['skins', 'settings', 'speichert in'],
    ['main', 'menu', 'zeigt'], ['main', 'pushView', 'zeigt'], ['main', 'labView', 'zeigt'], ['labView', 'brainMap', 'enthält'],
    ['labView', 'projectGraph', 'nutzt'], ['projectGraph', 'pushLevels', 'liest'], ['labView', 'brain', 'lädt'], ['labView', 'lab', 'lädt'],
    ['devlog', 'serve', 'POST /api/log'], ['serve', 'live', 'schreibt/liest'], ['labView', 'serve', 'fragt /api/activity'],
    ['tests', 'push', 'prüft'], ['tests', 'pushLevels', 'löst'], ['tests', 'devlog', 'meldet an'], ['check', 'brain', 'prüft'],
    ['check', 'lab', 'prüft'], ['devlog', 'config', 'nur wenn IS_DEV'], ['SYSTEM', 'live', 'erklärt'], ['SYSTEM', 'projectGraph', 'erklärt'],
  ].forEach(([a, b, rel]) => link(F(a), F(b), rel));
  link('g-file-push', 'g-mode-run', 'implementiert');
  link('g-file-engine', 'g-mode-run', 'Lichtlogik für');
  link('g-file-pushView', 'g-mode-run', 'zeigt');

  // Animationen und Texturen
  for (const a of ANIMATIONS) {
    add({ id: `g-anim-${a.id}`, type: 'animation', group: 'animations', label: a.label, summary: a.summary, area: a.file ? FILES.find((f) => fileId(f[0]) === F(a.file))?.[0] : 'src/game/render.js' });
    for (const o of a.objects) link(`g-anim-${a.id}`, `g-obj-${o}`, 'animiert');
    link(F(a.file || 'render'), `g-anim-${a.id}`, 'spielt ab');
  }
  for (const tx of TEXTURES) {
    add({ id: `g-tex-${tx.id}`, type: 'texture', group: 'textures', label: tx.label, summary: tx.summary, area: 'src/game/render.js' });
    for (const o of tx.objects) link(`g-tex-${tx.id}`, `g-obj-${o}`, 'gestaltet');
  }

  // Klänge
  for (const [id, label, summary, objs] of SOUNDS) {
    add({ id: `g-snd-${id}`, type: 'animation', group: 'sounds', label: `Klang: ${label}`, summary, area: 'src/game/sound.js', step: 9 });
    link(F('sound'), `g-snd-${id}`, 'synthetisiert');
    for (const o of objs) link(`g-obj-${o}`, `g-snd-${id}`, 'erklingt als');
  }
  link(F('pushView'), F('sound'), 'spielt ab mit'); link(F('menu'), F('sound'), 'spielt ab mit'); link(F('sound'), F('settings'), 'Lautstärke aus');

  // Live-Log-Quellen
  for (const [src, summary, file] of LOG_SOURCES) {
    add({ id: `g-log-${src}`, type: 'logsrc', group: 'livelog', label: `Log: ${src}`, summary, area: 'live.log', step: 5 });
    link(`g-log-${src}`, F('live'), 'schreibt in');
    if (file !== 'live') link(F(file), `g-log-${src}`, 'erzeugt');
  }

  // Steuerung, Seiten, Formationen, Einzeltests, Sicherungen
  for (const [id, label, summary, objs] of CONTROLS) {
    add({ id: `g-key-${id}`, type: 'mechanic', group: 'controls', label, summary, area: 'src/ui/pushView.js' });
    link(F('pushView'), `g-key-${id}`, 'reagiert auf');
    for (const o of objs) link(`g-key-${id}`, `g-obj-${o}`, 'steuert');
  }
  for (const [id, route, label, summary, file] of ROUTES) {
    add({ id: `g-route-${id}`, type: 'improvement', group: 'routes', label: `${label} ${route}`, summary, area: route.replace('/N', '/0'), step: 1 });
    link(F('main'), `g-route-${id}`, 'leitet zu');
    link(`g-route-${id}`, F(file), 'zeigt');
  }
  link('g-route-run', 'g-mode-run', 'spielt');
  for (const [id, label, summary] of FORMATION_LIST) {
    add({ id: `g-form-${id}`, type: 'improvement', group: 'formations', label, summary, area: 'src/lab/brainMap.js' });
    link(F('brainMap'), `g-form-${id}`, 'ordnet als');
  }
  for (const [id, label, objs] of UNIT_TESTS) {
    const step = id === 'enemy' ? 12 : ['flow', 'daily'].includes(id) ? 11 : id === 'shift' ? 10 : id === 'plate' ? 8 : id === 'lamp' ? 7 : id === 'lock' ? 6 : ['splitter', 'portal', 'portalwalk'].includes(id) ? 5 : ['prism', 'filter', 'ice'].includes(id) ? 3 : 2;
    add({ id: `g-test-${id}`, type: 'test', group: 'tests', label, summary: 'Einzeltest der Browser-Testseite tests/index.html.', area: 'tests/index.html', status: 'passed', step });
    link(F('tests'), `g-test-${id}`, 'enthält');
    for (const o of objs) link(`g-test-${id}`, `g-obj-${o}`, 'prüft');
    link(`g-test-${id}`, 'g-log-TEST', 'meldet an');
  }
  BACKUPS.forEach(([n, file], i) => {
    add({ id: `g-bak-${n}`, type: 'file', group: 'backups', label: file, summary: `Sicherung nach Schritt ${n} (backups/).`, area: 'backups/BACKUP_LOG.md', step: n });
    link(F('backup'), `g-bak-${n}`, 'erzeugte');
    if (i > 0) link(`g-bak-${BACKUPS[i - 1][0]}`, `g-bak-${n}`, 'Vorgänger von');
  });

  // Welten (Orte) – je Kapitel eine Welt mit eigenen Texturen und Teilchen
  CHAPTERS.forEach((ch, i) => {
    const wid = CHAPTER_WORLD[ch.id], w = WORLDS[wid];
    if (!w) return;
    add({ id: `g-world-${wid}`, type: 'step', group: 'worlds', label: `Welt ${i + 1}: ${w.icon} ${w.name}`, summary: `${ch.name} – ${ch.summary} ${ch.levels.length} Level.`, area: `#/menu/chapter/${i}`, step: 10, status: 'passed' });
    link(F('worlds'), `g-world-${wid}`, 'zeichnet');
    if (i > 0) link(`g-world-${CHAPTER_WORLD[CHAPTERS[i - 1].id]}`, `g-world-${wid}`, 'führt weiter nach');
  });
  link(F('render'), F('worlds'), 'zeichnet Welten mit'); link(F('pushView'), F('worlds'), 'wählt Welt'); link(F('menu'), F('worlds'), 'färbt Karten mit');

  // Schwierigkeitsstufen
  for (const t of TIERS) add({ id: `g-tier-${t.id}`, type: 'tier', group: 'tiers', label: t.label, summary: 'Level nach Mindestzügen laut Löser.' });
  link('g-tier-easy', 'g-tier-mid', 'steigt zu'); link('g-tier-mid', 'g-tier-hard', 'steigt zu');

  // Level mit verwendeten Objekten, Farben, Stufe, Größe und Einführung neuer Elemente
  const introduced = new Set();
  PUSH_LEVELS.forEach((def, i) => {
    const id = `g-lvl-${def.id}`;
    const { used, colors } = levelUses(def, def.rows);
    const w = Math.max(...def.rows.map((r) => r.length)), h = def.rows.length;
    const blocks = [...def.rows.join('')].filter((c) => 'mnhkoP'.includes(c) || def.legend?.[c]?.type === 'filter').length;
    add({ id, type: 'level', group: 'levels-run', label: `${i + 1}. ${def.name}`, summary: `${def.hint} Feld ${w}×${h}, ${blocks} Blöcke, Zugziel ${def.par ?? '–'}.`, area: `#/run/${i}`, status: 'passed', step: Number(def.id.slice(1)) >= 42 ? 12 : Number(def.id.slice(1)) >= 33 ? 11 : Number(def.id.slice(1)) >= 26 ? 10 : Number(def.id.slice(1)) >= 23 ? 8 : Number(def.id.slice(1)) >= 20 ? 7 : Number(def.id.slice(1)) >= 16 ? 6 : Number(def.id.slice(1)) >= 11 ? 5 : Number(def.id.slice(1)) >= 10 ? 4 : Number(def.id.slice(1)) >= 6 ? 3 : 2 });
    link('g-mode-run', id, 'enthält');
    if (i > 0) link(`g-lvl-${PUSH_LEVELS[i - 1].id}`, id, 'führt zu');
    for (const o of used) {
      if (['wall', 'floor', 'beam'].includes(o)) continue;
      const fresh = !introduced.has(o) && !['player', 'emitter', 'target'].includes(o);
      link(id, `g-obj-${o}`, fresh ? 'führt ein' : 'nutzt');
      introduced.add(o);
    }
    for (const c of colors) link(id, `g-col-${c}`, 'nutzt Farbe');
    const chap = CHAPTERS.find((c) => c.levels.includes(def.id));
    if (chap && CHAPTER_WORLD[chap.id]) link(id, `g-world-${CHAPTER_WORLD[chap.id]}`, def.master ? 'Meisterprüfung in' : 'spielt in');
    const tier = TIERS.find((t) => (def.par ?? 0) <= t.max);
    link(`g-tier-${tier.id}`, id, 'umfasst');
    link('g-file-pushLevels', id, 'definiert');
  });

  return { nodes, edges };
}

/** Kuratierte Karte + Projektknoten + Arbeitsschritte aus lab.json; verbindet die Bereiche. */
export function mergeGraphs(curated, generated, lab = null) {
  const ids = new Set(curated.nodes.map((n) => n.id));
  const genIds = new Set(generated.nodes.map((n) => n.id));
  const extraNodes = [];
  const extraEdges = [];
  // Arbeitsschritte als Knoten: jeder Schritt verbindet alle Knoten, die in ihm entstanden sind.
  if (lab?.steps) {
    lab.steps.forEach((s, i) => {
      const id = `g-step-${s.id}`;
      extraNodes.push({ id, type: 'step', group: 'steps', auto: true, step: s.id, label: `Schritt ${s.id}: ${s.title}`, summary: s.goal || '', status: s.status === 'in_progress' ? 'testing' : s.status === 'planned' ? 'idea' : 'passed', area: '#/lab' });
      if (i > 0) extraEdges.push({ from: `g-step-${lab.steps[i - 1].id}`, to: id, rel: 'danach' });
    });
    const stepIds = new Set(lab.steps.map((s) => s.id));
    for (const n of [...curated.nodes, ...generated.nodes]) {
      if (n.type === 'goal' || n.type === 'color' || n.type === 'texture' || n.type === 'tier') continue;
      if (stepIds.has(n.step) && (n.type !== 'file' || !n.auto || n.step >= 2)) extraEdges.push({ from: `g-step-${n.step}`, to: n.id, rel: 'brachte' });
    }
    extraEdges.push({ from: 'goal', to: `g-step-${lab.steps[0].id}`, rel: 'begann mit' });
  }
  const bridges = [
    ['mech-beam', 'g-obj-beam', 'zeichnet als'],
    ['mech-mix', 'g-col-7', 'definiert'],
    ['mech-push', 'g-mode-run', 'ist'],
    ['lvl-push', 'g-mode-run', 'umfasst'],
    ['mech-prism', 'g-obj-prism', 'ist'],
    ['mech-filter', 'g-obj-filter', 'ist'],
    ['mech-ice', 'g-obj-ice', 'ist'],
    ['mech-splitter', 'g-obj-splitter', 'ist'],
    ['mech-portal', 'g-obj-portal', 'ist'],
    ['goal', 'g-mode-run', 'Hauptmodus'],
    ['mech-lock', 'g-obj-sensor', 'ist'],
    ['mech-lock', 'g-obj-door', 'ist'],
    ['lvl-lock', 'g-lvl-w16', 'enthält'],
    ['lvl-lock', 'g-lvl-w17', 'enthält'],
    ['lvl-lock', 'g-lvl-w18', 'enthält'],
    ['lvl-lock', 'g-lvl-w19', 'enthält'],
    ['mech-prism', 'g-lvl-w18', 'Schlüssel in'],
    ['mech-lamp', 'g-obj-lamp', 'ist'],
    ['mech-plate', 'g-obj-plate', 'ist'],
    ['mech-plate', 'g-obj-flip', 'ist'],
    ['lvl-plate', 'g-lvl-w23', 'enthält'],
    ['lvl-plate', 'g-lvl-w24', 'enthält'],
    ['lvl-plate', 'g-lvl-w25', 'enthält'],
    ['feat-arcade', 'g-file-menu', 'umgesetzt in'],
    ['feat-kit', 'g-file-skins', 'umgesetzt in'],
    ['feat-sound', 'g-file-sound', 'umgesetzt in'],
    ['feat-chapters', 'g-file-pushLevels', 'umgesetzt in'],
    ['lvl-lamp', 'g-lvl-w20', 'enthält'],
    ['lvl-lamp', 'g-lvl-w21', 'enthält'],
    ['lvl-lamp', 'g-lvl-w22', 'enthält'],
    ['mech-lock', 'g-lvl-w22', 'Schloss in'],
    ['test-lamp', 'g-test-lamp', 'ist'],
    ['mech-ice', 'g-lvl-w19', 'Hindernis in'],
    ['test-lock', 'g-test-lock', 'ist'],
    ['feat-livelog', 'g-file-live', 'zeigt'],
    ['feat-logbus', 'g-file-devlog', 'umgesetzt in'],
    ['feat-logcolor', 'g-anim-logflow', 'gestaltet'],
    ['feat-fx', 'g-anim-fireworks', 'ist'],
    ['feat-neon', 'g-anim-framerun', 'enthält'],
    ['feat-levelselect', 'g-file-menu', 'umgesetzt in'],
    ['doc-system', 'g-file-SYSTEM', 'ist'],
    ['feat-allnodes', 'g-file-projectGraph', 'umgesetzt in'],
    ['feat-brain3d', 'g-file-brainMap', 'umgesetzt in'],
    ['feat-lab', 'g-file-labView', 'umgesetzt in'],
    ['file-serve', 'g-file-serve', 'ist'],
    ['file-backup', 'g-file-backup', 'ist'],
    ['file-check', 'g-file-check', 'ist'],
    ['lvl-big1', 'g-lvl-w10', 'ist'],
    ['lvl-push3', 'g-lvl-w11', 'enthält'],
    ['lvl-push3', 'g-lvl-w12', 'enthält'],
    ['lvl-push3', 'g-lvl-w13', 'enthält'],
    ['lvl-push3', 'g-lvl-w14', 'enthält'],
    ['lvl-push3', 'g-lvl-w15', 'enthält'],
  ].filter(([a, b]) => ids.has(a) && genIds.has(b));
  return {
    nodes: [...curated.nodes, ...generated.nodes, ...extraNodes],
    edges: [...curated.edges, ...generated.edges, ...extraEdges, ...bridges.map(([from, to, rel]) => ({ from, to, rel }))],
  };
}
