import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALL_SHAPES, ballShape, ballLayout, ballBeads3D, ballInstructions, toggleExtra, remapBall, fixBall, fixExtras } from '../js/ball.js';
import { createProject, createBlankProject, normalizeProject, setBallShape, modeApi, floodFill, usage, dimensions, instructionsText, removePaletteColor } from '../js/model.js';

const EXPECT = { b30: [12, 30], b90: [32, 90], b120: [42, 120], b270: [92, 270], b360: [122, 360], b480: [162, 480] };

test('bryły: liczba oczek i koralików, 12 pięciokątów, reszta sześciokąty', () => {
  for (const [key, [faces, beads]] of Object.entries(EXPECT)) {
    const s = ballShape(key);
    assert.equal(s.faces.length, faces, key);
    assert.equal(s.count, beads, key);
    assert.equal(s.steps.filter((st) => st.size === 5).length, 12, `${key}: 12 pięciokątów`);
    assert.ok(s.steps.every((st) => st.size === 5 || st.size === 6), `${key}: tylko 5 i 6`);
  }
  assert.equal(Object.keys(BALL_SHAPES).length, 6);
});

test('koraliki numerowane w kolejności pracy; pierwsze oczko z przodu, ostatnie nic nie dodaje', () => {
  const s = ballShape('b270');
  const added = s.steps.flatMap((st) => st.added);
  assert.deepEqual(added, Array.from({ length: s.count }, (_, i) => i));
  assert.equal(s.steps[0].existing.length, 0);
  assert.ok(s.faces[s.steps[0].face].center[2] > 0.95, 'oczko 1 na wprost');
  assert.equal(s.steps.at(-1).added.length, 0);
  // Każde następne oczko (poza pierwszym) dotyka już zrobionych.
  assert.ok(s.steps.slice(1).every((st) => st.existing.length >= 1));
});

test('każdy koralik: 4 sąsiadów (narożniki), lustrzany bliźniak, lustro jest symetryczne', () => {
  for (const key of Object.keys(EXPECT)) {
    const s = ballShape(key);
    for (const b of s.beads) {
      assert.equal(b.neighbors.length, 4);
      assert.notEqual(b.mirror, null);
      assert.equal(s.beads[b.mirror].mirror, b.id);
    }
  }
});

test('schemat płaski: koraliki nie nachodzą na siebie, numery wszystkich oczek', () => {
  const lay = ballLayout('b120');
  const s = ballShape('b120');
  assert.equal(lay.cells.length, 120);
  assert.equal(lay.labels.length, 42);
  for (const b of s.beads) for (const n of b.neighbors) {
    const a = lay.cells[b.id], c = lay.cells[n];
    assert.ok(Math.hypot(a.x - c.x, a.y - c.y) >= 1.1, 'sąsiedzi co najmniej koralik od siebie');
  }
  assert.ok(lay.cells.every((c) => c.x >= -0.5 && c.y >= -0.5 && c.x < lay.width && c.y < lay.height));
});

test('3D: rozmiar zależy od koralika, wydłużenie zmienia wysokość', () => {
  const ball = fixBall({ shape: 'b270' });
  const height = (b, bead) => { const ys = ballBeads3D(b, bead).map((q) => q.pos[1]); return Math.max(...ys) - Math.min(...ys); };
  const small = height(ball, { d: 2, h: 1.4 }), big = height(ball, { d: 3, h: 2.2 });
  assert.ok(big > small * 1.3);
  assert.ok(height({ ...ball, sy: 1.5 }, { d: 2, h: 1.4 }) > small * 1.4);
});

test('dodatki: doczepienie z lustrem, usunięcie, zużycie je liczy', () => {
  const p = createBlankProject('ball');
  const at = 10;
  const m = ballShape(p.ball.shape).beads[at].mirror;
  toggleExtra(p.ball, at, 5, 3);
  assert.equal(p.ball.extras.length, m === at ? 1 : 2);
  assert.equal(usage(p).total, 120 + 5 * p.ball.extras.length);
  toggleExtra(p.ball, at, 5, 3);
  assert.equal(p.ball.extras.length, 0);
  assert.equal(fixExtras([{ at: 999, colors: [1, 1] }, { at: 1, colors: [1] }, { at: 2, colors: [1, 2, 3] }], 120, (c) => c).length, 1);
});

