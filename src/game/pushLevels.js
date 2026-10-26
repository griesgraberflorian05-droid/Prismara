// Level für den Modus "Lichtläufer". Zeichen: '#' Wand, '.' Boden, '@' Spieler,
// 'm' Spiegelblock '/', 'n' Spiegelblock '\', 'o' Steinblock (blockiert Licht),
// 'h'/'k' Strahlteiler '/' bzw. '\', 'P' Prisma, '~' Eis.
// Emitter und Ziele über legend. 'par' = Mindestzüge laut Löser (Tests prüfen das).

const R_E = { type: 'emitter', dir: 'E', color: 'R' };

const ALL_LEVELS = [
  {
    id: 'w1',
    name: 'Erster Schub',
    hint: 'Pfeiltasten oder WASD bewegen deinen Lichtblock. Schiebe den Spiegel in den Strahl – und geh dem Licht aus dem Weg.',
    par: 3,
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#a......#',
      '#.......#',
      '#...n...#',
      '#...@...#',
      '#...1...#',
      '#########',
    ],
  },
  {
    id: 'w2',
    name: 'Drehmoment',
    hint: 'Leertaste dreht den Spiegel, auf den dein Block schaut.',
    par: 6,
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#a......#',
      '#.......#',
      '#.....m.#',
      '#...@...#',
      '#.....1.#',
      '#########',
    ],
  },
  {
    id: 'w3',
    name: 'Zwei Farben',
    hint: 'Jedes Ziel braucht genau seine Farbe. Strahlen dürfen sich kreuzen.',
    par: 12,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'E', color: 'B' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'B' },
    },
    rows: [
      '###########',
      '#a........#',
      '#.........#',
      '#..n......#',
      '#......n..#',
      '#....@....#',
      '#b........#',
      '#..1...2..#',
      '###########',
    ],
  },
  {
    id: 'w5',
    name: 'Schattenspiel',
    hint: 'Steinblöcke schlucken Licht. Räume den Weg frei, bevor du spiegelst.',
    par: 14,
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#a.o....#',
      '#.......#',
      '#....n..#',
      '#.@.....#',
      '#....1..#',
      '#########',
    ],
  },
  {
    id: 'w4',
    name: 'Mischlicht',
    hint: 'Rot und Blau ergeben Magenta: Beide Strahlen müssen dasselbe Ziel treffen.',
    par: 17,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'S', color: 'B' },
      3: { type: 'target', color: 'RB' },
    },
    rows: [
      '#########',
      '#...b...#',
      '#.....n.#',
      '#a......#',
      '#.......#',
      '#..n.@..#',
      '#......3#',
      '#########',
    ],
  },
  {
    id: 'w6',
    name: 'Prisma',
    hint: 'Das Prisma zerlegt weißes Licht: Rot knickt links ab, Grün läuft geradeaus, Blau knickt rechts ab.',
    par: 5,
    legend: {
      w: { type: 'emitter', dir: 'E', color: 'W' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'G' },
      3: { type: 'target', color: 'B' },
    },
    rows: [
      '###########',
      '#.....1...#',
      '#.........#',
      '#w..P....2#',
      '#.........#',
      '#..@..3...#',
      '###########',
    ],
  },
  {
    id: 'w7',
    name: 'Farbfilter',
    hint: 'Ein Farbfilter lässt nur seine eigene Farbe durch. Weißes Licht am roten Ziel ist falsch (≠).',
    par: 4,
    legend: {
      w: { type: 'emitter', dir: 'E', color: 'W' },
      1: { type: 'target', color: 'R' },
      r: { type: 'filter', color: 'R' },
    },
    rows: [
      '#########',
      '#w.....1#',
      '#.......#',
      '#..r....#',
      '#....@..#',
      '#########',
    ],
  },
  {
    id: 'w8',
    name: 'Glatteis',
    hint: 'Auf Eis rutschen dein Block und geschobene Blöcke weiter, bis etwas im Weg ist.',
    par: 4,
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#a......#',
      '#.~~~~~.#',
      '#.~n~~~.#',
      '#.~~o~~.#',
      '#@.1....#',
      '#########',
    ],
  },
  {
    id: 'w9',
    name: 'Regenbogen',
    hint: 'Licht fällt von oben ins Prisma: Rot knickt dann nach Osten, Blau nach Westen. Spiegel an den Enden lenken sie nach unten.',
    par: 19,
    legend: {
      w: { type: 'emitter', dir: 'S', color: 'W' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'G' },
      3: { type: 'target', color: 'B' },
    },
    rows: [
      '###########',
      '#....w....#',
      '#.........#',
      '#..m...P..#',
      '#.........#',
      '#....@..n.#',
      '#3...2...1#',
      '###########',
    ],
  },
];

