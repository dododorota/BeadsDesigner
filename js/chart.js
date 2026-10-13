// Schemat 2D: rysuje koraliki na kanwie i zamienia kliknięcia na numery koralików.
// Nie zna trybów ani narzędzi — dostaje gotowy układ z model.js.

import { EMPTY } from './model.js';

const MARGIN = { left: 40, top: 26, right: 16, bottom: 16 };
const LONG_PRESS_MS = 450;
const TAP_SLOP = 8; // px, o ile palec może drgnąć, żeby to nadal było stuknięcie

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

// Zarys koralika w kwadracie 100×100. `view` to 'side' (z boku, nitka poziomo)
// albo 'top' (patrzymy wzdłuż otworu, jak w figurce).
function beadPath(g, shape, view) {
  g.beginPath();
  const poly = (pts) => { g.moveTo(...pts[0]); for (const pt of pts.slice(1)) g.lineTo(...pt); g.closePath(); };
  switch (shape) {
    case 'cube': g.roundRect(8, 8, 84, 84, 8); break;
    case 'tila': g.roundRect(4, 14, 92, 72, 10); break;
    case 'triangle': poly([[50, 6], [95, 90], [5, 90]]); break;
    case 'bicone': poly([[50, 3], [97, 50], [50, 97], [3, 50]]); break;
    case 'drop':
      g.moveTo(50, 4);
      g.bezierCurveTo(70, 26, 86, 42, 86, 62);
      g.arc(50, 62, 36, 0, Math.PI);
      g.bezierCurveTo(14, 42, 30, 26, 50, 4);
      break;
    case 'pearl': g.arc(50, 50, 47, 0, Math.PI * 2); break;
    default:
      if (view !== 'side') g.arc(50, 50, 45, 0, Math.PI * 2);
      else if (shape === 'bugle') g.roundRect(2, 26, 96, 48, 10);
      else if (shape === 'demi') g.roundRect(26, 4, 48, 92, 18);
      else if (shape === 'cylinder') g.roundRect(9, 6, 82, 88, 10);
      else g.roundRect(11, 4, 78, 92, 30); // rocaille: beczułka
  }
}