test('zmiana rozmiaru kulki przenosi kolory według położenia', () => {
  const p = createProject();
  const before = usage({ ...p, mode: 'ball' }).rows.map((r) => r.color).sort();
  setBallShape(p, 'b480');
  assert.equal(p.ball.beads.length, 480);
  p.mode = 'ball';
  const after = usage(p).rows.map((r) => r.color).sort();
  assert.deepEqual(after, before, 'te same kolory po powiększeniu');
  assert.equal(p.ball.extras.length, 2);
  const r = remapBall(p.ball, 'b30');
  assert.equal(r.beads.length, 30);
});

test('tryb figurki w projekcie: zapis, wypełnianie po bryle, wymiary, instrukcja, usuwanie koloru', () => {
  const p = createProject();
  p.mode = 'ball';
  const back = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(back.ball, p.ball);
  const q = createBlankProject('ball');
  q.ball.beads[5] = 1;
  floodFill(q, {}, 0, 2);
  assert.equal(q.ball.beads.filter((c) => c === 2).length, 119);
  assert.match(dimensions(p).value, /mm/);
  const text = instructionsText(p);
  assert.ok(text.includes('Oczko 1: nawlecz 5 koralików'));
  assert.ok(text.includes('DODATKI'.toLowerCase()) || text.includes('Dodatki'));
  removePaletteColor(p, 0);
  assert.ok(p.ball.beads.every((c) => c >= 0));
  assert.equal(modeApi.ball.mirror(p, 0), ballShape(p.ball.shape).beads[0].mirror);
  const lines = ballInstructions(p.ball, (r) => `${r.n}×${r.color}`, (n, a) => `${n} ${a}`);
  assert.equal(lines.filter((l) => l.num?.startsWith('Oczko')).length, 92);
});

test('stare projekty: zawieszka true → figurka warstwami', () => {
  const raw = createProject();
  raw.strand.pendant = true;
  assert.equal(normalizeProject(raw).strand.pendant, 'layers');
  raw.strand.pendant = 'ball';
  assert.equal(normalizeProject(raw).strand.pendant, 'ball');
  delete raw.ball;
  assert.equal(normalizeProject(raw).ball.beads.length, 120);
});

// ---------------------------------------------------------------- części i paski z oczek

import { addPart, removePart, ballParts3D, ballCount, ballMirror, locate, partMirror, partJoin, extraAt, extraMirrorIndex, extraBeads3D, fixParts } from '../js/ball.js';

const ballWith = () => createBlankProject('ball');
// Oczko leżące najbliżej kierunku (x, y, z); dla x = 0 — oczko na osi symetrii.
const stepToward = (key, dir) => {
  const s = ballShape(key);
  const l = Math.hypot(...dir);
  let best = 0, bd = Infinity;
  s.steps.forEach((st, j) => {
    if (dir[0] === 0 && s.stepMirror[j] !== j) return;
    const c = s.faces[st.face].center;
    const d = Math.hypot(c[0] - dir[0] / l, c[1] - dir[1] / l, c[2] - dir[2] / l);
    if (d < bd) { bd = d; best = j; }
  });
  return best;
};

test('głowa na środku: jedna kulka, dotyka tułowia, numeracja przez całą figurkę', () => {
  const p = ballWith();
  const top = stepToward('b120', [0, 1, 0]);
  const pi = addPart(p.ball, -1, top, 'b30', 2);
  assert.equal(pi, 0);
  assert.equal(p.ball.parts.length, 1, 'oczko na środku — bez pary');
  assert.equal(p.ball.parts[0].name, 'Głowa');
  assert.equal(ballCount(p.ball), 150);
  assert.equal(usage(p).total, 150);
  assert.deepEqual(locate(p.ball, 125), { pi: 0, part: p.ball.parts[0], local: 5, offset: 120 });
  assert.equal(partMirror(p.ball, 0), 0);
  // Lustro w głowie zostaje w głowie.
  const m = ballMirror(p.ball, 125);
  assert.ok(m >= 120 && m < 150);
  // Głowa leży nad tułowiem, na osi symetrii.
  const g = ballParts3D(p.ball, { d: 2, h: 1.5 });
  const head = g[1].origin;
  assert.ok(Math.abs(head[0]) < 1e-6 && head[1] > 0);
  assert.equal(ballShape('b30').stepMirror[partJoin(p.ball, 0)], partJoin(p.ball, 0), 'łączy się oczkiem na osi');
  assert.equal(addPart(p.ball, -1, top, 'b30', 2), 'Do tego oczka jest już doczepiona kulka');
});