// Große Level (ab Schritt 4)
ALL_LEVELS.push(
  {
    id: 'w10',
    name: 'Lange Leitung',
    hint: 'Weite Wege: Bring jeden Spiegel ans richtige Ende – und denk daran, dass dein Block Schatten wirft.',
    par: 25,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'E', color: 'B' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'B' },
    },
    rows: [
      '###############',
      '#a............#',
      '#.............#',
      '#........n...2#',
      '#...m.......1.#',
      '#b.@..........#',
      '###############',
    ],
  },
);

// Strahlteiler und Lichtportale (ab Schritt 5). 'h' = Strahlteiler '/', 'k' = Strahlteiler '\'.
ALL_LEVELS.push(
  {
    id: 'w11',
    name: 'Halbes Licht',
    hint: 'Der Strahlteiler lässt Licht durch UND spiegelt es. Ein Strahl, zwei Ziele.',
    par: 7,
    legend: { a: R_E, 1: { type: 'target', color: 'R' }, 2: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#a.....1#',
      '#.......#',
      '#..k....#',
      '#..@....#',
      '#....2..#',
      '#########',
    ],
  },
  {
    id: 'w12',
    name: 'Lichtportal',
    hint: 'Licht, das in ein Portal fällt, kommt am Portal mit demselben Buchstaben in derselben Richtung heraus.',
    par: 9,
    legend: { a: { type: 'emitter', dir: 'S', color: 'B' }, A: { type: 'portal', pair: 'A' }, 1: { type: 'target', color: 'B' } },
    rows: [
      '#############',
      '#.a.....#...#',
      '#.......#...#',
      '#..m..@.#...#',
      '#.......#...#',
      '#......A#A.1#',
      '#############',
    ],
  },
  {
    id: 'w13',
    name: 'Weißes Kreuz',
    hint: 'Teile das weiße Licht – und filtere jeden Teil in seine Farbe.',
    par: 17,
    legend: {
      w: { type: 'emitter', dir: 'E', color: 'W' },
      r: { type: 'filter', color: 'R' },
      b: { type: 'filter', color: 'B' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'B' },
    },
    rows: [
      '#########',
      '#w.....2#',
      '#.......#',
      '#...k.b.#',
      '#.r.....#',
      '#...@...#',
      '#...1...#',
      '#########',
    ],
  },
  {
    id: 'w14',
    name: 'Gegenverkehr',
    hint: 'Rot und Blau nutzen dasselbe Portalpaar – aus entgegengesetzten Richtungen. Wohin kommt jeder Strahl heraus?',
    par: 27,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'W', color: 'B' },
      A: { type: 'portal', pair: 'A' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'B' },
    },
    rows: [
      '###############',
      '#a.....A.....b#',
      '#......#.....1#',
      '#.2....#......#',
      '#.............#',
      '#...n..#..m...#',
      '#..@...#......#',
      '#......A......#',
      '###############',
    ],
  },
  {
    id: 'w15',
    name: 'Lichtorchester',
    hint: 'Finale: Das Prisma zerlegt Weiß. Rot reist durchs Portal, Grün teilt sich auf zwei Ziele, Blau braucht einen Spiegel.',
    par: 26,
    legend: {
      w: { type: 'emitter', dir: 'E', color: 'W' },
      A: { type: 'portal', pair: 'A' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'G' },
      4: { type: 'target', color: 'G' },
      3: { type: 'target', color: 'B' },
    },
    rows: [
      '#################',
      '#...A...#.1.4...#',
      '#.......#.......#',
      '#w.............2#',
      '#..P..n.#...h...#',
      '#..@...3#.A.....#',
      '#################',
    ],
  },
);

