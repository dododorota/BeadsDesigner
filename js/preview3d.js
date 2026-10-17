// Podgląd 3D: z projektu powstaje lista koralików (pozycja, kierunek otworu, kolor),
// a każdy kolor to jedna siatka instancji, więc nawet tysiące koralików działają płynnie.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { beadType } from './beads.js';
import { strandSlots } from './motifs.js';
import { ballColors, ballParts3D, extraBeads3D } from './ball.js';
import { EMPTY, baseBead, beadOf, currentPart, stitchLayoutOf, tubeLayoutOf } from './model.js';

const UP = new THREE.Vector3(0, 1, 0);

// Bryła obrotowa z otworem wzdłuż osi Y: `outer(t)` daje promień zewnętrzny
// dla t od -1 (dół) do 1 (góra).
function latheBead(h, hole, outer, steps = 16, segments = 22) {
  const H = h / 2, rh = hole / 2;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = -1 + (2 * i) / steps;
    pts.push(new THREE.Vector2(Math.max(rh, outer(t)), H * t));
  }
  pts.push(new THREE.Vector2(rh * 0.98, H * 0.96));
  pts.push(new THREE.Vector2(rh * 0.98, -H * 0.96));
  pts.push(pts[0].clone());
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

// Każdy kształt koralika jako siatka z otworem wzdłuż osi Y (kierunek nitki).
function beadGeometry(id) {
  const b = beadType(id);
  const R = b.d / 2, rh = b.hole / 2;
  switch (b.shape) {
    case 'cylinder':
    case 'bugle': {
      // Prawie płaskie ścianki z lekko zaokrąglonym brzegiem.
      const edge = Math.min(0.92, 1 - 0.18 * (b.d / b.h));
      return latheBead(b.h, b.hole, (t) => (Math.abs(t) < edge ? R : rh + (R - rh) * Math.sqrt(Math.max(0, 1 - ((Math.abs(t) - edge) / (1 - edge)) ** 2))), 20, 20);
    }
    case 'cube':
    case 'tila': {
      const g = new THREE.BoxGeometry(b.d, b.h, b.t ?? b.d, 1, 1, 1);
      return g;
    }
    case 'triangle': {
      const g = new THREE.CylinderGeometry(R * 1.1, R * 1.1, b.h, 3, 1);
      g.rotateY(Math.PI / 6);
      return g;
    }
    case 'bicone':
      return latheBead(b.h, b.hole, (t) => R * (1 - Math.abs(t)) + rh, 8, 12);
    case 'pearl':
      return latheBead(b.h, b.hole, (t) => R * Math.sqrt(Math.max(0, 1 - t * t)), 18, 24);
    case 'drop': {
      // Kropla wisi pod nitką: otwór w poprzek, przy węższym końcu.
      const g = new THREE.SphereGeometry(1, 20, 14);
      g.scale(b.h / 2, b.h / 2, b.d / 2);
      g.translate(0, 0, -(b.d / 2 - b.h * 0.35));
      return g;
    }
    default: // round, demi: spłaszczony pierścień (rocaille)
      return latheBead(b.h, b.hole, (t) => rh + (R - rh) * Math.pow(Math.max(0, Math.cos((t * Math.PI) / 2)), 0.55), 14, 22);
  }
}

function beadMaterial(color) {
  const c = new THREE.Color(color.hex);
  switch (color.finish) {
    case 'metallic':
      return new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: 0.22 });
    case 'transparent':
      return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, transparent: true, opacity: 0.72, clearcoat: 1, depthWrite: false });
    case 'matte':
      return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.9 });
    case 'pearl':
      return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff'), iridescence: 0.35 });
    default:
      return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  }
}

// ---------------------------------------------------------------- układy koralików

