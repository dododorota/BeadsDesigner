// Silnik ściegów: peyote, brick, herringbone, square/krosno, ladder, RAW płaski,
// PRAW/CRAW, plecionka równoległa i wężyk szydełkowy (bead crochet), płasko albo w rurkę.
//
// Każdy ścieg to przepis na siatkę koralików. Dla każdego koralika podajemy:
//   x, y   — miejsce na schemacie (w jednostkach koralika, y rośnie w dół),
//   a      — kąt otworu w płaszczyźnie robótki (0 = poziomo, π/2 = pionowo),
//   u, v   — położenie w mm: u w poprzek (albo dookoła rurki), v w górę,
//   theta, rho — tylko PRAW: kąt i promień wokół osi rurki (wielokąt, nie koło).
// Schemat, podgląd 3D, wypełnianie, odbicie i instrukcja korzystają z tego samego opisu.

export const STITCHES = {
  peyote: {
    name: 'Peyote',
    hint: 'Koraliki leżą poziomo, sąsiednie kolumny są przesunięte o pół koralika. Każdy rząd dodaje co drugi koralik.',
    widthLabel: 'Kolumn',
  },
  brick: {
    name: 'Brick stitch',
    hint: 'Koraliki stoją pionowo, każdy rząd jest przesunięty o pół koralika. Pierwszy rząd to ladder.',
    widthLabel: 'W rzędzie',
  },
  herringbone: {
    name: 'Herringbone',
    hint: 'Koraliki dodajesz parami; każda para układa się w jodełkę (V). W rurce można go skręcić w spiralę.',
    widthLabel: 'W rzędzie (parzyście)',
  },
  square: {
    name: 'Square / krosno',
    hint: 'Prosta kratka: koraliki leżą poziomo, rzędy jeden nad drugim — tak samo w square stitch i na krośnie.',
    widthLabel: 'W rzędzie',
  },
  ladder: {
    name: 'Ladder',
    hint: 'Drabinka: koraliki stoją pionowo obok siebie. Kilka rzędów to szczeble z kilku koralików jeden nad drugim.',
    widthLabel: 'Szczebli',
  },
  raw: {
    name: 'RAW / na krzyż (płaski)',
    hint: 'Koraliki na przemian poziomo i pionowo: każde oczko to kwadrat z 4 koralików, a sąsiednie oczka dzielą koraliki. Tak samo wygląda płaska robótka na krzyż (technika japońska).',
    widthLabel: 'Oczek w rzędzie',
  },
  fringe: {
    name: 'Frędzle (agrafka, zawieszka)',
    hint: 'Pionowe sznureczki obok siebie, zawieszone u góry — na agrafce, kolczyku albo brelok. Obrazek układa się z kolorów w kolejnych frędzlach; gumką skrócisz frędzel.',
    widthLabel: 'Frędzli',
  },
  parallel: {
    name: 'Plecionka równoległa (na drucik)',
    hint: 'Na drucik albo żyłkę: oba końce przechodzą przez każdy rząd z przeciwnych stron. Rzędy mają różną długość, a z boków mogą wychodzić nóżki — tak powstają kraby, żabki, jaszczurki i ważki. Dwie warstwy (wierzch i spód) dają bryłkę: rybkę, ptaszka.',
    widthLabel: 'W rzędzie',
  },
  praw: {
    name: 'CRAW / PRAW',
    hint: 'Sznur z „klatek”: pierścień koralików (podłoga), pionowe ściany i kolejny pierścień. 4 boki to CRAW.',
    widthLabel: 'Boków',
  },
  // Wężyk ma własny tryb (przycisk „Wężyk” i dane w `project.tube`), więc nie ma go na liście ściegów.
  crochet: {
    name: 'Wężyk szydełkowy',
    hint: 'Wężyk szydełkowy z koralikami. Każdy rząd przesuwa się o pół koralika — tak jak na prawdziwym wężyku.',
    widthLabel: 'Na obwodzie',
    ownMode: 'tube',
  },
};

export const STITCH_LIMITS = { width: [2, 60], rows: [1, 400], sides: [3, 6], crochetWidth: [3, 16] };
export const PARALLEL_LIMITS = { row: [1, 30], leg: [0, 20], rows: [1, 80] };

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));

// Polska odmiana: 1 koralik, 2–4 koraliki, 5+ koralików (ale 12–14 koralików).
export function plural(n, one, few, many) {
  if (n === 1) return `${n} ${one}`;
  const d = n % 10, dd = n % 100;
  return `${n} ${d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many}`;
}
const beadsN = (n) => plural(n, 'koralik', 'koraliki', 'koralików');

// Nazwa ściegu do instrukcji i podpowiedzi.
export function stitchTitle(st) {
  if (st.kind === 'praw') return st.sides === 4 ? 'CRAW' : `PRAW-${st.sides}`;
  if (st.kind === 'raw') return 'RAW / na krzyż';
  if (st.kind === 'parallel') return 'Plecionka równoległa';
  return STITCHES[st.kind].name;
}

// W peyote każda kolumna ma `rows` koralików, ale rzędów (przejść igłą) jest dwa razy więcej.
export const visibleRows = (st) => (st.kind === 'peyote' ? st.rows * 2 : st.rows);
export const rowsFromVisible = (kind, v) => (kind === 'peyote' ? Math.ceil(Number(v) / 2) : Number(v));
const HB_TILT = 0.42; // pochylenie koralika w herringbone (rad)
const FRINGE_GAP = 1.35; // odstęp frędzli na schemacie (w koralikach), żeby było widać osobne sznureczki
const TWIST_SHIFT = 0.5; // o ile koralika przesuwa się każdy rząd skręconego herringbone

// Poprawia ustawienia ściegu (wymagania konkretnych ściegów, zakresy liczb).
export function fixStitch(st) {
  const s = { kind: 'peyote', form: 'flat', width: 10, rows: 20, sides: 4, twist: false, mirror: false, shape: PARALLEL_PRESETS.frog.shape, layers: 1, ...st };
  if (!STITCHES[s.kind]) s.kind = 'peyote';
  if (s.form !== 'tube') s.form = 'flat';
  if (s.kind === 'praw' || s.kind === 'crochet') s.form = 'tube';
  if (s.kind === 'raw' || s.kind === 'parallel' || s.kind === 'fringe') s.form = 'flat';
  // Plecionka równoległa: kształt to lista rzędów; szerokość i liczba rzędów wynikają z niego.
  const rows = parseParallel(s.shape);
  s.shape = parallelText(rows.length ? rows : parseParallel(PARALLEL_PRESETS.frog.shape));
  s.layers = Number(s.layers) === 2 ? 2 : 1;
  if (s.kind === 'parallel') {
    const list = parseParallel(s.shape);
    s.rows = list.length;
    s.width = Math.max(...list.map((r) => r.top));
  }
  s.width = clamp(s.width, s.kind === 'crochet' ? STITCH_LIMITS.crochetWidth : STITCH_LIMITS.width);
  if (s.kind === 'herringbone' && s.width % 2) s.width += 1;
  s.rows = clamp(s.rows, STITCH_LIMITS.rows);
  s.sides = clamp(s.sides, STITCH_LIMITS.sides);
  s.twist = Boolean(s.twist) && s.kind === 'herringbone' && s.form === 'tube';
  s.mirror = Boolean(s.mirror);
  return s;
}