// Lichtschlösser (ab Schritt 6): Ein Sensor öffnet sein Tor, solange Licht in genau seiner
// Farbe auf ihn fällt. Steht etwas im Tor, bleibt es offen (verklemmt).
ALL_LEVELS.push(
  {
    id: 'w16',
    name: 'Schattenschloss',
    hint: 'Der rote Sensor öffnet Tor A – solange sein Licht ankommt. Achtung: Dein eigener Schatten schließt das Tor wieder.',
    par: 18,
    legend: {
      a: { type: 'emitter', dir: 'S', color: 'R' },
      b: { type: 'emitter', dir: 'E', color: 'B' },
      S: { type: 'sensor', color: 'R', door: 'A' },
      D: { type: 'door', door: 'A' },
      1: { type: 'target', color: 'B' },
    },
    rows: [
      '#############',
      '#....a..#..1#',
      '#....o..#.n.#',
      '#b......D...#',
      '#..@.S..#...#',
      '#############',
    ],
  },
  {
    id: 'w17',
    name: 'Kettenschloss',
    exit: [14, 2], // Durchspieltest: die automatische Tür lag hinter dem Lichttor, das nach dem Lösen zufällt
    hint: 'Licht öffnet Licht: Erst wenn Tor A offen ist, kann Blau den Sensor für Tor B erreichen.',
    par: 15,
    legend: {
      a: { type: 'emitter', dir: 'S', color: 'R' },
      g: { type: 'emitter', dir: 'S', color: 'G' },
      b: { type: 'emitter', dir: 'S', color: 'B' },
      R: { type: 'sensor', color: 'R', door: 'A' },
      S: { type: 'sensor', color: 'B', door: 'B' },
      A: { type: 'door', door: 'A' },
      D: { type: 'door', door: 'B' },
      1: { type: 'target', color: 'G' },
    },
    rows: [
      '###############',
      '#...a....#..gb#',
      '#........#....#',
      '#S..o....A.m..#',
      '#........###D##',
      '#..@.....#....#',
      '#...R....#..1.#',
      '###############',
    ],
  },
  {
    id: 'w18',
    name: 'Prismenschlüssel',
    hint: 'Neu: Lichtschloss! Fällt Licht in seiner Farbe auf den Sensor (Raute), öffnet sich das Tor mit demselben Buchstaben. Der Sensor will Rot – das Prisma macht es aus Weiß.',
    par: 9,
    legend: {
      w: { type: 'emitter', dir: 'E', color: 'W' },
      R: { type: 'sensor', color: 'R', door: 'A' },
      A: { type: 'door', door: 'A' },
      1: { type: 'target', color: 'G' },
      2: { type: 'target', color: 'B' },
    },
    rows: [
      '#############',
      '#...R...#...#',
      '#.......#...#',
      '#w....P.A..1#',
      '#....m..#...#',
      '#.2...@.#...#',
      '#############',
    ],
  },
  {
    id: 'w19',
    name: 'Frostriegel',
    hint: 'Ein Stein auf dem Eis sperrt das rote Licht. Wer ihn anschiebt, sieht ihn davonrutschen – und Blau muss danach noch über das Eis zum Tor.',
    par: 17,
    legend: {
      a: { type: 'emitter', dir: 'S', color: 'R' },
      b: { type: 'emitter', dir: 'E', color: 'B' },
      R: { type: 'sensor', color: 'R', door: 'A' },
      A: { type: 'door', door: 'A' },
      1: { type: 'target', color: 'B' },
    },
    rows: [
      '###############',
      '#...a...#....1#',
      '#.~~~~~.#.....#',
      '#.~~o~~.#.....#',
      '#b~~~~~.A.....#',
      '#..@....#...m.#',
      '#...R...#.....#',
      '###############',
    ],
  },
);

// Wanderlampen (ab Schritt 7): schiebbare Lichtquellen; Leertaste dreht die Leuchtrichtung.
ALL_LEVELS.push(
  {
    id: 'w20',
    name: 'Wanderlampe',
    hint: 'Diese Lampe lässt sich schieben – und die Leertaste dreht ihre Leuchtrichtung im Uhrzeigersinn.',
    par: 5,
    legend: { L: { type: 'lamp', dir: 'S', color: 'R' }, 1: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#......1#',
      '#.......#',
      '#..L....#',
      '#..@....#',
      '#########',
    ],
  },
  {
    id: 'w21',
    name: 'Weißer Dreiklang',
    hint: 'Drei Lampen, ein weißes Ziel: Rot, Grün und Blau müssen gleichzeitig ankommen – aus drei Richtungen.',
    par: 16,
    legend: {
      L: { type: 'lamp', dir: 'N', color: 'R' },
      G: { type: 'lamp', dir: 'N', color: 'G' },
      K: { type: 'lamp', dir: 'N', color: 'B' },
      7: { type: 'target', color: 'RGB' },
    },
    rows: [
      '###########',
      '#....7....#',
      '#.........#',
      '#..L.G.K..#',
      '#....@....#',
      '###########',
    ],
  },
  {
    id: 'w22',
    name: 'Lampenschlüssel',
    hint: 'Trag das rote Licht selbst zum Sensor: Erst dann öffnet sich das Tor für den blauen Strahl.',
    par: 7,
    legend: {
      L: { type: 'lamp', dir: 'S', color: 'R' },
      b: { type: 'emitter', dir: 'E', color: 'B' },
      S: { type: 'sensor', color: 'R', door: 'A' },
      A: { type: 'door', door: 'A' },
      1: { type: 'target', color: 'B' },
    },
    rows: [
      '#############',
      '#.....S.#...#',
      '#..L....#...#',
      '#b......A..1#',
      '#....@..#...#',
      '#############',
    ],
  },
);