// Zamknięta pętla naszyjnika ułożona pionowo (jak na popiersiu), zapięcie u góry.
function strandCurve(length) {
  const samples = 1200;
  const raw = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    // Lekko zaostrzona dołem elipsa, przypomina wiszący naszyjnik.
    raw.push(new THREE.Vector3(Math.sin(t) * (1 - 0.12 * (1 - Math.cos(t)) / 2), Math.cos(t) * 1.25, 0));
  }
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + raw[i].distanceTo(raw[i - 1]));
  const scale = length / cum[cum.length - 1];
  return {
    at(s) {
      // s: odległość wzdłuż krzywej (mm) od zapięcia.
      const target = (s / scale);
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid; else hi = mid; }
      const f = (target - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
      const p = raw[lo].clone().lerp(raw[hi], f).multiplyScalar(scale);
      const tan = raw[hi].clone().sub(raw[lo]).normalize();
      return { p, tan };
    },
    points: raw.map((v) => v.clone().multiplyScalar(scale)),
  };
}

function figureBeads(fig, base, maxLayer, offset = new THREE.Vector3()) {
  const { d } = base;
  const { w, d: depth, h, voxels } = fig;
  const out = [];
  const cx = (w - 1) / 2, cy = (depth - 1) / 2;
  const top = maxLayer ?? h - 1;
  for (let z = 0; z <= Math.min(top, h - 1); z++) for (let y = 0; y < depth; y++) for (let x = 0; x < w; x++) {
    const c = voxels[x + y * w + z * w * depth];
    if (c === EMPTY) continue;
    out.push({
      pos: new THREE.Vector3(-(x - cx) * d, z * d * 0.92, -(y - cy) * d).add(offset),
      axis: new THREE.Vector3(1, 0, 0),
      color: c,
      faded: maxLayer !== null && maxLayer !== undefined && z < top,
    });
  }
  return out;
}

// Motyw ułożony wokół punktu na naszyjniku. Naszyjnik leży w płaszczyźnie XY,
// więc „na zewnątrz” to kierunek od środka naszyjnika, a „w dół” to -Y.
function motifBeads(p, g, at, tan) {
  const s = p.strand;
  const color = (k) => s.beads[g.start + k];
  const type = (k) => beadOf(p, color(k));
  let out = new THREE.Vector3(tan.y, -tan.x, 0);
  if (out.dot(at) < 0) out.negate();
  const res = [];
  if (g.kind === 'daisy') {
    // Płatki w kółku wokół środka, w płaszczyźnie naszyjnika; pierwszy płatek od strony, z której idzie nitka.
    const petals = g.n - 1, petal = type(0), center = type(petals);
    const rc = center.d / 2 + petal.d / 2;
    for (let k = 0; k < petals; k++) {
      const phi = Math.PI + (2 * Math.PI * k) / petals;
      const dir = tan.clone().multiplyScalar(Math.cos(phi)).addScaledVector(out, Math.sin(phi));
      const axis = tan.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(out, Math.cos(phi));
      res.push({ pos: at.clone().addScaledVector(dir, rc), axis, color: color(k) });
    }
    res.push({ pos: at.clone(), axis: tan.clone(), color: color(petals) });
  } else if (g.kind === 'loop') {
    // Kółko zaczepione w jednym punkcie, odstające na zewnątrz albo do środka.
    const b = type(0);
    const lens = Array.from({ length: g.n }, (_, k) => type(k).h * 1.05);
    const circ = lens.reduce((a, l) => a + l, 0);
    const R = Math.max(circ / (2 * Math.PI), b.d);
    const side = g.side === 'in' ? -1 : 1;
    const dirOut = out.clone().multiplyScalar(side);
    const c = at.clone().addScaledVector(dirOut, R + b.d * 0.3);
    let acc = 0;
    for (let k = 0; k < g.n; k++) {
      const alpha = (2 * Math.PI * (acc + lens[k] / 2)) / circ * (g.rev ? -1 : 1);
      acc += lens[k];
      const dir = dirOut.clone().multiplyScalar(-Math.cos(alpha)).addScaledVector(tan, Math.sin(alpha));
      const axis = dirOut.clone().multiplyScalar(Math.sin(alpha)).addScaledVector(tan, Math.cos(alpha));
      res.push({ pos: c.clone().addScaledVector(dir, R), axis, color: color(k) });
    }
  } else {
    // Frędzel zwisa pionowo w dół, ostatni koralik (zwrotny) na końcu.
    const down = new THREE.Vector3(0, -1, 0);
    let y = type(0).d * 0.6;
    for (let k = 0; k < g.n; k++) {
      const t = type(k);
      res.push({ pos: at.clone().addScaledVector(down, y + t.h / 2), axis: down.clone(), color: color(k) });
      y += t.h * 1.02;
    }
  }
  return res;
}

