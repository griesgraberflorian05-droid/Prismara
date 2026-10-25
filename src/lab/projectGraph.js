// "Alle Knoten": erzeugt Knoten aus den tatsächlichen Projektinhalten (Level, Objekte,
// Farben, Animationen, Texturen, Dateien, Arbeitsschritte, Live-Log-Quellen) und verknüpft
// sie mit der kuratierten Gehirnkarte. Nichts wird erfunden: Level und Farben werden aus den
// Leveldaten gelesen, Objekte/Animationen/Texturen entsprechen den Zeichenfunktionen in
// src/game/render.js, Schritte kommen aus lab/lab.json, Dateien aus dem Projektordner.
import { COLOR_INFO, parseColor } from '../game/engine.js';

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
  { id: 'portalspin', label: 'Portal-Wirbel', summary: 'Drei Bögen kreisen um den Portalbuchstaben.', objects: ['portal'] },
  { id: 'framerun', label: 'Neon-Rahmen', summary: 'Pink-Violett-Cyan-Verlauf wandert um das Spielfeld (3 s pro Runde).', objects: ['wall'] },
  { id: 'sparkle', label: 'Ziel-Funken', summary: 'Funken, sobald ein einzelnes Ziel neu aufleuchtet.', objects: ['target'], file: 'celebrate' },
  { id: 'fireworks', label: 'Siegesfeuerwerk', summary: 'Blitz, Lichtwellen von jedem Ziel und Raketen über den ganzen Bildschirm.', objects: ['target'], file: 'celebrate' },
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
  { id: 'rivets', label: 'Block-Nieten', summary: 'Vier Eckpunkte kennzeichnen schiebbare Lichtblöcke.', objects: ['mirrorblock', 'prism', 'filter', 'splitter'] },
  { id: 'rainbow', label: 'Regenbogenkante', summary: 'Prisma-Dreieck mit Rot-Grün-Blau-Verlauf.', objects: ['prism'] },
  { id: 'tint', label: 'Farbglas', summary: 'Halbtransparente Filterfläche mit Formsymbol.', objects: ['filter'] },
  { id: 'icesheen', label: 'Eisglanz', summary: 'Hellblauer Verlauf mit Glanzstreifen.', objects: ['ice'] },
  { id: 'goldcube', label: 'Gold-Verlauf', summary: 'Warmer Verlauf mit Prisma-Symbol für den Spielerblock.', objects: ['player'] },
  { id: 'glyphs', label: 'Formsymbole ▲●■', summary: 'Rot ▲, Grün ●, Blau ■ – Farben ohne Farbsinn erkennbar.', objects: ['emitter', 'target', 'beam'] },
];

// [Pfad, Beschreibung, implementierte Objekte, Schritt]
const FILES = [
  ['src/game/engine.js', 'Strahlverfolgung, Farben, Prisma, Filter, Strahlteiler, Portale', ['beam', 'emitter', 'target', 'prism', 'filter', 'splitter', 'portal'], 2],
  ['src/game/push.js', 'Lichtläufer: Bewegen, Schieben, Drehen, Eis, Löser (Breitensuche)', ['player', 'mirrorblock', 'stone', 'ice', 'splitter'], 2],
  ['src/game/pushLevels.js', 'Alle Level als Textraster + Legende + Zugziel', [], 2],
  ['src/game/render.js', 'Zeichnen aller Objekte, Strahlen, Animationen', ['beam', 'player', 'wall', 'floor', 'ice', 'portal', 'splitter'], 2],
  ['src/game/progress.js', 'Fortschritt und Bestleistungen (localStorage)', [], 2],
  ['src/ui/pushView.js', 'Spielansicht Lichtläufer: Eingabe, HUD, Sieg, Live-Log der Züge', [], 2],
  ['src/ui/menu.js', 'Startmenü mit Fortschritt und Level-Auswahl', [], 2],
  ['src/ui/celebrate.js', 'Siegesfeuerwerk und Ziel-Funken', [], 4],
  ['src/main.js', 'Router: #/menu, #/run/N, #/lab, #/brain', [], 1],
  ['src/config.js', 'Umgebung aus /env.js (IS_DEV)', [], 1],
  ['src/settings.js', 'Einstellungen, reduzierte Bewegung', [], 1],
  ['src/devlog.js', 'Live-Log-Bus: Spiel/Löser/Tests schreiben über POST /api/log in live.log', [], 5],
  ['src/styles.css', 'Neon-Design, Layout, Live-Log-Farben', [], 1],
  ['src/lab/labView.js', 'Lab-Seite: Status, Schritte, Karte, Live-Log-Panel mit Systempuls', [], 1],
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
  ['menu', '#/menu', 'Startmenü', 'Spielen, Fortschritt, Level-Auswahl, Lab-Zugang.', 'menu'],
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
];
const BACKUPS = [
  [1, 'step-01-grundlage-lab.zip'], [2, 'step-02-prototyp-lichtlaeufer.zip'], [3, 'step-03-lichtlaeufer-ausbau.zip'],
  [4, 'step-04-neon-feier-gross.zip'], [5, 'step-05-teiler-portale.zip'],
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
    const step = ['splitter', 'portal', 'portalwalk'].includes(id) ? 5 : ['prism', 'filter', 'ice'].includes(id) ? 3 : 2;
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
    add({ id, type: 'level', group: 'levels-run', label: `${i + 1}. ${def.name}`, summary: `${def.hint} Feld ${w}×${h}, ${blocks} Blöcke, Zugziel ${def.par ?? '–'}.`, area: `#/run/${i}`, status: 'passed', step: Number(def.id.slice(1)) >= 11 ? 5 : Number(def.id.slice(1)) >= 10 ? 4 : Number(def.id.slice(1)) >= 6 ? 3 : 2 });
    link('g-mode-run', id, 'enthält');
    if (i > 0) link(`g-lvl-${PUSH_LEVELS[i - 1].id}`, id, 'führt zu');
    for (const o of used) {
      if (['wall', 'floor', 'beam'].includes(o)) continue;
      const fresh = !introduced.has(o) && !['player', 'emitter', 'target'].includes(o);
      link(id, `g-obj-${o}`, fresh ? 'führt ein' : 'nutzt');
      introduced.add(o);
    }
    for (const c of colors) link(id, `g-col-${c}`, 'nutzt Farbe');
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
