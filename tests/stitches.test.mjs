import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STITCHES, fixStitch, stitchCount, stitchLayout, stitchNeighbors, stitchMirror, remapBeads, repeatStitchRows,
  stitchInstructions, plural, visibleRows, rowsFromVisible,
} from '../js/stitches.js';
import { createProject, createBlankProject, normalizeProject, setStitch, modeApi, floodFill, dimensions, instructionsText, removePaletteColor } from '../js/model.js';

const BEAD = { d: 2, h: 1.4 };
const lay = (o) => stitchLayout(fixStitch(o), BEAD);

test('każdy ścieg ma tyle komórek, ile koralików, z unikalnymi numerami w kolejności', () => {
  for (const kind of Object.keys(STITCHES)) for (const form of ['flat', 'tube']) {
    const st = fixStitch({ kind, form, width: 8, rows: 5 });
    const l = stitchLayout(st, BEAD);
    assert.equal(l.cells.length, stitchCount(st), `${kind} ${form}`);
    l.cells.forEach((c, i) => assert.equal(c.id, i, `${kind}: id = indeks`));
    for (const c of l.cells) {
      assert.ok(c.x >= 0 && c.x < l.width && c.y >= 0 && c.y < l.height, `${kind}: komórka w granicach schematu`);
    }
  }
});

test('reguły ściegów: herringbone parzysty, PRAW zawsze rurką, skręt tylko w rurce herringbone', () => {
  assert.equal(fixStitch({ kind: 'herringbone', width: 7 }).width, 8);
  assert.equal(fixStitch({ kind: 'praw', form: 'flat' }).form, 'tube');
  assert.equal(fixStitch({ kind: 'peyote', form: 'tube', twist: true }).twist, false);
  assert.equal(fixStitch({ kind: 'herringbone', form: 'tube', twist: true }).twist, true);
  assert.equal(fixStitch({ kind: 'nieznany' }).kind, 'peyote');
});

test('peyote: sąsiednie kolumny przesunięte o pół koralika', () => {
  const l = lay({ kind: 'peyote', width: 4, rows: 3 });
  assert.equal(l.cells[1].y - l.cells[0].y, -0.5);
  assert.equal(l.cells[1].a, 0, 'otwór poziomo');
});

test('brick: co drugi rząd przesunięty, koraliki stoją pionowo', () => {
  const l = lay({ kind: 'brick', width: 4, rows: 2 });
  assert.equal(l.cells[4].x - l.cells[0].x, 0.5);
  assert.equal(l.cells[0].a, Math.PI / 2);
});

test('herringbone: pary pochylone w przeciwne strony (V)', () => {
  const l = lay({ kind: 'herringbone', width: 4, rows: 1 });
  assert.ok(l.cells[0].a > Math.PI / 2 && l.cells[1].a < Math.PI / 2);
});

test('PRAW: podłogi leżą, ściany stoją, liczba koralików n·(2·klatki+1)', () => {
  const st = fixStitch({ kind: 'praw', sides: 4, rows: 3 });
  const l = stitchLayout(st, BEAD);
  assert.equal(l.cells.length, 4 * 7);
  assert.equal(l.cells.filter((c) => c.part === 'wall').every((c) => c.a === Math.PI / 2), true);
  assert.equal(l.cells.filter((c) => c.part === 'floor').length, 16);
});

test('sąsiedzi: w rurce schemat zawija się z prawej na lewą', () => {
  const flat = lay({ kind: 'square', width: 6, rows: 2 });
  const tube = lay({ kind: 'square', form: 'tube', width: 6, rows: 2 });
  assert.ok(!stitchNeighbors(flat, 0).includes(5));
  assert.ok(stitchNeighbors(tube, 0).includes(5));
});

test('odbicie lewo–prawo w tym samym rzędzie, tylko płasko', () => {
  const st = fixStitch({ kind: 'brick', width: 5, rows: 2, mirror: true });
  assert.equal(stitchMirror(st, 0), 4);
  assert.equal(stitchMirror(st, 6), 8);
  assert.equal(stitchMirror({ ...st, form: 'tube' }, 0), null);
});

test('zmiana rozmiaru i ściegu zachowuje wzór w rzędach i kolumnach', () => {
  const p = createBlankProject('stitch');
  setStitch(p, { kind: 'square', width: 4, rows: 3 });
  p.stitch.beads[5] = 3; // rząd 2, kolumna 2
  setStitch(p, { kind: 'brick', width: 6, rows: 5 });
  assert.equal(p.stitch.beads.length, 30);
  assert.equal(p.stitch.beads[1 * 6 + 1], 3);
  setStitch(p, { kind: 'praw', rows: 2 });
  assert.equal(p.stitch.beads.length, 4 * 5);
});