// Druckplatten (ab Schritt 8): Steht Spieler oder Block auf einer Platte, kippen alle fest
// verankerten Kippspiegel mit demselben Buchstaben.
const PLATE_A = { type: 'plate', plate: 'A' };
const FLIP_A = { type: 'flip', plate: 'A', orient: '/' };
ALL_LEVELS.push(
  {
    id: 'w23',
    name: 'Trittschalter',
    hint: 'Steh auf der Platte A – dann kippt der verankerte Spiegel A und lenkt Rot nach unten.',
    par: 9,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'E', color: 'B' },
      F: FLIP_A,
      p: PLATE_A,
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'B' },
    },
    rows: [
      '###########',
      '#a...F....#',
      '#.........#',
      '#.....p..2#',
      '#....1....#',
      '#b.@..m...#',
      '###########',
    ],
  },
  {
    id: 'w24',
    name: 'Kippwerk',
    hint: 'Zwei Platten, zwei Kippspiegel. Du kannst nur auf einer stehen – der Stein muss die andere halten.',
    par: 15,
    legend: {
      a: R_E,
      g: { type: 'emitter', dir: 'S', color: 'G' },
      F: FLIP_A,
      G: { type: 'flip', plate: 'B', orient: '\\' },
      p: PLATE_A,
      q: { type: 'plate', plate: 'B' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'G' },
    },
    rows: [
      '#############',
      '#a...F....g.#',
      '#...........#',
      '#2........G.#',
      '#.....o.....#',
      '#..q.1..p...#',
      '#....@......#',
      '#############',
    ],
  },
  {
    id: 'w25',
    name: 'Schaltzentrale',
    hint: 'Die Platte liegt mitten im blauen Strahl. Was drückt sie, ohne Blau zu schlucken?',
    par: 15,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'E', color: 'B' },
      F: FLIP_A,
      p: PLATE_A,
      f: { type: 'filter', color: 'B' },
      S: { type: 'sensor', color: 'R', door: 'A' },
      A: { type: 'door', door: 'A' },
      1: { type: 'target', color: 'B' },
    },
    rows: [
      '###############',
      '#a....F...#...#',
      '#.........#...#',
      '#b..p.....A..1#',
      '#......f..#...#',
      '#.@...S...#...#',
      '###############',
    ],
  },
);

// Farbwandler (ab Schritt 10): 'x' = schiebbarer Block, der Rot→Grün→Blau→Rot weiterschaltet.
ALL_LEVELS.push(
  {
    id: 'w26',
    name: 'Wandelglas',
    hint: 'Der Farbwandler schaltet jede Farbe eins weiter: Rot wird Grün, Grün wird Blau, Blau wird Rot.',
    par: 2,
    legend: { a: R_E, 2: { type: 'target', color: 'G' } },
    rows: [
      '#########',
      '#a.....2#',
      '#.......#',
      '#...x...#',
      '#...@...#',
      '#########',
    ],
  },
  {
    id: 'w27',
    name: 'Doppelwandel',
    hint: 'Das Ziel will Blau, die Lampe gibt Rot. Wie oft musst du wandeln?',
    par: 13,
    legend: { a: R_E, 3: { type: 'target', color: 'B' } },
    rows: [
      '###########',
      '#a.......3#',
      '#.........#',
      '#..x...x..#',
      '#.........#',
      '#....@....#',
      '###########',
    ],
  },
  {
    id: 'w28',
    name: 'Farbkreis',
    hint: 'Magenta teilt sich: Ein Teil bleibt Magenta, der andere wird im Wandler zu Gelb.',
    par: 12,
    legend: {
      a: { type: 'emitter', dir: 'E', color: 'RB' },
      9: { type: 'target', color: 'RG' },
      3: { type: 'target', color: 'RB' },
    },
    rows: [
      '###########',
      '#a.......9#',
      '#.........#',
      '#..k..x...#',
      '#.........#',
      '#..3.@....#',
      '###########',
    ],
  },
);