// Figurka na krzyż (wszystkie kulki) wyśrodkowana w (0, 0, 0). `ref` mówi, który
// koralik projektu to jest — po stuknięciu w podgląd 3D malujemy właśnie jego.
// `upTo` > 0 pokazuje tylko bieżącą kulkę do tego oczka (nauka kolejności pracy).
function ballBeads(p, base, upTo = 0, offset = new THREE.Vector3(), part = -1) {
  const ball = p.ball;
  const parts = ballParts3D(ball, base);
  const ys = parts.flatMap((g) => g.list.map((q) => q.pos[1] + g.origin[1]));
  const center = new THREE.Vector3(0, (Math.max(...ys) + Math.min(...ys)) / 2, 0).sub(offset);
  const v = (a, g) => new THREE.Vector3(a[0] + g.origin[0], a[1] + g.origin[1], a[2] + g.origin[2]).sub(center);
  const out = [];
  for (const g of parts) {
    let limit = Infinity, current = new Set();
    if (upTo > 0) {
      if (g.pi !== part) continue;
      const steps = g.shape.steps.slice(0, upTo);
      limit = steps.reduce((a, st) => a + st.added.length, 0);
      current = new Set(steps[steps.length - 1].added);
    }
    for (const q of g.list) {
      if (q.id >= limit) continue;
      out.push({
        pos: v(q.pos, g),
        axis: new THREE.Vector3(...q.axis),
        color: g.part.beads[q.id],
        ref: { kind: 'bead', id: g.offset + q.id },
        faded: upTo > 0 && !current.has(q.id),
      });
    }
    if (upTo > 0) continue;
    // Dodatki: pętelka albo pasek z oczek doczepiony do koralika, odstający od figurki.
    for (const x of g.part.extras) {
      const q = g.list[x.at];
      if (!q) continue;
      for (const e of extraBeads3D(x, q, base, (c) => beadOf(p, c))) {
        out.push({ pos: v(e.pos, g), axis: new THREE.Vector3(...e.axis), color: x.colors[e.k], ref: { kind: 'extra', at: g.offset + x.at, k: e.k } });
      }
    }
  }
  return out;
}

// Ścieg płaski leży przodem do kamery; rurka (też wężyk) stoi pionowo. Kąt `a` to kierunek
// otworu w płaszczyźnie robótki (0 = poziomo, π/2 = pionowo).
function stitchBeads(lay, list) {
  const midV = lay.sizeMM.h / 2;
  if (lay.form === 'tube') {
    const rho0 = lay.circ / (2 * Math.PI);
    return lay.cells.map((c) => {
      const th = c.theta ?? (2 * Math.PI * c.u) / lay.circ;
      const rho = c.rho ?? rho0;
      const tangent = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
      const axis = tangent.multiplyScalar(Math.cos(c.a)).add(new THREE.Vector3(0, Math.sin(c.a), 0));
      return { pos: new THREE.Vector3(rho * Math.cos(th), c.v - midV, rho * Math.sin(th)), axis, color: list[c.id] };
    });
  }
  const midU = Math.max(...lay.cells.map((c) => c.u)) / 2;
  return lay.cells.map((c) => ({
    pos: new THREE.Vector3(c.u - midU, c.v - midV, 0),
    axis: new THREE.Vector3(Math.cos(c.a), Math.sin(c.a), 0),
    color: list[c.id],
  }));
}

