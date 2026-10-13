// Model projektu: trzy tryby projektowania i wszystko, co da się o nich policzyć
// bez rysowania (układ na schemacie, sąsiedzi, symetria, zużycie, instrukcje).

import { BEAD_TYPES, DEFAULT_BEAD, DEFAULT_PALETTE, LEGACY_SIZES, beadType, beadsToGrams } from './beads.js';
import {
  fixStitch, remapBeads, repeatStitchRows, stitchCount, stitchInstructions, stitchLayout, stitchMirror, stitchNeighbors,
} from './stitches.js';

export const MODES = {
  strand: 'Naszyjnik (sznurek)',
  tube: 'Wężyk (bead crochet)',
  stitch: 'Ścieg (peyote, brick, herringbone…)',
  figure: 'Figurka 3D',
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
  return { count, wrap: 30, symmetric: true, pendant: true, beads };
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
    figure: exampleFigure(),
  };
}

export function createBlankProject(mode = 'strand') {
  const p = createProject();
  p.name = { strand: 'Nowy naszyjnik', tube: 'Nowy wężyk', stitch: 'Nowy ścieg', figure: 'Nowa figurka' }[mode] || 'Nowy projekt';
  p.mode = mode;
  p.strand = { count: 300, wrap: 30, symmetric: true, pendant: false, beads: new Array(300).fill(0) };
  p.tube = { around: 6, rows: 40, beads: new Array(240).fill(0) };
  p.stitch = blankStitch();
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
  p.strand = s;
  const t = { ...base.tube, ...(raw.tube || {}) };
  t.around = clamp(t.around, LIMITS.tubeAround);
  t.rows = clamp(t.rows, LIMITS.tubeRows);
  t.beads = Array.from({ length: t.around * t.rows }, (_, i) => fixColor((t.beads || [])[i] ?? 0));
  p.tube = t;
  const st = fixStitch({ ...base.stitch, ...(raw.stitch || {}) });
  st.beads = Array.from({ length: stitchCount(st) }, (_, i) => fixColor((raw.stitch?.beads || [])[i] ?? 0));
  p.stitch = st;
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
  if (wrap !== undefined) s.wrap = clamp(wrap, LIMITS.strandWrap);
}

export function resizeTube(p, around, rows) {
  const t = p.tube;
  around = clamp(around, LIMITS.tubeAround);
  rows = clamp(rows, LIMITS.tubeRows);
  const beads = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < around; c++) {
    beads.push(r < t.rows && c < t.around ? t.beads[r * t.around + c] : t.beads[(r % t.rows) * t.around + (c % t.around)] ?? 0);
  }
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
    return { cells, width: wrap, height: rows, rowLabels, colLabels, marks: center, shape: 'side' };
  },
  neighbors: (p, id) => [id - 1, id + 1].filter((n) => n >= 0 && n < p.strand.count),
  mirror: (p, id) => (p.strand.symmetric ? p.strand.count - 1 - id : null),
  allBeads: (p) => p.strand.beads,
};

// Wężyk szydełkowy: koraliki układają się w spiralę. Na obwodzie mieści się
// around + 0.5 koralika, więc każdy rząd przesuwa się o pół koralika.
// Rozwinięcie wężyka na płasko jest dzięki temu wierne: pionowy pasek na
// schemacie to pionowy pasek na wężyku, a skośny to spirala.
const tubeMode = {
  get: (p, id) => p.tube.beads[id],
  set: (p, id, c) => { p.tube.beads[id] = c; },
  layout(p) {
    const { around: C, rows: R } = p.tube;
    const P = C + 0.5;
    const cells = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = (((c - 0.5 * r) % P) + P) % P;
      cells.push({ id: r * C + c, x, y: R - 1 - r });
    }
    const rowLabels = Array.from({ length: R }, (_, r) => ({ y: R - 1 - r, text: String(r + 1) }));
    return { cells, width: C + 0.5, height: R, rowLabels, colLabels: [], marks: [], shape: 'side' };
  },
  neighbors(p, id) {
    const C = p.tube.around, n = C * p.tube.rows;
    return [id - 1, id + 1, id - C, id - C - 1, id + C, id + C + 1].filter((k) => k >= 0 && k < n);
  },
  mirror: () => null,
  allBeads: (p) => p.tube.beads,
};

// Ścieg: układ koralików liczy silnik ściegów (stitches.js) dla podstawowego koralika projektu.
const stitchLayoutOf = (p) => stitchLayout(p.stitch, baseBead(p, p.stitch.beads));

const stitchMode = {
  get: (p, id) => p.stitch.beads[id],
  set: (p, id, c) => { p.stitch.beads[id] = c; },
  layout(p) {
    const lay = stitchLayoutOf(p);
    return { ...lay, marks: [], shape: 'side' };
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

export { stitchLayoutOf };

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

export const modeApi = { strand: strandMode, tube: tubeMode, stitch: stitchMode, figure: figureMode };

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
    const s = p.strand;
    len = Math.max(1, Math.min(s.count, len | 0));
    for (let i = len; i < s.count; i++) s.beads[i] = s.beads[i % len];
  } else if (p.mode === 'stitch') {
    repeatStitchRows(p.stitch, p.stitch.beads, len);
  } else if (p.mode === 'tube') {
    const t = p.tube;
    len = Math.max(1, Math.min(t.rows, len | 0));
    for (let r = len; r < t.rows; r++) for (let c = 0; c < t.around; c++) {
      t.beads[r * t.around + c] = t.beads[(r % len) * t.around + c];
    }
  }
}

// Kopiuje lewą połowę sznurka na prawą (od środka na zewnątrz).
export function mirrorStrand(p) {
  const s = p.strand;
  for (let i = 0; i < Math.floor(s.count / 2); i++) s.beads[s.count - 1 - i] = s.beads[i];
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
  p.figure.voxels = p.figure.voxels.map(remap);
}

// ---------------------------------------------------------------- liczenie

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
    const mm = p.strand.beads.reduce((a, c) => a + beadOf(p, c).h, 0);
    return { label: 'Długość sznurka', value: `${(mm / 10).toFixed(1)} cm` };
  }
  const b = baseBead(p);
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
    lines.push({ head: 'Kolejność nawlekania', note: 'Od zapięcia do zapięcia. Numery to pozycje koralików.' });
    for (const r of runs(p.strand.beads)) {
      const range = r.n === 1 ? `${r.start + 1}` : `${r.start + 1}–${r.start + r.n}`;
      lines.push({ num: range, text: runText(r), color: r.color });
    }
  } else if (p.mode === 'stitch') {
    lines.push(...stitchInstructions(p.stitch, p.stitch.beads, runText));
  } else if (p.mode === 'tube') {
    const { around: C, beads } = p.tube;
    lines.push({
      head: 'Kolejność nawlekania',
      note: `Nawlekaj od góry listy. Pierwszy nawleczony koralik trafi na koniec wężyka, więc lista idzie od ostatniego rzędu do pierwszego. Na obwodzie ${C} koralików.`,
    });
    const reversed = [...beads].reverse();
    let pos = 0;
    for (const r of runs(reversed)) {
      lines.push({ num: `${pos + 1}${r.n > 1 ? `–${pos + r.n}` : ''}`, text: runText(r), color: r.color });
      pos += r.n;
    }
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