test('powielanie rzędów', () => {
  const st = fixStitch({ kind: 'square', width: 2, rows: 4 });
  const beads = [1, 2, 3, 4, 0, 0, 0, 0];
  repeatStitchRows(st, beads, 1);
  assert.deepEqual(beads, [1, 2, 1, 2, 1, 2, 1, 2]);
});

test('peyote: rzędy w instrukcji to przejścia igłą (dwa razy więcej niż koralików w kolumnie)', () => {
  const st = fixStitch({ kind: 'peyote', width: 6, rows: 3 });
  assert.equal(visibleRows(st), 6);
  assert.equal(rowsFromVisible('peyote', 7), 4);
  const beads = Array.from({ length: 18 }, (_, i) => i % 2);
  const lines = stitchInstructions(st, beads, (r) => `${r.n}×${r.color}`);
  assert.match(lines[1].num, /1–2/);
  assert.equal(lines.length, 1 + 1 + 4, 'nagłówek, rzędy 1–2 i rzędy 3–6');
  assert.equal(lines[2].text, '3×0', 'rząd 3: same parzyste kolumny');
});

test('odmiana liczebników', () => {
  assert.equal(plural(1, 'koralik', 'koraliki', 'koralików'), '1 koralik');
  assert.equal(plural(3, 'koralik', 'koraliki', 'koralików'), '3 koraliki');
  assert.equal(plural(12, 'koralik', 'koraliki', 'koralików'), '12 koralików');
  assert.equal(plural(22, 'koralik', 'koraliki', 'koralików'), '22 koraliki');
});

test('tryb ścieg w projekcie: zapis, wypełnianie, wymiary, instrukcja, usuwanie koloru', () => {
  const p = createProject();
  p.mode = 'stitch';
  const back = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(back.stitch.beads, p.stitch.beads);
  setStitch(p, { kind: 'square', width: 3, rows: 2 });
  p.stitch.beads = [0, 0, 1, 0, 0, 1];
  floodFill(p, {}, 0, 2);
  assert.deepEqual(p.stitch.beads, [2, 2, 1, 2, 2, 1]);
  assert.match(dimensions(p).value, /cm/);
  assert.ok(instructionsText(p).includes('SQUARE / KROSNO PŁASKI'));
  removePaletteColor(p, 1);
  assert.deepEqual(p.stitch.beads, [1, 1, 0, 1, 1, 0]);
  assert.equal(modeApi.stitch.layout(p, {}).cells.length, 6);
});

test('wężyk w silniku ściegów: zawsze rurka 3–16, sąsiedzi wzdłuż spirali także na szwie', () => {
  const st = fixStitch({ kind: 'crochet', form: 'flat', width: 40, rows: 5 });
  assert.equal(st.form, 'tube');
  assert.equal(st.width, 16);
  assert.equal(fixStitch({ kind: 'crochet', width: 1 }).width, 3);
  const l = stitchLayout(fixStitch({ kind: 'crochet', width: 6, rows: 4 }), BEAD);
  assert.equal(l.width, 6.5, 'na obwodzie mieści się 6,5 koralika');
  // Koralik 5 (koniec rzędu 1) i 6 (początek rzędu 2) leżą obok siebie na spirali.
  assert.ok(stitchNeighbors(l, 5).includes(6));
  assert.deepEqual([...stitchNeighbors(l, 7)].sort((a, b) => a - b), [0, 1, 6, 8, 13, 14]);
  // Spirala: każdy koralik o 1/6,5 obrotu dalej i odrobinę wyżej.
  assert.ok(Math.abs(l.cells[13].theta - 2 * Math.PI * 2) < 1e-9);
  assert.ok(l.cells[1].v > l.cells[0].v);
  const lines = stitchInstructions(fixStitch({ kind: 'crochet', width: 3, rows: 2 }), [0, 0, 1, 1, 1, 2], (r) => `${r.n}×${r.color}`);
  assert.deepEqual(lines.slice(1).map((x) => `${x.num}: ${x.text}`), ['1: 1×2', '2–4: 3×1', '5–6: 2×0'], 'od ostatniego koralika');
});

test('wężyka nie ma na liście ściegów; ścieg-wężyk z pliku staje się peyote', () => {
  const p = createProject();
  p.stitch = { ...p.stitch, kind: 'crochet' };
  const back = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.equal(back.stitch.kind, 'peyote');
  assert.equal(back.stitch.beads.length, stitchCount(back.stitch));
  assert.ok(STITCHES.crochet.ownMode);
  // Wypełnianie w trybie wężyka przechodzi przez szew spirali.
  const q = createBlankProject('tube');
  floodFill(q, {}, 0, 4);
  assert.ok(q.tube.beads.every((c) => c === 4));
});