// Gotowe obrazki pojedynczych koralików, żeby nie liczyć gradientów tysiące razy.
const spriteCache = new Map();
function beadSprite(color, view, shape, size, dpr) {
  const px = Math.max(2, Math.round(size * dpr));
  const key = `${color.hex}|${color.finish}|${view}|${shape}|${px}`;
  let c = spriteCache.get(key);
  if (c) return c;
  if (spriteCache.size > 400) spriteCache.clear();
  c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.scale(px / 100, px / 100);
  const { hex, finish } = color;
  beadPath(g, shape, view);
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
  const holes = shape === 'drop' ? [[50, 22, 7]] : shape === 'tila' && view !== 'side' ? [[28, 50, 9], [72, 50, 9]] : [[50, 50, 13]];
  if (view === 'side' && shape !== 'drop') {
    g.save();
    g.clip();
    g.fillStyle = shade(hex, -0.3);
    g.globalAlpha = finish === 'transparent' ? 0.55 : 0.18;
    if (shape === 'tila') { g.fillRect(0, 28, 100, 9); g.fillRect(0, 63, 100, 9); } else g.fillRect(0, 44, 100, 12);
    g.restore();
  } else {
    g.fillStyle = shade(hex, -0.45);
    g.globalAlpha = 0.55;
    for (const [x, y, r] of holes) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
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
    this.canvas.setAttribute('aria-label', 'Schemat wzoru — kliknij albo stuknij koralik, aby go pomalować');
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
    z = Math.max(8, Math.min(64, Math.round(z)));
    if (z === this.zoom) return;
    this.zoom = z;
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

  // Mysz i rysik malują od razu. Palec czeka chwilę, żeby odróżnić stuknięcie,
  // przeciągnięcie, przytrzymanie (pipeta) i gest dwoma palcami (przybliżanie).
  // Gdy pojawi się Apple Pencil, palec tylko przesuwa schemat, a maluje rysik.
  bindEvents() {
    const cv = this.canvas;
    this.pointers = new Map();
    this.penSeen = false;
    this.pending = null;
    this.gesture = null;
    this.lastType = 'mouse';

    cv.addEventListener('pointerdown', (e) => {
      this.lastType = e.pointerType;
      if (e.button === 2) return;
      if (e.pointerType === 'pen' && !this.penSeen) {
        this.penSeen = true;
        this.handlers.penDetected?.();
      }
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch { /* np. wskaźnik już puszczony */ }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      const pt = this.toChart(e);
      const id = this.hit(pt);
      if (e.pointerType !== 'touch') {
        if (id !== null) this.beginStroke(id, pt, e.pointerId);
        return;
      }
      if (this.touches().length >= 2) {
        this.cancelPending();
        if (this.drawing) { this.drawing = false; this.handlers.cancel?.(); }
        this.startPinch();
        return;
      }
      if (id === null) { this.gesture = { kind: 'pan', pointerId: e.pointerId, x: e.clientX, y: e.clientY }; return; }
      this.pending = {
        id, pt, pointerId: e.pointerId, x: e.clientX, y: e.clientY,
        timer: setTimeout(() => this.longPress(), LONG_PRESS_MS),
      };
    });

    cv.addEventListener('pointermove', (e) => {
      const rec = this.pointers.get(e.pointerId);
      if (rec) { rec.x = e.clientX; rec.y = e.clientY; }
      const g = this.gesture;
      if (g?.kind === 'pinch') { this.updatePinch(); return; }
      if (g?.kind === 'pan' && g.pointerId === e.pointerId) {
        this.scroller.scrollLeft -= e.clientX - g.x;
        this.scroller.scrollTop -= e.clientY - g.y;
        g.x = e.clientX; g.y = e.clientY;
        return;
      }
      const pend = this.pending;
      if (pend && pend.pointerId === e.pointerId) {
        if (Math.hypot(e.clientX - pend.x, e.clientY - pend.y) < TAP_SLOP) return;
        this.cancelPending();
        if (this.penSeen) {
          this.gesture = { kind: 'pan', pointerId: e.pointerId, x: pend.x, y: pend.y };
          return;
        }
        this.beginStroke(pend.id, pend.pt, e.pointerId);
      }
      const pt = this.toChart(e);
      if (this.drawing && e.pointerId === this.strokePointer) {
        // Przy szybkim ruchu sprawdzamy punkty pośrednie, żeby nie zostawały dziury.
        const steps = Math.max(1, Math.ceil(Math.hypot(pt.x - this.lastPt.x, pt.y - this.lastPt.y) / (this.zoom / 3)));
        for (let i = 1; i <= steps; i++) {
          const id = this.hit({ x: this.lastPt.x + ((pt.x - this.lastPt.x) * i) / steps, y: this.lastPt.y + ((pt.y - this.lastPt.y) * i) / steps });
          if (id !== null && id !== this.lastId) { this.lastId = id; this.handlers.drag(id, e); }
        }
        this.lastPt = pt;
      }
      if (e.pointerType !== 'touch' || this.drawing) this.setHover(this.hit(pt));
    });

    const end = (e) => {
      this.pointers.delete(e.pointerId);
      const pend = this.pending;
      if (pend && pend.pointerId === e.pointerId) {
        this.cancelPending();
        // Krótkie stuknięcie palcem maluje jeden koralik (albo wypełnia).
        if (e.type === 'pointerup' && !this.penSeen) { this.beginStroke(pend.id, pend.pt, e.pointerId); this.endStroke(); }
      }
      const g = this.gesture;
      if (g && (g.kind === 'pinch' ? this.touches().length < 2 : g.pointerId === e.pointerId)) this.gesture = null;
      if (this.drawing && e.pointerId === this.strokePointer) this.endStroke();
      if (e.pointerType === 'touch' && this.pointers.size === 0) this.setHover(null);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch' && !this.drawing) this.setHover(null);
    });
    cv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Na dotyku pipetą jest przytrzymanie palca, więc tu obsługujemy tylko mysz.
      if (this.lastType !== 'mouse') return;
      const id = this.hit(this.toChart(e));
      if (id !== null) this.handlers.pick(id);
    });
    // Safari na iPadzie ma własne gesty przybliżania strony — tu je wyłączamy.
    cv.addEventListener('gesturestart', (e) => e.preventDefault());
    this.scroller.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      this.setZoom(this.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      this.handlers.zoom?.(this.zoom);
    }, { passive: false });
  }

  touches() {
    return [...this.pointers.values()].filter((p) => p.type === 'touch');
  }

  beginStroke(id, pt, pointerId) {
    this.drawing = true;
    this.strokePointer = pointerId;
    this.lastPt = pt;
    this.lastId = id;
    this.setHover(id);
    this.handlers.down(id);
  }

  endStroke() {
    this.drawing = false;
    this.handlers.up();
  }

  cancelPending() {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending = null;
  }

  longPress() {
    const pend = this.pending;
    if (!pend) return;
    this.pending = null;
    this.setHover(pend.id);
    this.handlers.pick(pend.id);
    navigator.vibrate?.(12);
  }

  // Przybliżanie dwoma palcami: punkt schematu pod środkiem palców zostaje pod
  // palcami, więc ten sam gest jednocześnie przybliża i przesuwa.
  startPinch() {
    const [a, b] = this.touches();
    const r = this.canvas.getBoundingClientRect();
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    this.gesture = {
      kind: 'pinch',
      z0: this.zoom,
      d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
      ux: (mx - r.left - MARGIN.left) / this.zoom,
      uy: (my - r.top - MARGIN.top) / this.zoom,
    };
  }

  updatePinch() {
    const [a, b] = this.touches();
    if (!b) return;
    const g = this.gesture;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const before = this.zoom;
    this.setZoom(g.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
    if (this.zoom !== before) this.handlers.zoom?.(this.zoom);
    const r = this.canvas.getBoundingClientRect();
    this.scroller.scrollLeft += r.left + MARGIN.left + g.ux * this.zoom - mx;
    this.scroller.scrollTop += r.top + MARGIN.top + g.uy * this.zoom - my;
  }

  setHover(id) {
    if (id === this.hover) return;
    this.hover = id;
    this.handlers.hover(id);
    this.render();
  }

  render() {
    if (!this.data) return;
    const { layout, colorOf, palette, mirrorOf, beadOf, base } = this.data;
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
    if (this.data.mode === 'strand' || this.data.mode === 'figure') {
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
        const sp = beadSprite(palette[c.color] || palette[0], 'top', beadOf(c.color).shape, S * 0.7, dpr);
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
      // Koraliki mniejsze od podstawowego rysujemy mniejsze, żeby było widać różnicę.
      const t = beadOf(col);
      const k = Math.max(0.55, Math.min(1, t.d / base.d));
      const sp = beadSprite(palette[col] || palette[0], layout.shape, t.shape, S * k, dpr);
      if (c.a) {
        // Ściegi: koralik obrócony tak, jak leży jego otwór (pionowo, jodełka…).
        // Na kanwie oś y rośnie w dół, więc kąt zmienia znak.
        g.save();
        g.translate(x + S / 2, y + S / 2);
        g.rotate(-c.a);
        g.drawImage(sp, (-S * k) / 2, (-S * k) / 2, S * k, S * k);
        g.restore();
      } else {
        g.drawImage(sp, x + (S * (1 - k)) / 2, y + (S * (1 - k)) / 2, S * k, S * k);
      }
    }

    // Motywy na naszyjniku: obwódka wokół ich koralików i znaczek rodzaju.
    if (layout.bands?.length) {
      const glyph = { daisy: '✿', loop: '◯', dangle: '↓' };
      g.save();
      g.strokeStyle = tok('--accent');
      g.lineWidth = 2;
      for (const b of layout.bands) {
        g.beginPath();
        g.roundRect(MARGIN.left + b.x0 * S + 1, MARGIN.top + b.y * S + 1, (b.x1 - b.x0 + 1) * S - 2, S - 2, S * 0.3);
        g.stroke();
        if (b.first && S >= 14) {
          const fx = MARGIN.left + b.x0 * S, fy = MARGIN.top + b.y * S;
          g.fillStyle = tok('--accent');
          g.beginPath();
          g.arc(fx + 2, fy + 2, Math.max(5, S * 0.24), 0, Math.PI * 2);
          g.fill();
          g.fillStyle = tok('--accent-ink');
          g.font = `${Math.max(8, S * 0.32)}px ${tok('--font-body') || 'sans-serif'}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(glyph[b.kind] || '•', fx + 2, fy + 2.5);
        }
      }
      g.restore();
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
