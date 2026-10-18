// Spina interfejs: stan projektu, narzędzia, historia zmian, zapis i podgląd.

import { BEAD_TYPES, FINISHES, SHAPES, SUGGESTED_COLORS, beadsPerGram } from './beads.js';
import {
  EMPTY, addShape, baseBead, beadOf, clearLayer, currentPart, setBallShape, stitchThreadAt, setStitch, stitchLayoutOf, copyLayer, countColors, createBlankProject, createProject,
  dimensions, floodFill, motifRoleText, hollow, instructions, instructionsText, mirrorStrand, modeApi, normalizeProject,
  removePaletteColor, repeatPattern, resizeFigure, resizeStrand, resizeTube, usage,
} from './model.js';
import { ChartEditor } from './chart.js';
import { Preview3D } from './preview3d.js';
import { Library, openBackend, parseImport } from './storage.js';
import { STITCHES, hasThread, rowsFromVisible, visibleRows } from './stitches.js';
import { MOTIFS, clearMotifs, fillMotifs, groupAt, insertMotif, removeMotifAt } from './motifs.js';
import {
  BALL_SHAPES, EXTRA_KINDS, STRETCH, addPart, ballShape, extraAt, extraMirrorIndex, extraSize, locate, partAt, partJoin, partName,
  removePart, setPartStretch, toggleExtra,
} from './ball.js';

const IN_ARTIFACT = Boolean(window.BEADS_ARTIFACT);

const $ = (id) => document.getElementById(id);

// Lista koralików do wyboru w palecie, pogrupowana według kształtu.
const BEAD_OPTIONS = Object.entries(SHAPES).map(([shape, label]) => {
  const opts = Object.entries(BEAD_TYPES)
    .filter(([, t]) => t.shape === shape)
    .map(([id, t]) => `<option value="${id}">${t.label}</option>`)
    .join('');
  return `<optgroup label="${label}">${opts}</optgroup>`;
}).join('');

const MODE_HINTS = {
  strand: 'Pojedynczy sznurek koralików. Schemat czyta się wierszami od lewej; trójkąt pokazuje środek naszyjnika.',
  tube: STITCHES.crochet.hint,
  stitch: '',
  ball: 'Figurka w technice japońskiej (na krzyż). Koraliki leżą na krawędziach oczek; oczko 1 to przód (środek schematu), ostatnie zamyka tył. Maluj na schemacie albo stuknięciem w podgląd 3D.',
  figure: 'Figurka budowana warstwami od dołu. Rysujesz jeden plaster naraz; blade kropki to warstwa poniżej.',
};

// ---------------------------------------------------------------- stan

let project = createProject();
let currentId = null;
let library = null;
const ui = {
  tool: 'pencil', color: 0, layer: 0, buildView: false, hover: null,
  motif: { kind: 'daisy', size: 6, accent: 3, inside: false, alternate: false },
  extraKind: 'loop',
  extraSize: { loop: EXTRA_KINDS.loop.def, strip: EXTRA_KINDS.strip.def },
  ballStep: 0,
  ballPart: -1,
  partShape: 'b30',
  thread: false, threadStep: 0,
};
const history = { undo: [], redo: [] };
let strokeChanged = false;
let strokeActive = false;

// ---------------------------------------------------------------- zapis

// Projekt zapisuje się sam: po każdej zmianie (z opóźnieniem 0,4 s) do biblioteki
// projektów, a od razu, gdy aplikacja chowa się w tle albo zamyka. Dodatkowo trzymamy
// szybką, synchroniczną kopię bieżącego projektu w localStorage — na wypadek, gdyby
// system zamknął aplikację, zanim zapis do IndexedDB się skończy.
const AUTOSAVE_KEY = 'beadsdesigner.autosave';
const LEGACY_KEY = 'beadsdesigner.project.v1';
const THUMB_EVERY_MS = 4000;
const BACKUP_DAYS = 14;

let saveTimer = null;
let dirty = false;
let lastThumb = 0;

function setSaveState(text) {
  $('saveState').textContent = text;
}

function scheduleSave() {
  if (!library) return;
  dirty = true;
  setSaveState('Zapisywanie…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 400);
}

function writeAutosave(updated) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ id: currentId, updated, project }));
  } catch { /* brak miejsca albo tryb prywatny — zostaje IndexedDB */ }
}

function readAutosave() {
  try { return JSON.parse(localStorage.getItem(AUTOSAVE_KEY)); } catch { return null; }
}

async function saveNow({ thumb = false } = {}) {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!library || !currentId) return;
  const wasDirty = dirty;
  dirty = false;
  const now = Date.now();
  const makeThumb = thumb || (wasDirty && now - lastThumb > THUMB_EVERY_MS);
  if (!wasDirty && !makeThumb) return;
  if (makeThumb) lastThumb = now;
  if (wasDirty) writeAutosave(now);
  try {
    // Miniaturka bez zmian w projekcie nie przesuwa go na liście „ostatnio zmieniane”.
    const updated = wasDirty ? now : (await library.updatedAt(currentId)) ?? now;
    await library.save(currentId, project, makeThumb ? preview.thumbnail() : undefined, updated);
    setSaveState(library.backend.kind === 'memory' ? 'Zapisz projekt do pliku — to urządzenie nie pozwala zapisywać' : 'Zapisano na tym urządzeniu');
  } catch {
    dirty = true;
    setSaveState('Nie udało się zapisać — zapisz projekt do pliku');
  }
}

// iPad może zamknąć aplikację w tle bez ostrzeżenia — zapisujemy, gdy tylko znika z ekranu.
function flushOnHide() {
  if (!dirty) return;
  writeAutosave(Date.now());
  saveNow();
}

function snapshot() {
  history.undo.push(JSON.stringify(project));
  if (history.undo.length > 150) history.undo.shift();
  history.redo.length = 0;
}

function restore(json) {
  project = normalizeProject(JSON.parse(json));
  ui.color = Math.min(ui.color, project.palette.length - 1);
  ui.layer = Math.min(ui.layer, project.figure.h - 1);
}

function undo() {
  if (!history.undo.length) return;
  history.redo.push(JSON.stringify(project));
  restore(history.undo.pop());
  changed({ structure: true });
}

function redo() {
  if (!history.redo.length) return;
  history.undo.push(JSON.stringify(project));
  restore(history.redo.pop());
  changed({ structure: true });
}

// Każda zmiana przechodzi tędy: odświeża widoki i zapisuje projekt.
function changed({ structure = false, palette = false, fit = false } = {}) {
  if (structure) renderControls();
  if (fit) fitZoom();
  if (structure || palette) renderPalette();
  else renderPaletteCounts();
  renderChart();
  renderInfo();
  schedulePreview();
  scheduleSave();
}

