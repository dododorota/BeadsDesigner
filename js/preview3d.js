// Podgląd 3D: z projektu powstaje lista koralików (pozycja, kierunek otworu, kolor),
// a każdy kolor to jedna siatka instancji, więc nawet tysiące koralików działają płynnie.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { beadType } from './beads.js';
import { EMPTY, baseBead, beadOf } from './model.js';

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

export function buildBeads(p, ui) {
  const b = baseBead(p);
  const extras = [];
  let beads = [];
  if (p.mode === 'strand') {
    const s = p.strand;
    // Każdy koralik zajmuje na nitce tyle, ile ma długości — rurka 6 mm
    // zajmuje więcej miejsca niż koralik 15/0.
    const lengths = s.beads.map((c) => beadOf(p, c).h * 1.02);
    const total = lengths.reduce((a, l) => a + l, 0);
    const gap = Math.max(6, b.d * 3);
    const curve = strandCurve(total + gap);
    let along = gap / 2;
    beads = s.beads.map((color, i) => {
      const { p: pos, tan } = curve.at(along + lengths[i] / 2);
      along += lengths[i];
      return { pos, axis: tan, color };
    });
    extras.push({ kind: 'thread', points: curve.points });
    extras.push({ kind: 'clasp', pos: curve.at(0).p, size: b.d });
    if (s.pendant && p.figure.voxels.some((c) => c !== EMPTY)) {
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
    const { around: C, beads: list } = p.tube;
    const P = C + 0.5;
    const s = b.d * 0.95;
    const rho = (P * s) / (2 * Math.PI);
    const rowH = b.d * 0.95;
    const total = list.length;
    const mid = (total * rowH) / P / 2;
    beads = list.map((color, k) => {
      const th = (2 * Math.PI * k) / P;
      const pos = new THREE.Vector3(rho * Math.cos(th), (k * rowH) / P - mid, rho * Math.sin(th));
      const axis = new THREE.Vector3(-Math.sin(th) * 2 * Math.PI * rho, rowH, Math.cos(th) * 2 * Math.PI * rho).normalize();
      return { pos, axis, color };
    });
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
}
