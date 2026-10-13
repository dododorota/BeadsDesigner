import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Library, kvBackend, memoryKV, parseImport, LIBRARY_FORMAT } from '../js/storage.js';
import { createProject, createBlankProject } from '../js/model.js';

const fresh = () => new Library(kvBackend(memoryKV(), 'memory'));

test('biblioteka: dodanie, odczyt i lista od ostatnio zmienianego', async () => {
  const lib = fresh();
  const a = createBlankProject('strand'); a.name = 'A';
  const b = createBlankProject('tube'); b.name = 'B';
  const idA = await lib.add(a);
  const idB = await lib.add(b);
  await lib.save(idA, a, undefined, Date.now() + 1000);
  const list = await lib.list();
  assert.deepEqual(list.map((p) => p.name), ['A', 'B']);
  assert.equal(list[1].mode, 'tube');
  assert.equal(list[0].project, undefined, 'lista nie zawiera treści projektów');
  const back = await lib.load(idB);
  assert.equal(back.name, 'B');
  assert.equal(back.tube.around, b.tube.around);
});

test('biblioteka: zapis bez miniaturki zostawia poprzednią', async () => {
  const lib = fresh();
  const p = createProject();
  const id = await lib.add(p, 'data:image/png;base64,AAA');
  p.name = 'Zmieniony';
  await lib.save(id, p);
  const [rec] = await lib.list();
  assert.equal(rec.thumb, 'data:image/png;base64,AAA');
  assert.equal(rec.name, 'Zmieniony');
});

test('biblioteka: duplikat jest niezależną kopią, usuwanie działa', async () => {
  const lib = fresh();
  const p = createBlankProject('strand'); p.name = 'Oryginał';
  const id = await lib.add(p);
  const copyId = await lib.duplicate(id);
  assert.notEqual(copyId, id);
  const copy = await lib.load(copyId);
  assert.equal(copy.name, 'Oryginał (kopia)');
  copy.strand.beads[0] = 5;
  await lib.save(copyId, copy);
  assert.equal((await lib.load(id)).strand.beads[0], 0);
  await lib.remove(id);
  assert.deepEqual((await lib.list()).map((q) => q.id), [copyId]);
  assert.equal(await lib.load(id), null);
});

test('eksport wszystkich i ponowny import', async () => {
  const lib = fresh();
  const a = createBlankProject('strand'); a.name = 'Naszyjnik';
  const b = createBlankProject('figure'); b.name = 'Żabka';
  await lib.add(a);
  await lib.add(b);
  const data = JSON.parse(JSON.stringify(await lib.exportAll()));
  assert.equal(data.format, LIBRARY_FORMAT);
  assert.equal(data.projects.length, 2);
  const projects = parseImport(data);
  assert.deepEqual(projects.map((p) => p.name).sort(), ['Naszyjnik', 'Żabka']);
});

test('import pojedynczego projektu i odrzucenie śmieci', () => {
  const [p] = parseImport(JSON.parse(JSON.stringify(createProject())));
  assert.equal(p.mode, 'strand');
  assert.throws(() => parseImport(null));
  assert.throws(() => parseImport({ format: LIBRARY_FORMAT }));
});

test('meta: zapamiętuje bieżący projekt i datę kopii', async () => {
  const lib = fresh();
  assert.equal(await lib.getMeta('current'), undefined);
  await lib.setMeta('current', 'abc');
  await lib.setMeta('lastExport', 123);
  assert.equal(await lib.getMeta('current'), 'abc');
  assert.equal(await lib.getMeta('lastExport'), 123);
});
