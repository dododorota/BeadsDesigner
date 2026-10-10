// Spina interfejs: stan projektu, narzędzia, historia zmian, zapis i podgląd.

import { BEAD_SIZES, FINISHES, SUGGESTED_COLORS } from './beads.js';
import {
  EMPTY, addShape, clearLayer, copyLayer, countColors, createBlankProject, createProject,
  dimensions, floodFill, hollow, instructions, instructionsText, mirrorStrand, modeApi, normalizeProject,
  removePaletteColor, repeatPattern, resizeFigure, resizeStrand, resizeTube, usage,
} from './model.js';
import { ChartEditor } from './chart.js';
import { Preview3D } from './preview3d.js';

const STORAGE_KEY = 'beadsdesigner.project.v1';
const IN_ARTIFACT = Boolean(window.BEADS_ARTIFACT);

const $ = (id) => document.getElementById(id);

const MODE_HINTS = {
  strand: 'Pojedynczy sznurek koralików. Schemat czyta się wierszami od lewej; trójkąt pokazuje środek naszyjnika.',
  tube: 'Wężyk szydełkowy z koralikami. Każdy rząd przesuwa się o pół koralika — tak jak na prawdziwym wężyku.',
  figure: 'Figurka budowana warstwami od dołu. Rysujesz jeden plaster naraz; blade kropki to warstwa poniżej.',
};

// ---------------------------------------------------------------- stan

const restored = loadSaved();
let project = restored || createProject();
const ui = { tool: 'pencil', color: 0, layer: 0, buildView: false, hover: null };
const history = { undo: [], redo: [] };
let strokeChanged = false;
let strokeActive = false;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let saveTimer = null;
function scheduleSave() {
  $('saveState').textContent = 'Zapisywanie…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      $('saveState').textContent = 'Zapisano w przeglądarce';
    } catch {
      $('saveState').textContent = 'Zapisz projekt do pliku';
    }
  }, 400);
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

const chart = new ChartEditor($('chartScroller'), {
  down(id) {
    if (ui.tool === 'picker') return pick(id);
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
  pick,
  hover(id) {
    ui.hover = id;
    renderHover();
  },
  zoom: () => renderZoom(),
});

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
    colorOf: (id) => api.get(project, id),
    mirrorOf: (id) => api.mirror(project, id),
  });
}

// Dobiera powiększenie tak, żeby schemat mieścił się na szerokość.
function fitZoom() {
  const layout = modeApi[project.mode].layout(project, ui);
  const avail = $('chartScroller').clientWidth - 90;
  chart.zoom = Math.max(12, Math.min(32, Math.floor(avail / layout.width)));
  renderZoom();
}

function renderZoom() {
  $('zoomLabel').textContent = `${Math.round((chart.zoom / 24) * 100)}%`;
}

