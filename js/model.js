// Model projektu: trzy tryby projektowania i wszystko, co da się o nich policzyć
// bez rysowania (układ na schemacie, sąsiedzi, symetria, zużycie, instrukcje).

import { BEAD_TYPES, DEFAULT_BEAD, DEFAULT_PALETTE, LEGACY_SIZES, beadType, beadsToGrams } from './beads.js';
import {
  fixStitch, plural, remapBeads, repeatStitchRows, stitchCount, stitchInstructions, stitchLayout, stitchMirror, stitchNeighbors, stitchThread,
} from './stitches.js';
import {
  BALL_SHAPES, BODY, ballColors, ballInstructions, ballThread, ballLayout, ballMirror, ballNeighbors, ballParts3D, ballShape, extraSize, fixBall,
  fixExtras, fixParts, locate, partAt, partJoin, partOffset, setPartShape,
} from './ball.js';
import { MOTIFS, fixGroups, mirrorWithMotifs, repeatWithMotifs, roleInGroup, strandSlots, trimGroups } from './motifs.js';

export const MODES = {
  strand: 'Naszyjnik (sznurek)',
  tube: 'Wężyk (bead crochet)',
  stitch: 'Ścieg (peyote, brick, herringbone…)',
  ball: 'Figurka na krzyż (technika japońska)',
  figure: 'Figurka warstwami',
};

export const EMPTY = -1;

export const LIMITS = {
  strandCount: [10, 2000],
  strandWrap: [5, 80],
  tubeAround: [3, 16],
  tubeRows: [2, 400],
  figureSide: [2, 32],
  figureHeight: [1, 40],
};

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));

// ---------------------------------------------------------------- przykłady

function exampleStrand() {
  const count = 300;
  const beads = new Array(count).fill(0);
  // Akcenty co 15 koralików, lustrzane względem środka.
  const half = count / 2;
  for (let i = 0; i < half; i++) {
    const fromCenter = half - 1 - i;
    if (fromCenter >= 8 && fromCenter % 15 === 8) {
      beads[i] = 6; beads[i + 1] = 3; beads[i + 2] = 6;
    }
  }
  // Motyw na środku: złoto i biel.
  const motif = [1, 6, 7, 6, 1];
  for (let k = 0; k < motif.length; k++) beads[half - 1 - k] = motif[k];
  for (let i = 0; i < half; i++) beads[count - 1 - i] = beads[i];
  return { count, wrap: 30, symmetric: true, pendant: 'ball', beads, groups: [] };
}

function exampleTube() {
  const around = 6, rows = 60;
  const beads = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < around; c++) beads.push(c < 2 ? 0 : c < 4 ? 6 : 2);
  }
  return { around, rows, beads };
}

// Peyote płaski: biały pasek z różowym rombem i złotym środkiem.
function exampleStitch() {
  const st = fixStitch({ kind: 'peyote', form: 'flat', width: 14, rows: 18, mirror: true });
  st.beads = [];
  for (let r = 0; r < st.rows; r++) for (let c = 0; c < st.width; c++) {
    const dist = Math.abs(c - 6.5) + Math.abs(r - 8.5) * 0.8;
    st.beads.push(dist < 2 ? 7 : dist < 4.5 ? 0 : dist < 5.5 ? 1 : 6);
  }
  return st;
}

function blankStitch() {
  const st = fixStitch({ kind: 'peyote', form: 'flat', width: 10, rows: 20 });
  st.beads = new Array(stitchCount(st)).fill(0);
  return st;
}

// Żabka na krzyż: miętowa, z białym brzuszkiem, czarnymi oczkami, różowymi
// policzkami i dwiema łapkami z przodu.
function exampleBall() {
  const ball = fixBall({ shape: 'b270', mirror: true });
  const shape = ballShape(ball.shape);
  const nearest = (x, y, z) => {
    const l = Math.hypot(x, y, z);
    let best = 0, bd = Infinity;
    for (const b of shape.beads) {
      const d = Math.hypot(b.mid[0] - x / l, b.mid[1] - y / l, b.mid[2] - z / l);
      if (d < bd) { bd = d; best = b.id; }
    }
    return best;
  };
  ball.beads = shape.beads.map((b) => (b.mid[1] < -0.3 && b.mid[2] > 0.05 ? 6 : 2));
  for (const sx of [-1, 1]) {
    ball.beads[nearest(sx * 0.38, 0.42, 0.82)] = 9;
    ball.beads[nearest(sx * 0.6, 0.02, 0.8)] = 1;
  }
  ball.extras = [-1, 1].map((sx) => ({ at: nearest(sx * 0.5, -0.72, 0.48), kind: 'loop', colors: [2, 2, 2, 2] }));
  return ball;
}

