// Rysuje ikony aplikacji (PNG) do instalacji na ekranie początkowym iPada/telefonu.
// Bez zależności: prosty rasteryzator z wygładzaniem i ręcznie złożony plik PNG.
// Uruchom: node scripts/make-icons.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const BG = hex('#fbe3ec');
// Pięć koralików na łuku, jak naszyjnik — te same kolory co znaczek w aplikacji.
const BEADS = ['#ff4f7b', '#f5dc3f', '#93dcc0', '#d3a548', '#86c3ee'].map((c, i) => {
  const t = (i - 2) / 2; // -1..1
  return { x: 0.5 + t * 0.29, y: 0.42 + 0.17 * (1 - t * t), r: 0.105, color: hex(c) };
});

// Kolor jednego punktu ikony (współrzędne 0..1).
function shade(x, y) {
  let col = BG;
  // Nitka: łuk przechodzący przez środki koralików.
  const ty = 0.42 + 0.17 * (1 - ((x - 0.5) / 0.29) ** 2);
  if (Math.abs(y - ty) < 0.011 && x > 0.05 && x < 0.95) col = hex('#b48aa0');
  for (const b of BEADS) {
    const dx = (x - b.x) / b.r, dy = (y - b.y) / (b.r * 1.08);
    const d = Math.hypot(dx, dy);
    if (d > 1) continue;
    let c = mix(b.color, [255, 255, 255], Math.max(0, 0.25 - (dx + dy) * 0.15));
    if (d > 0.86) c = mix(b.color, [0, 0, 0], 0.28); // obwódka
    if (Math.abs(dy) < 0.13 && d <= 0.86) c = mix(c, [0, 0, 0], 0.09); // otwór na nitkę
    const hl = Math.hypot(dx + 0.38, dy + 0.42);
    if (hl < 0.3) c = mix(c, [255, 255, 255], 0.65 * (1 - hl / 0.3));
    col = c;
  }
  return col;
}

function render(size) {
  const ss = 4; // wygładzanie: 4×4 próbki na piksel
  const px = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    px[y * (size * 3 + 1)] = 0; // filtr PNG: brak
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const c = shade((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(acc[k] / (ss * ss));
    }
  }
  return png(size, size, px);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bitów, RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir(path.join(root, 'icons'), { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await writeFile(path.join(root, 'icons', name), render(size));
  console.log(`icons/${name}`);
}