// ---------------------------------------------------------------- schemat

const chartHandlers = {
  down(id) {
    if (ui.tool === 'picker') return pick(id);
    if (ui.tool === 'motif') return project.mode === 'ball' ? extraTap(id) : motifTap(id);
    snapshot();
    strokeActive = true;
    strokeChanged = false;
    applyTool(id);
  },
  drag(id) {
    if (strokeActive && (ui.tool === 'pencil' || ui.tool === 'eraser')) applyTool(id);
  },
  up() {
    if (strokeActive && !strokeChanged) history.undo.pop();
    strokeActive = false;
  },
  // Drugi palec dotknął ekranu w trakcie malowania: to jednak gest przybliżania.
  cancel() {
    if (!strokeActive) return;
    strokeActive = false;
    const before = history.undo.pop();
    if (strokeChanged && before) {
      restore(before);
      changed({ structure: true });
    }
  },
  penDetected: () => toast('Rysik: malujesz rysikiem, palcem przesuwasz schemat'),
  pick,
  hover(id) {
    ui.hover = id;
    renderHover();
  },
  zoom: () => renderZoom(),
};
const chart = new ChartEditor($('chartScroller'), chartHandlers);

function applyTool(id) {
  const api = modeApi[project.mode];
  const color = ui.tool === 'eraser' ? EMPTY : ui.color;
  if (ui.tool === 'fill') {
    const a = floodFill(project, ui, id, color);
    const m = api.mirror(project, id);
    const b = m !== null && api.get(project, m) !== color ? floodFill(project, ui, m, color) : [];
    if (a.length || b.length) strokeChanged = true;
  } else {
    for (const target of new Set([id, api.mirror(project, id)])) {
      if (target === null || api.get(project, target) === color) continue;
      api.set(project, target, color);
      strokeChanged = true;
    }
  }
  if (strokeChanged) changed();
}

// Narzędzie motywu: stuknięcie w zwykły koralik wstawia za nim motyw, w motyw — usuwa go.
function motifTap(id) {
  const s = project.strand;
  snapshot();
  if (groupAt(s, id)) {
    removeMotifAt(s, id);
    toast('Motyw usunięty');
  } else {
    const m = ui.motif;
    if (!insertMotif(s, id, m.kind, m.size, motifColors())) {
      history.undo.pop();
      return toast('Naszyjnik ma już maksymalną liczbę koralików');
    }
  }
  changed({ structure: true });
}

// Figurka: narzędzie motywu doczepia do koralika dodatek (uszko, łapkę) albo go usuwa.
function extraTap(id) {
  snapshot();
  const res = toggleExtra(project.ball, id, ui.extraSize[ui.extraKind], ui.color, ui.extraKind);
  toast(res === 'added' ? 'Dodatek doczepiony' : 'Dodatek usunięty');
  changed({ structure: true });
}

// Stuknięcie w koralik w podglądzie 3D (tylko figurka na krzyż).
function previewTap(ref) {
  if (project.mode !== 'ball') return;
  // Stuknięcie w inną kulkę przełącza na nią schemat.
  const pi = locate(project.ball, ref.kind === 'bead' ? ref.id : ref.at)?.pi ?? -1;
  if (pi !== currentPart(project, ui)) {
    ui.ballPart = pi;
    ui.ballStep = 0;
    renderBallControls();
    renderChart();
    fitZoom();
  }
  if (ref.kind === 'bead') {
    if (ui.tool === 'motif') return extraTap(ref.id);
    chartHandlers.down(ref.id);
    chartHandlers.up();
    return;
  }
  const ball = project.ball;
  const x = extraAt(ball, ref.at);
  if (!x) return;
  if (ui.tool === 'motif') return extraTap(ref.at);
  if (ui.tool === 'picker') {
    ui.color = x.colors[ref.k];
    setTool('pencil');
    return renderPalette();
  }
  snapshot();
  x.colors[ref.k] = ui.color;
  const m = modeApi.ball.mirror(project, ref.at);
  const twin = m !== null ? extraAt(ball, m) : null;
  if (twin && twin.kind === x.kind && twin.colors.length === x.colors.length) twin.colors[extraMirrorIndex(ball, ref.at, ref.k)] = ui.color;
  changed();
}

function motifColors() {
  const m = ui.motif;
  return { main: ui.color, accent: Math.min(m.accent, project.palette.length - 1), side: m.inside ? 'in' : 'out' };
}

function pick(id) {
  const c = modeApi[project.mode].get(project, id);
  if (c === EMPTY) return;
  ui.color = c;
  setTool('pencil');
  renderPalette();
}

function renderChart() {
  const api = modeApi[project.mode];
  chart.set({
    mode: project.mode,
    layout: api.layout(project, ui),
    palette: project.palette,
    beadOf: (c) => beadOf(project, c),
    base: baseBead(project),
    colorOf: (id) => api.get(project, id),
    mirrorOf: (id) => api.mirror(project, id),
  });
}

// Dobiera powiększenie tak, żeby schemat mieścił się na szerokość.
function fitZoom() {
  const layout = modeApi[project.mode].layout(project, ui);
  const avail = $('chartScroller').clientWidth - 90;
  // Pod palec koraliki nie mogą być zbyt drobne — wtedy schemat po prostu się przewija.
  const min = matchMedia('(pointer: coarse)').matches ? 18 : 12;
  chart.zoom = Math.max(min, Math.min(32, Math.floor(avail / layout.width)));
  renderZoom();
}

function renderZoom() {
  $('zoomLabel').textContent = `${Math.round((chart.zoom / 24) * 100)}%`;
}