// Ile koralików ma robótka i ile ich jest w jednym rzędzie (do przenoszenia wzoru).
export function stitchCount(st) {
  if (st.kind === 'praw') return st.sides * (2 * st.rows + 1);
  if (st.kind === 'parallel') return parallelRows(st).reduce((a, r) => a + r.size, 0);
  if (st.kind === 'raw') return st.width * (st.rows + 1) + (st.width + 1) * st.rows;
  return st.width * st.rows;
}
// Rząd do powielania; pierwsza podłoga PRAW i dolne koraliki RAW nie należą do żadnego rzędu.
const rowSize = (st) => (st.kind === 'praw' ? 2 * st.sides : st.kind === 'raw' ? 2 * st.width + 1 : st.width);
const rowStart = (st) => (st.kind === 'praw' ? st.sides : st.kind === 'raw' ? st.width : 0);

// ---------------------------------------------------------------- układ

function gridLayout(st, bead) {
  const W = st.width, R = st.rows, tube = st.form === 'tube';
  const { d, h } = bead;
  const cells = [];
  let width = W, height = R, circ = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < W; c++) {
    const id = r * W + c;
    let x = c, y = R - 1 - r, a = 0, u = 0, v = 0;
    switch (st.kind) {
      case 'peyote': // kolumny na zmianę o pół koralika wyżej
        y += c % 2 ? 0 : 0.5;
        u = c * h * 1.05; v = (r + (c % 2) * 0.5) * d;
        break;
      case 'brick': // rzędy na zmianę o pół koralika w prawo
        x += r % 2 ? 0.5 : 0;
        a = Math.PI / 2; u = x * d * 1.02; v = r * h * 1.05;
        break;
      case 'herringbone': {
        const left = c % 2 === 0;
        if (st.twist) x = (((c + r * TWIST_SHIFT) % W) + W) % W;
        a = Math.PI / 2 + (left ? HB_TILT : -HB_TILT);
        u = x * d * 0.95; v = r * h * 1.15;
        break;
      }
      case 'ladder':
        a = Math.PI / 2; u = c * d * 1.02; v = r * h * 1.05;
        break;
      case 'fringe': // frędzle wiszą od góry: koralik 1 przy agrafce, sznureczki z przerwą
        x = c * FRINGE_GAP; y = r; a = Math.PI / 2;
        u = c * d * 1.5; v = (R - 1 - r) * h * 1.02;
        break;
      default: // square / krosno
        u = c * h * 1.05; v = r * d;
    }
    cells.push({ id, x, y, a, u, v, row: r, col: c });
  }
  if (st.kind === 'peyote') height = R + 0.5;
  if (st.kind === 'brick') width = W + 0.5;
  if (st.kind === 'fringe') {
    return {
      cells, width: (W - 1) * FRINGE_GAP + 1, height: R, circ: 0, period: W,
      rowLabels: Array.from({ length: R }, (_, r) => ({ y: r, text: String(r + 1) })),
      colLabels: Array.from({ length: W }, (_, c) => ({ x: c * FRINGE_GAP, text: String(c + 1) })),
    };
  }
  const stepU = { peyote: h * 1.05, square: h * 1.05, brick: d * 1.02, ladder: d * 1.02, herringbone: d * 0.95 }[st.kind];
  if (tube) circ = W * stepU;
  // W peyote podpisujemy rzędy peyote 1, 3, 5… przy kolumnach parzystych (rzędy 2, 4… są pół koralika wyżej).
  const rowLabels = Array.from({ length: R }, (_, r) => (st.kind === 'peyote'
    ? { y: R - 1 - r + 0.5, text: String(2 * r + 1) }
    : { y: R - 1 - r, text: String(r + 1) }));
  const colLabels = tube ? [] : Array.from({ length: W }, (_, c) => ({ x: c, text: String(c + 1) }));
  return { cells, width, height, circ, period: W, rowLabels, colLabels };
}

// PRAW-n: pierścień n koralików (podłoga) leży na bokach wielokąta, n koralików
// ściany stoi pionowo w jego narożnikach, potem kolejny pierścień (sufit = podłoga
// następnej klatki). Na schemacie: podłogi w rzędach parzystych, ściany pomiędzy.
function prawLayout(st, bead) {
  const n = st.sides, U = st.rows;
  const L = bead.d;
  const R = L / (2 * Math.sin(Math.PI / n));
  const cells = [];
  let id = 0;
  for (let k = 0; k <= U; k++) {
    const level = 2 * k;
    for (let j = 0; j < n; j++) {
      cells.push({ id: id++, x: j + 0.5, y: 2 * U - level, a: 0, theta: (2 * Math.PI * (j + 0.5)) / n, rho: R * Math.cos(Math.PI / n), v: k * L, row: level, col: j, part: 'floor' });
    }
    if (k === U) break;
    for (let j = 0; j < n; j++) {
      cells.push({ id: id++, x: j, y: 2 * U - level - 1, a: Math.PI / 2, theta: (2 * Math.PI * j) / n, rho: R, v: k * L + L / 2, row: level + 1, col: j, part: 'wall' });
    }
  }
  const rowLabels = Array.from({ length: U }, (_, k) => ({ y: 2 * U - 2 * k - 1, text: String(k + 1) }));
  return { cells, width: n + 0.5, height: 2 * U + 1, circ: 2 * Math.PI * R, period: n, rowLabels, colLabels: [] };
}

