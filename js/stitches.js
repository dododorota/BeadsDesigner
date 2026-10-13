// Silnik ściegów: peyote, brick, herringbone, square/krosno, ladder i PRAW/CRAW,
// płasko albo w rurkę.
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
  praw: {
    name: 'CRAW / PRAW',
    hint: 'Sznur z „klatek”: pierścień koralików (podłoga), pionowe ściany i kolejny pierścień. 4 boki to CRAW.',
    widthLabel: 'Boków',
  },
};

export const STITCH_LIMITS = { width: [2, 60], rows: [1, 400], sides: [3, 6] };

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
  if (s.kind === 'praw') s.form = 'tube';
  s.width = clamp(s.width, STITCH_LIMITS.width);
  if (s.kind === 'herringbone' && s.width % 2) s.width += 1;
  s.rows = clamp(s.rows, STITCH_LIMITS.rows);
  s.sides = clamp(s.sides, STITCH_LIMITS.sides);
  s.twist = Boolean(s.twist) && s.kind === 'herringbone' && s.form === 'tube';
  s.mirror = Boolean(s.mirror);
  return s;
}

// Ile koralików ma robótka i ile ich jest w jednym rzędzie (do przenoszenia wzoru).
export function stitchCount(st) {
  return st.kind === 'praw' ? st.sides * (2 * st.rows + 1) : st.width * st.rows;
}
const rowSize = (st) => (st.kind === 'praw' ? 2 * st.sides : st.width);

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

// Układ zależy tylko od ustawień ściegu i wymiarów koralika — trzymamy kilka ostatnich.
const cache = new Map();
export function stitchLayout(st, bead) {
  const key = `${st.kind}|${st.form}|${st.width}|${st.rows}|${st.sides}|${st.twist}|${bead.d}|${bead.h}`;
  let lay = cache.get(key);
  if (lay) return lay;
  lay = st.kind === 'praw' ? prawLayout(st, bead) : gridLayout(st, bead);
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
  const W = st.width, r = Math.floor(id / W), c = id % W;
  return r * W + (W - 1 - c);
}

// Przenosi wzór po zmianie ściegu lub rozmiaru: koralik zostaje w tym samym
// rzędzie i kolumnie, a nowe miejsca dostają wzór powtórzony z istniejących.
export function remapBeads(oldSt, oldBeads, st) {
  const n = stitchCount(st);
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
  const first = st.kind === 'praw' ? st.sides : 0; // pierwsza podłoga PRAW zostaje
  len = Math.max(1, Math.min(st.rows, len | 0)) * size;
  for (let i = first + len; i < beads.length; i++) beads[i] = beads[first + ((i - first) % len)];
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

  if (st.kind === 'peyote') {
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