function renderHover() {
  const id = ui.hover;
  const info = $('hoverInfo');
  if (id === null) {
    info.textContent = 'Wskaż koralik, żeby zobaczyć szczegóły.';
    return;
  }
  const c = modeApi[project.mode].get(project, id);
  const name = c === EMPTY ? 'puste miejsce' : `${project.palette[c].name} (${beadOf(project, c).label})`;
  if (project.mode === 'strand') {
    const role = motifRoleText(project, id);
    info.textContent = `Koralik ${id + 1} z ${project.strand.count}${role ? ` · ${role}` : ''} · ${name}`;
  } else if (project.mode === 'tube') {
    const C = project.tube.around;
    info.textContent = `Rząd ${Math.floor(id / C) + 1}, koralik ${(id % C) + 1} · ${name}`;
  } else if (project.mode === 'ball') {
    const l = locate(project.ball, id);
    const shape = ballShape(l.part.shape);
    const [a, b] = shape.beads[l.local].faces.map((f) => shape.faceStep.get(f) + 1).sort((x, y) => x - y);
    const extra = extraAt(project.ball, id);
    const extraText = !extra ? '' : extra.kind === 'strip' ? ` · pasek ${extraSize(extra)} oczek` : ` · pętelka ${extraSize(extra)} kor.`;
    const where = project.ball.parts.length ? `${partName(project.ball, l.pi)} · ` : '';
    info.textContent = `${where}Koralik ${l.local + 1} z ${shape.count} · między oczkami ${a} i ${b}${extraText} · ${name}`;
  } else if (project.mode === 'stitch') {
    const c = stitchLayoutOf(project).cells[id];
    const st = project.stitch;
    if (st.kind === 'praw') {
      const unit = Math.floor(c.row / 2) + (c.part === 'wall' ? 1 : 0);
      info.textContent = `${c.part === 'wall' ? `Klatka ${unit}, ściana` : unit === 0 ? 'Pierwsza podłoga' : `Klatka ${unit}, sufit`} ${c.col + 1} · ${name}`;
    } else {
      const row = st.kind === 'peyote' ? 2 * c.row + 1 + (c.col % 2) : c.row + 1;
      info.textContent = `Rząd ${row}, ${st.kind === 'ladder' ? 'szczebel' : 'kolumna'} ${c.col + 1} · ${name}`;
    }
  } else {
    const { w, d } = project.figure;
    info.textContent = `Warstwa ${ui.layer + 1} · rząd ${Math.floor(id / w) % d + 1} · kolumna ${(id % w) + 1} · ${name}`;
  }
}

// ---------------------------------------------------------------- podgląd 3D

const preview = new Preview3D($('preview'));
let previewQueued = false;
function schedulePreview() {
  if (previewQueued) return;
  previewQueued = true;
  requestAnimationFrame(() => {
    previewQueued = false;
    const p = project;
    const st = p.stitch;
    const fitKey = [p.mode, p.palette.map((c) => c.bead).join(), baseBead(p).label, p.ball.shape, p.ball.sy, p.ball.sz, p.ball.parts.map((q) => [q.parent, q.at, q.shape, q.sy, q.sz].join(':')).join(';'), st.kind, st.form, st.width, st.rows, st.sides, st.twist, p.strand.count, p.strand.pendant, p.tube.around, p.tube.rows, p.figure.w, p.figure.d, p.figure.h].join('|');
    preview.update(p, ui, fitKey);
  });
}

// ---------------------------------------------------------------- panele

function setNumber(id, v) {
  const el = $(id);
  if (document.activeElement !== el) el.value = v;
}