// Wężyk szydełkowy: koraliki układają się w jedną spiralę. Na obwodzie mieści się
// width + 0.5 koralika, więc każdy rząd przesuwa się o pół koralika. Rozwinięcie
// wężyka na płasko jest dzięki temu wierne: pionowy pasek na schemacie to pionowy
// pasek na wężyku, a skośny to spirala. Otwór biegnie wzdłuż spirali.
function crochetLayout(st, bead) {
  const C = st.width, R = st.rows, P = C + 0.5;
  const step = bead.d * 0.95, rowH = bead.d * 0.95;
  const rho = (P * step) / (2 * Math.PI);
  const a = Math.atan2(rowH, P * step);
  const cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const id = r * C + c;
    const x = (((c - 0.5 * r) % P) + P) % P;
    cells.push({ id, x, y: R - 1 - r, a, u: x * step, v: (id * rowH) / P, theta: (2 * Math.PI * id) / P, rho, row: r, col: c });
  }
  const rowLabels = Array.from({ length: R }, (_, r) => ({ y: R - 1 - r, text: String(r + 1) }));
  // Sąsiedzi wzdłuż spirali: koralik przed i za, dwa nad i dwa pod (o C i C+1 dalej).
  // Na schemacie przy szwie leżą one na ukos, więc nie szukamy ich po odległości.
  const n = C * R;
  const neighbors = cells.map(({ id }) => [id - 1, id + 1, id - C, id - C - 1, id + C, id + C + 1].filter((k) => k >= 0 && k < n));
  return { cells, width: P, height: R, circ: P * step, period: P, rowLabels, colLabels: [], neighbors };
}

// RAW płaski: siatka kwadratowych oczek. Koraliki leżą na bokach oczek — poziome na
// górze i dole, pionowe po bokach — a sąsiednie oczka dzielą koraliki. Numerujemy
// poziomami od dołu: poziom 2r to poziome koraliki pod rzędem r (W sztuk), poziom
// 2r+1 to pionowe koraliki rzędu r (W+1 sztuk); ostatni poziom to góra robótki.
const RAW_PITCH = 1.5; // odstęp oczek na schemacie (w koralikach), żeby koraliki się nie nakładały

export function rawBead(st, id) {
  const W = st.width;
  let level = 0, rest = id;
  for (;;) {
    const n = level % 2 ? W + 1 : W;
    if (rest < n) return { level, col: rest, part: level % 2 ? 'v' : 'h' };
    rest -= n;
    level++;
  }
}
export const rawId = (st, level, col) => {
  const W = st.width, k = level >> 1;
  return k * (2 * W + 1) + (level % 2 ? W : 0) + col;
};

function rawLayout(st, bead) {
  const W = st.width, R = st.rows, P = RAW_PITCH;
  const mm = bead.h + bead.d * 0.55; // bok oczka w mm: długość koralika i trochę na nitkę
  const cells = [];
  const n = stitchCount(st);
  for (let id = 0; id < n; id++) {
    const { level, col, part } = rawBead(st, id);
    const cx = 0.5 + col * P + (part === 'h' ? P / 2 : 0);
    const cy = 0.5 + (R - level / 2) * P;
    const row = part === 'h' ? level / 2 : (level - 1) / 2;
    cells.push({
      id, x: cx - 0.5, y: cy - 0.5, a: part === 'h' ? 0 : Math.PI / 2,
      u: ((cx - 0.5) / P) * mm, v: ((R * P + 0.5 - cy) / P) * mm, row, col, part, level,
    });
  }
  const rowLabels = Array.from({ length: R }, (_, r) => ({ y: (R - r - 0.5) * P, text: String(r + 1) }));
  const colLabels = Array.from({ length: W }, (_, c) => ({ x: c * P + P / 2, text: String(c + 1) }));
  return { cells, width: W * P + 1, height: R * P + 1, circ: 0, period: W, rowLabels, colLabels };
}

// Kolejność pracy RAW: rzędy oczek od dołu, na zmianę w prawo i w lewo. W każdym
// oczku nawlekasz tylko nowe koraliki — w pierwszym 4, potem 3 albo 2, bo resztę
// oczko dzieli z sąsiadami. `around`: wszystkie 4 koraliki po kolei, od tego, z którego wychodzi nić.
const RAW_ROLE = { bottom: 'dół', top: 'góra', left: 'lewy bok', right: 'prawy bok' };
export function rawSteps(st) {
  const W = st.width, R = st.rows;
  const steps = [];
  for (let r = 0; r < R; r++) {
    const dir = r % 2 ? '←' : '→';
    const order = [...Array(W).keys()];
    if (dir === '←') order.reverse();
    order.forEach((c, i) => {
      const id = {
        bottom: rawId(st, 2 * r, c), top: rawId(st, 2 * r + 2, c),
        left: rawId(st, 2 * r + 1, c), right: rawId(st, 2 * r + 1, c + 1),
      };
      // Bok wspólny z poprzednim oczkiem w rzędzie: z lewej, gdy idziesz w prawo.
      const back = dir === '→' ? 'left' : 'right', ahead = dir === '→' ? 'right' : 'left';
      let roles;
      if (r === 0 && i === 0) roles = ['left', 'bottom', 'right', 'top'];
      else if (r === 0) roles = ['bottom', 'right', 'top'];
      else if (i === 0) roles = [ahead === 'right' ? 'left' : 'right', 'top', ahead === 'right' ? 'right' : 'left'];
      else roles = ['top', ahead];
      // Dookoła oczka zgodnie z kolejnością nawlekania, zaczynając od wspólnego koralika.
      const cycle = r === 0 && i === 0 ? ['left', 'bottom', 'right', 'top']
        : r === 0 ? ['left', 'bottom', 'right', 'top']
          : i === 0 ? ['bottom', ...roles]
            : [back, 'top', ahead, 'bottom'];
      steps.push({ row: r, col: c, dir, first: i === 0, roles, added: roles.map((k) => id[k]), around: cycle.map((k) => id[k]) });
    });
  }
  return steps;
}

// ---------------------------------------------------------------- plecionka równoległa

// Plecionka równoległa (parallel weaving, na drucik albo żyłkę): każdy rząd to kilka
// koralików leżących obok siebie, a oba końce drucika przechodzą przez nie z przeciwnych
// stron. Kształt zapisujemy tekstem — liczby koralików w kolejnych rzędach, od pierwszego:
//   „5”    — rząd z 5 koralików,
//   „5+6”  — rząd z 5 i nóżki po 6 koralików z obu stron (ostatni koralik nóżki jest zwrotny),
//   „5/4”  — przy dwóch warstwach: 5 na wierzchu i 4 na spodzie (bez „/” spód = wierzch).
// Przy dwóch warstwach nóżki wychodzą ze spodu (tam, gdzie u zwierzątka są łapki).
export const PARALLEL_PRESETS = {
  frog: { name: 'Żabka (zawieszka)', shape: '3+7 4 5 4+5 4 4 3', layers: 1, eyes: 5 },
  crab: { name: 'Krabik', shape: '2 3+5 4+5 5+5 5 4+6 3 2', layers: 1, eyes: 7 },
  lizard: { name: 'Jaszczurka', shape: '1 1 1 2 2 2+5 3 3 3 3 2+5 2 3 3 2', layers: 1, eyes: 13 },
  dragonfly: { name: 'Ważka', shape: '1 1 1 1 1 1 1 2 2+9 2+9 2 3', layers: 1, eyes: 11 },
  spider: { name: 'Pajączek', shape: '2 3+6 3+7 3+7 3+6 3 2', layers: 1, eyes: 5 },
  fish: { name: 'Rybka (bryłka)', shape: '3 2 2 3 4 5 5 5 5 4 3 2', layers: 2, eyes: 9 },
  bird: { name: 'Ptaszek (bryłka)', shape: '2 2 3 3 4 4 4 4 3 3 3 2', layers: 2, eyes: 9 },
};