test('kulka z boku: lustrzana para, malowanie i dodatki odbijają się na drugą', () => {
  const p = ballWith();
  const side = stepToward('b120', [1, -0.4, 0.3]);
  addPart(p.ball, -1, side, 'b30', 3);
  assert.equal(p.ball.parts.length, 2);
  assert.match(p.ball.parts[0].name, /^Łapka (prawa|lewa)$/);
  assert.equal(partMirror(p.ball, 0), 1);
  const g = ballParts3D(p.ball, { d: 2, h: 1.5 });
  assert.ok(Math.abs(g[1].origin[0] + g[2].origin[0]) < 1e-6, 'para ustawiona lustrzanie');
  assert.ok(Math.abs(g[1].origin[1] - g[2].origin[1]) < 1e-6);
  const id = 120 + 7;
  const m = ballMirror(p.ball, id);
  assert.ok(m >= 150 && m < 180, 'lustrzany koralik w drugiej kulce');
  // Dodatek na kulce bocznej trafia też na jej parę.
  toggleExtra(p.ball, id, 2, 1, 'strip');
  assert.equal(p.ball.parts[0].extras.length, 1);
  assert.equal(p.ball.parts[1].extras.length, 1);
  assert.equal(extraAt(p.ball, m).colors.length, 6);
  assert.equal(usage(p).total, 120 + 60 + 12);
  // Usunięcie jednej kulki usuwa parę i to, co do niej doczepione.
  addPart(p.ball, 0, 3, 'b30', 1);
  removePart(p.ball, 1);
  assert.equal(p.ball.parts.length, 0);
});

test('pasek z oczek: 3 koraliki na oczko, odstaje od figurki, lustro zamienia boki', () => {
  const p = ballWith();
  const at = 10;
  const m = ballShape('b120').beads[at].mirror;
  toggleExtra(p.ball, at, 3, 4, 'strip');
  const x = extraAt(p.ball, at);
  assert.equal(x.kind, 'strip');
  assert.equal(x.colors.length, 9);
  const q = ballBeads3D(p.ball, { d: 2, h: 1.5 })[at];
  const beads = extraBeads3D(x, q, { d: 2, h: 1.5 }, () => ({ d: 2, h: 1.5 }));
  assert.equal(beads.length, 9);
  const out = (b) => (b.pos[0] - q.pos[0]) * q.normal[0] + (b.pos[1] - q.pos[1]) * q.normal[1] + (b.pos[2] - q.pos[2]) * q.normal[2];
  assert.ok(beads.every((b) => out(b) > 0), 'cały pasek na zewnątrz');
  assert.ok(out(beads[7]) > out(beads[1]), 'kolejne oczka coraz dalej');
  if (m !== at) {
    const k = extraMirrorIndex(p.ball, at, 0);
    assert.ok(k === 0 || k === 2);
  }
  // Pętelka i pasek w instrukcji.
  const text = instructionsText(p);
  assert.match(text, /pasek z 3 oczek/);
});

