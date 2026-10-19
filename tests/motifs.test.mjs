import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTIFS, insertMotif, removeMotifAt, clearMotifs, fillMotifs, repeatWithMotifs, mirrorWithMotifs, fixGroups, groupAt, strandSlots, roleInGroup,
} from '../js/motifs.js';
import { createBlankProject, resizeStrand, normalizeProject, instructionsText, dimensions, modeApi, motifRoleText } from '../js/model.js';

const strand = (n) => { const p = createBlankProject('strand'); resizeStrand(p, n); return p; };
const COLORS = { main: 6, accent: 3, side: 'out' };

test('wstawienie stokrotki: płatki, środek na końcu, przesunięcie dalszych motywów', () => {
  const p = strand(20);
  const s = p.strand;
  insertMotif(s, 10, 'loop', 5, COLORS);
  insertMotif(s, 4, 'daisy', 6, COLORS);
  assert.equal(s.count, 20 + 5 + 7);
  const [daisy, loop] = s.groups;
  assert.deepEqual([daisy.kind, daisy.start, daisy.n], ['daisy', 5, 7]);
  assert.equal(loop.start, 11 + 7, 'pętelka przesunięta o 7 koralików stokrotki');
  assert.deepEqual(s.beads.slice(5, 12), [6, 6, 6, 6, 6, 6, 3]);
  assert.equal(roleInGroup(daisy, 11).part, 'center');
});

test('nie wstawia w środek motywu i pilnuje limitu długości', () => {
  const s = strand(20).strand;
  insertMotif(s, 4, 'dangle', 4, COLORS);
  insertMotif(s, 6, 'loop', 3, COLORS); // koralik 6 jest w frędzlu 5–8
  assert.equal(s.groups[1].start, 9);
  const big = strand(1995).strand;
  assert.equal(insertMotif(big, 3, 'daisy', 6, COLORS), false);
});

test('usuwanie jednego motywu i wszystkich', () => {
  const s = strand(20).strand;
  insertMotif(s, 2, 'daisy', 6, COLORS);
  insertMotif(s, 15, 'loop', 6, COLORS);
  assert.ok(removeMotifAt(s, 5));
  assert.equal(s.count, 26);
  assert.equal(s.groups[0].start, 9);
  assert.equal(removeMotifAt(s, 0), false);
  clearMotifs(s);
  assert.equal(s.count, 20);
  assert.deepEqual(s.groups, []);
});

test('daisy chain jednym przyciskiem: równe odstępy, stare motywy znikają', () => {
  const s = strand(60).strand;
  insertMotif(s, 1, 'loop', 10, COLORS);
  const n = fillMotifs(s, 6, 'daisy', 6, COLORS);
  assert.equal(n, 9);
  assert.equal(s.count, 60 + 9 * 7);
  assert.ok(s.groups.every((g) => g.kind === 'daisy'));
  const gaps = s.groups.slice(1).map((g, i) => g.start - (s.groups[i].start + s.groups[i].n));
  assert.ok(gaps.every((d) => d === 6), `odstępy: ${gaps}`);
});

test('pętelki na zmianę na zewnątrz i do środka', () => {
  const s = strand(40).strand;
  fillMotifs(s, 5, 'loop', 8, COLORS, true);
  const sides = s.groups.map((g) => g.side);
  assert.ok(sides.includes('in') && sides.includes('out'));
});

test('powielanie z motywami i lustro z zachowaniem kolejności nawlekania', () => {
  const s = strand(20).strand;
  insertMotif(s, 1, 'daisy', 5, COLORS); // 2..7, środek na 7
  repeatWithMotifs(s, 10);
  assert.deepEqual(s.groups.map((g) => g.start), [2, 12], 'trzecia stokrotka (22–28) nie mieści się w 26 koralikach');
  const m = strand(30).strand;
  insertMotif(m, 2, 'daisy', 5, { ...COLORS, accent: 9 });
  insertMotif(m, 12, 'dangle', 3, { ...COLORS, accent: 8 });
  mirrorWithMotifs(m);
  const right = m.groups.filter((g) => g.start > m.count / 2);
  assert.equal(right.length, 2);
  const d = right.find((g) => g.kind === 'daisy');
  assert.equal(m.beads[d.start + d.n - 1], 9, 'środek stokrotki nadal na końcu');
  const f = right.find((g) => g.kind === 'dangle');
  assert.equal(m.beads[f.start + f.n - 1], 8, 'koralik zwrotny nadal na końcu');
});

test('symetria malowania: płatek ↔ płatek, środek ↔ środek', () => {
  const p = strand(30);
  insertMotif(p.strand, 2, 'daisy', 5, COLORS);
  mirrorWithMotifs(p.strand);
  const s = p.strand;
  const [a, b] = s.groups;
  assert.equal(modeApi.strand.mirror(p, a.start + a.n - 1), b.start + b.n - 1);
  assert.equal(modeApi.strand.mirror(p, a.start), b.start + b.n - 2);
});

test('zapis i odczyt grup, odrzucanie błędnych', () => {
  const p = strand(30);
  insertMotif(p.strand, 3, 'loop', 6, COLORS);
  const back = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(back.strand.groups, p.strand.groups);
  assert.deepEqual(fixGroups([{ start: 0, n: 5, kind: 'loop' }, { start: 3, n: 5, kind: 'loop' }, { start: 20, n: 99, kind: 'daisy' }, { start: 9, n: 3, kind: 'kwadrat' }], 30).length, 1);
});

test('długość, instrukcja i opis koralika w motywie', () => {
  const p = strand(10);
  insertMotif(p.strand, 4, 'daisy', 6, COLORS);
  const slots = strandSlots(p.strand, () => ({ d: 2, h: 1.4 }));
  assert.equal(slots.length, 11);
  assert.match(dimensions(p).value, /cm/);
  const text = instructionsText(p);
  assert.ok(text.includes('Stokrotka 6–12'));
  assert.ok(text.includes('przez 4. płatek'));
  assert.equal(motifRoleText(p, 11), 'Stokrotka · środek');
  assert.equal(Object.keys(MOTIFS).length, 4);
  assert.equal(groupAt(p.strand, 0), null);
});

test('owocek: szypułka na nitce, owoc pod nią, instrukcja i lustro', () => {
  const p = strand(20);
  const s = p.strand;
  insertMotif(s, 3, 'berry', 3, { main: 8, accent: 2, side: 'out' });
  assert.deepEqual(s.beads.slice(4, 8), [2, 8, 8, 8], 'najpierw szypułka, potem owoc');
  assert.equal(roleInGroup(s.groups[0], 4).part, 'stem');
  assert.equal(motifRoleText(p, 6), 'Owocek · 2 z 3');
  const text = instructionsText(p);
  assert.ok(text.includes('Owocek 5–8'));
  assert.ok(text.includes('wróć igłą przez szypułkę'));
  mirrorWithMotifs(s);
  assert.equal(s.groups.length, 2);
  const twin = s.groups[1];
  assert.equal(s.beads[twin.start], 2, 'lustro też zaczyna od szypułki');
  assert.equal(modeApi.strand.mirror({ ...p, strand: { ...s, symmetric: true } }, 4), twin.start);
  const json = JSON.parse(JSON.stringify(p));
  assert.equal(normalizeProject(json).strand.groups[0].kind, 'berry');
});