const clampTo = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(v)));

export function parseParallel(text) {
  const rows = [];
  for (const tok of String(text ?? '').split(/[\s,;]+/)) {
    const m = /^(\d+)(?:\/(\d+))?(?:\+(\d+))?$/.exec(tok);
    if (!m || rows.length >= PARALLEL_LIMITS.rows[1]) continue;
    const top = clampTo(Number(m[1]), PARALLEL_LIMITS.row);
    const bottom = m[2] === undefined ? top : clampTo(Number(m[2]), PARALLEL_LIMITS.row);
    const leg = m[3] === undefined ? 0 : clampTo(Number(m[3]), PARALLEL_LIMITS.leg);
    // Nóżka z jednego koralika nie ma przez co wrócić — najkrótsza ma 2.
    rows.push({ top, bottom, leg: leg === 1 ? 2 : leg });
  }
  return rows;
}

export const parallelText = (rows) => rows.map((r) => `${r.top}${r.bottom !== r.top ? `/${r.bottom}` : ''}${r.leg ? `+${r.leg}` : ''}`).join(' ');

// Rzędy z numerami koralików. W każdym rzędzie po kolei: wierzch, (spód), lewa nóżka, prawa nóżka;
// nóżka liczona od tułowia do koralika zwrotnego.
const rowsCache = new Map();
export function parallelRows(st) {
  const key = `${st.shape}|${st.layers}`;
  let rows = rowsCache.get(key);
  if (rows) return rows;
  const two = st.layers === 2;
  let id = 0;
  rows = parseParallel(st.shape).map((r, i) => {
    const row = { ...r, i, two };
    row.top0 = id; id += r.top;
    row.bot0 = two ? id : -1; id += two ? r.bottom : 0;
    row.legL0 = id; id += r.leg;
    row.legR0 = id; id += r.leg;
    row.size = id - row.top0;
    return row;
  });
  if (rowsCache.size > 20) rowsCache.delete(rowsCache.keys().next().value);
  rowsCache.set(key, rows);
  return rows;
}

// Gdzie leży koralik: rząd, warstwa ('top'/'bottom'), część ('body', 'legL', 'legR') i numer w części.
export function parallelBead(st, id) {
  for (const r of parallelRows(st)) {
    if (id >= r.top0 + r.size) continue;
    if (id < r.top0 + r.top) return { row: r.i, layer: 'top', part: 'body', k: id - r.top0, n: r.top, r };
    if (r.two && id < r.bot0 + r.bottom) return { row: r.i, layer: 'bottom', part: 'body', k: id - r.bot0, n: r.bottom, r };
    const layer = r.two ? 'bottom' : 'top';
    if (id < r.legR0) return { row: r.i, layer, part: 'legL', k: id - r.legL0, n: r.leg, r };
    return { row: r.i, layer, part: 'legR', k: id - r.legR0, n: r.leg, r };
  }
  return null;
}

// Schemat: rzędy jeden nad drugim, każdy wyśrodkowany; nóżki przedłużają rząd na boki.
// Przy dwóch warstwach wierzch jest z lewej, spód z prawej. `cx` to położenie względem
// środka rzędu — po nim przenosimy wzór, gdy zmienia się kształt. `z` unosi wierzch
// nad spód (w podglądzie 3D bryłka jest wypukła, najbardziej w szerokich rzędach).
function parallelLayout(st, bead) {
  const rows = parallelRows(st), R = rows.length, two = st.layers === 2;
  const legLayer = two ? 'bottom' : 'top';
  const span = (r, layer) => (layer === 'top' ? r.top : r.bottom) + (layer === legLayer ? 2 * r.leg : 0);
  const Wt = Math.max(...rows.map((r) => span(r, 'top')));
  const Wb = two ? Math.max(...rows.map((r) => span(r, 'bottom'))) : 0;
  const GAP = 2, wide = Math.max(Wt, Wb);
  const step = bead.h * 1.05, rowH = bead.d;
  const cells = new Array(stitchCount(st));
  const put = (id, r, layer, part, k, cx, n) => {
    const panel = layer === 'top' ? 0 : Wt + GAP, W = layer === 'top' ? Wt : Wb;
    let z = 0;
    if (two) {
      const s = n > 1 ? cx / (n / 2) : 0, bulge = Math.max(0, 1 - s * s);
      z = part !== 'body' ? -bead.d * 0.5
        : layer === 'top' ? bead.d * (0.5 + 0.16 * n * bulge) : -bead.d * (0.5 + 0.06 * n * bulge);
    }
    cells[id] = {
      id, x: panel + (W - 1) / 2 + cx, y: R - 1 - r.i, a: 0, u: (cx + wide / 2) * step, v: r.i * rowH, z,
      row: r.i, col: k, part, layer, cx,
    };
  };
  for (const r of rows) {
    for (let k = 0; k < r.top; k++) put(r.top0 + k, r, 'top', 'body', k, k - (r.top - 1) / 2, r.top);
    if (two) for (let k = 0; k < r.bottom; k++) put(r.bot0 + k, r, 'bottom', 'body', k, k - (r.bottom - 1) / 2, r.bottom);
    const n = two ? r.bottom : r.top;
    for (let j = 0; j < r.leg; j++) {
      put(r.legL0 + j, r, legLayer, 'legL', j, -(n - 1) / 2 - 1 - j, n);
      put(r.legR0 + j, r, legLayer, 'legR', j, (n - 1) / 2 + 1 + j, n);
    }
  }
  const rowLabels = rows.map((r) => ({ y: R - 1 - r.i, text: String(r.i + 1) }));
  const colLabels = two ? [{ x: (Wt - 1) / 2, text: 'wierzch', always: true }, { x: Wt + GAP + (Wb - 1) / 2, text: 'spód', always: true }] : [];
  return { cells, width: two ? Wt + GAP + Wb : Wt, height: R, circ: 0, period: Wt, rowLabels, colLabels };
}

// Lustro: koralik k ↔ n-1-k w tym samym rzędzie i warstwie, lewa nóżka ↔ prawa.
function parallelMirror(st, id) {
  const b = parallelBead(st, id);
  if (!b) return null;
  const r = b.r;
  if (b.part === 'legL') return r.legR0 + b.k;
  if (b.part === 'legR') return r.legL0 + b.k;
  return (b.layer === 'top' ? r.top0 : r.bot0) + b.n - 1 - b.k;
}