// Meisterprüfungen (ab Schritt 10): mit der Levelschmiede gefunden (Zufall + Bergsteigen über
// den Löser) – jede Welt endet schwerer als die vorige.
ALL_LEVELS.push(
  {
    id: 'w29',
    name: 'Mondlichtpfad',
    hint: 'Meisterprüfung Nachtwald: Zwei Lampen, ein Magenta-Ziel – nur von links und rechts erreichbar.',
    par: 26,
    master: true,
    legend: { L: { type: 'lamp', dir: 'N', color: 'R' }, K: { type: 'lamp', dir: 'S', color: 'B' }, 5: { type: 'target', color: 'RB' } },
    rows: [
      '#############',
      '#.....#.....#',
      '#..L.K#.....#',
      '#..#.....#..#',
      '##.#.###.#.##',
      '#....@5.....#',
      '#.....#.....#',
      '#############',
    ],
  },
  {
    id: 'w30',
    name: 'Glutwerk',
    hint: 'Meisterprüfung Vulkanschmiede: Zwei Platten, drei Steine – welcher Stein hält welche Platte?',
    par: 27,
    master: true,
    legend: {
      a: R_E,
      g: { type: 'emitter', dir: 'S', color: 'G' },
      F: FLIP_A,
      G: { type: 'flip', plate: 'B', orient: '\\' },
      p: PLATE_A,
      q: { type: 'plate', plate: 'B' },
      1: { type: 'target', color: 'R' },
      2: { type: 'target', color: 'G' },
    },
    rows: [
      '#############',
      '#a...F....g.#',
      '#.......o.o.#',
      '#2.......oG.#',
      '#...........#',
      '#..q.1..p...#',
      '#@..........#',
      '#############',
    ],
  },
  {
    id: 'w31',
    name: 'Tempelriegel',
    hint: 'Meisterprüfung Wüstentempel: Rot öffnet das Tor, Blau muss über zwei Spiegel hindurch – und ein Stein steht im Weg.',
    par: 29,
    master: true,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'S', color: 'B' },
      R: { type: 'sensor', color: 'R', door: 'A' },
      A: { type: 'door', door: 'A' },
      3: { type: 'target', color: 'B' },
    },
    rows: [
      '#############',
      '#a.@...n...b#',
      '#.#.#.#.#.#.#',
      '#.......m...#',
      '#...#...#...#',
      '#..Ro......m#',
      '#####A#######',
      '#....3......#',
      '#############',
    ],
  },
  {
    id: 'w32',
    name: 'Polarnacht',
    hint: 'Meisterprüfung Polarlicht: Rot braucht zwei Wandler bis Blau, Blau einen bis Rot. Drei Wandler, zwei Wege.',
    par: 34,
    master: true,
    legend: {
      a: R_E,
      b: { type: 'emitter', dir: 'E', color: 'B' },
      F: { type: 'flip', plate: 'Z', orient: '\\' },
      1: { type: 'target', color: 'R' },
      3: { type: 'target', color: 'B' },
    },
    rows: [
      '#############',
      '#a.........F#',
      '#.###.###.#.#',
      '#...........#',
      '#.#.###@#.#.#',
      '#..x......x.#',
      '#.###.###.#.#',
      '#b...x...1.3#',
      '#############',
    ],
  },
);