function blankBall() {
  const ball = fixBall({ shape: 'b120' });
  ball.beads = new Array(ballShape(ball.shape).count).fill(0);
  return ball;
}

function exampleFigure() {
  // Kurczaczek: korpus + główka, wydrążone, z dziobkiem i oczkami.
  const w = 9, d = 9, h = 12;
  const v = new Array(w * d * h).fill(EMPTY);
  const idx = (x, y, z) => x + y * w + z * w * d;
  const inEllipsoid = (x, y, z, cx, cy, cz, rx, ry, rz) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;
  for (let z = 0; z < h; z++) for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    if (inEllipsoid(x, y, z, 4, 4.5, 3, 4.3, 4.3, 3.6) || inEllipsoid(x, y, z, 4, 3.6, 8.2, 2.9, 2.9, 2.9)) {
      v[idx(x, y, z)] = 3;
    }
  }
  const fig = { w, d, h, mirror: true, voxels: v };
  hollow(fig);
  // Dziobek: na przodzie główki (mały y = przód).
  v[idx(4, 0, 8)] = 4; v[idx(4, 0, 7)] = 4;
  v[idx(3, 1, 9)] = 9; v[idx(5, 1, 9)] = 9;
  // Skrzydełka w kolorze pomarańczowym.
  for (const z of [2, 3, 4]) { v[idx(0, 4, z)] = 4; v[idx(8, 4, z)] = 4; v[idx(0, 5, z)] = 4; v[idx(8, 5, z)] = 4; }
  return fig;
}

export function createProject() {
  return {
    version: 2,
    name: 'Mój naszyjnik',
    description: '',
    mode: 'strand',
    palette: DEFAULT_PALETTE.map((c) => ({ ...c })),
    strand: exampleStrand(),
    tube: exampleTube(),
    stitch: exampleStitch(),
    ball: exampleBall(),
    figure: exampleFigure(),
  };
}

export function createBlankProject(mode = 'strand') {
  const p = createProject();
  p.name = { strand: 'Nowy naszyjnik', tube: 'Nowy wężyk', stitch: 'Nowy ścieg', ball: 'Nowa figurka', figure: 'Nowa figurka warstwami' }[mode] || 'Nowy projekt';
  p.mode = mode;
  p.strand = { count: 300, wrap: 30, symmetric: true, pendant: '', beads: new Array(300).fill(0), groups: [] };
  p.tube = { around: 6, rows: 40, beads: new Array(240).fill(0) };
  p.stitch = blankStitch();
  p.ball = blankBall();
  p.figure = { w: 9, d: 9, h: 10, mirror: true, voxels: new Array(810).fill(EMPTY) };
  return p;
}

