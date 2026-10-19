// Silnik ściegów: peyote, brick, herringbone, square/krosno, ladder, RAW płaski,
// PRAW/CRAW i wężyk szydełkowy (bead crochet), płasko albo w rurkę.
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
  return STITCHES[st.kind].name;
}

// W peyote każda kolumna ma `rows` koralików, ale rzędów (przejść igłą) jest dwa razy więcej.
export const visibleRows = (st) => (st.kind === 'peyote' ? st.rows * 2 : st.rows);
export const rowsFromVisible = (kind, v) => (kind === 'peyote' ? Math.ceil(Number(v) / 2) : Number(v));
const HB_TILT = 0.42; // pochylenie koralika w herringbone (rad)
const TWIST_SHIFT = 0.5; // o ile koralika przesuwa się każdy rząd skręconego herringbone

// Poprawia ustawienia ściegu (wymagania konkretnych ściegów, zakresy liczb).
export function fixStitch(st) {
  const s = { kind: 'peyote', form: 'flat', width: 10, rows: 20, sides: 4, twist: false, mirror: false, ...st };
  if (!STITCHES[s.kind]) s.kind = 'peyote';
  if (s.form !== 'tube') s.form = 'flat';
  if (s.kind === 'praw' || s.kind === 'crochet') s.form = 'tube';
  if (s.kind === 'raw') s.form = 'flat';
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
      default: // square / krosno
        u = c * h * 1.05; v = r * d;
    }
    cells.push({ id, x, y, a, u, v, row: r, col: c });
  }
  if (st.kind === 'peyote') height = R + 0.5;
  if (st.kind === 'brick') width = W + 0.5;
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

// Układ zależy tylko od ustawień ściegu i wymiarów koralika — trzymamy kilka ostatnich.
const cache = new Map();
export function stitchLayout(st, bead) {
  const key = `${st.kind}|${st.form}|${st.width}|${st.rows}|${st.sides}|${st.twist}|${bead.d}|${bead.h}`;
  let lay = cache.get(key);
  if (lay) return lay;
  lay = st.kind === 'praw' ? prawLayout(st, bead) : st.kind === 'crochet' ? crochetLayout(st, bead)
    : st.kind === 'raw' ? rawLayout(st, bead) : gridLayout(st, bead);
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
  if (oldSt.kind === 'raw' || st.kind === 'raw') {
    // Między RAW a innym ściegiem obrazek przenosimy według miejsca na schemacie.
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

export function stitchThread(st, lay) {
  if (!hasThread(st)) return [];
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

// Linie instrukcji w kolejności pracy. `runText` zamienia ciąg tych samych kolorów na tekst.
export function stitchInstructions(st, beads, runText) {
  const W = st.width, R = st.rows, tube = st.form === 'tube';
  const at = (r, c) => beads[r * W + c];
  const lines = [];
  const row = (num, list, dir) => {
    const ordered = dir === '←' ? [...list].reverse() : list;
    const rs = runs(ordered);
    lines.push({ num: `${num}${dir && !tube ? ` ${dir}` : ''}`, text: rs.map(runText).join(', '), color: rs.length === 1 ? rs[0].color : undefined });
  };
  const cols = (r, parity) => Array.from({ length: W }, (_, c) => c).filter((c) => parity === null || c % 2 === parity).map((c) => at(r, c));
  const word = tube ? 'Okr.' : 'Rz.';
  const name = `${stitchTitle(st)} ${tube ? 'w rurkę' : 'płaski'}`;

  if (st.kind === 'raw') {
    lines.push({
      head: name,
      note: 'Każde oczko to kwadrat z 4 koralików: dwa leżą poziomo (dół, góra), dwa stoją pionowo (boki); sąsiednie oczka dzielą koraliki. Rzędy oczek idą od dołu schematu, na zmianę w prawo i w lewo. Nawlekasz tylko nowe koraliki i przekładasz nić dookoła oczka — jedną igłą albo na krzyż dwiema końcówkami żyłki (technika japońska).',
    });
    rawSteps(st).forEach((s, k) => {
      if (s.first) lines.push({ sub: `Rząd ${s.row + 1} ${s.dir}` });
      const rs = runs(s.added.map((id) => beads[id]));
      lines.push({
        num: `Oczko ${k + 1}`,
        text: `${rs.map(runText).join(', ')} — ${s.roles.map((x) => RAW_ROLE[x]).join(', ')}${k === 0 ? ' — zamknij w kółko' : ''}`,
        color: rs.length === 1 ? rs[0].color : undefined,
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