// Strömungen (ab Schritt 11): '>' '<' '^' 'v' = Einbahnfelder, nur in Pfeilrichtung betretbar
// (für Spieler und Blöcke). Licht fließt ungehindert darüber.
const REEF = {
  a: { type: 'emitter', dir: 'S', color: 'R' },
  b: { type: 'emitter', dir: 'W', color: 'B' },
  1: { type: 'target', color: 'R' },
  3: { type: 'target', color: 'B' },
};
ALL_LEVELS.push(
  {
    id: 'w33',
    name: 'Strömung',
    hint: 'Neu: Strömungen! Pfeilfelder kannst du (und jeder Block) nur in Pfeilrichtung betreten. Plane den Rückweg.',
    par: 7,
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: [
      '#########',
      '#a......#',
      '#..>>>n.#',
      '#.......#',
      '#.@<<<..#',
      '#.....1.#',
      '#########',
    ],
  },
  {
    id: 'w34',
    name: 'Gezeiten',
    hint: 'Zwei Strömungsringe laufen gegeneinander. Rot muss nach unten, Blau quer hinüber.',
    par: 23,
    legend: REEF,
    rows: [
      '###########',
      '#..a..@...#',
      '#......n.b#',
      '#.v.>>>.^.#',
      '#.v.m...^.#',
      '#.v.<<<.^.#',
      '#....1.o3.#',
      '###########',
    ],
  },
  {
    id: 'w35',
    name: 'Riffstrudel',
    hint: 'Meisterprüfung Korallenriff: Die Spiegel stehen nah beieinander – doch die Strömungen erlauben nur lange Wege.',
    par: 44,
    master: true,
    legend: REEF,
    rows: [
      '###########',
      '#..a..@...#',
      '#........b#',
      '#.v.>>>.^.#',
      '#.vnm...^.#',
      '#.v.<<<.^.#',
      '#....1.o3.#',
      '###########',
    ],
  },
);

// Nachschub für die ersten Welten (Schritt 11, Levelschmiede) – jeweils leichter als der Welt-Abschluss.
ALL_LEVELS.push(
  {
    id: 'w36', name: 'Strandgut', par: 10,
    hint: 'Zwei Spiegel und ein Stein liegen im Sand. Welcher Spiegel bringt Rot in die Ecke?',
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: ['#########', '#a......#', '#...m@..#', '#.......#', '#.n.....#', '#...o..1#', '#########'],
  },
  {
    id: 'w37', name: 'Leuchtturm', par: 13,
    hint: 'Rot fällt von oben, Blau steigt von unten. Drei Spiegel, zwei Ziele – und eine Säule in der Mitte.',
    legend: { a: { type: 'emitter', dir: 'S', color: 'R' }, b: { type: 'emitter', dir: 'N', color: 'B' }, 1: { type: 'target', color: 'R' }, 3: { type: 'target', color: 'B' } },
    rows: ['###########', '#.a.n.....#', '#.........#', '#@.n.#....#', '#.........#', '#1...m...3#', '#.......b.#', '###########'],
  },
  {
    id: 'w38', name: 'Kirschprisma', par: 12,
    hint: 'Weiß fällt von oben. Bring das Prisma darunter – und räum die Steine aus den Farbwegen.',
    legend: { w: { type: 'emitter', dir: 'S', color: 'W' }, 1: { type: 'target', color: 'R' }, 2: { type: 'target', color: 'G' }, 3: { type: 'target', color: 'B' } },
    rows: ['###########', '#....w....#', '#.........#', '#3o@.P..o1#', '#.........#', '#....2....#', '###########'],
  },
  {
    id: 'w39', name: 'Abendrot', par: 16,
    hint: 'Rot und Blau treffen sich im Magenta-Ziel. Drei Steine stehen im Weg.',
    legend: { a: R_E, b: { type: 'emitter', dir: 'W', color: 'B' }, 5: { type: 'target', color: 'RB' } },
    rows: ['###########', '#a.....o.o#', '#.......o.#', '#....#@...#', '#.......n.#', '#..5.....b#', '###########'],
  },
  {
    id: 'w40', name: 'Lianentor', par: 15,
    hint: 'Grün muss durch das Portalpaar in der Lianenwand. Zwei Steine versperren den Weg zum oberen Portal.',
    legend: { a: { type: 'emitter', dir: 'S', color: 'G' }, A: { type: 'portal', pair: 'A' }, 2: { type: 'target', color: 'G' } },
    rows: ['#############', '#.a...#.....#', '#.@.ooA.....#', '#.....#.....#', '#.m..nA....2#', '#.....#.....#', '#############'],
  },
  {
    id: 'w41', name: 'Eisspalt', par: 24, exit: [0, 3],
    hint: 'Ein Strahlteiler oben, zwei rote Ziele unten in den Ecken – und dazwischen glattes Eis.',
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: ['###########', '#a..k.....#', '#.~~~~~~~.#', '#.~~~~~~~m#', '#.~~~~~~~.#', '#1@.n....1#', '###########'],
  },
);