// Wczytanie pliku: naprawia brakujące pola, żeby stare/obce pliki się nie wysypały.
export function normalizeProject(raw) {
  const base = createBlankProject();
  if (!raw || typeof raw !== 'object') throw new Error('Plik nie zawiera projektu.');
  const p = { ...base, ...raw, version: 2 };
  // Wersja 1 miała jeden rozmiar dla całego projektu — trafia teraz do każdego koloru.
  const legacyBead = LEGACY_SIZES[raw.beadSize] || DEFAULT_BEAD;
  delete p.beadSize;
  if (!Array.isArray(p.palette) || p.palette.length === 0) p.palette = base.palette;
  p.palette = p.palette.map((c) => ({
    name: String(c.name || 'Kolor'),
    hex: /^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#999999',
    finish: c.finish || 'opaque',
    bead: BEAD_TYPES[c.bead] ? c.bead : legacyBead,
  }));
  if (!MODES[p.mode]) p.mode = 'strand';
  const n = p.palette.length;
  const fixColor = (c, allowEmpty) => {
    c = Number.isInteger(c) ? c : 0;
    if (allowEmpty && c === EMPTY) return c;
    return c >= 0 && c < n ? c : 0;
  };
  const s = { ...base.strand, ...(raw.strand || {}) };
  s.count = clamp(s.count, LIMITS.strandCount);
  s.wrap = clamp(s.wrap, LIMITS.strandWrap);
  s.beads = Array.from({ length: s.count }, (_, i) => fixColor((s.beads || [])[i] ?? 0));
  s.groups = fixGroups(raw.strand?.groups, s.count);
  // Zawieszka: '' (brak), 'ball' (figurka na krzyż) albo 'layers' (figurka warstwami; dawniej true).
  s.pendant = s.pendant === true || s.pendant === 'layers' ? 'layers' : s.pendant === 'ball' ? 'ball' : '';
  p.strand = s;
  const t = { ...base.tube, ...(raw.tube || {}) };
  t.around = clamp(t.around, LIMITS.tubeAround);
  t.rows = clamp(t.rows, LIMITS.tubeRows);
  t.beads = Array.from({ length: t.around * t.rows }, (_, i) => fixColor((t.beads || [])[i] ?? 0));
  p.tube = t;
  // Wężyk ma własny tryb — w danych ściegu go nie trzymamy.
  const st = fixStitch({ ...base.stitch, ...(raw.stitch || {}) });
  if (st.kind === 'crochet') Object.assign(st, fixStitch({ ...st, kind: 'peyote', form: 'tube' }));
  st.beads = Array.from({ length: stitchCount(st) }, (_, i) => fixColor((raw.stitch?.beads || [])[i] ?? 0));
  p.stitch = st;
  const ball = fixBall({ ...base.ball, ...(raw.ball || {}) });
  ball.beads = Array.from({ length: ballShape(ball.shape).count }, (_, i) => fixColor((raw.ball?.beads || [])[i] ?? 0));
  ball.extras = fixExtras(raw.ball ? raw.ball.extras : base.ball.extras, ball.beads.length, (c) => fixColor(c));
  ball.parts = fixParts(raw.ball ? raw.ball.parts : [], ball, (c) => fixColor(c));
  p.ball = ball;
  const f = { ...base.figure, ...(raw.figure || {}) };
  f.w = clamp(f.w, LIMITS.figureSide);
  f.d = clamp(f.d, LIMITS.figureSide);
  f.h = clamp(f.h, LIMITS.figureHeight);
  f.voxels = Array.from({ length: f.w * f.d * f.h }, (_, i) => fixColor((f.voxels || [])[i] ?? EMPTY, true));
  p.figure = f;
  return p;
}

// ---------------------------------------------------------------- zmiana rozmiaru

export function resizeStrand(p, count, wrap) {
  const s = p.strand;
  count = clamp(count, LIMITS.strandCount);
  const old = s.beads;
  s.beads = Array.from({ length: count }, (_, i) => (i < old.length ? old[i] : 0));
  s.count = count;
  trimGroups(s);
  if (wrap !== undefined) s.wrap = clamp(wrap, LIMITS.strandWrap);
}

// Nowe rzędy i kolumny powtarzają istniejący wzór (tak samo jak w ściegach).
export function resizeTube(p, around, rows) {
  const t = p.tube;
  around = clamp(around, LIMITS.tubeAround);
  rows = clamp(rows, LIMITS.tubeRows);
  const beads = remapBeads(crochetOf(t), t.beads, crochetOf({ around, rows }));
  Object.assign(t, { around, rows, beads });
}

export function resizeFigure(p, w, d, h) {
  const f = p.figure;
  w = clamp(w, LIMITS.figureSide); d = clamp(d, LIMITS.figureSide); h = clamp(h, LIMITS.figureHeight);
  // Zawartość zostaje wyśrodkowana w poziomie, żeby figurka nie „uciekała” w róg.
  const ox = Math.floor((w - f.w) / 2), oy = Math.floor((d - f.d) / 2);
  const v = new Array(w * d * h).fill(EMPTY);
  for (let z = 0; z < Math.min(h, f.h); z++) for (let y = 0; y < f.d; y++) for (let x = 0; x < f.w; x++) {
    const nx = x + ox, ny = y + oy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= d) continue;
    v[nx + ny * w + z * w * d] = f.voxels[x + y * f.w + z * f.w * f.d];
  }
  Object.assign(f, { w, d, h, voxels: v });
}

// ---------------------------------------------------------------- tryby

// Każdy tryb opisuje, jak koraliki leżą na schemacie (x, y w jednostkach koralika),
// kto jest czyim sąsiadem (do wypełniania) i jak wygląda odbicie lustrzane.