function renderHover() {
  const id = ui.hover;
  const info = $('hoverInfo');
  if (id === null) {
    info.textContent = 'Najedź na koralik, żeby zobaczyć szczegóły.';
    return;
  }
  const c = modeApi[project.mode].get(project, id);
  const name = c === EMPTY ? 'puste miejsce' : project.palette[c].name;
  if (project.mode === 'strand') {
    info.textContent = `Koralik ${id + 1} z ${project.strand.count} · ${name}`;
  } else if (project.mode === 'tube') {
    const C = project.tube.around;
    info.textContent = `Rząd ${Math.floor(id / C) + 1}, koralik ${(id % C) + 1} · ${name}`;
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
    const fitKey = [p.mode, p.beadSize, p.strand.count, p.strand.pendant, p.tube.around, p.tube.rows, p.figure.w, p.figure.d, p.figure.h].join('|');
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
  $('modeHint').textContent = MODE_HINTS[p.mode];
  document.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== p.mode; });
  setNumber('strandCount', p.strand.count);
  setNumber('strandWrap', p.strand.wrap);
  $('strandSym').checked = p.strand.symmetric;
  $('strandPendant').checked = p.strand.pendant;
  setNumber('tubeAround', p.tube.around);
  setNumber('tubeRows', p.tube.rows);
  setNumber('figW', p.figure.w);
  setNumber('figD', p.figure.d);
  setNumber('figH', p.figure.h);
  $('figMirror').checked = p.figure.mirror;
  $('beadSize').value = p.beadSize;
  ui.layer = Math.max(0, Math.min(ui.layer, p.figure.h - 1));
  $('layerLabel').textContent = `Warstwa ${ui.layer + 1}/${p.figure.h}`;
  $('buildView').checked = ui.buildView;
  if (p.mode !== 'figure' && ui.tool === 'eraser') setTool('pencil');
  document.title = `${p.name} · Beads Designer`;
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
        <select class="finish" aria-label="Wykończenie" id="pal-finish-${i}">${Object.entries(FINISHES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      </span>
      <span class="count"></span>
      <button class="remove" type="button" aria-label="Usuń kolor" title="Usuń kolor">×</button>`;
    li.querySelector('.swatch-input').value = c.hex;
    li.querySelector('.name').value = c.name;
    li.querySelector('.finish').value = c.finish;
    li.querySelector('.count').innerHTML = `${i < 9 ? `<span class="key">${i + 1}</span>` : ''}${counts[i]}`;
    li.querySelector('.remove').disabled = project.palette.length <= 1;
    return li;
  }));
  renderCurrentColor();
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
      <div><strong>${u.grams.toFixed(1)} g</strong><span>ok. wagi ${p.beadSize}</span></div>
      <div><strong>${u.rows.length}</strong><span>kolorów</span></div>
    </div>
    <table class="usage-table"><tbody>
      ${u.rows.map((r) => {
        const c = p.palette[r.color];
        return `<tr><td><span class="dot" style="background:${c.hex}"></span>${esc(c.name)}
          <div class="bar"><i style="width:${(r.n / max) * 100}%;background:${c.hex}"></i></div></td>
          <td class="num">${r.n} szt.</td><td class="num">${r.grams.toFixed(1)} g</td></tr>`;
      }).join('')}
    </tbody></table>
    <p class="usage-note">Waga to przybliżenie dla japońskich koralików ${p.beadSize} (ok. ${BEAD_SIZES[p.beadSize].perGram} szt./g). Kup z zapasem 10–15%.</p>`;
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
  ui.tool = tool;
  document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
}

function setMode(mode) {
  if (project.mode === mode) return;
  project.mode = mode;
  if (mode !== 'figure' && ui.tool === 'eraser') setTool('pencil');
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

  $('strandSym').addEventListener('change', (e) => { project.strand.symmetric = e.target.checked; changed(); });
  $('strandPendant').addEventListener('change', (e) => { project.strand.pendant = e.target.checked; changed(); });
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

  $('beadSize').addEventListener('change', (e) => { snapshot(); project.beadSize = e.target.value; changed({ structure: true }); });

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
    project.palette.push({ name: `Kolor ${project.palette.length + 1}`, hex, finish: 'opaque' });
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

  $('btnNew').addEventListener('click', async () => {
    const choice = await ask('Nowy projekt', 'Obecny projekt zostanie zastąpiony. Jeśli chcesz go zachować, najpierw zapisz go do pliku.', [
      { label: 'Anuluj', value: null },
      { label: 'Przykłady', value: 'examples' },
      { label: 'Pusty naszyjnik', value: 'strand', primary: true },
      { label: 'Pusty wężyk', value: 'tube', primary: true },
      { label: 'Pusta figurka', value: 'figure', primary: true },
    ]);
    if (!choice) return;
    snapshot();
    project = choice === 'examples' ? createProject() : createBlankProject(choice);
    ui.color = 0; ui.layer = 0;
    changed({ structure: true, fit: true });
  });
  $('btnOpen').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = normalizeProject(JSON.parse(await file.text()));
      snapshot();
      project = next;
      ui.color = 0; ui.layer = 0;
      changed({ structure: true, fit: true });
      toast(`Wczytano „${project.name}”`);
    } catch {
      toast('To nie jest plik projektu Beads Designer (.json).');
    }
  });
  $('btnSave').addEventListener('click', () => {
    download(new Blob([JSON.stringify(project, null, 1)], { type: 'application/json' }), `${slug()}.beads.json`);
    toast('Projekt zapisany do pliku');
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea') || !$('dialog').hidden) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'b' || k === 'p') setTool('pencil');
    else if (k === 'g' || k === 'f') setTool('fill');
    else if (k === 'i') setTool('picker');
    else if (k === 'e' && project.mode === 'figure') setTool('eraser');
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

function showTab(which) {
  $('tabUsage').setAttribute('aria-selected', String(which === 'usage'));
  $('tabSteps').setAttribute('aria-selected', String(which === 'steps'));
  $('usagePanel').hidden = which !== 'usage';
  $('stepsPanel').hidden = which !== 'steps';
}

// ---------------------------------------------------------------- start

if (IN_ARTIFACT) document.querySelectorAll('[data-download]').forEach((el) => { el.hidden = true; });
bind();
setTool('pencil');
renderControls();
renderPalette();
fitZoom();
renderChart();
renderInfo();
schedulePreview();
$('saveState').textContent = restored ? 'Wczytano z przeglądarki' : '';
