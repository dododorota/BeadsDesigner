import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY, createProject, createBlankProject, normalizeProject, modeApi, floodFill, repeatPattern,
  mirrorStrand, resizeTube, resizeFigure, hollow, removePaletteColor, usage, instructions, instructionsText,
} from '../js/model.js';

test('przykładowy projekt jest poprawny po zapisie i odczycie', () => {
  const p = createProject();
  const back = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(back.strand.beads, p.strand.beads);
  assert.deepEqual(back.figure.voxels, p.figure.voxels);
});

test('naszyjnik: symetria odbija koralik względem środka', () => {
  const p = createBlankProject('strand');
  assert.equal(modeApi.strand.mirror(p, 0), 299);
  p.strand.symmetric = false;
  assert.equal(modeApi.strand.mirror(p, 0), null);
});

test('naszyjnik: powielanie i lustro', () => {
  const p = createBlankProject('strand');
  p.strand.beads[0] = 1; p.strand.beads[1] = 2;
  repeatPattern(p, 3);
  assert.deepEqual(p.strand.beads.slice(0, 7), [1, 2, 0, 1, 2, 0, 1]);
  mirrorStrand(p);
  assert.equal(p.strand.beads[299], p.strand.beads[0]);
});

test('wężyk: układ ma przesunięcie o pół koralika na rząd', () => {
  const p = createBlankProject('tube');
  const { cells } = modeApi.tube.layout(p, {});
  const C = p.tube.around;
  assert.equal(cells[0].x, 0);
  assert.equal(cells[C].x, C); // drugi rząd zaczyna się pół koralika wcześniej, zawinięty
  assert.equal(cells[C + 1].x, 0.5);
});

test('wężyk: zmiana obwodu zachowuje wzór', () => {
  const p = createBlankProject('tube');
  p.tube.beads[0] = 3;
  resizeTube(p, 8, 10);
  assert.equal(p.tube.beads.length, 80);
  assert.equal(p.tube.beads[0], 3);
});

test('wypełnianie zatrzymuje się na innym kolorze', () => {
  const p = createBlankProject('strand');
  p.strand.beads[5] = 1;
  floodFill(p, {}, 0, 2);
  assert.deepEqual(p.strand.beads.slice(0, 6), [2, 2, 2, 2, 2, 1]);
  assert.equal(p.strand.beads[6], 0);
});

test('figurka: wydrążanie zostawia tylko powierzchnię', () => {
  const p = createBlankProject('figure');
  resizeFigure(p, 3, 3, 3);
  p.figure.voxels.fill(0);
  assert.equal(hollow(p.figure), 1);
  assert.equal(p.figure.voxels[13], EMPTY);
});

test('usunięcie koloru przenumerowuje koraliki', () => {
  const p = createBlankProject('strand');
  p.strand.beads[0] = 2; p.strand.beads[1] = 1;
  removePaletteColor(p, 1);
  assert.equal(p.strand.beads[0], 1);
  assert.equal(p.strand.beads[1], 0);
});

test('zużycie i instrukcja', () => {
  const p = createProject();
  assert.equal(usage(p).total, 300);
  const lines = instructions(p);
  assert.ok(lines[0].head);
  p.mode = 'figure';
  assert.ok(instructionsText(p).includes('Warstwa 1'));
  p.mode = 'tube';
  assert.ok(instructionsText(p).includes('KOLEJNOŚĆ NAWLEKANIA'));
});