const strandMode = {
  get: (p, id) => p.strand.beads[id],
  set: (p, id, c) => { p.strand.beads[id] = c; },
  layout(p) {
    const { count, wrap } = p.strand;
    const cells = [];
    for (let i = 0; i < count; i++) cells.push({ id: i, x: i % wrap, y: Math.floor(i / wrap) });
    const rows = Math.ceil(count / wrap);
    const rowLabels = Array.from({ length: rows }, (_, y) => ({ y, text: String(y * wrap + 1) }));
    const colLabels = Array.from({ length: Math.min(wrap, count) }, (_, x) => ({ x, text: String(x + 1) }));
    const center = count % 2 ? [(count - 1) / 2] : [count / 2 - 1, count / 2];
    // Motywy zaznaczamy obwódką; motyw dzielony między wiersze schematu ma kilka kawałków.
    const bands = [];
    for (const g of p.strand.groups) {
      for (let i = g.start; i < g.start + g.n;) {
        const y = Math.floor(i / wrap), x0 = i % wrap;
        const x1 = Math.min(wrap - 1, x0 + (g.start + g.n - 1 - i));
        bands.push({ y, x0, x1, kind: g.kind, first: i === g.start });
        i += x1 - x0 + 1;
      }
    }
    return { cells, width: wrap, height: rows, rowLabels, colLabels, marks: center, bands, shape: 'side' };
  },
  neighbors: (p, id) => [id - 1, id + 1].filter((n) => n >= 0 && n < p.strand.count),
  mirror: (p, id) => (p.strand.symmetric ? mirrorBead(p.strand, id) : null),
  allBeads: (p) => p.strand.beads,
};

// Lustrzany koralik po drugiej stronie środka. W motywach odpowiada sobie rola:
// płatek ↔ płatek, środek ↔ środek, koralik zwrotny ↔ koralik zwrotny.
function mirrorBead(s, id) {
  const inGroup = (i) => s.groups.find((g) => i >= g.start && i < g.start + g.n);
  const g = inGroup(id);
  if (!g) {
    const m = s.count - 1 - id;
    return inGroup(m) ? null : m;
  }
  const twin = s.groups.find((q) => q.start === s.count - g.start - g.n && q.kind === g.kind && q.n === g.n);
  if (!twin) return null;
  if (twin === g) return g.kind === 'loop' ? g.start + g.n - 1 - (id - g.start) : null;
  const k = id - g.start;
  if (g.kind === 'daisy') return twin.start + (k === g.n - 1 ? k : g.n - 2 - k);
  if (g.kind === 'dangle') return twin.start + k;
  return twin.start + g.n - 1 - k;
}

// Wężyk szydełkowy: układ spirali liczy silnik ściegów (ścieg „crochet”), a wężyk
// trzyma tylko obwód, liczbę rzędów i kolory w `project.tube`.
const crochetOf = (t) => fixStitch({ kind: 'crochet', form: 'tube', width: t.around, rows: t.rows });
const tubeLayoutOf = (p) => stitchLayout(crochetOf(p.tube), baseBead(p, p.tube.beads));

const tubeMode = {
  get: (p, id) => p.tube.beads[id],
  set: (p, id, c) => { p.tube.beads[id] = c; },
  layout(p) {
    return { ...tubeLayoutOf(p), marks: [], shape: 'side' };
  },
  neighbors: (p, id) => stitchNeighbors(tubeLayoutOf(p), id),
  mirror: () => null,
  allBeads: (p) => p.tube.beads,
};

// Ścieg: układ koralików liczy silnik ściegów (stitches.js) dla podstawowego koralika projektu.
const stitchLayoutOf = (p) => stitchLayout(p.stitch, baseBead(p, p.stitch.beads));

// Ścieżka nici dla kroku `ui.threadStep` (bieżący krok wyraźnie, poprzedni blado).
export function stitchThreadAt(p, ui) {
  const steps = stitchThread(p.stitch, stitchLayoutOf(p));
  if (!steps.length) return null;
  const i = Math.max(0, Math.min(steps.length - 1, ui?.threadStep ?? 0));
  return { label: steps[i].label, index: i, count: steps.length, main: [steps[i].path], faint: i > 0 ? [steps[i - 1].path] : [], marks: [] };
}

const stitchMode = {
  get: (p, id) => p.stitch.beads[id],
  set: (p, id, c) => { p.stitch.beads[id] = c; },
  layout(p, ui) {
    const lay = stitchLayoutOf(p);
    return { ...lay, marks: [], shape: 'side', thread: ui?.thread ? stitchThreadAt(p, ui) : null };
  },
  neighbors: (p, id) => stitchNeighbors(stitchLayoutOf(p), id),
  mirror: (p, id) => stitchMirror(p.stitch, id),
  allBeads: (p) => p.stitch.beads,
};