test('instrukcja z kilku kulek: sekcja dla każdej i zszycie oczek', () => {
  const p = ballWith();
  addPart(p.ball, -1, stepToward('b120', [0, 1, 0]), 'b90', 2);
  const lines = ballInstructions(p.ball, (r) => `${r.n}×${r.color}`, (n, a, b, c) => `${n} ${n === 1 ? a : n < 5 ? b : c}`);
  assert.deepEqual(lines.filter((l) => l.sub).map((l) => l.sub), ['Tułów — 42 oczka, 120 koralików', 'Głowa — 32 oczka, 90 koralików']);
  assert.equal(lines.filter((l) => l.num?.startsWith('Oczko')).length, 42 + 32);
  const join = lines.find((l) => l.num === 'Zszyj');
  assert.match(join.text, /^oczko \d+ tej kulki z oczkiem \d+ \(Tułów\)/);
});

test('zapis i wczytanie części; zmiana rozmiaru tułowia przenosi miejsce doczepienia', () => {
  const p = ballWith();
  const top = stepToward('b120', [0, 1, 0]);
  addPart(p.ball, -1, top, 'b30', 5);
  addPart(p.ball, 0, stepToward('b30', [1, 0.3, 0.6]), 'b30', 6);
  const back = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(back.ball, p.ball);
  // Uszkodzone wpisy odpadają, a te z brakującym rodzicem razem z nimi.
  const fixed = fixParts([{ parent: 5, at: 0 }, { parent: -1, at: 999 }, { parent: -1, at: 1, shape: 'b30' }, { parent: 2, at: 0 }, { parent: 1, at: 0 }], p.ball, (c) => c);
  assert.equal(fixed.length, 2);
  assert.equal(fixed[1].parent, 0, 'numer rodzica przeliczony na nową listę');
  setBallShape(p, 'b480');
  const s480 = ballShape('b480'), at = p.ball.parts[0].at;
  assert.ok(s480.faces[s480.steps[at].face].center[1] > 0.8, 'głowa dalej na górze');
  assert.equal(partMirror(p.ball, 0), 0, 'i dalej na osi symetrii');
  removePaletteColor(p, 5);
  assert.ok(p.ball.parts.every((q) => q.beads.every((c) => c !== 5 || p.palette.length > 5)));
  // Wypełnianie nie wychodzi poza kulkę.
  const q = ballWith();
  addPart(q.ball, -1, top, 'b30', 0);
  floodFill(q, {}, 0, 3);
  assert.equal(q.ball.beads.filter((c) => c === 3).length, 120);
  assert.ok(q.ball.parts[0].beads.every((c) => c === 0));
  // Schemat bieżącej kulki ma jej numery koralików i znaczek ◆ przy łączeniu.
  const lay = modeApi.ball.layout(q, { ballPart: 0 });
  assert.equal(lay.cells[0].id, 120);
  assert.ok(lay.labels.some((l) => l.text.endsWith('◆')));
  assert.ok(modeApi.ball.layout(q, {}).labels[top].text.endsWith('◆'));
});

import { ballThread } from '../js/ball.js';

test('ścieżka nici w figurce: od ostatniego istniejącego koralika przez nowe, krzyż na ostatnim', () => {
  const s = ballShape('b120'), lay = ballLayout('b120');
  const at = (id) => [lay.cells[id].x + 0.5, lay.cells[id].y + 0.5];
  const first = ballThread('b120', 0);
  assert.equal(first.main[0].length, 6, '5 koralików i powrót do pierwszego');
  const st = s.steps[7];
  const t = ballThread('b120', 7);
  assert.deepEqual(t.main[0].slice(1), st.added.map(at));
  assert.ok(st.existing.some((id) => JSON.stringify(at(id)) === JSON.stringify(t.main[0][0])), 'start w istniejącym koraliku');
  assert.deepEqual(t.marks, [at(st.added.at(-1))]);
  assert.equal(t.faint[0].length, st.size + 1, 'obwód oczka zamknięty');
  assert.equal(ballThread('b120', s.steps.length - 1).main.length, 0, 'ostatnie oczko nic nie dodaje');
  // Na schemacie figurki ścieżka pojawia się tylko dla wybranego oczka.
  const p = createBlankProject('ball');
  assert.equal(modeApi.ball.layout(p, { thread: true, ballStep: 0 }).thread, null);
  assert.equal(modeApi.ball.layout(p, { thread: true, ballStep: 8 }).thread.label, 'Oczko 8');
});