// Przenosi kolory między dwoma kształtami plecionki: ten sam rząd (nowe rzędy powtarzają
// stare), ta sama warstwa i część, najbliższe miejsce względem środka rzędu.
function parallelRemap(oldSt, oldBeads, st, rowOf = (r, R) => (r < R ? r : r % R)) {
  const unit = { d: 2, h: 1.5 };
  const a = stitchLayout(oldSt, unit), b = stitchLayout(st, unit);
  const groups = new Map();
  for (const c of a.cells) {
    const k = `${c.row}|${c.layer}|${c.part}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const R = oldSt.rows;
  return b.cells.map((c) => {
    const r = rowOf(c.row, R);
    const list = groups.get(`${r}|${c.layer}|${c.part}`) || groups.get(`${r}|${c.layer}|body`) || groups.get(`${r}|top|body`) || [];
    let best = null, bd = Infinity;
    for (const o of list) {
      const d = c.part === 'body' ? Math.abs(o.cx - c.cx) : Math.abs(o.col - c.col);
      if (d < bd) { bd = d; best = o; }
    }
    return best ? oldBeads[best.id] ?? 0 : 0;
  });
}

// Układ zależy tylko od ustawień ściegu i wymiarów koralika — trzymamy kilka ostatnich.
const cache = new Map();
export function stitchLayout(st, bead) {
  const key = `${st.kind}|${st.form}|${st.width}|${st.rows}|${st.sides}|${st.twist}|${st.kind === 'parallel' ? `${st.shape}|${st.layers}` : ''}|${bead.d}|${bead.h}`;
  let lay = cache.get(key);
  if (lay) return lay;
  lay = st.kind === 'praw' ? prawLayout(st, bead) : st.kind === 'crochet' ? crochetLayout(st, bead)
    : st.kind === 'raw' ? rawLayout(st, bead) : st.kind === 'parallel' ? parallelLayout(st, bead) : gridLayout(st, bead);
  lay.form = st.form;
  lay.sizeMM = {
    w: st.form === 'tube' ? lay.circ / Math.PI : Math.max(...lay.cells.map((c) => c.u)) + bead.d,
    h: Math.max(...lay.cells.map((c) => c.v)) + (st.kind === 'praw' ? bead.d : Math.max(bead.d, bead.h)),
  };
  lay.index = buildIndex(lay);
  if (cache.size > 6) cache.delete(cache.keys().next().value);
  cache.set(key, lay);
  return lay;
}

// Szybkie wyszukiwanie koralików po miejscu na schemacie (sąsiedzi, odbicie).
function buildIndex(lay) {
  const map = new Map();
  for (const c of lay.cells) {
    const k = `${Math.round(c.x * 2)},${Math.round(c.y * 2)}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  }
  return map;
}

// Sąsiedzi to koraliki, które na schemacie stykają się z danym (do wypełniania).
// W rurce schemat zawija się z prawej na lewą stronę.
export function stitchNeighbors(lay, id) {
  const c = lay.cells[id];
  if (!c) return [];
  if (lay.neighbors) return lay.neighbors[id];
  const out = [];
  const wrap = lay.form === 'tube' ? lay.period : 0;
  const shifts = wrap ? [0, -wrap, wrap] : [0];
  for (const s of shifts) {
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const list = lay.index.get(`${Math.round((c.x + s) * 2) + dx},${Math.round(c.y * 2) + dy}`);
      if (!list) continue;
      for (const o of list) {
        if (o.id === id) continue;
        const dist = Math.hypot(o.x - s - c.x, o.y - c.y);
        if (dist <= 1.2 && !out.includes(o.id)) out.push(o.id);
      }
    }
  }
  return out;
}

// Odbicie lewo–prawo w obrębie tego samego rzędu (tylko robótki płaskie).
export function stitchMirror(st, id) {
  if (!st.mirror || st.form === 'tube' || st.kind === 'praw') return null;
  if (st.kind === 'parallel') return parallelMirror(st, id);
  if (st.kind === 'raw') {
    const { level, col, part } = rawBead(st, id);
    return rawId(st, level, (part === 'h' ? st.width - 1 : st.width) - col);
  }
  const W = st.width, r = Math.floor(id / W), c = id % W;
  return r * W + (W - 1 - c);
}

// Przenosi wzór po zmianie ściegu lub rozmiaru: koralik zostaje w tym samym
// rzędzie i kolumnie, a nowe miejsca dostają wzór powtórzony z istniejących.
export function remapBeads(oldSt, oldBeads, st) {
  const n = stitchCount(st);
  if (oldSt.kind === 'parallel' && st.kind === 'parallel') return parallelRemap(oldSt, oldBeads, st);
  if (oldSt.kind === 'raw' && st.kind === 'raw') {
    // RAW → RAW: ten sam poziom i kolumna; nowe rzędy i kolumny powtarzają wzór.
    const top = 2 * oldSt.rows;
    return Array.from({ length: n }, (_, id) => {
      const { level, col, part } = rawBead(st, id);
      const l = level <= top ? level : ((level - 1) % top) + 1;
      const w = part === 'h' ? oldSt.width : oldSt.width + 1;
      return oldBeads[rawId(oldSt, l, col < w ? col : col % w)] ?? 0;
    });
  }
  if (['raw', 'parallel'].includes(oldSt.kind) || ['raw', 'parallel'].includes(st.kind)) {
    // Między RAW albo plecionką a innym ściegiem obrazek przenosimy według miejsca na schemacie.
    const unit = { d: 2, h: 1.5 };
    const a = stitchLayout(oldSt, unit), b = stitchLayout(st, unit);
    return b.cells.map((c) => {
      const fx = (c.x + 0.5) / b.width, fy = (c.y + 0.5) / b.height;
      let best = 0, bd = Infinity;
      for (const o of a.cells) {
        const d = ((o.x + 0.5) / a.width - fx) ** 2 + ((o.y + 0.5) / a.height - fy) ** 2;
        if (d < bd) { bd = d; best = o.id; }
      }
      return oldBeads[best] ?? 0;
    });
  }
  if (oldSt.kind === 'praw' || st.kind === 'praw') {
    return Array.from({ length: n }, (_, i) => oldBeads[i % oldBeads.length] ?? 0);
  }
  const out = [];
  for (let r = 0; r < st.rows; r++) for (let c = 0; c < st.width; c++) {
    const rr = r < oldSt.rows ? r : r % oldSt.rows;
    const cc = c < oldSt.width ? c : c % oldSt.width;
    out.push(oldBeads[rr * oldSt.width + cc] ?? 0);
  }
  return out;
}

