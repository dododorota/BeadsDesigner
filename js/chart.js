// Schemat 2D: rysuje koraliki na kanwie i zamienia kliknięcia na numery koralików.
// Nie zna trybów ani narzędzi — dostaje gotowy układ z model.js.

import { EMPTY } from './model.js';

const MARGIN = { left: 40, top: 26, right: 16, bottom: 16 };

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

// Gotowe obrazki pojedynczych koralików, żeby nie liczyć gradientów tysiące razy.
const spriteCache = new Map();
function beadSprite(color, shape, size, dpr) {
  const key = `${color.hex}|${color.finish}|${shape}|${size}|${dpr}`;
  let c = spriteCache.get(key);
  if (c) return c;
  if (spriteCache.size > 400) spriteCache.clear();
  c = document.createElement('canvas');
  const px = Math.max(2, Math.round(size * dpr));
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.scale(px / 100, px / 100);
  const { hex, finish } = color;
  g.beginPath();
  if (shape === 'side') {
    // Koralik widziany z boku na nitce: beczułka szersza niż dłuższa.
    g.roundRect(11, 4, 78, 92, 30);
  } else {
    g.arc(50, 50, 45, 0, Math.PI * 2);
  }
  g.globalAlpha = finish === 'transparent' ? 0.78 : 1;
  const body = g.createLinearGradient(0, 0, 100, 100);
  if (finish === 'metallic') {
    body.addColorStop(0, shade(hex, 0.55));
    body.addColorStop(0.45, hex);
    body.addColorStop(0.7, shade(hex, -0.35));
    body.addColorStop(1, shade(hex, 0.15));
  } else {
    body.addColorStop(0, shade(hex, finish === 'matte' ? 0.08 : 0.18));
    body.addColorStop(1, shade(hex, finish === 'matte' ? -0.12 : -0.22));
  }
  g.fillStyle = body;
  g.fill();
  g.globalAlpha = 1;
  g.lineWidth = 3;
  g.strokeStyle = shade(hex, -0.38);
  g.stroke();
  // Otwór / nitka.
  if (shape === 'side') {
    g.fillStyle = shade(hex, -0.3);
    g.globalAlpha = finish === 'transparent' ? 0.55 : 0.18;
    g.fillRect(11, 44, 78, 12);
  } else {
    g.beginPath();
    g.arc(50, 50, 13, 0, Math.PI * 2);
    g.fillStyle = shade(hex, -0.45);
    g.globalAlpha = 0.55;
    g.fill();
  }
  g.globalAlpha = 1;
  if (finish !== 'matte') {
    const hl = g.createRadialGradient(34, 28, 2, 34, 28, finish === 'pearl' ? 34 : 24);
    hl.addColorStop(0, `rgba(255,255,255,${finish === 'pearl' ? 0.75 : 0.6})`);
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.fillRect(0, 0, 100, 100);
  }
  spriteCache.set(key, c);
  return c;
}