// Schattenläufer (ab Schritt 12): 'z' patrouilliert waagrecht, 'y' senkrecht – ein Schritt pro Zug,
// Umkehr an Hindernissen. Berührung = erwischt; im Lichtstrahl lösen sie sich auf.
const SHADOW = {
  a: R_E,
  b: { type: 'emitter', dir: 'N', color: 'B' },
  1: { type: 'target', color: 'R' },
  3: { type: 'target', color: 'B' },
};
ALL_LEVELS.push(
  {
    id: 'w42', name: 'Schattenläufer', par: 8,
    hint: 'Neu: Schattenläufer! Sie gehen mit jedem deiner Züge einen Schritt. Berühr sie nicht – aber Licht löst sie auf.',
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: ['#########', '#a...n..#', '#.......#', '#..z....#', '#.......#', '#....@.1#', '#########'],
  },
  {
    id: 'w43', name: 'Schattenpfad', par: 18,
    hint: 'Zwei Schattenläufer kreuzen den Weg – einer quer, einer längs. Rot muss nach unten ins linke Ziel.',
    legend: SHADOW,
    rows: ['###########', '#a........#', '#.....y...#', '#..#...#..#', '#.z.n..m..#', '#1@.....3.#', '#.......b.#', '###########'],
  },
  {
    id: 'w44', name: 'Mondfinsternis', par: 32, master: true,
    hint: 'Meisterprüfung Schattenreich: Die Spiegel stehen eng beieinander – und die Schatten zählen jeden deiner Schritte mit.',
    legend: SHADOW,
    rows: ['###########', '#a........#', '#.....y...#', '#..#...#..#', '#.zn...m..#', '#1@.....3.#', '#.......b.#', '###########'],
  },
);

// Burgverlies: Schlüssel ('K') einsammeln, Gittertore ('L') aufschließen. Zu ist ein Tor eine Wand –
// auch fürs Licht. Wer einen Schlüssel ans falsche Tor verschwendet, sitzt fest (Z hilft).
ALL_LEVELS.push(
  {
    id: 'w45', name: 'Der erste Schlüssel', par: 8,
    hint: 'Neu: Ein Gittertor unterbricht die Leitung. Hol den Schlüssel und lauf gegen das Tor – es schwingt auf. Dann geh der Leitung aus dem Weg!',
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: ['#########', '#a...L.1#', '#.......#', '#.@...K.#', '#########'],
  },
  {
    id: 'w46', name: 'Schlüsselbund', par: 21,
    hint: 'Zwei Tore unterbrechen die Leitung, ein drittes sperrt die Kammer mit den Schlüsseln. Welches Tor öffnest du zuerst?',
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: ['##########', '#a.L.L..1#', '#####.####', '#KK.L....#', '#...#.@.K#', '##########'],
  },
  {
    id: 'w47', name: 'Spiegelkammer', par: 20,
    hint: 'Der Spiegel steckt hinter Gittern. Schließ auf, hol ihn heraus und schick die Leitung nach unten zur Lampe.',
    legend: { a: R_E, 1: { type: 'target', color: 'R' } },
    rows: ['##########', '#a.......#', '#.......##', '#.@..L.n.#', '#K...#...#', '#..1.#...#', '##########'],
  },
);

// Nebelmoor: 'O' Moorgrube (nicht betretbar, ein hineingeschobener Block versinkt und wird zum
// Trittstein), '%' morscher Boden (trägt genau einmal, bricht beim Verlassen ein). Licht zieht über
// Gruben hinweg. m3–m5 mit der Levelschmiede auf festen Grundrissen gewürfelt, alle vom Löser geprüft.
const MOOR_R = { a: R_E, 1: { type: 'target', color: 'R' } };
ALL_LEVELS.push(
  {
    id: 'w48', name: 'Trittstein', par: 10,
    hint: 'Neu: Moorgruben! Hinein kannst du nicht – aber ein Stein, den du hineinschiebst, versinkt und wird zum Trittstein.',
    legend: MOOR_R,
    rows: ['#########', '#a....m.#', '#OOOOOOO#', '#..o....#', '#.@.....#', '#.....1.#', '#########'],
  },
  {
    id: 'w49', name: 'Morscher Steg', par: 12,
    hint: 'Neu: Morsches Holz trägt dich nur einmal – verlässt du es, bricht es ein. Nimm den Spiegel mit hinüber, bevor der Steg bricht!',
    legend: MOOR_R,
    rows: ['###########', '#a...O....#', '#..m.%....#', '#.@..#....#', '#....#...1#', '###########'],
  },
  {
    id: 'w50', name: 'Bruchring', par: 13,
    hint: 'Ein Ring aus morschem Holz umschließt zwei Gruben. Jeder Schritt darüber zählt – Blau soll in die linke Ecke.',
    legend: { b: { type: 'emitter', dir: 'W', color: 'B' }, 3: { type: 'target', color: 'B' } },
    rows: ['##########', '#.......b#', '#.@%%%%..#', '#..%OO%o.#', '#.n%%%%..#', '#3.....o.#', '##########'],
  },
  {
    id: 'w51', name: 'Nebelbank', par: 21, exit: [8, 4], // nach der Lösung ist der obere Steg eingebrochen
    hint: 'Grünes Licht fällt ins Moor. Der Spiegel steht fast richtig – doch um ihn herum ist nur Sumpf und morsches Holz.',
    legend: { a: { type: 'emitter', dir: 'S', color: 'G' }, 2: { type: 'target', color: 'G' } },
    rows: ['#########', '#.o.a...#', '#.......#', '#O%OOO%O#', '#...m@..#', '#2......#', '#########'],
  },
  {
    id: 'w52', name: 'Irrlichtmoor', par: 26, master: true,
    hint: 'Meisterprüfung Nebelmoor: Zwei Steine, zwei Bruchstellen, ein Spiegel – und nur ein Weg über den Sumpf, der dich nicht verschluckt.',
    legend: MOOR_R,
    rows: ['#########', '#a......#', '#.n.@..o#', '#OO%OO%O#', '#....o..#', '#......1#', '#########'],
  },
);

