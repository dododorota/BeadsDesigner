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
export const EXTRA_SIZE = [2, 16];

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
  const shape = { key, beads, corners: g.corners, faces: g.faces, steps, faceStep, count: n };
  shapeCache.set(key, shape);
  return shape;
}

export function fixBall(b) {
  const s = { shape: DEFAULT_BALL, sy: 1, sz: 1, mirror: true, beads: [], extras: [], ...b };
  if (!BALL_SHAPES[s.shape]) s.shape = DEFAULT_BALL;
  const clampS = (v) => Math.max(STRETCH[0], Math.min(STRETCH[1], Number(v) || 1));
  s.sy = clampS(s.sy);
  s.sz = clampS(s.sz);
  s.mirror = Boolean(s.mirror);
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

// ---------------------------------------------------------------- dodatki (uszka, łapki, płetwy)

export function fixExtras(extras, count, fixColor) {
  if (!Array.isArray(extras)) return [];
  const seen = new Set();
  return extras.filter((x) => x && Number.isInteger(x.at) && x.at >= 0 && x.at < count && Array.isArray(x.colors) && !seen.has(x.at) && seen.add(x.at))
    .map((x) => ({ at: x.at, colors: x.colors.slice(0, EXTRA_SIZE[1]).map((c) => fixColor(c)) }))
    .filter((x) => x.colors.length >= EXTRA_SIZE[0]);
}

export const extraAt = (ball, at) => ball.extras.find((x) => x.at === at) || null;

// Dodaje albo usuwa pętelkę przy koraliku (z lustrzanym odbiciem, jeśli włączone).
export function toggleExtra(ball, at, n, color) {
  const shape = ballShape(ball.shape);
  const targets = [at];
  const m = ball.mirror ? shape.beads[at].mirror : null;
  if (m !== null && m !== at) targets.push(m);
  if (extraAt(ball, at)) {
    ball.extras = ball.extras.filter((x) => !targets.includes(x.at));
    return 'removed';
  }
  n = Math.max(EXTRA_SIZE[0], Math.min(EXTRA_SIZE[1], Math.round(n)));
  for (const t of targets) if (!extraAt(ball, t)) ball.extras.push({ at: t, colors: new Array(n).fill(color) });
  ball.extras.sort((a, b) => a.at - b.at);
  return 'added';
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

// ---------------------------------------------------------------- instrukcja

export function ballInstructions(ball, runText, plural) {
  const shape = ballShape(ball.shape);
  const color = (id) => ball.beads[id];
  const runs = (ids) => {
    const out = [];
    for (const id of ids) {
      const c = color(id), last = out[out.length - 1];
      if (last && last.color === c) last.n++;
      else out.push({ color: c, n: 1 });
    }
    return out.map(runText).join(', ');
  };
  const lines = [{
    head: `Figurka na krzyż — ${BALL_SHAPES[ball.shape].label.split(' — ')[1]}`,
    note: 'Pracujesz dwiema końcówkami żyłki. W każdym oczku nawlekasz nowe koraliki na jedną końcówkę i przekładasz drugą przez ostatni z nich na krzyż. Oczko 1 to przód figurki (środek schematu), ostatnie zamyka tył. Przed zamknięciem ostatnich oczek możesz wypchać figurkę watą.',
  }];
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
  if (ball.extras.length) {
    lines.push({ sub: 'Dodatki (uszka, łapki, płetwy)' });
    for (const x of [...ball.extras].sort((a, b) => a.at - b.at)) {
      const rs = [];
      for (const c of x.colors) { const last = rs[rs.length - 1]; if (last && last.color === c) last.n++; else rs.push({ color: c, n: 1 }); }
      lines.push({ num: `Przy ${x.at + 1}`, text: `${rs.map(runText).join(', ')} → przełóż igłę z powrotem przez koralik ${x.at + 1}` });
    }
  }
  return lines;
}