export class ChartEditor {
  constructor(scroller, handlers) {
    this.scroller = scroller;
    this.handlers = handlers;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'chart-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Schemat wzoru — kliknij koralik, aby go pomalować');
    scroller.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.zoom = 24;
    this.hover = null;
    this.drawing = false;
    this.lastPt = null;
    this.data = null;
    this.bindEvents();
  }

  set(data) {
    this.data = data;
    this.render();
  }

  setZoom(z) {
    this.zoom = Math.max(8, Math.min(64, Math.round(z)));
    this.render();
  }

  toChart(evt) {
    const r = this.canvas.getBoundingClientRect();
    return { x: evt.clientX - r.left, y: evt.clientY - r.top };
  }

  hit(pt) {
    if (!this.data) return null;
    const S = this.zoom;
    const fx = (pt.x - MARGIN.left) / S, fy = (pt.y - MARGIN.top) / S;
    let best = null, bestD = 0.62 * 0.62;
    for (const c of this.data.layout.cells) {
      const dx = c.x + 0.5 - fx, dy = c.y + 0.5 - fy;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c.id; }
    }
    return best;
  }

  bindEvents() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      const id = this.hit(this.toChart(e));
      if (id === null) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      this.drawing = true;
      this.lastPt = this.toChart(e);
      this.lastId = id;
      this.handlers.down(id, e);
    });
    cv.addEventListener('pointermove', (e) => {
      const pt = this.toChart(e);
      if (this.drawing) {
        // Przy szybkim ruchu sprawdzamy punkty pośrednie, żeby nie zostawały dziury.
        const steps = Math.max(1, Math.ceil(Math.hypot(pt.x - this.lastPt.x, pt.y - this.lastPt.y) / (this.zoom / 3)));
        for (let i = 1; i <= steps; i++) {
          const id = this.hit({ x: this.lastPt.x + ((pt.x - this.lastPt.x) * i) / steps, y: this.lastPt.y + ((pt.y - this.lastPt.y) * i) / steps });
          if (id !== null && id !== this.lastId) { this.lastId = id; this.handlers.drag(id, e); }
        }
        this.lastPt = pt;
      }
      const h = this.hit(pt);
      if (h !== this.hover) {
        this.hover = h;
        this.handlers.hover(h);
        this.render();
      }
    });
    const end = () => {
      if (!this.drawing) return;
      this.drawing = false;
      this.handlers.up();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => {
      if (this.hover !== null && !this.drawing) { this.hover = null; this.handlers.hover(null); this.render(); }
    });
    cv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const id = this.hit(this.toChart(e));
      if (id !== null) this.handlers.pick(id);
    });
    this.scroller.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      this.setZoom(this.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      this.handlers.zoom?.(this.zoom);
    }, { passive: false });
  }

  render() {
    if (!this.data) return;
    const { layout, colorOf, palette, mirrorOf } = this.data;
    const S = this.zoom;
    const dpr = window.devicePixelRatio || 1;
    const W = MARGIN.left + layout.width * S + MARGIN.right;
    const H = MARGIN.top + layout.height * S + MARGIN.bottom;
    const cv = this.canvas;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
    }
    const css = getComputedStyle(this.scroller);
    const tok = (n) => css.getPropertyValue(n).trim();
    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // Etykiety rzędów i kolumn.
    g.font = `${Math.max(9, Math.min(12, S * 0.45))}px ${tok('--font-mono') || 'monospace'}`;
    g.fillStyle = tok('--ink-soft');
    g.textBaseline = 'middle';
    g.textAlign = 'right';
    const thin = S < 16;
    const skip = (n) => thin && n !== 1 && n % 5 !== 0;
    for (const l of layout.rowLabels) {
      if (this.data.mode !== 'strand' && skip(Number(l.text))) continue;
      g.fillText(l.text, MARGIN.left - 8, MARGIN.top + (l.y + 0.5) * S);
    }
    g.textAlign = 'center';
    for (const l of layout.colLabels) {
      if (skip(l.x + 1)) continue;
      g.fillText(l.text, MARGIN.left + (l.x + 0.5) * S, MARGIN.top - 12);
    }

    // Co piąta / dziesiąta linia pomocnicza na siatce kwadratowej (figurka i sznurek).
    if (this.data.mode !== 'tube') {
      g.strokeStyle = tok('--grid-line');
      g.lineWidth = 1;
      for (let x = 5; x < layout.width; x += 5) {
        g.beginPath();
        g.moveTo(MARGIN.left + x * S + 0.5, MARGIN.top);
        g.lineTo(MARGIN.left + x * S + 0.5, MARGIN.top + layout.height * S);
        g.stroke();
      }
      if (this.data.mode === 'figure') {
        for (let y = 5; y < layout.height; y += 5) {
          g.beginPath();
          g.moveTo(MARGIN.left, MARGIN.top + y * S + 0.5);
          g.lineTo(MARGIN.left + layout.width * S, MARGIN.top + y * S + 0.5);
          g.stroke();
        }
      }
    }

    // Warstwa poniżej (tylko figurka), jako blady podkład.
    if (layout.ghost) {
      g.globalAlpha = 0.22;
      for (const c of layout.ghost) {
        const sp = beadSprite(palette[c.color] || palette[0], 'top', S, dpr);
        g.drawImage(sp, MARGIN.left + c.x * S + S * 0.15, MARGIN.top + c.y * S + S * 0.15, S * 0.7, S * 0.7);
      }
      g.globalAlpha = 1;
    }

    const empty = tok('--empty-dot');
    for (const c of layout.cells) {
      const col = colorOf(c.id);
      const x = MARGIN.left + c.x * S, y = MARGIN.top + c.y * S;
      if (col === EMPTY) {
        g.beginPath();
        g.arc(x + S / 2, y + S / 2, Math.max(1.2, S * 0.09), 0, Math.PI * 2);
        g.fillStyle = empty;
        g.fill();
        continue;
      }
      const sp = beadSprite(palette[col] || palette[0], layout.shape, S, dpr);
      g.drawImage(sp, x, y, S, S);
    }

    // Środek naszyjnika.
    g.fillStyle = tok('--accent');
    for (const id of layout.marks) {
      const c = layout.cells[id];
      if (!c) continue;
      const cx = MARGIN.left + (c.x + 0.5) * S, y = MARGIN.top + c.y * S;
      g.beginPath();
      g.moveTo(cx - 4, y - 7);
      g.lineTo(cx + 4, y - 7);
      g.lineTo(cx, y - 2);
      g.fill();
    }

    // Podświetlenie koralika pod kursorem i jego lustrzanego odbicia.
    const ring = (id, dashed) => {
      const c = layout.cells.find((q) => q.id === id);
      if (!c) return;
      g.save();
      g.strokeStyle = tok('--accent');
      g.lineWidth = 2;
      if (dashed) g.setLineDash([3, 3]);
      g.beginPath();
      g.arc(MARGIN.left + (c.x + 0.5) * S, MARGIN.top + (c.y + 0.5) * S, S * 0.56, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    };
    if (this.hover !== null) {
      ring(this.hover, false);
      const m = mirrorOf?.(this.hover);
      if (m !== null && m !== undefined && m !== this.hover) ring(m, true);
    }
  }

  toBlob() {
    return new Promise((res) => this.canvas.toBlob(res, 'image/png'));
  }
}