// Zmiana ściegu, formy albo rozmiaru — wzór zostaje w tych samych rzędach i kolumnach.
export function setStitch(p, changes) {
  const old = p.stitch;
  const st = fixStitch({ ...old, ...changes });
  st.beads = remapBeads(old, old.beads, st);
  p.stitch = st;
}

export { stitchLayoutOf, tubeLayoutOf };

// Figurka na krzyż: koraliki na krawędziach oczek, schemat płaski z numerami oczek.
// Figurka może mieć kilka kulek (tułów, głowa…) — numery koralików idą przez całą
// figurkę, a schemat pokazuje jedną kulkę naraz (`ui.ballPart`).
export const currentPart = (p, ui) => Math.max(BODY, Math.min(p.ball.parts.length - 1, ui?.ballPart ?? BODY));

const ballMode = {
  get: (p, id) => { const l = locate(p.ball, id); return l ? l.part.beads[l.local] : 0; },
  set: (p, id, c) => { const l = locate(p.ball, id); if (l) l.part.beads[l.local] = c; },
  layout(p, ui) {
    const ball = p.ball, pi = currentPart(p, ui), part = partAt(ball, pi);
    const off = partOffset(ball, pi);
    const lay = ballLayout(part.shape);
    const cells = lay.cells.map((c) => ({ ...c, id: c.id + off }));
    const badges = part.extras.map((x) => {
      const c = lay.cells[x.at];
      return { x: c.x + 0.5, y: c.y + 0.5, text: x.kind === 'strip' ? `${extraSize(x)}□` : `+${extraSize(x)}` };
    });
    // ◆ przy oczkach, którymi ta kulka łączy się z innymi.
    const joined = new Set(ball.parts.filter((q) => q.parent === pi).map((q) => q.at));
    if (pi >= 0) joined.add(partJoin(ball, pi));
    const labels = joined.size ? lay.labels.map((l, i) => (joined.has(i) ? { ...l, text: `${l.text}◆` } : l)) : lay.labels;
    const thread = ui?.thread && ui.ballStep > 0 ? ballThread(part.shape, ui.ballStep - 1) : null;
    return { ...lay, cells, labels, rowLabels: [], colLabels: [], marks: [], badges, shape: 'side', thread };
  },
  neighbors: (p, id) => ballNeighbors(p.ball, id),
  mirror: (p, id) => ballMirror(p.ball, id),
  allBeads: (p) => ballColors(p.ball),
};

// Zmiana rozmiaru kulki — kolory i dodatki przenoszą się według położenia na bryle.
export function setBallShape(p, key, pi = BODY) {
  if (!BALL_SHAPES[key]) return;
  setPartShape(p.ball, pi, key);
}

const figureMode = {
  get: (p, id) => p.figure.voxels[id],
  set: (p, id, c) => { p.figure.voxels[id] = c; },
  layout(p, ui) {
    const { w, d, h } = p.figure;
    const z = Math.min(ui.layer ?? 0, h - 1);
    const cells = [], ghost = [];
    for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
      cells.push({ id: x + y * w + z * w * d, x, y });
      if (z > 0) {
        const below = p.figure.voxels[x + y * w + (z - 1) * w * d];
        if (below !== EMPTY) ghost.push({ x, y, color: below });
      }
    }
    const rowLabels = Array.from({ length: d }, (_, y) => ({ y, text: String(y + 1) }));
    const colLabels = Array.from({ length: w }, (_, x) => ({ x, text: String(x + 1) }));
    return { cells, width: w, height: d, rowLabels, colLabels, marks: [], ghost, shape: 'top', allowEmpty: true };
  },
  neighbors(p, id) {
    const { w, d } = p.figure;
    const x = id % w, y = Math.floor(id / w) % d;
    const out = [];
    if (x > 0) out.push(id - 1);
    if (x < w - 1) out.push(id + 1);
    if (y > 0) out.push(id - w);
    if (y < d - 1) out.push(id + w);
    return out;
  },
  mirror(p, id) {
    if (!p.figure.mirror) return null;
    const w = p.figure.w;
    const x = id % w;
    return id - x + (w - 1 - x);
  },
  allBeads: (p) => p.figure.voxels.filter((c) => c !== EMPTY),
};

