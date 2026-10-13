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