// Powiela pierwsze `len` rzędów (w PRAW: klatek) na całą robótkę.
export function repeatStitchRows(st, beads, len) {
  if (st.kind === 'parallel') {
    // Rzędy mają różną długość — kolory bierzemy z odpowiedniego miejsca w rzędzie wzoru.
    len = Math.max(1, Math.min(st.rows, len | 0));
    const out = parallelRemap(st, beads.slice(), st, (r) => r % len);
    out.forEach((c, i) => { beads[i] = c; });
    return;
  }
  const size = rowSize(st);
  const first = rowStart(st); // pierwsza podłoga PRAW i dół RAW zostają
  len = Math.max(1, Math.min(st.rows, len | 0)) * size;
  for (let i = first + len; i < beads.length; i++) beads[i] = beads[first + ((i - first) % len)];
}

// ---------------------------------------------------------------- ścieżka nici

// Droga nici przez koraliki, krok po kroku — te same kroki i nazwy co w instrukcji.
// Każdy krok to { label, path }, a path to punkty [x, y] na schemacie (środek koralika
// to x + 0.5, y + 0.5); null przerywa linię (w rurce, gdzie schemat się zawija).
// PRAW/CRAW (nić idzie w głąb klatek) i wężyk (szydełko, nie igła) nie mają ścieżki.
export const hasThread = (st) => st.kind !== 'praw' && st.kind !== 'crochet';

// Plecionka równoległa: końcówka A idzie przez rząd w prawo (linia trochę wyżej),
// końcówka B przez te same koraliki w lewo (trochę niżej). Nóżka: na zewnątrz do
// koralika zwrotnego, wokół niego i z powrotem do tułowia. Pierwszy rząd leży na środku drucika.
function parallelThread(st, lay) {
  const OFF = 0.2;
  const at = (id, dy = 0) => { const q = lay.cells[id]; return [q.x + 0.5, q.y + 0.5 + dy]; };
  const ids = (from, n) => Array.from({ length: n }, (_, k) => from + k);
  const through = (list, dir, dy) => {
    const seq = dir > 0 ? list : [...list].reverse();
    const [x0, y0] = at(seq[0], dy), [x1, y1] = at(seq[seq.length - 1], dy);
    return [[x0 - 0.6 * dir, y0], ...seq.map((id) => at(id, dy)), [x1 + 0.6 * dir, y1]];
  };
  const leg = (from, n, dir) => {
    const list = ids(from, n);
    const [tx, ty] = at(list[n - 1]);
    return [...list.map((id) => at(id, -OFF)), [tx + 0.55 * dir, ty], ...list.slice(0, -1).reverse().map((id) => at(id, OFF))];
  };
  const steps = [];
  for (const r of parallelRows(st)) {
    const body = (layer) => (layer === 'top' ? ids(r.top0, r.top) : ids(r.bot0, r.bottom));
    const row = (layer) => (r.i === 0
      ? { path: through(body(layer), 1, 0), extra: [] }
      : { path: through(body(layer), 1, -OFF), extra: [through(body(layer), -1, OFF)] });
    const legs = r.leg ? [leg(r.legL0, r.leg, -1), leg(r.legR0, r.leg, 1)] : [];
    // Nóżki to osobny krok — tak samo jak osobna linia w instrukcji.
    const legStep = () => legs.length && steps.push({ label: `Rz. ${r.i + 1} nóżki`, path: legs[0], extra: legs.slice(1) });
    if (r.two) {
      const b = row('bottom'), t = row('top');
      steps.push({ label: `Rz. ${r.i + 1} spód`, path: b.path, extra: b.extra });
      legStep();
      steps.push({ label: `Rz. ${r.i + 1} wierzch`, path: t.path, extra: t.extra });
    } else {
      const t = row('top');
      steps.push({ label: `Rz. ${r.i + 1}`, path: t.path, extra: t.extra });
      legStep();
    }
  }
  return steps;
}

export function stitchThread(st, lay) {
  if (!hasThread(st)) return [];
  if (st.kind === 'parallel') return parallelThread(st, lay);
  const W = st.width, R = st.rows, tube = st.form === 'tube';
  const cell = (r, c) => lay.cells[r * W + c];
  const ctr = (r, c) => { const q = cell(r, c); return [q.x + 0.5, q.y + 0.5]; };
  // Koniec koralika wzdłuż otworu: s = 1 — górny/prawy, s = -1 — dolny/lewy (kąt `a` w układzie „y w górę”).
  const end = (r, c, s, k = 0.42) => { const q = cell(r, c); return [q.x + 0.5 + s * k * Math.cos(q.a), q.y + 0.5 - s * k * Math.sin(q.a)]; };
  const cols = (dir) => { const list = [...Array(W).keys()]; return dir === '←' ? list.reverse() : list; };
  const dirOf = (r) => (tube || r % 2 === 0 ? '→' : '←');
  const word = tube ? 'Okr.' : 'Rz.';
  const label = (n, dir) => `${word} ${n}${tube ? '' : ` ${dir}`}`;
  const steps = [];
  // Ladder: nić idzie w górę przez jeden koralik i w dół przez następny; w rurce zamyka kółko.
  const ladder = (r) => {
    const path = [];
    cols('→').forEach((c, i) => path.push(end(r, c, i % 2 ? 1 : -1), end(r, c, i % 2 ? -1 : 1)));
    if (tube) path.push(end(r, 0, -1));
    return path;
  };

  if (st.kind === 'raw') {
    // Każde oczko: od wspólnego koralika przez nowe, dookoła oczka.
    const at = (id) => { const q = lay.cells[id]; return [q.x + 0.5, q.y + 0.5]; };
    rawSteps(st).forEach((s, k) => steps.push({ label: `Oczko ${k + 1}`, path: [...s.around, s.around[0]].map(at) }));
    return steps;
  }
  if (st.kind === 'peyote') {
    // Rzędy 1–2 nawlekasz naraz; potem nić przechodzi na zmianę przez nowy koralik
    // i przez wystający koralik rzędu poniżej. W rurce na końcu okrążenia — step up.
    steps.push({ label: label('1–2', '→'), path: cols('→').map((c) => ctr(0, c)) });
    for (let t = 2; t < 2 * R; t++) {
      const r = t >> 1, below = (t - 1) >> 1, parity = t % 2, dir = tube ? '→' : t % 2 ? '→' : '←';
      const order = cols(dir);
      const path = order.map((c) => (c % 2 === parity ? ctr(r, c) : ctr(below, c)));
      if (tube) path.push(ctr(r, order.find((c) => c % 2 === parity)));
      steps.push({ label: label(t + 1, dir), path });
    }
  } else if (st.kind === 'brick') {
    // Każdy koralik: pod mostkiem nici rzędu poniżej i z powrotem w górę przez koralik.
    steps.push({ label: label(1, '→'), path: ladder(0) });
    for (let r = 1; r < R; r++) {
      const dir = dirOf(r), path = [];
      for (const c of cols(dir)) {
        const [bx, by] = end(r, c, -1, 0.62);
        path.push([bx, by], end(r, c, -1), end(r, c, 1));
      }
      steps.push({ label: label(r + 1, dir), path });
    }
  } else if (st.kind === 'herringbone') {
    // Para kolumn: w górę przez koralik poniżej, dwa nowe, w dół przez sąsiedni poniżej.
    steps.push({ label: label(1, '→'), path: ladder(0) });
    for (let r = 1; r < R; r++) {
      const dir = dirOf(r), path = [];
      const pairs = [...Array(W / 2).keys()];
      for (const k of dir === '←' ? pairs.reverse() : pairs) {
        const [c0, c1] = dir === '←' ? [2 * k + 1, 2 * k] : [2 * k, 2 * k + 1];
        path.push(ctr(r - 1, c0), ctr(r, c0), ctr(r, c1), ctr(r - 1, c1));
      }
      steps.push({ label: label(r + 1, dir), path });
    }
  } else if (st.kind === 'fringe') {
    // Każdy frędzel osobno: od góry w dół i z powrotem w górę (koralik zwrotny na dole).
    for (let c = 0; c < W; c++) {
      const top = cell(0, c), down = Array.from({ length: R }, (_, r) => ctr(r, c));
      const [bx, by] = down[R - 1];
      steps.push({ label: `Fr. ${c + 1}`, path: [[top.x + 0.5, top.y - 0.3], ...down, [bx, by + 0.6]] });
    }
  } else if (st.kind === 'ladder') {
    // Szczebel po szczeblu: w górę przez jeden, w dół przez następny.
    for (let c = 0; c < W; c++) {
      const path = [];
      for (let k = Math.max(0, c - 1); k <= c; k++) path.push(k % 2 ? end(R - 1, k, 1) : end(0, k, -1), k % 2 ? end(0, k, -1) : end(R - 1, k, 1));
      steps.push({ label: `Szcz. ${c + 1}`, path });
    }
  } else {
    // Square stitch: każdy nowy koralik łączysz z koralikiem pod nim.
    steps.push({ label: label(1, '→'), path: cols('→').map((c) => ctr(0, c)) });
    for (let r = 1; r < R; r++) {
      const path = [];
      for (const c of cols('→')) path.push(ctr(r - 1, c), ctr(r, c));
      steps.push({ label: label(r + 1, '→'), path });
    }
  }
  // W rurce schemat się zawija — tam, gdzie nić przechodzi na drugi brzeg, przerywamy linię.
  if (tube) {
    for (const stp of steps) {
      const out = [];
      stp.path.forEach((q, i) => {
        const prev = stp.path[i - 1];
        if (prev && Math.abs(q[0] - prev[0]) > lay.period / 2) out.push(null);
        out.push(q);
      });
      stp.path = out;
    }
  }
  return steps;
}