export function buildBeads(p, ui) {
  const b = baseBead(p);
  const extras = [];
  let beads = [];
  if (p.mode === 'strand') {
    const s = p.strand;
    // Każdy koralik zajmuje na nitce tyle, ile ma długości — rurka 6 mm
    // zajmuje więcej miejsca niż koralik 15/0. Motyw zajmuje tyle, ile jest szeroki.
    const slots = strandSlots(s, (c) => beadOf(p, c));
    const total = slots.reduce((a, sl) => a + sl.len * 1.02, 0);
    const gap = Math.max(6, b.d * 3);
    const curve = strandCurve(total + gap);
    let along = gap / 2;
    for (const sl of slots) {
      const len = sl.len * 1.02;
      const { p: pos, tan } = curve.at(along + len / 2);
      along += len;
      if (sl.type === 'bead') beads.push({ pos, axis: tan, color: s.beads[sl.i] });
      else beads.push(...motifBeads(p, sl.g, pos, tan));
    }
    extras.push({ kind: 'thread', points: curve.points });
    extras.push({ kind: 'clasp', pos: curve.at(0).p, size: b.d });
    if (s.pendant === 'ball') {
      const bottom = curve.at((total + gap) / 2).p;
      const fb = baseBead(p, ballColors(p.ball));
      const ringY = bottom.y - b.d * 2.2;
      const body = ballBeads(p, fb);
      const top = Math.max(...body.map((q) => q.pos.y));
      const shift = new THREE.Vector3(bottom.x, ringY - fb.d - top, 0);
      beads = beads.concat(body.map((q) => ({ ...q, pos: q.pos.add(shift), ref: undefined })));
      extras.push({ kind: 'ring', pos: new THREE.Vector3(bottom.x, ringY, 0), size: b.d });
    }
    if (s.pendant === 'layers' && p.figure.voxels.some((c) => c !== EMPTY)) {
      const bottom = curve.at((total + gap) / 2).p;
      const f = p.figure;
      const fb = baseBead(p, f.voxels.filter((c) => c !== EMPTY));
      // Najwyższa zajęta warstwa wyznacza, gdzie zaczepić zawieszkę.
      let topZ = 0;
      for (let z = 0; z < f.h; z++) if (f.voxels.slice(z * f.w * f.d, (z + 1) * f.w * f.d).some((c) => c !== EMPTY)) topZ = z;
      const ringY = bottom.y - b.d * 2.2;
      const offset = new THREE.Vector3(bottom.x, ringY - fb.d * 1.6 - topZ * fb.d * 0.92, 0);
      beads = beads.concat(figureBeads(f, fb, null, offset));
      extras.push({ kind: 'ring', pos: new THREE.Vector3(bottom.x, ringY, 0), size: b.d });
    }
  } else if (p.mode === 'tube') {
    beads = stitchBeads(tubeLayoutOf(p), p.tube.beads);
  } else if (p.mode === 'stitch') {
    beads = stitchBeads(stitchLayoutOf(p), p.stitch.beads);
  } else if (p.mode === 'ball') {
    beads = ballBeads(p, b, ui.ballStep || 0, undefined, currentPart(p, ui));
  } else {
    beads = figureBeads(p.figure, b, ui.buildView ? ui.layer : null);
  }
  return { beads, extras };
}

// ---------------------------------------------------------------- scena