export const modeApi = { strand: strandMode, tube: tubeMode, stitch: stitchMode, ball: ballMode, figure: figureMode };

// ---------------------------------------------------------------- narzędzia

export function floodFill(p, ui, startId, color) {
  const api = modeApi[p.mode];
  const target = api.get(p, startId);
  if (target === color) return [];
  const seen = new Set([startId]);
  const stack = [startId];
  const changed = [];
  while (stack.length) {
    const id = stack.pop();
    api.set(p, id, color);
    changed.push(id);
    for (const n of api.neighbors(p, id, ui)) {
      if (!seen.has(n) && api.get(p, n) === target) { seen.add(n); stack.push(n); }
    }
  }
  return changed;
}

// Powiela pierwsze `len` koralików (sznurek) lub rzędów (wężyk) na całą długość.
export function repeatPattern(p, len) {
  if (p.mode === 'strand') {
    repeatWithMotifs(p.strand, len);
  } else if (p.mode === 'stitch') {
    repeatStitchRows(p.stitch, p.stitch.beads, len);
  } else if (p.mode === 'tube') {
    repeatStitchRows(crochetOf(p.tube), p.tube.beads, len);
  }
}

// Kopiuje lewą połowę sznurka na prawą (od środka na zewnątrz).
export function mirrorStrand(p) {
  mirrorWithMotifs(p.strand);
}

export function copyLayer(p, from, to) {
  const f = p.figure, n = f.w * f.d;
  if (to < 0 || to >= f.h) return;
  for (let i = 0; i < n; i++) f.voxels[to * n + i] = f.voxels[from * n + i];
}

export function clearLayer(p, z) {
  const f = p.figure, n = f.w * f.d;
  for (let i = 0; i < n; i++) f.voxels[z * n + i] = EMPTY;
}

// Dodaje bryłę wpisaną w całą przestrzeń figurki.
export function addShape(p, kind, color) {
  const { w, d, h, voxels } = p.figure;
  const cx = (w - 1) / 2, cy = (d - 1) / 2, cz = (h - 1) / 2;
  const rx = w / 2, ry = d / 2, rz = h / 2;
  for (let z = 0; z < h; z++) for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
    let inside = false;
    if (kind === 'sphere') inside = dx * dx + dy * dy + dz * dz <= 1;
    else if (kind === 'cylinder') inside = dx * dx + dy * dy <= 1;
    else if (kind === 'cone') { const t = 1 - z / h; inside = dx * dx + dy * dy <= t * t; }
    else if (kind === 'box') inside = true;
    if (inside) voxels[x + y * w + z * w * d] = color;
  }
}

// Zostawia tylko koraliki na powierzchni bryły — figurki z koralików są puste w środku.
export function hollow(fig) {
  const { w, d, h, voxels } = fig;
  const filled = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < w && y < d && z < h && voxels[x + y * w + z * w * d] !== EMPTY;
  const remove = [];
  for (let z = 0; z < h; z++) for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    if (!filled(x, y, z)) continue;
    if (filled(x - 1, y, z) && filled(x + 1, y, z) && filled(x, y - 1, z) && filled(x, y + 1, z) && filled(x, y, z - 1) && filled(x, y, z + 1)) {
      remove.push(x + y * w + z * w * d);
    }
  }
  for (const i of remove) voxels[i] = EMPTY;
  return remove.length;
}

// Przesuwa kolory w palecie po usunięciu koloru `removed`.
export function removePaletteColor(p, removed) {
  if (p.palette.length <= 1) return;
  p.palette.splice(removed, 1);
  const remap = (c) => (c === EMPTY ? c : c === removed ? 0 : c > removed ? c - 1 : c);
  p.strand.beads = p.strand.beads.map(remap);
  p.tube.beads = p.tube.beads.map(remap);
  p.stitch.beads = p.stitch.beads.map(remap);
  for (const q of [p.ball, ...p.ball.parts]) {
    q.beads = q.beads.map(remap);
    q.extras.forEach((x) => { x.colors = x.colors.map(remap); });
  }
  p.figure.voxels = p.figure.voxels.map(remap);
}

// ---------------------------------------------------------------- liczenie

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export function countColors(p, beads = modeApi[p.mode].allBeads(p)) {
  const counts = new Array(p.palette.length).fill(0);
  for (const c of beads) if (c >= 0 && c < counts.length) counts[c]++;
  return counts;
}