// ---------------------------------------------------------------- instrukcja

function runs(list) {
  const out = [];
  for (const c of list) {
    const last = out[out.length - 1];
    if (last && last.color === c) last.n++;
    else out.push({ color: c, n: 1 });
  }
  return out;
}

// Puste miejsce (gumka) — robótka ma tam wycięty kształt. Ten sam numer co EMPTY w model.js.
const NONE = -1;

// Tekst ciągu koralików z pustymi miejscami: puste z przodu to „od k. miejsca”,
// w środku „przerwa n”, a na końcu po prostu się kończy.
function seqText(list, runText) {
  let a = 0, b = list.length - 1;
  while (a <= b && list[a] === NONE) a++;
  while (b >= a && list[b] === NONE) b--;
  if (a > b) return { text: 'bez koralików — to miejsce jest wycięte', color: undefined };
  const rs = runs(list.slice(a, b + 1));
  const body = rs.map((r) => (r.color === NONE ? `przerwa ${r.n}` : runText(r))).join(', ');
  return { text: `${a ? `od ${a + 1}. miejsca: ` : ''}${body}`, color: rs.length === 1 ? rs[0].color : undefined };
}

// Linie instrukcji w kolejności pracy. `runText` zamienia ciąg tych samych kolorów na tekst.
export function stitchInstructions(st, beads, runText) {
  const W = st.width, R = st.rows, tube = st.form === 'tube';
  const at = (r, c) => beads[r * W + c];
  const lines = [];
  const row = (num, list, dir) => {
    const ordered = dir === '←' ? [...list].reverse() : list;
    const { text, color } = seqText(ordered, runText);
    lines.push({ num: `${num}${dir && !tube ? ` ${dir}` : ''}`, text, color });
  };
  const cols = (r, parity) => Array.from({ length: W }, (_, c) => c).filter((c) => parity === null || c % 2 === parity).map((c) => at(r, c));
  const word = tube ? 'Okr.' : 'Rz.';
  const name = `${stitchTitle(st)} ${tube ? 'w rurkę' : 'płaski'}`;

  if (st.kind === 'parallel') {
    const two = st.layers === 2, rows = parallelRows(st);
    const text = (from, n) => beads.slice(from, from + n);
    const line = (num, list, tail = '') => { const q = seqText(list, runText); lines.push({ num, text: `${q.text}${tail}`, color: q.color }); };
    // Drucik: oba końce przechodzą przez każdy rząd i nóżkę (ok. 2,2 mm na koralik 11/0),
    // trochę na zawinięcia i po 15 cm na końcówki.
    const mm = rows.reduce((a, r) => a + 2 * ((r.top + (two ? r.bottom : 0)) * 2.2 + (two ? 8 : 4)) + 4 * (r.leg * 2.2 + 2), 0) + 300;
    const hasLegs = rows.some((r) => r.leg);
    lines.push({
      head: `Plecionka równoległa${two ? ' — dwie warstwy' : ''}`,
      note: `Na drucik 0,2–0,3 mm albo żyłkę, ok. ${Math.round(mm / 10)} cm (przy koralikach 11/0). Rząd 1 nawlecz na środek drucika. Każdy następny rząd nawlecz na jedną końcówkę, drugą przełóż przez te same koraliki z przeciwnej strony i dociągnij — rząd ułoży się nad poprzednim. Kolory od lewej do prawej, jak na schemacie; rząd 1 jest na dole.${hasLegs ? ' Nóżka: na końcówkę nawlecz koraliki nóżki, omiń ostatni (zwrotny) i wróć przez pozostałe do tułowia; potem tak samo druga końcówka po drugiej stronie.' : ''}${two ? ' Dwie warstwy: w każdym rzędzie najpierw spód, potem wierzch — wierzch układasz nad spodem, więc robótka robi się wypukła. Przed ostatnimi rzędami możesz włożyć do środka trochę waty.' : ''} Na końcu przewlecz obie końcówki przez kilka rzędów i obetnij.`,
    });
    const legLine = (r) => {
      const l = seqText(text(r.legL0, r.leg), runText), p = seqText(text(r.legR0, r.leg), runText);
      lines.push({
        num: `Rz. ${r.i + 1} nóżki`,
        text: `lewa: ${l.text}, prawa: ${p.text} — na każdej omiń ostatni (zwrotny) i wróć przez ${beadsN(r.leg - 1)}`,
        color: l.color !== undefined && l.color === p.color ? l.color : undefined,
      });
    };
    for (const r of rows) {
      const first = r.i === 0 ? ' — na środek drucika' : '';
      if (two) {
        line(`Rz. ${r.i + 1} spód`, text(r.bot0, r.bottom), first);
        if (r.leg) legLine(r);
        line(`Rz. ${r.i + 1} wierzch`, text(r.top0, r.top));
      } else {
        line(`Rz. ${r.i + 1}`, text(r.top0, r.top), first);
        if (r.leg) legLine(r);
      }
    }
  } else if (st.kind === 'raw') {
    lines.push({
      head: name,
      note: 'Każde oczko to kwadrat z 4 koralików: dwa leżą poziomo (dół, góra), dwa stoją pionowo (boki); sąsiednie oczka dzielą koraliki. Rzędy oczek idą od dołu schematu, na zmianę w prawo i w lewo. Nawlekasz tylko nowe koraliki i przekładasz nić dookoła oczka — jedną igłą albo na krzyż dwiema końcówkami żyłki (technika japońska).',
    });
    rawSteps(st).forEach((s, k) => {
      if (s.first) lines.push({ sub: `Rząd ${s.row + 1} ${s.dir}` });
      const rs = runs(s.added.map((id) => beads[id]));
      lines.push({
        num: `Oczko ${k + 1}`,
        text: `${rs.map((r) => (r.color === NONE ? `${r.n}× brak` : runText(r))).join(', ')} — ${s.roles.map((x) => RAW_ROLE[x]).join(', ')}${k === 0 ? ' — zamknij w kółko' : ''}`,
        color: rs.length === 1 && rs[0].color !== NONE ? rs[0].color : undefined,
      });
    });
  } else if (st.kind === 'crochet') {
    lines.push({
      head: 'Kolejność nawlekania',
      note: `Nawlekaj od góry listy. Pierwszy nawleczony koralik trafi na koniec wężyka, więc lista idzie od ostatniego rzędu do pierwszego. Na obwodzie ${W} koralików.`,
    });
    let pos = 0;
    for (const r of runs([...beads].reverse())) {
      lines.push({ num: `${pos + 1}${r.n > 1 ? `–${pos + r.n}` : ''}`, text: runText(r), color: r.color });
      pos += r.n;
    }
  } else if (st.kind === 'peyote') {
    lines.push({
      head: name,
      note: tube
        ? `Na start nawlecz ${beadsN(W)} z rzędów 1–2 i zamknij w kółko. Każde okrążenie dodaje ${beadsN(Math.ceil(W / 2))} w przerwy; na końcu okrążenia przejdź w górę (step up).`
        : `Na start nawlecz ${beadsN(W)} z rzędów 1–2 (na zmianę z obu rzędów). Każdy kolejny rząd dodaje co drugi koralik, kierunek zmienia się co rząd. Rząd 1 jest na dole schematu.`,
    });
    row(`${word} 1–2`, cols(0, null), '→');
    // Rząd peyote t (od 3): koraliki o wysokości t-1 w połówkach koralika.
    for (let t = 2; t < 2 * R; t++) {
      const r = Math.floor(t / 2), parity = t % 2;
      row(`${word} ${t + 1}`, cols(r, parity), t % 2 ? '→' : '←');
    }
  } else if (st.kind === 'brick') {
    lines.push({ head: name, note: `Rząd 1 to ladder (${beadsN(W)} obok siebie). Kolejne rzędy zaczepiasz o nitki rzędu poniżej; każdy jest przesunięty o pół koralika.` });
    for (let r = 0; r < R; r++) row(`${word} ${r + 1}`, cols(r, null), tube || r % 2 === 0 ? '→' : '←');
  } else if (st.kind === 'herringbone') {
    lines.push({
      head: name,
      note: `Rząd 1 to ladder; w każdym kolejnym rzędzie dodajesz po 2 koraliki na każdą parę kolumn (${plural(W / 2, 'para', 'pary', 'par')}).${st.twist ? ' Skręcony: w każdym okrążeniu przejdź w dół o jeden koralik w kolumnie — wtedy rurka skręca się w spiralę.' : ''}`,
    });
    for (let r = 0; r < R; r++) row(`${word} ${r + 1}`, cols(r, null), tube || r % 2 === 0 ? '→' : '←');
  } else if (st.kind === 'fringe') {
    lines.push({
      head: 'Frędzle',
      note: `${plural(W, 'frędzel', 'frędzle', 'frędzli')} obok siebie, każdy od góry (przy agrafce albo kółku) w dół, kolory jak na schemacie. Na dole frędzla nawlecz mały koralik zwrotny i wróć igłą przez cały frędzel do góry — albo zakończ szpilką z oczkiem. Frędzle zawieś po kolei od lewej.`,
    });
    for (let c = 0; c < W; c++) {
      const { text, color } = seqText(Array.from({ length: R }, (_, r) => at(r, c)), runText);
      lines.push({ num: `Fr. ${c + 1}`, text, color });
    }
  } else if (st.kind === 'ladder') {
    lines.push({ head: name, note: `Każdy szczebel to ${R === 1 ? '1 koralik' : `${beadsN(R)} jeden nad drugim`}; szczeble łączysz obok siebie od lewej.` });
    for (let c = 0; c < W; c++) row(`Szcz. ${c + 1}`, Array.from({ length: R }, (_, r) => at(r, c)), '');
  } else if (st.kind === 'praw') {
    const n = st.sides;
    const part = (from) => beads.slice(from, from + n);
    lines.push({ head: name, note: `Każda klatka: podłoga — pierścień z ${n} koralików, ściany — ${beadsN(n)} stojące pionowo w narożnikach, sufit — pierścień, który jest już podłogą następnej klatki.` });
    row('Podłoga 1', part(0), '');
    for (let k = 0; k < R; k++) {
      lines.push({ sub: `Klatka ${k + 1}` });
      row('Ściany', part(n + k * 2 * n), '');
      row('Sufit', part(2 * n + k * 2 * n), '');
    }
  } else {
    lines.push({ head: name, note: tube ? 'Każde okrążenie od lewej strony schematu.' : 'Każdy rząd od lewej; na krośnie nawlekasz cały rząd naraz. Rząd 1 jest na dole schematu.' });
    for (let r = 0; r < R; r++) row(`${word} ${r + 1}`, cols(r, null), '→');
  }
  return lines;
}