export class Preview3D {
  constructor(container) {
    this.container = container;
    this.ok = false;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (err) {
      container.innerHTML = '<p class="preview-error">Ta przeglądarka nie obsługuje podglądu 3D (WebGL).</p>';
      return;
    }
    this.ok = true;
    const r = this.renderer;
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.setClearColor(0x000000, 0);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(30, 60, 80);
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f95, 0.6));

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000);
    this.camera.position.set(0, 0, 200);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener('change', () => this.requestRender());

    // Stuknięcie (bez przeciągania) w koralik maluje go — przeciąganie nadal obraca widok.
    this.onTap = null;
    this.raycaster = new THREE.Raycaster();
    const el = r.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 500;
      down = null;
      if (moved > 6 || !quick || !this.onTap) return;
      const ref = this.pick(e.clientX, e.clientY);
      if (ref) this.onTap(ref);
    });

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.geometries = new Map();
    this.materials = new Map();
    this.fitKey = null;

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  resize() {
    if (!this.ok) return;
    const w = this.container.clientWidth || 300, h = this.container.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  requestRender() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      // Wygaszanie obrotu wymaga kilku klatek po puszczeniu myszy.
      if (this.controls.update()) this.requestRender();
      this.renderer.render(this.scene, this.camera);
    });
  }

  // Który koralik jest pod punktem ekranu (albo null).
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = this.group.children.filter((c) => c.isInstancedMesh && c.userData.refs);
    for (const hit of this.raycaster.intersectObjects(meshes, false)) {
      const ref = hit.object.userData.refs[hit.instanceId];
      if (ref) return ref;
    }
    return null;
  }

  geometry(id) {
    if (!this.geometries.has(id)) this.geometries.set(id, beadGeometry(id));
    return this.geometries.get(id);
  }

  material(color, faded) {
    const key = `${color.hex}|${color.finish}|${faded ? 1 : 0}`;
    if (!this.materials.has(key)) {
      const m = beadMaterial(color);
      if (faded) { m.transparent = true; m.opacity = 0.28; m.depthWrite = false; }
      this.materials.set(key, m);
    }
    return this.materials.get(key);
  }

  update(p, ui, fitKey) {
    if (!this.ok) return;
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      if (child.isInstancedMesh) child.dispose();
      if (child.userData.ownGeometry) child.geometry.dispose();
    }
    const { beads, extras } = buildBeads(p, ui);
    const groups = new Map();
    for (const bd of beads) {
      if (bd.color === EMPTY || !p.palette[bd.color]) continue;
      const k = `${bd.color}|${bd.faded ? 1 : 0}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(bd);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (const [k, list] of groups) {
      const [color, faded] = k.split('|').map(Number);
      const mesh = new THREE.InstancedMesh(this.geometry(p.palette[color].bead), this.material(p.palette[color], faded === 1), list.length);
      list.forEach((bd, i) => {
        q.setFromUnitVectors(UP, bd.axis.clone().normalize());
        m4.compose(bd.pos, q, one);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData.refs = list.map((bd) => bd.ref);
      this.group.add(mesh);
    }
    const gold = this.material({ hex: '#d3a548', finish: 'metallic' }, false);
    for (const ex of extras) {
      if (ex.kind === 'thread') {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ex.points), new THREE.LineBasicMaterial({ color: 0x9a92a3 }));
        line.userData.ownGeometry = true;
        this.group.add(line);
      } else if (ex.kind === 'clasp' || ex.kind === 'ring') {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(ex.size * (ex.kind === 'clasp' ? 1.3 : 0.9), ex.size * 0.18, 10, 28), gold);
        torus.position.copy(ex.pos);
        if (ex.kind === 'ring') torus.rotation.y = Math.PI / 2;
        torus.userData.ownGeometry = true;
        this.group.add(torus);
      }
    }
    if (fitKey !== this.fitKey) {
      this.fitKey = fitKey;
      this.fit();
    }
    this.requestRender();
  }

  fit() {
    const box = new THREE.Box3().setFromObject(this.group);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.08;
    this.controls.target.copy(sphere.center);
    const dir = new THREE.Vector3(0.35, 0.3, 1).normalize();
    this.camera.position.copy(sphere.center).addScaledVector(dir, dist);
    this.camera.near = dist / 100;
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.requestRender();
  }

  snapshot() {
    return this.ok ? this.renderer.domElement.toDataURL('image/png') : null;
  }

  // Mała miniaturka do „Moich projektów” (kwadrat ze środka podglądu).
  thumbnail(size = 200) {
    if (!this.ok) return null;
    const src = this.renderer.domElement;
    if (!src.width || !src.height) return null;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const s = Math.min(src.width, src.height);
    c.getContext('2d').drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/png');
  }
}