// Typ koralika (kształt i rozmiar) przypisany do koloru z palety.
export const beadOf = (p, color) => beadType(p.palette[color]?.bead);

// Typy koralików użyte w liście kolorów, od najczęstszego.
export function beadTypesUsed(p, beads = modeApi[p.mode].allBeads(p)) {
  const counts = new Map();
  for (const c of beads) {
    const id = p.palette[c]?.bead;
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

// Koralik, na którym opiera się siatka wężyka i figurki: najczęściej użyty.
export function baseBead(p, beads = modeApi[p.mode].allBeads(p)) {
  return beadType(beadTypesUsed(p, beads)[0] ?? p.palette[0]?.bead);
}

export function usage(p) {
  const counts = countColors(p);
  const total = counts.reduce((a, b) => a + b, 0);
  const rows = counts
    .map((n, i) => ({ color: i, n, grams: beadsToGrams(n, p.palette[i].bead) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  return { total, rows, grams: rows.reduce((a, r) => a + r.grams, 0) };
}

// Rozmiar gotowej rzeczy w milimetrach.
export function dimensions(p) {
  if (p.mode === 'strand') {
    const mm = strandSlots(p.strand, (c) => beadOf(p, c)).reduce((a, s) => a + s.len, 0);
    return { label: 'Długość sznurka', value: `${(mm / 10).toFixed(1)} cm` };
  }
  const b = baseBead(p);
  if (p.mode === 'ball') {
    const pts = ballParts3D(p.ball, b).flatMap((g) => g.list.map((q) => add3(q.pos, g.origin)));
    const size = (k) => Math.max(...pts.map((q) => q[k])) - Math.min(...pts.map((q) => q[k])) + b.d;
    return { label: 'Figurka', value: `${size(0).toFixed(0)} × ${size(1).toFixed(0)} × ${size(2).toFixed(0)} mm` };
  }
  if (p.mode === 'stitch') {
    const { w, h } = stitchLayoutOf(p).sizeMM;
    return p.stitch.form === 'tube'
      ? { label: 'Rurka', value: `${(h / 10).toFixed(1)} cm × ⌀ ${w.toFixed(1)} mm` }
      : { label: 'Robótka', value: `${(w / 10).toFixed(1)} × ${(h / 10).toFixed(1)} cm` };
  }
  if (p.mode === 'tube') {
    const len = p.tube.rows * b.d * 0.95;
    const dia = ((p.tube.around + 0.5) * b.d) / Math.PI + b.d * 0.9;
    return { label: 'Wężyk', value: `${(len / 10).toFixed(1)} cm × ⌀ ${dia.toFixed(1)} mm` };
  }
  const { w, d, h } = p.figure;
  const fmt = (n) => (n * b.d / 10).toFixed(1);
  return { label: 'Figurka', value: `${fmt(w)} × ${fmt(d)} × ${fmt(h)} cm` };
}

// ---------------------------------------------------------------- instrukcje

function runs(list) {
  const out = [];
  list.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.color === c) last.n++;
    else out.push({ color: c, n: 1, start: i });
  });
  return out;
}

export function instructions(p) {
  const mixed = beadTypesUsed(p).length > 1;
  const name = (c) => {
    if (c === EMPTY) return '—';
    const n = p.palette[c]?.name ?? '?';
    return mixed ? `${n} (${beadOf(p, c).label})` : n;
  };
  const runText = (r) => `${r.n}× ${name(r.color)}`;
  const lines = [];
  if (p.mode === 'strand') {
    const s = p.strand;
    lines.push({
      head: 'Kolejność nawlekania',
      note: s.groups.length
        ? 'Od zapięcia do zapięcia. Numery to pozycje koralików; przy motywach jest opis, kiedy przełożyć igłę.'
        : 'Od zapięcia do zapięcia. Numery to pozycje koralików.',
    });
    const range = (a, n) => (n === 1 ? `${a + 1}` : `${a + 1}–${a + n}`);
    let buf = [];
    const flush = () => {
      for (const r of runs(buf.map((i) => s.beads[i]))) lines.push({ num: range(buf[0] + r.start, r.n), text: runText(r), color: r.color });
      buf = [];
    };
    for (const slot of strandSlots(s, (c) => beadOf(p, c))) {
      if (slot.type === 'bead') { buf.push(slot.i); continue; }
      flush();
      lines.push(...motifLines(p, slot.g, runText, range));
    }
    flush();
  } else if (p.mode === 'stitch') {
    lines.push(...stitchInstructions(p.stitch, p.stitch.beads, runText));
  } else if (p.mode === 'ball') {
    lines.push(...ballInstructions(p.ball, runText, plural));
  } else if (p.mode === 'tube') {
    lines.push(...stitchInstructions(crochetOf(p.tube), p.tube.beads, runText));
  } else {
    const { w, d, h, voxels } = p.figure;
    lines.push({ head: 'Warstwy od dołu', note: 'Każda warstwa to płaski plaster figurki; rzędy liczone od przodu (góra schematu).' });
    for (let z = 0; z < h; z++) {
      const layer = voxels.slice(z * w * d, (z + 1) * w * d);
      const n = layer.filter((c) => c !== EMPTY).length;
      if (!n) continue;
      lines.push({ sub: `Warstwa ${z + 1} · ${n} koralików` });
      for (let y = 0; y < d; y++) {
        const row = layer.slice(y * w, (y + 1) * w);
        if (row.every((c) => c === EMPTY)) continue;
        // Przycinamy puste brzegi, a dziury w środku opisujemy jako „przerwa”.
        let a = 0, b = row.length - 1;
        while (row[a] === EMPTY) a++;
        while (row[b] === EMPTY) b--;
        const parts = runs(row.slice(a, b + 1)).map((r) => (r.color === EMPTY ? `przerwa ${r.n}` : runText(r)));
        lines.push({ num: `rz. ${y + 1}`, text: `od kol. ${a + 1}: ${parts.join(', ')}` });
      }
    }
  }
  return lines;
}

// Opis jednego motywu: co nawlec i kiedy przełożyć igłę.
function motifLines(p, g, runText, range) {
  const s = p.strand;
  const list = s.beads.slice(g.start, g.start + g.n);
  const text = (from, to) => runs(list.slice(from, to)).map(runText).join(', ');
  const num = `${MOTIFS[g.kind].name} ${range(g.start, g.n)}`;
  if (g.kind === 'daisy') {
    const petals = g.n - 1;
    const opposite = Math.floor(petals / 2) + 1;
    return [{
      num,
      text: `płatki: ${text(0, petals)} → przełóż igłę przez 1. płatek, środek: ${text(petals)} → przełóż przez ${opposite}. płatek`,
    }];
  }
  if (g.kind === 'dangle') {
    return [{ num, text: `${text(0, g.n - 1)}, zwrotny: ${text(g.n - 1)} → wróć igłą przez ${plural(g.n - 1, 'koralik', 'koraliki', 'koralików')} frędzla` }];
  }
  return [{ num, text: `${text(0)} → zamknij pętelkę: przełóż igłę przez koralik przed pętelką` }];
}

// Opis koralika do paska stanu, np. „Stokrotka · płatek 3 z 6”.
export function motifRoleText(p, i) {
  const g = p.strand.groups.find((q) => i >= q.start && i < q.start + q.n);
  if (!g) return '';
  const r = roleInGroup(g, i);
  if (g.kind === 'daisy') return r.part === 'center' ? 'Stokrotka · środek' : `Stokrotka · płatek ${r.k + 1} z ${g.n - 1}`;
  if (g.kind === 'dangle') return r.part === 'turn' ? 'Frędzel · koralik zwrotny' : `Frędzel · ${r.k + 1} z ${g.n}`;
  return `Pętelka · ${r.k + 1} z ${g.n}`;
}

export function instructionsText(p) {
  const u = usage(p);
  const dim = dimensions(p);
  const types = beadTypesUsed(p).map((id) => BEAD_TYPES[id].label).join(', ');
  const out = [`${p.name} — ${MODES[p.mode]}${types ? `, koraliki: ${types}` : ''}`, `${dim.label}: ${dim.value}`, ''];
  out.push(`Zużycie (razem ${u.total} szt., ok. ${u.grams.toFixed(1)} g):`);
  for (const r of u.rows) out.push(`  ${p.palette[r.color].name}, ${beadOf(p, r.color).label}: ${r.n} szt. (ok. ${r.grams.toFixed(1)} g)`);
  out.push('');
  for (const l of instructions(p)) {
    if (l.head) out.push(l.head.toUpperCase(), l.note, '');
    else if (l.sub) out.push('', l.sub);
    else out.push(`  ${l.num}: ${l.text}`);
  }
  return out.join('\n');
}
