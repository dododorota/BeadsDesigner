// Figurki w technice japońskiej (na krzyż, cross weave): kulka z „oczek”.
//
// Bryła to wielościan z pięcio- i sześciokątnych oczek (wielościan Goldberga).
// Każdy koralik leży na krawędzi — tam, gdzie stykają się dwa oczka — a w każdym
// narożniku spotykają się trzy koraliki. Tak wyglądają kulki ze schematów
// „Kugeltier” / żabki / rybki fugu: oczko 1 to przód (buzia), kolejne oczka
// dokłada się pierścieniami, ostatnie oczko zamyka tył.
//
// Geometrię budujemy z dwudziestościanu: dzielimy go na trójkąty (sfera geodezyjna)
// i bierzemy bryłę dualną — wierzchołki geodezji stają się oczkami, trójkąty narożnikami.

export const BALL_SHAPES = {
  b30: { label: 'Mini — 12 oczek, 30 koralików', build: () => subdivide(1) },
  b90: { label: 'Piłka — 32 oczka, 90 koralików', build: () => kisDual(subdivide(1)) },
  b120: { label: 'Mała — 42 oczka, 120 koralików', build: () => subdivide(2) },
  b270: { label: 'Średnia — 92 oczka, 270 koralików', build: () => subdivide(3) },
  b360: { label: 'Duża — 122 oczka, 360 koralików', build: () => kisDual(subdivide(2)) },
  b480: { label: 'Bardzo duża — 162 oczka, 480 koralików', build: () => subdivide(4) },
};
export const DEFAULT_BALL = 'b270';
export const STRETCH = [0.6, 1.8];
export const MAX_PARTS = 8;
export const BODY = -1;

// Dodatki doczepione do jednego koralika. Pętelka: n koralików w kółko.
// Pasek z oczek: n oczek po 4 koraliki (bok, góra, bok + koralik poniżej) —
// uszko, płetwa albo łapka odstająca od figurki.
export const EXTRA_KINDS = {
  loop: { name: 'Pętelka', unit: 'Koralików', size: [2, 16], def: 4, per: 1 },
  strip: { name: 'Pasek z oczek', unit: 'Oczek', size: [1, 8], def: 2, per: 3 },
};

// ---------------------------------------------------------------- wektory

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / len(a));
const keyOf = (p) => p.map((x) => Math.round(x * 1e6)).join(',');

// ---------------------------------------------------------------- triangulacje sfery

const PHI = (1 + Math.sqrt(5)) / 2;
// Układ współrzędnych symetryczny względem płaszczyzny x = 0 (lustro lewo–prawo).
const ICO_V = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];
const ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];

// Sfera geodezyjna: każdy trójkąt dwudziestościanu dzielony na f² mniejszych.
function subdivide(f) {
  const verts = [], index = new Map(), tris = [];
  const vid = (p) => {
    const q = norm(p), k = keyOf(q);
    if (!index.has(k)) { index.set(k, verts.length); verts.push(q); }
    return index.get(k);
  };
  for (const [ia, ib, ic] of ICO_F) {
    const a = ICO_V[ia], b = ICO_V[ib], c = ICO_V[ic];
    const pt = (i, j) => vid(add(a, add(mul(sub(b, a), i / f), mul(sub(c, a), j / f))));
    for (let i = 0; i < f; i++) for (let j = 0; j < f - i; j++) {
      tris.push([pt(i, j), pt(i + 1, j), pt(i, j + 1)]);
      if (i + j < f - 1) tris.push([pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]);
    }
  }
  return { verts, tris };
}

// Krawędzie triangulacji razem z dwoma trójkątami, które je dzielą.
function edgeMap(tris) {
  const m = new Map();
  tris.forEach((t, ti) => {
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!m.has(key)) m.set(key, { a: Math.min(a, b), b: Math.max(a, b), tris: [] });
      m.get(key).tris.push(ti);
    }
  });
  return [...m.values()];
}

const centroid = (verts, t) => norm(add(verts[t[0]], add(verts[t[1]], verts[t[2]])));

// Dodaje środek każdego trójkąta i łączy go z sąsiadami — po bryle dualnej daje to
// sześciokąty na miejscu dawnych narożników (np. z dwunastościanu robi się „piłka”).
function kisDual(tri) {
  const verts = tri.verts.slice();
  const cIdx = tri.tris.map((t) => { verts.push(centroid(tri.verts, t)); return verts.length - 1; });
  const tris = [];
  for (const e of edgeMap(tri.tris)) {
    const [t1, t2] = e.tris;
    tris.push([e.a, cIdx[t1], cIdx[t2]], [e.b, cIdx[t1], cIdx[t2]]);
  }
  return { verts, tris };
}