function renderControls() {
  const p = project;
  $('projectName').value = p.name;
  document.querySelectorAll('.mode-switch button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === p.mode)));
  $('modeHint').textContent = p.mode === 'stitch' ? STITCHES[p.stitch.kind].hint : MODE_HINTS[p.mode];
  renderStitchControls();
  document.querySelectorAll('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(p.mode); });
  renderBallControls();
  setNumber('strandCount', p.strand.count);
  setNumber('strandWrap', p.strand.wrap);
  $('strandSym').checked = p.strand.symmetric;
  $('strandPendant').value = p.strand.pendant;
  setNumber('tubeAround', p.tube.around);
  setNumber('tubeRows', p.tube.rows);
  setNumber('figW', p.figure.w);
  setNumber('figD', p.figure.d);
  setNumber('figH', p.figure.h);
  $('figMirror').checked = p.figure.mirror;
  ui.layer = Math.max(0, Math.min(ui.layer, p.figure.h - 1));
  $('layerLabel').textContent = `Warstwa ${ui.layer + 1}/${p.figure.h}`;
  $('buildView').checked = ui.buildView;
  if ((p.mode !== 'figure' && ui.tool === 'eraser') || (!['strand', 'ball'].includes(p.mode) && ui.tool === 'motif')) setTool('pencil');
  document.title = `${p.name} · Beads Designer`;
}

function renderBallControls() {
  const ball = project.ball;
  const pi = (ui.ballPart = currentPart(project, ui));
  const b = partAt(ball, pi);
  const esc = (s) => s.replace(/[&<"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;' }[ch]));
  $('ballPart').innerHTML = [-1, ...ball.parts.keys()].map((k) => `<option value="${k}">${esc(partName(ball, k))}</option>`).join('');
  $('ballPart').value = String(pi);
  $('ballPartField').hidden = !ball.parts.length;
  $('ballPartEdit').hidden = pi < 0;
  if (pi >= 0 && document.activeElement !== $('ballPartName')) $('ballPartName').value = b.name;
  $('ballPartHint').hidden = pi < 0;
  if (pi >= 0) $('ballPartHint').textContent = `Doczepiona do oczka ${b.at + 1} (${partName(ball, b.parent)}), łączy się swoim oczkiem ${partJoin(ball, pi) + 1}.`;
  $('ballShape').value = b.shape;
  setNumber('ballSy', b.sy);
  setNumber('ballSz', b.sz);
  $('ballMirror').checked = ball.mirror;
  $('ballThread').checked = ui.thread;
  $('ballThreadHint').hidden = !ui.thread;
  $('partShape').value = ui.partShape;
  $('partAt').max = ballShape(b.shape).steps.length;
  $('partAtOf').textContent = pi < 0 ? 'tułowia' : 'tej kulki';
  const K = EXTRA_KINDS[ui.extraKind];
  $('extraKind').value = ui.extraKind;
  $('extraSizeLabel').textContent = K.unit;
  $('extraSize').min = K.size[0];
  $('extraSize').max = K.size[1];
  setNumber('extraSize', ui.extraSize[ui.extraKind]);
  const steps = ballShape(b.shape).steps.length;
  $('ballStep').max = steps;
  ui.ballStep = Math.min(ui.ballStep, steps);
  setNumber('ballStep', ui.ballStep);
}

function setBallStep(v) {
  const steps = ballShape(partAt(project.ball, currentPart(project, ui)).shape).steps.length;
  ui.ballStep = Math.max(0, Math.min(steps, Math.round(Number(v) || 0)));
  setNumber('ballStep', ui.ballStep);
  schedulePreview();
  if (ui.thread) {
    renderChart();
    const t = modeApi.ball.layout(project, ui).thread;
    if (t) chart.reveal(t.faint[0]);
  }
}

function renderMotifControls() {
  const m = ui.motif, meta = MOTIFS[m.kind];
  $('motifKind').value = m.kind;
  $('motifSizeLabel').textContent = meta.sizeLabel;
  $('motifSize').min = meta.size[0];
  $('motifSize').max = meta.size[1];
  setNumber('motifSize', m.size);
  $('motifAccentField').hidden = !meta.accentLabel;
  $('motifAccentLabel').textContent = meta.accentLabel || '';
  const accent = $('motifAccent');
  accent.innerHTML = project.palette.map((c, i) => `<option value="${i}">${c.name.replace(/[<&]/g, '')}</option>`).join('');
  accent.value = String(Math.min(m.accent, project.palette.length - 1));
  $('motifInsideField').hidden = m.kind !== 'loop';
  $('motifAltField').hidden = m.kind !== 'loop';
  $('motifInside').checked = m.inside;
  $('motifAlt').checked = m.alternate;
}

function renderStitchControls() {
  const st = project.stitch;
  const praw = st.kind === 'praw', tube = st.form === 'tube';
  $('stitchKind').value = st.kind;
  $('stitchForm').value = st.form;
  $('stitchForm').disabled = praw;
  $('stitchWidthField').hidden = praw;
  $('stitchSidesField').hidden = !praw;
  $('stitchSides').value = String(st.sides);
  $('stitchWidthLabel').textContent = tube ? 'Na obwodzie' : STITCHES[st.kind].widthLabel;
  $('stitchWidth').step = st.kind === 'herringbone' ? 2 : 1;
  setNumber('stitchWidth', st.width);
  $('stitchRowsLabel').textContent = praw ? 'Klatek' : 'Rzędów';
  setNumber('stitchRows', visibleRows(st));
  $('stitchTwistField').hidden = !(st.kind === 'herringbone' && tube);
  $('stitchTwist').checked = st.twist;
  $('stitchMirrorField').hidden = tube;
  $('stitchMirror').checked = st.mirror;
  $('stitchRepeatUnit').textContent = praw ? 'klatek' : 'rzędów';
  const thread = hasThread(st) ? stitchThreadAt(project, ui) : null;
  $('stitchThread').checked = ui.thread;
  $('stitchThread').disabled = !thread;
  $('stitchThreadNav').hidden = !(ui.thread && thread);
  if (thread) {
    ui.threadStep = thread.index;
    $('threadLabel').textContent = `${thread.label} · ${thread.index + 1} z ${thread.count}`;
    $('threadPrev').disabled = thread.index === 0;
    $('threadNext').disabled = thread.index === thread.count - 1;
  }
  $('stitchThreadHint').textContent = !thread
    ? 'Dla tego ściegu ścieżki nici jeszcze nie rysujemy — kolejność opisuje instrukcja.'
    : 'Gruba linia ze strzałkami: którędy idzie nić w tym rzędzie (jak w instrukcji). Cienka: poprzedni rząd.';
}

// Przejście do innego rzędu na ścieżce nici — schemat przewija się do niego.
function setThreadStep(i) {
  ui.threadStep = Math.max(0, i);
  renderStitchControls();
  renderChart();
  const t = stitchThreadAt(project, ui);
  if (t) chart.reveal(t.main[0]);
}

function renderPalette() {
  const list = $('palette');
  const counts = countColors(project);
  list.replaceChildren(...project.palette.map((c, i) => {
    const li = document.createElement('li');
    li.className = i === ui.color ? 'active' : '';
    li.dataset.index = i;
    li.innerHTML = `
      <input class="swatch-input" type="color" aria-label="Kolor ${i + 1}" id="pal-color-${i}">
      <span class="meta">
        <input class="name" type="text" maxlength="40" aria-label="Nazwa koloru" id="pal-name-${i}">
        <span class="bead-opts">
          <select class="bead" aria-label="Kształt i rozmiar" id="pal-bead-${i}">${BEAD_OPTIONS}</select>
          <select class="finish" aria-label="Wykończenie" id="pal-finish-${i}">${Object.entries(FINISHES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        </span>
      </span>
      <span class="count"></span>
      <button class="remove" type="button" aria-label="Usuń kolor" title="Usuń kolor">×</button>`;
    li.querySelector('.swatch-input').value = c.hex;
    li.querySelector('.name').value = c.name;
    li.querySelector('.finish').value = c.finish;
    li.querySelector('.bead').value = c.bead;
    li.querySelector('.count').innerHTML = `${i < 9 ? `<span class="key">${i + 1}</span>` : ''}${counts[i]}`;
    li.querySelector('.remove').disabled = project.palette.length <= 1;
    return li;
  }));
  renderCurrentColor();
  renderMotifControls();
}

function renderPaletteCounts() {
  const counts = countColors(project);
  $('palette').querySelectorAll('li').forEach((li, i) => {
    li.querySelector('.count').innerHTML = `${i < 9 ? `<span class="key">${i + 1}</span>` : ''}${counts[i]}`;
  });
}

function renderCurrentColor() {
  const c = project.palette[ui.color];
  $('currentSwatch').style.background = c.hex;
  $('currentName').textContent = c.name;
  $('currentBead').textContent = beadOf(project, ui.color).label;
}

function renderInfo() {
  const p = project;
  const u = usage(p);
  const dim = dimensions(p);
  $('dimInfo').textContent = `${dim.label}: ${dim.value}`;
  const max = Math.max(1, ...u.rows.map((r) => r.n));
  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  $('usagePanel').innerHTML = `
    <div class="usage-summary">
      <div><strong>${u.total}</strong><span>koralików</span></div>
      <div><strong>${u.grams.toFixed(1)} g</strong><span>ok. wagi</span></div>
      <div><strong>${u.rows.length}</strong><span>kolorów</span></div>
    </div>
    <table class="usage-table"><tbody>
      ${u.rows.map((r) => {
        const c = p.palette[r.color];
        return `<tr><td><span class="dot" style="background:${c.hex}"></span>${esc(c.name)}
          <span class="bead-label">${esc(beadOf(p, r.color).label)} · ok. ${beadsPerGram(c.bead)} szt./g</span>
          <div class="bar"><i style="width:${(r.n / max) * 100}%;background:${c.hex}"></i></div></td>
          <td class="num">${r.n} szt.</td><td class="num">${r.grams.toFixed(1)} g</td></tr>`;
      }).join('')}
    </tbody></table>
    <p class="usage-note">Waga to przybliżenie dla japońskich koralików (Miyuki, Toho); dla kształtów innych niż okrągłe 11/0 i Delica szacujemy ją z wymiarów. Kup z zapasem 10–15%.</p>`;
  const steps = instructions(p);
  $('steps').innerHTML = steps.map((l) => {
    if (l.head) return `<li class="head"><strong>${esc(l.head)}</strong><p>${esc(l.note)}</p></li>`;
    if (l.sub) return `<li class="sub">${esc(l.sub)}</li>`;
    const dot = l.color !== undefined && l.color !== EMPTY ? `<span class="dot" style="background:${p.palette[l.color].hex}"></span>` : '';
    return `<li><span class="n">${esc(l.num)}</span><span>${dot}${esc(l.text)}</span></li>`;
  }).join('');
}

// ---------------------------------------------------------------- akcje

function setTool(tool) {
  if (tool === 'motif' && ui.tool !== 'motif') toast('Stuknij koralik — motyw wstawi się za nim. Stuknij motyw, żeby go usunąć.');
  ui.tool = tool;
  document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
}

function setMode(mode) {
  if (project.mode === mode) return;
  project.mode = mode;
  if ((mode !== 'figure' && ui.tool === 'eraser') || (!['strand', 'ball'].includes(mode) && ui.tool === 'motif')) setTool('pencil');
  changed({ structure: true, fit: true });
}

function setLayer(z) {
  ui.layer = Math.max(0, Math.min(project.figure.h - 1, z));
  $('layerLabel').textContent = `Warstwa ${ui.layer + 1}/${project.figure.h}`;
  renderChart();
  schedulePreview();
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}

// Własne okno potwierdzenia — działa także tam, gdzie confirm() jest zablokowane.
function ask(title, text, buttons) {
  return new Promise((resolve) => {
    $('dialogTitle').textContent = title;
    $('dialogText').textContent = text;
    const box = $('dialogButtons');
    box.replaceChildren(...buttons.map((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `btn${b.primary ? ' btn-primary' : ''}`;
      el.textContent = b.label;
      el.addEventListener('click', () => { $('dialog').hidden = true; resolve(b.value); });
      return el;
    }));
    $('dialog').hidden = false;
    box.lastElementChild?.focus();
  });
}

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const slug = () => (project.name || 'projekt').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projekt';

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    toast('Nie udało się skopiować — zaznacz tekst ręcznie.');
  }
}

function bindNumber(id, apply) {
  $(id).addEventListener('change', (e) => {
    snapshot();
    apply(Number(e.target.value));
    changed({ structure: true, fit: true });
  });
}

function bind() {
  $('projectName').addEventListener('input', (e) => { project.name = e.target.value; document.title = `${project.name} · Beads Designer`; scheduleSave(); });

  document.querySelectorAll('.mode-switch button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

  bindNumber('strandCount', (v) => resizeStrand(project, v));
  bindNumber('strandWrap', (v) => resizeStrand(project, project.strand.count, v));
  bindNumber('tubeAround', (v) => resizeTube(project, v, project.tube.rows));
  bindNumber('tubeRows', (v) => resizeTube(project, project.tube.around, v));
  bindNumber('figW', (v) => resizeFigure(project, v, project.figure.d, project.figure.h));
  bindNumber('figD', (v) => resizeFigure(project, project.figure.w, v, project.figure.h));
  bindNumber('figH', (v) => resizeFigure(project, project.figure.w, project.figure.d, v));

  $('ballShape').innerHTML = Object.entries(BALL_SHAPES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
  $('ballShape').addEventListener('change', (e) => { snapshot(); setBallShape(project, e.target.value, currentPart(project, ui)); changed({ structure: true, fit: true }); });
  const stretch = (v) => Math.max(STRETCH[0], Math.min(STRETCH[1], Math.round((Number(v) || 1) * 10) / 10));
  $('ballSy').addEventListener('change', (e) => { snapshot(); setPartStretch(project.ball, currentPart(project, ui), stretch(e.target.value)); changed({ structure: true }); });
  $('ballSz').addEventListener('change', (e) => { snapshot(); setPartStretch(project.ball, currentPart(project, ui), undefined, stretch(e.target.value)); changed({ structure: true }); });
  $('ballMirror').addEventListener('change', (e) => { project.ball.mirror = e.target.checked; changed(); });
  $('ballPart').addEventListener('change', (e) => {
    ui.ballPart = Number(e.target.value);
    ui.ballStep = 0;
    changed({ structure: true, fit: true });
  });
  $('ballPartName').addEventListener('input', (e) => {
    const q = project.ball.parts[currentPart(project, ui)];
    if (!q) return;
    q.name = e.target.value.slice(0, 40) || 'Kulka';
    $('ballPart').selectedOptions[0].textContent = q.name;
    renderInfo();
    scheduleSave();
  });
  $('ballPartRemove').addEventListener('click', async () => {
    const pi = currentPart(project, ui);
    if (pi < 0) return;
    const ok = await ask('Usunąć kulkę?', `„${partName(project.ball, pi)}” zniknie razem z lustrzaną parą i wszystkim, co było do nich doczepione.`, [
      { label: 'Anuluj', value: false }, { label: 'Usuń', value: true, primary: true },
    ]);
    if (!ok) return;
    snapshot();
    // Rodzic jest na liście przed kulką i jej parą, więc jego numer się nie zmienia.
    const parent = project.ball.parts[pi].parent;
    removePart(project.ball, pi);
    ui.ballPart = parent;
    ui.ballStep = 0;
    changed({ structure: true, fit: true });
  });
  $('partShape').innerHTML = Object.entries(BALL_SHAPES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
  $('partShape').addEventListener('change', (e) => { ui.partShape = e.target.value; });
  $('partAdd').addEventListener('click', () => {
    snapshot();
    const res = addPart(project.ball, currentPart(project, ui), Math.round(Number($('partAt').value)) - 1, ui.partShape, ui.color);
    if (typeof res === 'string') {
      history.undo.pop();
      return toast(res);
    }
    toast(`Doczepiona: ${partName(project.ball, res)}`);
    ui.ballPart = res;
    ui.ballStep = 0;
    changed({ structure: true, fit: true });
  });
  $('extraKind').innerHTML = Object.entries(EXTRA_KINDS).map(([k, x]) => `<option value="${k}">${x.name}</option>`).join('');
  $('extraKind').addEventListener('change', (e) => { ui.extraKind = e.target.value; renderBallControls(); });
  $('extraSize').addEventListener('change', (e) => {
    const K = EXTRA_KINDS[ui.extraKind];
    ui.extraSize[ui.extraKind] = Math.max(K.size[0], Math.min(K.size[1], Math.round(Number(e.target.value) || K.def)));
    setNumber('extraSize', ui.extraSize[ui.extraKind]);
  });
  $('ballStep').addEventListener('change', (e) => setBallStep(e.target.value));
  $('ballThread').addEventListener('change', (e) => {
    ui.thread = e.target.checked;
    renderBallControls();
    // Ścieżka dotyczy jednego oczka — bez wybranego oczka zaczynamy od pierwszego.
    if (ui.thread && !ui.ballStep) setBallStep(1);
    else renderChart();
  });
  $('stitchThread').addEventListener('change', (e) => {
    ui.thread = e.target.checked;
    if (ui.thread) setThreadStep(ui.threadStep);
    else { renderStitchControls(); renderChart(); }
  });
  $('threadPrev').addEventListener('click', () => setThreadStep(ui.threadStep - 1));
  $('threadNext').addEventListener('click', () => setThreadStep(ui.threadStep + 1));
  $('ballStepPrev').addEventListener('click', () => setBallStep(ui.ballStep - 1));
  $('ballStepNext').addEventListener('click', () => setBallStep(ui.ballStep + 1));
  preview.onTap = previewTap;

  $('motifKind').innerHTML = Object.entries(MOTIFS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join('');
  $('motifKind').addEventListener('change', (e) => {
    ui.motif.kind = e.target.value;
    ui.motif.size = MOTIFS[ui.motif.kind].def;
    renderMotifControls();
  });
  $('motifSize').addEventListener('change', (e) => {
    const [lo, hi] = MOTIFS[ui.motif.kind].size;
    ui.motif.size = Math.max(lo, Math.min(hi, Math.round(Number(e.target.value) || lo)));
    renderMotifControls();
  });
  $('motifAccent').addEventListener('change', (e) => { ui.motif.accent = Number(e.target.value); });
  $('motifInside').addEventListener('change', (e) => { ui.motif.inside = e.target.checked; });
  $('motifAlt').addEventListener('change', (e) => { ui.motif.alternate = e.target.checked; });
  $('motifFill').addEventListener('click', () => {
    snapshot();
    const m = ui.motif;
    const n = fillMotifs(project.strand, Number($('motifEvery').value), m.kind, m.size, motifColors(), m.kind === 'loop' && m.alternate);
    changed({ structure: true });
    toast(n ? `Wstawiono motywy: ${n}` : 'Naszyjnik jest za krótki na motywy w takim odstępie');
  });
  $('motifClear').addEventListener('click', () => {
    if (!project.strand.groups.length) return toast('Na naszyjniku nie ma motywów');
    snapshot();
    clearMotifs(project.strand);
    changed({ structure: true });
    toast('Motywy usunięte');
  });

  $('stitchKind').innerHTML = Object.entries(STITCHES).filter(([, s]) => !s.ownMode).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join('');
  const stitchChange = (changes) => {
    snapshot();
    setStitch(project, changes);
    changed({ structure: true, fit: true });
  };
  $('stitchKind').addEventListener('change', (e) => stitchChange({ kind: e.target.value }));
  $('stitchForm').addEventListener('change', (e) => stitchChange({ form: e.target.value }));
  $('stitchSides').addEventListener('change', (e) => stitchChange({ sides: Number(e.target.value) }));
  $('stitchWidth').addEventListener('change', (e) => stitchChange({ width: Number(e.target.value) }));
  $('stitchRows').addEventListener('change', (e) => stitchChange({ rows: rowsFromVisible(project.stitch.kind, e.target.value) }));
  $('stitchTwist').addEventListener('change', (e) => stitchChange({ twist: e.target.checked }));
  $('stitchMirror').addEventListener('change', (e) => { project.stitch.mirror = e.target.checked; changed(); });
  $('stitchRepeat').addEventListener('click', () => {
    snapshot();
    repeatPattern(project, rowsFromVisible(project.stitch.kind, $('stitchRepeatLen').value));
    changed();
    toast(project.stitch.kind === 'praw' ? 'Klatki powielone na cały sznur' : 'Rzędy powielone na całą robótkę');
  });

  $('strandSym').addEventListener('change', (e) => { project.strand.symmetric = e.target.checked; changed(); });
  $('strandPendant').addEventListener('change', (e) => { snapshot(); project.strand.pendant = e.target.value; changed({ structure: true }); });
  $('figMirror').addEventListener('change', (e) => { project.figure.mirror = e.target.checked; changed(); });
  $('strandRepeat').addEventListener('click', () => { snapshot(); repeatPattern(project, Number($('strandRepeatLen').value)); changed(); toast('Wzór powielony na cały sznurek'); });
  $('tubeRepeat').addEventListener('click', () => { snapshot(); repeatPattern(project, Number($('tubeRepeatLen').value)); changed(); toast('Rzędy powielone na cały wężyk'); });
  $('strandMirror').addEventListener('click', () => { snapshot(); mirrorStrand(project); changed(); toast('Prawa połowa jest teraz lustrem lewej'); });
  $('shapeAdd').addEventListener('click', () => { snapshot(); addShape(project, $('shapeKind').value, ui.color); changed(); });
  $('figHollow').addEventListener('click', () => {
    snapshot();
    const n = hollow(project.figure);
    changed();
    toast(n ? `Usunięto ${n} koralików ze środka` : 'Figurka jest już pusta w środku');
  });

  // Paleta: jedna obsługa zdarzeń na całą listę.
  const palette = $('palette');
  palette.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const i = Number(li.dataset.index);
    if (e.target.closest('.remove')) {
      if (project.palette.length <= 1) return;
      snapshot();
      removePaletteColor(project, i);
      ui.color = Math.min(ui.color > i ? ui.color - 1 : ui.color, project.palette.length - 1);
      changed({ palette: true });
      return;
    }
    if (ui.color !== i) {
      ui.color = i;
      palette.querySelectorAll('li').forEach((el, k) => el.classList.toggle('active', k === i));
      renderCurrentColor();
    }
    if (ui.tool === 'picker' || (ui.tool === 'eraser' && !e.target.closest('input, select'))) setTool('pencil');
  });
  palette.addEventListener('focusin', (e) => {
    if (e.target.matches('input, select')) snapshot.pending = JSON.stringify(project);
  });
  palette.addEventListener('input', (e) => {
    const li = e.target.closest('li');
    const c = project.palette[Number(li.dataset.index)];
    if (e.target.classList.contains('swatch-input')) c.hex = e.target.value;
    else if (e.target.classList.contains('name')) c.name = e.target.value || 'Kolor';
    else if (e.target.classList.contains('finish')) c.finish = e.target.value;
    else if (e.target.classList.contains('bead')) c.bead = e.target.value;
    if (snapshot.pending) { history.undo.push(snapshot.pending); history.redo.length = 0; snapshot.pending = null; }
    renderCurrentColor();
    renderChart();
    renderInfo();
    schedulePreview();
    scheduleSave();
  });
  $('addColor').addEventListener('click', () => {
    snapshot();
    const used = new Set(project.palette.map((c) => c.hex.toLowerCase()));
    const hex = SUGGESTED_COLORS.find((h) => !used.has(h)) || '#888888';
    // Nowy kolor dostaje ten sam koralik co aktualny — zwykle dokupuje się kolor tego samego rozmiaru.
    project.palette.push({ name: `Kolor ${project.palette.length + 1}`, hex, finish: 'opaque', bead: project.palette[ui.color].bead });
    ui.color = project.palette.length - 1;
    changed({ palette: true });
    $(`pal-name-${ui.color}`)?.select();
  });

  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('zoomIn').addEventListener('click', () => { chart.setZoom(chart.zoom * 1.2); renderZoom(); });
  $('zoomOut').addEventListener('click', () => { chart.setZoom(chart.zoom / 1.2); renderZoom(); });

  $('layerUp').addEventListener('click', () => setLayer(ui.layer + 1));
  $('layerDown').addEventListener('click', () => setLayer(ui.layer - 1));
  $('layerCopy').addEventListener('click', () => {
    if (ui.layer === 0) return toast('Pod pierwszą warstwą nic nie ma');
    snapshot();
    copyLayer(project, ui.layer - 1, ui.layer);
    changed();
  });
  $('layerClear').addEventListener('click', () => { snapshot(); clearLayer(project, ui.layer); changed(); });
  $('buildView').addEventListener('change', (e) => { ui.buildView = e.target.checked; schedulePreview(); });

  $('tabUsage').addEventListener('click', () => showTab('usage'));
  $('tabSteps').addEventListener('click', () => showTab('steps'));
  $('copySteps').addEventListener('click', () => copyText(instructionsText(project), 'Instrukcja skopiowana'));
  $('savePng').addEventListener('click', async () => download(await chart.toBlob(), `${slug()}-schemat.png`));
  $('fitView').addEventListener('click', () => preview.fit());
  $('shot3d').addEventListener('click', async () => {
    const url = preview.snapshot();
    if (url) download(await (await fetch(url)).blob(), `${slug()}-podglad.png`);
  });

  $('btnNew').addEventListener('click', newProject);
  $('btnLibrary').addEventListener('click', openLibrary);
  $('libClose').addEventListener('click', closeLibrary);
  $('libNew').addEventListener('click', newProject);
  $('libImport').addEventListener('click', () => $('fileInput').click());
  $('libExport').addEventListener('click', exportAll);
  $('library').addEventListener('click', (e) => {
    if (e.target === $('library')) return closeLibrary();
    const btn = e.target.closest('[data-act]');
    if (btn) libraryAction(btn.dataset.act, btn.closest('[data-id]').dataset.id);
  });
  $('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) importFile(file);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushOnHide(); });
  window.addEventListener('pagehide', flushOnHide);
  $('btnSave').addEventListener('click', () => {
    download(new Blob([JSON.stringify(project, null, 1)], { type: 'application/json' }), `${slug()}.beads.json`);
    toast('Projekt zapisany do pliku');
  });

  window.addEventListener('keydown', (e) => {
    if (!$('library').hidden && e.key === 'Escape' && $('dialog').hidden) return closeLibrary();
    if (e.target.closest('input, select, textarea') || !$('dialog').hidden || !$('library').hidden) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'b' || k === 'p') setTool('pencil');
    else if (k === 'g' || k === 'f') setTool('fill');
    else if (k === 'i') setTool('picker');
    else if (k === 'e' && project.mode === 'figure') setTool('eraser');
    else if (k === 'm' && ['strand', 'ball'].includes(project.mode)) setTool('motif');
    else if (k === '+' || k === '=') { chart.setZoom(chart.zoom * 1.2); renderZoom(); }
    else if (k === '-') { chart.setZoom(chart.zoom / 1.2); renderZoom(); }
    else if (k === 'pageup' || k === ']') setLayer(ui.layer + 1);
    else if (k === 'pagedown' || k === '[') setLayer(ui.layer - 1);
    else if (/^[1-9]$/.test(k) && Number(k) <= project.palette.length) {
      ui.color = Number(k) - 1;
      renderPalette();
    }
  });
}

// ---------------------------------------------------------------- moje projekty

const MODE_NAMES = { strand: 'Naszyjnik', tube: 'Wężyk', stitch: 'Ścieg', ball: 'Figurka', figure: 'Figurka warstwami' };

// Przełącza edytor na inny projekt. Nie zapisuje go od nowa — samo otwarcie
// nie zmienia daty „ostatnio zmieniany”.
function showProject(p, id) {
  project = p;
  currentId = id;
  history.undo.length = 0;
  history.redo.length = 0;
  ui.color = 0;
  ui.layer = 0;
  dirty = false;
  library.setMeta('current', id).catch(() => {});
  renderControls();
  fitZoom();
  renderPalette();
  renderChart();
  renderInfo();
  schedulePreview();
}

async function openProject(id) {
  if (id === currentId) return closeLibrary();
  await saveNow({ thumb: true });
  const p = await library.load(id);
  if (!p) return toast('Nie znaleziono projektu');
  showProject(p, id);
  closeLibrary();
  setSaveState('Otwarto z „Moich projektów”');
}

async function addAndOpen(p) {
  await saveNow({ thumb: true });
  const id = await library.add(p);
  showProject(p, id);
  // Miniaturka nowego projektu powstanie, gdy podgląd 3D się narysuje.
  dirty = true;
  setTimeout(() => saveNow({ thumb: true }), 300);
  return id;
}

async function newProject() {
  const choice = await ask('Nowy projekt', 'Obecny projekt zostaje zapisany w „Moich projektach”.', [
    { label: 'Anuluj', value: null },
    { label: 'Przykład', value: 'example' },
    { label: 'Naszyjnik', value: 'strand', primary: true },
    { label: 'Wężyk', value: 'tube', primary: true },
    { label: 'Ścieg', value: 'stitch', primary: true },
    { label: 'Figurka', value: 'ball', primary: true },
    { label: 'Warstwy', value: 'figure' },
  ]);
  if (!choice) return;
  await addAndOpen(choice === 'example' ? createProject() : createBlankProject(choice));
  closeLibrary();
}

function relativeDate(ms) {
  const d = new Date(ms), now = new Date();
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days === 0) return `dziś, ${time}`;
  if (days === 1) return `wczoraj, ${time}`;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

function daysSince(ms) {
  return Math.floor((Date.now() - ms) / 86400000);
}

// Czy warto przypomnieć o kopii zapasowej: nigdy jej nie było albo jest stara,
// a od tamtej pory coś się zmieniło.
function backupOverdue(list, lastExport) {
  if (!list.length) return false;
  if (!lastExport) return true;
  return daysSince(lastExport) >= BACKUP_DAYS && list.some((p) => p.updated > lastExport);
}

async function refreshBackupBadge() {
  const [list, lastExport] = await Promise.all([library.list(), library.getMeta('lastExport')]);
  $('btnLibrary').classList.toggle('has-badge', backupOverdue(list, lastExport));
}

async function renderLibrary() {
  const [list, lastExport] = await Promise.all([library.list(), library.getMeta('lastExport')]);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const note = $('libBackup');
  note.classList.toggle('warn', backupOverdue(list, lastExport));
  note.textContent = !lastExport
    ? 'Projekty są zapisane tylko na tym urządzeniu. „Eksportuj wszystkie” zapisze je w jednym pliku — np. w aplikacji Pliki albo na iCloud Drive.'
    : `Ostatnia kopia zapasowa: ${relativeDate(lastExport)}${daysSince(lastExport) >= BACKUP_DAYS ? ' — czas na nową.' : '.'}`;
  $('libCount').textContent = `${list.length} ${list.length === 1 ? 'projekt' : list.length % 10 >= 2 && list.length % 10 <= 4 && (list.length % 100 < 12 || list.length % 100 > 14) ? 'projekty' : 'projektów'}`;
  $('libList').innerHTML = list.map((p) => `
    <li class="lib-card${p.id === currentId ? ' current' : ''}" data-id="${esc(p.id)}">
      <button type="button" class="lib-open" data-act="open">
        <span class="lib-thumb">${p.thumb ? `<img src="${p.thumb}" alt="">` : ''}</span>
        <span class="lib-name">${esc(p.name || 'Bez nazwy')}</span>
        <span class="lib-meta">${MODE_NAMES[p.mode] || ''} · ${relativeDate(p.updated)}${p.id === currentId ? ' · otwarty' : ''}</span>
      </button>
      <span class="lib-actions">
        <button type="button" class="btn btn-small" data-act="dup">Duplikuj</button>
        <button type="button" class="btn btn-small" data-act="del">Usuń</button>
      </span>
    </li>`).join('');
}

async function openLibrary() {
  await saveNow({ thumb: true });
  await renderLibrary();
  $('library').hidden = false;
  $('libClose').focus();
}

function closeLibrary() {
  $('library').hidden = true;
}

async function libraryAction(act, id) {
  if (act === 'open') return openProject(id);
  if (act === 'dup') {
    await saveNow({ thumb: true });
    await library.duplicate(id);
    toast('Projekt zduplikowany');
    return renderLibrary();
  }
  if (act === 'del') {
    const list = await library.list();
    const p = list.find((q) => q.id === id);
    const ok = await ask('Usunąć projekt?', `„${p?.name || 'Bez nazwy'}” zniknie z tego urządzenia. Tego nie da się cofnąć — chyba że masz go w pliku.`, [
      { label: 'Anuluj', value: false },
      { label: 'Usuń', value: true, primary: true },
    ]);
    if (!ok) return;
    await library.remove(id);
    // Szybka kopia nie może „wskrzesić” usuniętego projektu przy następnym uruchomieniu.
    try { if (readAutosave()?.id === id) localStorage.removeItem(AUTOSAVE_KEY); } catch { /* bez localStorage nie ma kopii */ }
    if (id === currentId) {
      const rest = list.filter((q) => q.id !== id);
      if (rest.length) showProject(await library.load(rest[0].id), rest[0].id);
      else {
        const blank = createBlankProject('strand');
        showProject(blank, await library.add(blank));
      }
    }
    toast('Projekt usunięty');
    await renderLibrary();
    refreshBackupBadge();
  }
}

async function exportAll() {
  await saveNow({ thumb: true });
  const data = await library.exportAll();
  const date = new Date().toISOString().slice(0, 10);
  download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `koraliki-wszystkie-projekty-${date}.beads.json`);
  await library.setMeta('lastExport', Date.now());
  toast(`Wyeksportowano ${data.projects.length} ${data.projects.length === 1 ? 'projekt' : 'projekty'}`);
  await renderLibrary();
  refreshBackupBadge();
}

// „Otwórz plik” niczego nie zastępuje: projekty z pliku dochodzą do biblioteki.
async function importFile(file) {
  let projects;
  try {
    projects = parseImport(JSON.parse(await file.text()));
  } catch {
    return toast('To nie jest plik projektu Beads Designer (.json).');
  }
  if (!projects.length) return toast('W pliku nie ma projektów.');
  await saveNow({ thumb: true });
  const ids = [];
  for (const p of projects) ids.push(await library.add(p));
  showProject(projects[0], ids[0]);
  dirty = true;
  setTimeout(() => saveNow({ thumb: true }), 300);
  toast(projects.length === 1 ? `Dodano „${projects[0].name}”` : `Dodano ${projects.length} projektów`);
  if (!$('library').hidden) renderLibrary();
}

// Pierwsze uruchomienie po aktualizacji: jedyny projekt ze starego zapisu trafia do biblioteki.
async function migrateLegacy() {
  if (await library.getMeta('migratedV1')) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) await library.add(normalizeProject(JSON.parse(raw)));
  } catch { /* uszkodzony stary zapis — pomijamy */ }
  await library.setMeta('migratedV1', true);
}

// Szybka kopia z localStorage jest nowsza niż wpis w bibliotece, gdy aplikacja
// zamknęła się w trakcie zapisu — wtedy ona wygrywa.
async function recoverAutosave() {
  const auto = readAutosave();
  if (!auto?.id || !auto.project) return;
  try {
    const saved = await library.updatedAt(auto.id);
    if (saved === null || saved < auto.updated) await library.save(auto.id, normalizeProject(auto.project), undefined, auto.updated);
  } catch { /* uszkodzona kopia — zostaje wersja z biblioteki */ }
}

function showTab(which) {
  $('tabUsage').setAttribute('aria-selected', String(which === 'usage'));
  $('tabSteps').setAttribute('aria-selected', String(which === 'steps'));
  $('usagePanel').hidden = which !== 'usage';
  $('stepsPanel').hidden = which !== 'steps';
}

// ---------------------------------------------------------------- start

async function start() {
  if (IN_ARTIFACT) document.querySelectorAll('[data-download]').forEach((el) => { el.hidden = true; });
  bind();
  setTool('pencil');
  library = new Library(await openBackend());
  // Prośba, żeby system nie usuwał danych aplikacji, gdy brakuje miejsca.
  navigator.storage?.persist?.().catch(() => {});
  await migrateLegacy();
  await recoverAutosave();
  const list = await library.list();
  const wanted = await library.getMeta('current');
  const id = list.some((p) => p.id === wanted) ? wanted : list[0]?.id;
  if (id) {
    showProject(await library.load(id), id);
    setSaveState('Wczytano z tego urządzenia');
  } else {
    const p = createProject();
    showProject(p, await library.add(p));
    dirty = true;
    setTimeout(() => saveNow({ thumb: true }), 500);
  }
  refreshBackupBadge();
}

start();

// Praca offline tylko na prawdziwej stronie (https), żeby nie przeszkadzała przy pracy lokalnej.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !IN_ARTIFACT) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
