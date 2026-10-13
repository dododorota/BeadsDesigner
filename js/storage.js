// Biblioteka projektów: wiele projektów zapisanych na tym urządzeniu.
//
// Na stronie dane trzymamy w IndexedDB — mieści dużo więcej niż localStorage
// i nie zatrzymuje aplikacji przy zapisie. Gdy IndexedDB nie działa, używamy
// localStorage, a w ostateczności pamięci (do zamknięcia karty). Aplikacja
// natywna na iPada (etap 1c) dostanie tu kolejny „backend” — pliki w Dokumentach —
// z tym samym zestawem metod: all, get, put, del, getMeta, setMeta.

import { normalizeProject } from './model.js';

export const LIBRARY_FORMAT = 'beadsdesigner-library';

// ---------------------------------------------------------------- backendy

function idbBackend() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('beadsdesigner', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('projects', { keyPath: 'id' });
      req.result.createObjectStore('meta');
    };
    req.onblocked = () => reject(new Error('IndexedDB zablokowane'));
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const run = (store, mode, fn) => new Promise((res, rej) => {
        const tx = db.transaction(store, mode);
        const r = fn(tx.objectStore(store));
        tx.oncomplete = () => res(r.result);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      });
      resolve({
        kind: 'indexeddb',
        all: () => run('projects', 'readonly', (s) => s.getAll()),
        get: (id) => run('projects', 'readonly', (s) => s.get(id)),
        put: (rec) => run('projects', 'readwrite', (s) => s.put(rec)),
        del: (id) => run('projects', 'readwrite', (s) => s.delete(id)),
        getMeta: (k) => run('meta', 'readonly', (s) => s.get(k)),
        setMeta: (k, v) => run('meta', 'readwrite', (s) => s.put(v, k)),
      });
    };
  });
}

// Wszystko w jednym wpisie typu klucz–wartość (localStorage albo zwykła mapa w testach).
export function kvBackend(kv, kind = 'localstorage') {
  const KEY = 'beadsdesigner.library';
  const read = () => {
    try { return JSON.parse(kv.getItem(KEY)) || { projects: {}, meta: {} }; } catch { return { projects: {}, meta: {} }; }
  };
  const write = (d) => kv.setItem(KEY, JSON.stringify(d));
  const edit = async (fn) => { const d = read(); fn(d); write(d); };
  return {
    kind,
    all: async () => Object.values(read().projects),
    get: async (id) => read().projects[id],
    put: (rec) => edit((d) => { d.projects[rec.id] = rec; }),
    del: (id) => edit((d) => { delete d.projects[id]; }),
    getMeta: async (k) => read().meta[k],
    setMeta: (k, v) => edit((d) => { d.meta[k] = v; }),
  };
}

export function memoryKV() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

export async function openBackend() {
  if (typeof indexedDB !== 'undefined') {
    try { return await idbBackend(); } catch { /* np. tryb prywatny w starszym Safari */ }
  }
  try {
    localStorage.setItem('beadsdesigner.test', '1');
    localStorage.removeItem('beadsdesigner.test');
    return kvBackend(localStorage);
  } catch {
    return kvBackend(memoryKV(), 'memory');
  }
}

// ---------------------------------------------------------------- biblioteka

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export class Library {
  constructor(backend) {
    this.backend = backend;
  }

  // Lista do ekranu „Moje projekty”: od ostatnio zmienianego, bez treści projektów.
  async list() {
    const all = await this.backend.all();
    return all
      .map(({ id, name, mode, updated, thumb }) => ({ id, name, mode, updated, thumb }))
      .sort((a, b) => b.updated - a.updated);
  }

  async load(id) {
    const rec = await this.backend.get(id);
    return rec ? normalizeProject(rec.project) : null;
  }

  async updatedAt(id) {
    return (await this.backend.get(id))?.updated ?? null;
  }

  // Bez nowej miniaturki zostaje poprzednia.
  async save(id, project, thumb, updated = Date.now()) {
    const prev = thumb === undefined ? await this.backend.get(id) : null;
    await this.backend.put({
      id,
      name: project.name,
      mode: project.mode,
      updated,
      thumb: thumb === undefined ? prev?.thumb ?? null : thumb,
      project,
    });
  }

  async add(project, thumb = null) {
    const id = newId();
    await this.save(id, project, thumb);
    return id;
  }

  async duplicate(id) {
    const rec = await this.backend.get(id);
    if (!rec) return null;
    const copy = normalizeProject(JSON.parse(JSON.stringify(rec.project)));
    copy.name = `${copy.name} (kopia)`;
    return this.add(copy, rec.thumb);
  }

  remove(id) {
    return this.backend.del(id);
  }

  getMeta(k) {
    return this.backend.getMeta(k);
  }

  setMeta(k, v) {
    return this.backend.setMeta(k, v);
  }

  // Jeden plik ze wszystkimi projektami — kopia zapasowa albo przeniesienie na inne urządzenie.
  async exportAll() {
    const all = await this.backend.all();
    all.sort((a, b) => b.updated - a.updated);
    return {
      format: LIBRARY_FORMAT,
      version: 1,
      exported: new Date().toISOString(),
      projects: all.map(({ updated, project }) => ({ updated, project })),
    };
  }
}

// Plik z „Otwórz” może być jednym projektem albo całą biblioteką z eksportu.
export function parseImport(data) {
  if (data && data.format === LIBRARY_FORMAT) {
    if (!Array.isArray(data.projects)) throw new Error('Pusty plik biblioteki.');
    return data.projects.map((p) => normalizeProject(p.project));
  }
  return [normalizeProject(data)];
}