// ---------------------------------------------------------------- bryła z oczek

// Obrót wokół osi x, który stawia oczko nad wierzchołkiem (0, 1, φ) na wprost (+z),
// nie psując symetrii lewo–prawo.
const ROT = Math.atan2(1, PHI);
const rotX = (p) => [p[0], p[1] * Math.cos(ROT) - p[2] * Math.sin(ROT), p[1] * Math.sin(ROT) + p[2] * Math.cos(ROT)];

// Wielościan dualny: oczka (ściany) = wierzchołki triangulacji, narożniki = trójkąty,
// koraliki (krawędzie) = krawędzie triangulacji.
function goldberg(tri) {
  const corners = tri.tris.map((t) => rotX(centroid(tri.verts, t)));
  const faceCenters = tri.verts.map(rotX);
  const edges = edgeMap(tri.tris).map((e) => ({ v: e.tris, f: [e.a, e.b] }));
  // Krawędzie każdego oczka po kolei dookoła (według kąta wokół środka oczka).
  const faceEdges = faceCenters.map(() => []);
  edges.forEach((e, i) => { faceEdges[e.f[0]].push(i); faceEdges[e.f[1]].push(i); });
  const faces = faceCenters.map((c, fi) => {
    const up = Math.abs(c[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const e1 = norm(cross(up, c)), e2 = cross(c, e1);
    const angle = (ei) => {
      const m = norm(add(corners[edges[ei].v[0]], corners[edges[ei].v[1]]));
      const d = sub(m, c);
      return Math.atan2(dot(d, e2), dot(d, e1));
    };
    return { center: c, edges: faceEdges[fi].sort((a, b) => angle(a) - angle(b)) };
  });
  return { corners, edges, faces };
}

// Kolejność pracy: oczko na wprost (buzia), potem pierścieniami na zewnątrz,
// w pierścieniu zgodnie z ruchem wskazówek zegara od góry. Koraliki numerujemy
// w kolejności nawlekania, więc numer koralika = moment, w którym się pojawia.
function workOrder(g) {
  const { faces, edges } = g;
  const start = faces.reduce((best, f, i) => (f.center[2] > faces[best].center[2] ? i : best), 0);
  const adj = faces.map((f, fi) => f.edges.map((ei) => (edges[ei].f[0] === fi ? edges[ei].f[1] : edges[ei].f[0])));
  const ring = new Array(faces.length).fill(-1);
  ring[start] = 0;
  const queue = [start];
  while (queue.length) {
    const f = queue.shift();
    for (const n of adj[f]) if (ring[n] < 0) { ring[n] = ring[f] + 1; queue.push(n); }
  }
  const clock = (c) => (Math.atan2(c[0], c[1]) + 2 * Math.PI) % (2 * Math.PI);
  const order = faces.map((_, i) => i).sort((a, b) => ring[a] - ring[b] || clock(faces[a].center) - clock(faces[b].center));

  const beadOf = new Array(edges.length).fill(-1);
  const steps = [];
  let next = 0;
  for (const fi of order) {
    const cyc = faces[fi].edges;
    const known = cyc.map((ei) => beadOf[ei] >= 0);
    // Nowe koraliki po kolei dookoła oczka, zaczynając tuż za ostatnim istniejącym.
    let from = 0;
    if (known.some(Boolean)) {
      for (let k = 0; k < cyc.length; k++) if (known[k] && !known[(k + 1) % cyc.length]) { from = (k + 1) % cyc.length; break; }
    } else {
      from = cyc.reduce((best, ei, k) => (midTop(g, ei) > midTop(g, cyc[best]) ? k : best), 0);
    }
    const added = [], existing = [];
    for (let k = 0; k < cyc.length; k++) {
      const ei = cyc[(from + k) % cyc.length];
      if (beadOf[ei] < 0) { beadOf[ei] = next++; added.push(beadOf[ei]); } else existing.push(beadOf[ei]);
    }
    steps.push({ face: fi, size: cyc.length, added, existing, ring: ring[fi] });
  }
  return { beadOf, steps };
}

const midTop = (g, ei) => g.corners[g.edges[ei].v[0]][1] + g.corners[g.edges[ei].v[1]][1];

// ---------------------------------------------------------------- model kulki

const shapeCache = new Map();

// Bryła w kolejności koralików: dla koralika i — jego dwa narożniki, dwa oczka,
// sąsiedzi (koraliki ze wspólnym narożnikiem) i lustrzany koralik.
export function ballShape(key) {
  if (shapeCache.has(key)) return shapeCache.get(key);
  const g = goldberg(BALL_SHAPES[key in BALL_SHAPES ? key : DEFAULT_BALL].build());
  const { beadOf, steps } = workOrder(g);
  const n = g.edges.length;
  const beads = new Array(n);
  g.edges.forEach((e, ei) => {
    const mid = norm(add(g.corners[e.v[0]], g.corners[e.v[1]]));
    beads[beadOf[ei]] = { id: beadOf[ei], corners: e.v, faces: e.f, mid };
  });
  const atCorner = g.corners.map(() => []);
  beads.forEach((b) => b.corners.forEach((c) => atCorner[c].push(b.id)));
  for (const b of beads) {
    b.neighbors = [...new Set(b.corners.flatMap((c) => atCorner[c]))].filter((x) => x !== b.id);
    // Lustrzany koralik: najbliższy odbiciu względem płaszczyzny x = 0.
    const m = [-b.mid[0], b.mid[1], b.mid[2]];
    let best = null, bd = 1e-3;
    for (const o of beads) { const d = len(sub(o.mid, m)); if (d < bd) { bd = d; best = o.id; } }
    b.mirror = best;
  }
  const faceStep = new Map(steps.map((s, i) => [s.face, i]));
  // Lustrzane oczko (numer kroku) — do doczepiania kulek parami.
  const stepMirror = steps.map((st) => {
    const c = g.faces[st.face].center, m = [-c[0], c[1], c[2]];
    let best = null, bd = 1e-3;
    steps.forEach((o, j) => { const d = len(sub(g.faces[o.face].center, m)); if (d < bd) { bd = d; best = j; } });
    return best;
  });
  const shape = { key, beads, corners: g.corners, faces: g.faces, steps, faceStep, stepMirror, count: n };
  shapeCache.set(key, shape);
  return shape;
}

const clampStretch = (v) => Math.max(STRETCH[0], Math.min(STRETCH[1], Number(v) || 1));

export function fixBall(b) {
  const s = { shape: DEFAULT_BALL, sy: 1, sz: 1, mirror: true, beads: [], extras: [], parts: [], ...b };
  if (!BALL_SHAPES[s.shape]) s.shape = DEFAULT_BALL;
  s.sy = clampStretch(s.sy);
  s.sz = clampStretch(s.sz);
  s.mirror = Boolean(s.mirror);
  if (!Array.isArray(s.parts)) s.parts = [];
  return s;
}

// Zmiana rozmiaru kulki: kolory przenosimy według położenia na bryle
// (najbliższy koralik starej kulki), dodatki zostają przy najbliższym koraliku.
export function remapBall(oldBall, newKey) {
  const from = ballShape(oldBall.shape), to = ballShape(newKey);
  const nearest = (p) => {
    let best = 0, bd = Infinity;
    for (const b of from.beads) { const d = len(sub(b.mid, p)); if (d < bd) { bd = d; best = b.id; } }
    return best;
  };
  const beads = to.beads.map((b) => oldBall.beads[nearest(b.mid)] ?? 0);
  const extras = oldBall.extras.map((x) => {
    const p = from.beads[x.at]?.mid;
    if (!p) return null;
    let best = 0, bd = Infinity;
    for (const b of to.beads) { const d = len(sub(b.mid, p)); if (d < bd) { bd = d; best = b.id; } }
    return { ...x, at: best };
  }).filter(Boolean);
  return { ...oldBall, shape: newKey, beads, extras };
}

// Oczko nowej bryły leżące tam, gdzie oczko `step` starej (po kierunku od środka).
// Oczko na osi symetrii przechodzi na oczko na osi, żeby lustro dalej działało.
function remapStep(oldKey, newKey, step) {
  const from = ballShape(oldKey), to = ballShape(newKey);
  const c = from.faces[from.steps[step].face].center;
  const onAxis = from.stepMirror[step] === step;
  let best = 0, bd = Infinity;
  to.steps.forEach((st, j) => {
    if (onAxis && to.stepMirror[j] !== j) return;
    const d = len(sub(to.faces[st.face].center, c));
    if (d < bd) { bd = d; best = j; }
  });
  return best;
}

// ---------------------------------------------------------------- części (głowa, łapki, ogon)

// Figurka to tułów (sama `ball`) i doczepione do niego kulki (`ball.parts`). Każda
// część ma własny rozmiar, kolory i dodatki, a doczepiona jest do oczka `at`
// (numer kroku) części `parent` (-1 = tułów; rodzic zawsze wcześniej na liście).
// Koraliki numerujemy przez całą figurkę: najpierw tułów, potem części po kolei.

export const partAt = (ball, pi) => (pi < 0 ? ball : ball.parts[pi]);
export const partName = (ball, pi) => (pi < 0 ? 'Tułów' : ball.parts[pi].name);

export function partOffset(ball, pi) {
  if (pi < 0) return 0;
  let off = ballShape(ball.shape).count;
  for (let k = 0; k < pi; k++) off += ballShape(ball.parts[k].shape).count;
  return off;
}

export const ballCount = (ball) => partOffset(ball, ball.parts.length);

// Która część i który jej koralik kryje się pod numerem w całej figurce.
export function locate(ball, gid) {
  let off = 0;
  for (let pi = -1; pi < ball.parts.length; pi++) {
    const part = partAt(ball, pi), n = ballShape(part.shape).count;
    if (gid >= off && gid < off + n) return { pi, part, local: gid - off, offset: off };
    off += n;
  }
  return null;
}

export const ballColors = (ball) => [ball, ...ball.parts].flatMap((q) => [...q.beads, ...q.extras.flatMap((x) => x.colors)]);

export function ballNeighbors(ball, gid) {
  const l = locate(ball, gid);
  return l ? ballShape(l.part.shape).beads[l.local].neighbors.map((n) => n + l.offset) : [];
}

// Lustrzana część: tułów odbija się sam w sobie, kulka doczepiona na środku też,
// a kulka z boku ma bliźniaczkę doczepioną do lustrzanego oczka.
export function partMirror(ball, pi) {
  if (pi < 0) return BODY;
  const q = ball.parts[pi];
  const mp = partMirror(ball, q.parent);
  if (mp === null) return null;
  const ms = ballShape(partAt(ball, q.parent).shape).stepMirror[q.at];
  if (mp === q.parent && ms === q.at) return pi;
  const j = ball.parts.findIndex((o) => o.parent === mp && o.at === ms && o.shape === q.shape);
  return j >= 0 ? j : null;
}

export function ballMirror(ball, gid) {
  if (!ball.mirror) return null;
  const l = locate(ball, gid);
  if (!l) return null;
  const mp = partMirror(ball, l.pi);
  if (mp === null) return null;
  return partOffset(ball, mp) + ballShape(l.part.shape).beads[l.local].mirror;
}

const twinsOf = (ball, pi) => {
  const m = ball.mirror ? partMirror(ball, pi) : null;
  return m === null || m === pi ? [pi] : [pi, m];
};

// Doczepia kulkę do oczka `step` części `parent` (z lustrzaną parą, jeśli trzeba).
// Zwraca numer nowej części albo komunikat, czemu się nie da.
export function addPart(ball, parent, step, key, color) {
  const ps = ballShape(partAt(ball, parent).shape);
  if (!BALL_SHAPES[key] || step < 0 || step >= ps.steps.length) return 'Nie ma takiego oczka';
  const taken = (pa, st) => ball.parts.some((q) => q.parent === pa && q.at === st);
  if (taken(parent, step)) return 'Do tego oczka jest już doczepiona kulka';
  const mp = ball.mirror ? partMirror(ball, parent) : null;
  const twin = mp === null ? null : { parent: mp, at: ps.stepMirror[step] };
  const pair = twin && !(twin.parent === parent && twin.at === step) && !taken(twin.parent, twin.at);
  if (ball.parts.length + (pair ? 2 : 1) > MAX_PARTS) return `Figurka może mieć najwyżej ${MAX_PARTS + 1} kulek`;
  const count = ballShape(key).count;
  const make = (pa, at, name) => ({ name, parent: pa, at, shape: key, sy: 1, sz: 1, beads: new Array(count).fill(color), extras: [] });
  // Nazwa według miejsca: na środku u góry głowa, z tyłu ogonek, z boku para lewa/prawa.
  const geo = ballParts3D(ball, UNIT_BEAD);
  const dir = norm(faceCenter(geo[parent + 1].list, ps.steps[step]));
  const x = geo[parent + 1].origin[0] + faceCenter(geo[parent + 1].list, ps.steps[step])[0];
  const used = new Set(ball.parts.map((q) => q.name));
  const unique = (base) => { let s = base, k = 2; while (used.has(s)) s = `${base} ${k++}`; used.add(s); return s; };
  const base = `Kulka ${ball.parts.length + 2}`;
  if (pair) {
    // Strony jak na schemacie i w podglądzie: dodatnie x po prawej.
    const kind = dir[1] > 0.4 ? 'Uszko' : 'Łapka';
    const side = (sx) => (sx > 0 ? 'prawe' : 'lewe');
    const sideF = (sx) => (sx > 0 ? 'prawa' : 'lewa');
    const label = (sx) => (kind === 'Uszko' ? `Uszko ${side(sx)}` : `Łapka ${sideF(sx)}`);
    ball.parts.push(make(parent, step, unique(label(x))), make(twin.parent, twin.at, unique(label(-x))));
    return ball.parts.length - 2;
  }
  const centered = Math.abs(x) < 1e-6;
  const name = centered && dir[1] > 0.5 ? 'Głowa' : centered && dir[2] < -0.5 ? 'Ogonek' : centered && dir[1] < -0.5 ? 'Nóżka' : base;
  ball.parts.push(make(parent, step, unique(name)));
  return ball.parts.length - 1;
}

// Usuwa część razem z jej lustrzaną parą i wszystkim, co było do nich doczepione.
export function removePart(ball, pi) {
  if (pi < 0) return;
  const gone = new Set(twinsOf(ball, pi));
  ball.parts.forEach((q, k) => { if (gone.has(q.parent)) gone.add(k); });
  const index = [];
  let n = 0;
  ball.parts.forEach((_, k) => { index[k] = gone.has(k) ? null : n++; });
  ball.parts = ball.parts.filter((_, k) => !gone.has(k)).map((q) => ({ ...q, parent: q.parent < 0 ? q.parent : index[q.parent] }));
}

// Zmiana rozmiaru części (i jej pary): kolory i dodatki według położenia,
// doczepione do niej kulki przechodzą na oczko w tym samym miejscu.
export function setPartShape(ball, pi, key) {
  if (!BALL_SHAPES[key]) return;
  for (const t of twinsOf(ball, pi)) {
    const part = partAt(ball, t);
    if (part.shape === key) continue;
    const old = part.shape;
    const next = remapBall(part, key);
    if (t < 0) Object.assign(ball, { shape: next.shape, beads: next.beads, extras: next.extras });
    else ball.parts[t] = next;
    for (const q of ball.parts) if (q.parent === t) q.at = remapStep(old, key, q.at);
  }
}

export function setPartStretch(ball, pi, sy, sz) {
  for (const t of twinsOf(ball, pi)) {
    const part = partAt(ball, t);
    if (sy !== undefined) part.sy = clampStretch(sy);
    if (sz !== undefined) part.sz = clampStretch(sz);
  }
}

// Wczytanie części z pliku: odrzuca uszkodzone i te, których rodzic zniknął.
export function fixParts(raw, ball, fixColor) {
  if (!Array.isArray(raw)) return [];
  const out = [], index = [];
  raw.forEach((r, k) => {
    if (!r || typeof r !== 'object' || out.length >= MAX_PARTS) return;
    const parent = r.parent === BODY ? BODY : index[r.parent];
    if (parent === undefined || parent === null) return;
    const ps = ballShape(parent < 0 ? ball.shape : out[parent].shape);
    if (!Number.isInteger(r.at) || r.at < 0 || r.at >= ps.steps.length) return;
    const shape = BALL_SHAPES[r.shape] ? r.shape : 'b30';
    const n = ballShape(shape).count;
    index[k] = out.length;
    out.push({
      name: String(r.name || `Kulka ${out.length + 2}`).slice(0, 40),
      parent, at: r.at, shape, sy: clampStretch(r.sy), sz: clampStretch(r.sz),
      beads: Array.from({ length: n }, (_, i) => fixColor((r.beads || [])[i] ?? 0)),
      extras: fixExtras(r.extras, n, fixColor),
    });
  });
  return out;
}

// ---------------------------------------------------------------- dodatki (uszka, łapki, płetwy)

export function fixExtras(extras, count, fixColor) {
  if (!Array.isArray(extras)) return [];
  const seen = new Set();
  return extras.filter((x) => x && Number.isInteger(x.at) && x.at >= 0 && x.at < count && Array.isArray(x.colors) && !seen.has(x.at) && seen.add(x.at))
    .map((x) => {
      const kind = x.kind === 'strip' ? 'strip' : 'loop';
      const K = EXTRA_KINDS[kind];
      const n = Math.min(K.size[1], Math.floor(x.colors.length / K.per));
      return { at: x.at, kind, colors: x.colors.slice(0, n * K.per).map((c) => fixColor(c)), n };
    })
    .filter((x) => x.n >= EXTRA_KINDS[x.kind].size[0])
    .map(({ n, ...x }) => x);
}

export function extraAt(ball, gid) {
  const l = locate(ball, gid);
  return l ? l.part.extras.find((x) => x.at === l.local) || null : null;
}

// Liczba „sztuk” dodatku: koralików w pętelce albo oczek w pasku.
export const extraSize = (x) => x.colors.length / EXTRA_KINDS[x.kind].per;

// Dodaje albo usuwa dodatek przy koraliku (z lustrzanym odbiciem, jeśli włączone).
export function toggleExtra(ball, gid, n, color, kind = 'loop') {
  const targets = [...new Set([gid, ballMirror(ball, gid)])].filter((t) => t !== null);
  if (extraAt(ball, gid)) {
    for (const t of targets) {
      const l = locate(ball, t);
      l.part.extras = l.part.extras.filter((x) => x.at !== l.local);
    }
    return 'removed';
  }
  const K = EXTRA_KINDS[kind] || EXTRA_KINDS.loop;
  n = Math.max(K.size[0], Math.min(K.size[1], Math.round(n)));
  for (const t of targets) {
    if (extraAt(ball, t)) continue;
    const l = locate(ball, t);
    l.part.extras.push({ at: l.local, kind: EXTRA_KINDS[kind] ? kind : 'loop', colors: new Array(n * K.per).fill(color) });
    l.part.extras.sort((a, b) => a.at - b.at);
  }
  return 'added';
}

// Kierunek koralika ujednolicony tak, żeby lustrzane dodatki były lustrzane:
// dodatnie x (a gdy koralik leży w płaszczyźnie lustra — dodatnie y, potem z).
function canonAxis(a) {
  const s = Math.abs(a[0]) > 1e-6 ? a[0] : Math.abs(a[1]) > 1e-6 ? a[1] : a[2];
  return s < 0 ? mul(a, -1) : a;
}

// Który koralik lustrzanego dodatku odpowiada koralikowi `k` dodatku przy `gid`.
export function extraMirrorIndex(ball, gid, k) {
  const l = locate(ball, gid);
  const x = extraAt(ball, gid);
  if (!l || !x) return k;
  const shape = ballShape(l.part.shape), b = shape.beads[l.local];
  const a = sub(shape.corners[b.corners[1]], shape.corners[b.corners[0]]);
  if (Math.abs(a[0]) <= 1e-6) return k;
  return x.kind === 'strip' ? k - (k % 3) + (2 - (k % 3)) : x.colors.length - 1 - k;
}

// ---------------------------------------------------------------- schemat płaski

// Rzut azymutalny równoodległy ze środka oczka 1: oczka układają się w pierścienie
// w równych odstępach, a ostatnie oczko (tył) jest obwodem — jak na schematach.
function project(p) {
  const t = Math.acos(Math.max(-1, Math.min(1, p[2])));
  const r = Math.hypot(p[0], p[1]);
  if (r < 1e-9) return [0, 0];
  return [(t * p[0]) / r, (-t * p[1]) / r];
}

const layoutCache = new Map();
export function ballLayout(key) {
  if (layoutCache.has(key)) return layoutCache.get(key);
  const shape = ballShape(key);
  const pos = shape.beads.map((b) => project(b.mid));
  const cpos = shape.corners.map(project);
  // Skala: sąsiednie koraliki co najmniej ~1,15 koralika od siebie.
  let minD = Infinity;
  for (const b of shape.beads) for (const n of b.neighbors) minD = Math.min(minD, Math.hypot(pos[b.id][0] - pos[n][0], pos[b.id][1] - pos[n][1]));
  const s = 1.15 / minD;
  const all = [...pos, ...cpos];
  const minX = Math.min(...all.map((p) => p[0])), minY = Math.min(...all.map((p) => p[1]));
  const maxX = Math.max(...all.map((p) => p[0])), maxY = Math.max(...all.map((p) => p[1]));
  const tx = (p) => [(p[0] - minX) * s, (p[1] - minY) * s + 0.6];
  const cells = shape.beads.map((b) => {
    const [x, y] = tx(pos[b.id]);
    const [x1, y1] = tx(cpos[b.corners[0]]), [x2, y2] = tx(cpos[b.corners[1]]);
    // Koralik leży wzdłuż krawędzi; kąt w układzie „y w górę”, tak jak w ściegach.
    return { id: b.id, x: x - 0.5, y: y - 0.5, a: -Math.atan2(y2 - y1, x2 - x1) };
  });
  const lines = shape.beads.map((b) => [...tx(cpos[b.corners[0]]), ...tx(cpos[b.corners[1]])]);
  // Numery oczek w środkach oczek; ostatnie (tył) — pod spodem schematu.
  const width = (maxX - minX) * s + 0.5, height = (maxY - minY) * s + 1.6;
  const labels = shape.steps.map((st, i) => {
    if (i === shape.steps.length - 1) return { x: width / 2, y: height - 0.2, text: `${i + 1} — tył (obwód)` };
    const [x, y] = tx(project(shape.faces[st.face].center));
    return { x, y, text: String(i + 1) };
  });
  const lay = { cells, lines, labels, width, height };
  layoutCache.set(key, lay);
  return lay;
}

// ---------------------------------------------------------------- 3D

// Położenia koralików w mm: średnia krawędź = długość koralika z odrobiną nici.
export function ballBeads3D(ball, bead) {
  const shape = ballShape(ball.shape);
  const L = ((bead.h + bead.d) / 2) * 1.1;
  let mean = 0;
  for (const b of shape.beads) mean += len(sub(shape.corners[b.corners[0]], shape.corners[b.corners[1]]));
  mean /= shape.beads.length;
  const R = L / mean;
  const scale = (p) => [p[0] * R, p[1] * R * ball.sy, p[2] * R * ball.sz];
  return shape.beads.map((b) => {
    const a = scale(shape.corners[b.corners[0]]), c = scale(shape.corners[b.corners[1]]);
    return { id: b.id, pos: mul(add(a, c), 0.5), axis: sub(c, a), normal: norm(scale(b.mid)) };
  });
}

const UNIT_BEAD = { d: 2, h: 1.5 };
const faceCenter = (list, st) => mul([...st.added, ...st.existing].reduce((a, id) => add(a, list[id].pos), [0, 0, 0]), 1 / st.size);

// Wszystkie kulki figurki w jednym układzie (mm): tułów w (0, 0, 0), a każda doczepiona
// kulka dotyka swoim oczkiem `join` oczka `at` rodzica. Kulki nie obracamy — przód
// zostaje z przodu — więc `join` to jej oczko zwrócone w stronę rodzica (najchętniej
// o tej samej liczbie koralików, żeby dało się je równo zszyć).
export function ballParts3D(ball, bead) {
  const gap = bead.d * 0.9;
  const out = [];
  for (let pi = -1; pi < ball.parts.length; pi++) {
    const part = partAt(ball, pi), shape = ballShape(part.shape);
    const list = ballBeads3D(part, bead);
    const offset = partOffset(ball, pi);
    if (pi < 0) { out.push({ pi, part, shape, list, origin: [0, 0, 0], offset, join: null }); continue; }
    const par = out[part.parent + 1];
    const fc = faceCenter(par.list, par.shape.steps[part.at]);
    const n = norm(fc);
    const centers = shape.steps.map((st) => faceCenter(list, st));
    const score = centers.map((c) => -dot(norm(c), n));
    let cand = shape.steps.map((_, j) => j);
    // Kulka na środku figurki łączy się oczkiem leżącym na płaszczyźnie lustra.
    if (Math.abs(par.origin[0] + fc[0]) < 1e-6) cand = cand.filter((j) => shape.stepMirror[j] === j);
    cand.sort((a, b) => score[b] - score[a]);
    const size = par.shape.steps[part.at].size;
    const join = cand.find((j) => shape.steps[j].size === size && score[j] > score[cand[0]] - 0.06) ?? cand[0];
    const origin = sub(add(add(par.origin, fc), mul(n, gap)), centers[join]);
    out.push({ pi, part, shape, list, origin, offset, join });
  }
  return out;
}

// Oczko, którym kulka `pi` łączy się z rodzicem (numer kroku).
export const partJoin = (ball, pi) => ballParts3D(ball, UNIT_BEAD)[pi + 1].join;

// Koraliki dodatku przy koraliku `q` (z ballBeads3D) — położenia względem środka kulki.
// `typeOf(color)` daje typ koralika (do długości pętelki).
export function extraBeads3D(x, q, base, typeOf) {
  const nrm = q.normal, tan = norm(canonAxis(q.axis));
  const out = [];
  if (x.kind === 'strip') {
    // Płaski pasek kwadratowych oczek, prostopadły do figurki: każde oczko to bok,
    // góra, bok, a jego dół to koralik figurki albo góra poprzedniego oczka.
    const w = len(q.axis);
    for (let c = 0; c < x.colors.length / 3; c++) {
      const side = (s) => add(add(q.pos, mul(tan, (s * w) / 2)), mul(nrm, w * (c + 0.5)));
      out.push({ pos: side(-1), axis: nrm, k: 3 * c });
      out.push({ pos: add(q.pos, mul(nrm, w * (c + 1))), axis: tan, k: 3 * c + 1 });
      out.push({ pos: side(1), axis: nrm, k: 3 * c + 2 });
    }
    return out;
  }
  // Pętelka odstająca od figurki, zaczepiona o koralik.
  const lens = x.colors.map((c) => typeOf(c).h * 1.05);
  const circ = lens.reduce((a, l) => a + l, 0);
  const R = Math.max(circ / (2 * Math.PI), base.d * 0.8);
  const c = add(q.pos, mul(nrm, R + base.d * 0.4));
  let acc = 0;
  x.colors.forEach((_, k) => {
    const alpha = (2 * Math.PI * (acc + lens[k] / 2)) / circ;
    acc += lens[k];
    const dir = add(mul(nrm, -Math.cos(alpha)), mul(tan, Math.sin(alpha)));
    const axis = add(mul(nrm, Math.sin(alpha)), mul(tan, Math.cos(alpha)));
    out.push({ pos: add(c, mul(dir, R)), axis, k });
  });
  return out;
}

// ---------------------------------------------------------------- instrukcja

export function ballInstructions(ball, runText, plural) {
  const runsOf = (colors) => {
    const out = [];
    for (const c of colors) {
      const last = out[out.length - 1];
      if (last && last.color === c) last.n++;
      else out.push({ color: c, n: 1 });
    }
    return out.map(runText).join(', ');
  };
  const sizeLabel = (key) => BALL_SHAPES[key].label.split(' — ')[1];
  const multi = ball.parts.length > 0;
  const lines = [{
    head: `Figurka na krzyż — ${multi ? `${ball.parts.length + 1} kulek` : sizeLabel(ball.shape)}`,
    note: 'Pracujesz dwiema końcówkami żyłki. W każdym oczku nawlekasz nowe koraliki na jedną końcówkę i przekładasz drugą przez ostatni z nich na krzyż. Oczko 1 to przód figurki (środek schematu), ostatnie zamyka tył. Przed zamknięciem ostatnich oczek możesz wypchać figurkę watą.'
      + (multi ? ' Każdą kulkę robisz osobno, a na końcu zszywasz je oczkami podanymi przy kulce.' : ''),
  }];
  const joins = multi ? ballParts3D(ball, UNIT_BEAD) : null;
  for (let pi = -1; pi < ball.parts.length; pi++) {
    const part = partAt(ball, pi), shape = ballShape(part.shape);
    const runs = (ids) => runsOf(ids.map((id) => part.beads[id]));
    if (multi) lines.push({ sub: `${partName(ball, pi)} — ${sizeLabel(part.shape)}` });
    shape.steps.forEach((st, i) => {
      const num = `Oczko ${i + 1}`;
      if (i === 0) {
        lines.push({ num, text: `nawlecz ${plural(st.added.length, 'koralik', 'koraliki', 'koralików')}: ${runs(st.added)} — zamknij w kółko na krzyż` });
      } else if (!st.added.length) {
        lines.push({ num, text: `nic nie dodajesz — ${plural(st.size, 'koralik już jest', 'koraliki już są', 'koralików już jest')}; przełóż nitkę, żeby zamknąć oczko` });
      } else {
        lines.push({ num, text: `${runs(st.added)} (oczko ma ${st.size}, ${plural(st.existing.length, 'koralik już jest', 'koraliki już są', 'koralików już jest')})` });
      }
    });
    if (part.extras.length) {
      lines.push({ sub: `${multi ? `${partName(ball, pi)}: d` : 'D'}odatki (uszka, łapki, płetwy)` });
      for (const x of [...part.extras].sort((a, b) => a.at - b.at)) {
        const num = `Przy ${x.at + 1}`;
        if (x.kind === 'strip') {
          const cells = [];
          for (let c = 0; c < x.colors.length / 3; c++) cells.push(`oczko ${c + 1}: ${runsOf(x.colors.slice(3 * c, 3 * c + 3))}`);
          lines.push({
            num,
            text: `pasek z ${plural(cells.length, 'oczka', 'oczek', 'oczek')} — ${cells.join('; ')}. W każdym oczku nawlecz bok, górę i bok, i zamknij na krzyż przez koralik ${x.at + 1} (w następnych oczkach — przez górę poprzedniego)`,
          });
        } else {
          lines.push({ num, text: `${runsOf(x.colors)} → przełóż igłę z powrotem przez koralik ${x.at + 1}` });
        }
      }
    }
    if (pi >= 0) {
      const g = joins[pi + 1];
      const parentShape = ballShape(partAt(ball, part.parent).shape);
      const a = shape.steps[g.join].size, b = parentShape.steps[part.at].size;
      lines.push({
        num: 'Zszyj',
        text: `oczko ${g.join + 1} tej kulki z oczkiem ${part.at + 1} (${partName(ball, part.parent)}): przełóż nitkę na przemian przez ich koraliki i mocno dociągnij${a !== b ? ` — oczka mają ${a} i ${b} koralików, więc przy jednym koraliku przełóż nitkę dwa razy` : ''}`,
      });
    }
  }
  return lines;
}
