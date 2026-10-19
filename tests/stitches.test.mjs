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

import { stitchThread, hasThread } from '../js/stitches.js';

test('ścieżka nici: te same kroki co instrukcja, punkty na koralikach', () => {
  for (const kind of Object.keys(STITCHES)) for (const form of ['flat', 'tube']) {
    const st = fixStitch({ kind, form, width: 6, rows: 4 });
    const l = stitchLayout(st, BEAD);
    const steps = stitchThread(st, l);
    if (!hasThread(st)) { assert.equal(steps.length, 0, kind); continue; }
    const rows = stitchInstructions(st, new Array(stitchCount(st)).fill(0), () => 'x').filter((x) => x.num);
    assert.deepEqual(steps.map((s) => s.label), rows.map((x) => x.num), `${kind} ${form}: nazwy kroków`);
    for (const s of steps) {
      assert.ok(s.path.filter(Boolean).length >= 2, `${kind}: ścieżka ma co najmniej odcinek`);
      for (const q of s.path.filter(Boolean)) assert.ok(q[0] >= -0.5 && q[0] <= l.width + 0.5 && q[1] >= -0.5 && q[1] <= l.height + 0.5, `${kind}: punkt na schemacie`);
    }
    if (form === 'tube') {
      // Linia nie przecina całego schematu w poprzek (przerwa na zawinięciu).
      for (const s of steps) s.path.forEach((q, i) => { const p = s.path[i - 1]; if (q && p) assert.ok(Math.abs(q[0] - p[0]) <= l.period / 2, kind); });
    }
  }
});

test('ścieżka nici peyote: na zmianę nowy koralik i wystający koralik rzędu poniżej', () => {
  const st = fixStitch({ kind: 'peyote', width: 4, rows: 3 });
  const l = stitchLayout(st, BEAD);
  const steps = stitchThread(st, l);
  const at = (r, c) => { const q = l.cells[r * 4 + c]; return [q.x + 0.5, q.y + 0.5]; };
  // Rząd 3 idzie w lewo: kolumna 3 (rząd poniżej), 2 (nowy), 1 (poniżej), 0 (nowy).
  assert.equal(steps[1].label, 'Rz. 3 ←');
  assert.deepEqual(steps[1].path, [at(0, 3), at(1, 2), at(0, 1), at(1, 0)]);
});

import { rawSteps, rawBead } from '../js/stitches.js';

test('RAW płaski: koraliki na przemian poziomo i pionowo, każdy nawleczony raz', () => {
  const st = fixStitch({ kind: 'raw', form: 'tube', width: 5, rows: 3 });
  assert.equal(st.form, 'flat', 'RAW tylko płasko');
  assert.equal(stitchCount(st), 5 * 4 + 6 * 3);
  const l = stitchLayout(st, BEAD);
  assert.equal(l.cells.filter((c) => c.a === 0).length, 20, 'poziome: góra i dół oczek');
  assert.equal(l.cells.filter((c) => c.a === Math.PI / 2).length, 18, 'pionowe: boki');
  const steps = rawSteps(st);
  assert.equal(steps.length, 15);
  const added = steps.flatMap((s) => s.added).sort((a, b) => a - b);
  assert.deepEqual(added, Array.from({ length: stitchCount(st) }, (_, i) => i));
  assert.deepEqual(steps.map((s) => s.added.length).slice(0, 7), [4, 3, 3, 3, 3, 3, 2], 'pierwsze 4, rząd 1 po 3, nowy rząd 3, potem 2');
  for (const s of steps) assert.equal(new Set(s.around).size, 4, 'oczko ma 4 różne koraliki');
  // Rząd 2 idzie w lewo — zaczyna od prawego oczka.
  assert.equal(steps[5].col, 4);
  assert.equal(steps[5].dir, '←');
});

test('RAW płaski: lustro, sąsiedzi, powielanie i przenoszenie wzoru', () => {
  const st = fixStitch({ kind: 'raw', width: 4, rows: 3, mirror: true });
  const n = stitchCount(st);
  for (let id = 0; id < n; id++) {
    const m = stitchMirror(st, id);
    assert.equal(stitchMirror(st, m), id);
    assert.equal(rawBead(st, m).part, rawBead(st, id).part);
  }
  const l = stitchLayout(st, BEAD);
  // Poziomy koralik w środku robótki styka się z 4 pionowymi (rogi dwóch oczek).
  const mid = l.cells.find((c) => c.part === 'h' && c.level === 2 && c.col === 1);
  assert.deepEqual(stitchNeighbors(l, mid.id).map((k) => l.cells[k].part), ['v', 'v', 'v', 'v']);
  // Powielenie pierwszego rzędu oczek nie rusza dolnych koralików.
  const beads = Array.from({ length: n }, (_, i) => i);
  repeatStitchRows(st, beads, 1);
  assert.deepEqual(beads.slice(0, 4), [0, 1, 2, 3]);
  assert.equal(beads[4 + 9], beads[4]);
  // Większa robótka RAW powtarza wzór; z peyote obrazek przenosi się według miejsca.
  const bigger = fixStitch({ kind: 'raw', width: 6, rows: 5 });
  const out = remapBeads(st, beads, bigger);
  assert.equal(out.length, stitchCount(bigger));
  assert.equal(out[0], beads[0]);
  const pey = fixStitch({ kind: 'peyote', width: 8, rows: 6 });
  const half = Array.from({ length: stitchCount(pey) }, (_, i) => (i % 8 < 4 ? 1 : 2));
  const raw = remapBeads(pey, half, fixStitch({ kind: 'raw', width: 8, rows: 6 }));
  const lr = stitchLayout(fixStitch({ kind: 'raw', width: 8, rows: 6 }), BEAD);
  const left = lr.cells.filter((c) => c.x + 0.5 < lr.width * 0.4).map((c) => raw[c.id]);
  assert.ok(left.every((c) => c === 1), 'lewa połowa obrazka zostaje po lewej');
});