// Welten: jede Welt führt ein Element ein (Einführungslevel zuerst), steigert es und endet mit
// einer Prüfung. Die Abschlüsse werden von Welt zu Welt schwerer: 14 · 19 · 25 · 26 · 27 · 29 · 32 · 34 · 44.
export const CHAPTERS = [
  { id: 'c1', name: 'Erstes Licht', icon: '◇', summary: 'Spiegel schieben und drehen, Farben trennen, Schatten.', levels: ['w1', 'w2', 'w36', 'w3', 'w37', 'w5'] },
  { id: 'c2', name: 'Farbenlehre', icon: '▲', summary: 'Filter, Prisma, Mischlicht und Regenbogen.', levels: ['w7', 'w6', 'w38', 'w39', 'w4', 'w9'] },
  { id: 'c3', name: 'Weite Wege', icon: '❄', summary: 'Eis, große Felder, Strahlteiler und Portale.', levels: ['w8', 'w11', 'w12', 'w40', 'w13', 'w41', 'w10'] },
  { id: 'c10', name: 'Burgverlies', icon: '🗝', summary: 'Schlüssel finden, Gittertore aufschließen – in der richtigen Reihenfolge.', levels: ['w45', 'w46', 'w47'] },
  { id: 'c11', name: 'Nebelmoor', icon: '🌫', summary: 'Gruben mit Steinen füllen, morsches Holz trägt nur einmal.', levels: ['w48', 'w49', 'w50', 'w51', 'w52'] },
  { id: 'c5', name: 'Wanderlicht', icon: '✦', summary: 'Lampen, die du trägst und drehst.', levels: ['w20', 'w21', 'w15', 'w29'] },
  { id: 'c6', name: 'Schaltwerk', icon: '◉', summary: 'Druckplatten kippen verankerte Spiegel.', levels: ['w23', 'w24', 'w30'] },
  { id: 'c4', name: 'Lichtschlösser', icon: '⚿', summary: 'Sensoren öffnen Tore – dein Schatten schließt sie.', levels: ['w18', 'w22', 'w17', 'w25', 'w19', 'w16', 'w14', 'w31'] },
  { id: 'c9', name: 'Schattenjagd', icon: '☾', summary: 'Schattenläufer patrouillieren – Licht ist deine einzige Waffe.', levels: ['w42', 'w43', 'w44'] },
  { id: 'c7', name: 'Wandelglas', icon: '◐', summary: 'Farbwandler schalten Rot → Grün → Blau → Rot.', levels: ['w26', 'w28', 'w27', 'w32'] },
  { id: 'c8', name: 'Strömungen', icon: '≋', summary: 'Einbahnfelder lenken dich und die Blöcke – nur in Pfeilrichtung.', levels: ['w33', 'w34', 'w35'] },
];

// Spielreihenfolge = Kapitel nacheinander.
const ORDER = CHAPTERS.flatMap((c) => c.levels);
export const PUSH_LEVELS = ORDER.map((id) => ALL_LEVELS.find((l) => l.id === id));
