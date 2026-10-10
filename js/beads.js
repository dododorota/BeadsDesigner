// Stałe związane z koralikami: katalog kształtów i rozmiarów, wykończenia, paleta startowa.

// Kształty koralików. Każdy koralik w palecie ma swój kształt i rozmiar,
// więc w jednym projekcie można mieszać np. 11/0 z rurkami i perełkami.
export const SHAPES = {
  round: 'Okrągłe (rocaille)',
  cylinder: 'Cylindry (Delica, Treasure, Aiko)',
  demi: 'Demi round',
  cube: 'Kostki',
  triangle: 'Trójkąty',
  bugle: 'Rurki (bugle)',
  drop: 'Krople i magatamy',
  tila: 'Tile (2 otwory)',
  bicone: 'Bicone',
  pearl: 'Perełki i koraliki okrągłe',
};

// Wymiary w mm: d = szerokość (średnica), h = długość wzdłuż otworu,
// t = grubość (tylko płaskie tile). perGram podajemy tam, gdzie znamy typową
// wartość dla japońskich koralików; dla reszty liczymy ją z wymiarów.
export const BEAD_TYPES = {
  'round-15': { shape: 'round', label: 'Okrągły 15/0', d: 1.5, h: 1.0, hole: 0.6, perGram: 250 },
  'round-11': { shape: 'round', label: 'Okrągły 11/0', d: 2.0, h: 1.4, hole: 0.8, perGram: 110 },
  'round-8': { shape: 'round', label: 'Okrągły 8/0', d: 3.0, h: 2.2, hole: 1.1, perGram: 37 },
  'round-6': { shape: 'round', label: 'Okrągły 6/0', d: 4.0, h: 3.0, hole: 1.5, perGram: 13 },

  'delica-15': { shape: 'cylinder', label: 'Delica 15/0 (DBS)', d: 1.3, h: 1.1, hole: 0.65 },
  'delica-11': { shape: 'cylinder', label: 'Delica 11/0 (DB)', d: 1.6, h: 1.3, hole: 0.8, perGram: 200 },
  'delica-10': { shape: 'cylinder', label: 'Delica 10/0 (DBM)', d: 2.2, h: 1.7, hole: 1.1 },
  'delica-8': { shape: 'cylinder', label: 'Delica 8/0 (DBL)', d: 3.0, h: 2.6, hole: 1.5 },
  'treasure-11': { shape: 'cylinder', label: 'Toho Treasure 11/0', d: 1.8, h: 1.5, hole: 0.9 },
  'aiko-11': { shape: 'cylinder', label: 'Toho Aiko 10,5/0', d: 1.8, h: 1.6, hole: 0.9 },

  'demi-11': { shape: 'demi', label: 'Demi round 11/0', d: 2.2, h: 0.8, hole: 0.9 },
  'demi-8': { shape: 'demi', label: 'Demi round 8/0', d: 3.0, h: 1.3, hole: 1.2 },

  'cube-1.5': { shape: 'cube', label: 'Kostka 1,5 mm', d: 1.5, h: 1.5, hole: 0.6 },
  'cube-1.8': { shape: 'cube', label: 'Kostka 1,8 mm', d: 1.8, h: 1.8, hole: 0.8 },
  'cube-3': { shape: 'cube', label: 'Kostka 3 mm', d: 3.0, h: 3.0, hole: 1.3 },
  'cube-4': { shape: 'cube', label: 'Kostka 4 mm', d: 4.0, h: 4.0, hole: 1.5 },

  'triangle-11': { shape: 'triangle', label: 'Trójkąt 11/0', d: 2.0, h: 1.6, hole: 0.8 },
  'triangle-8': { shape: 'triangle', label: 'Trójkąt 8/0', d: 3.0, h: 2.4, hole: 1.1 },
  'triangle-5': { shape: 'triangle', label: 'Trójkąt 5/0', d: 5.0, h: 4.0, hole: 1.5 },

  'bugle-3': { shape: 'bugle', label: 'Rurka 3 mm (#1)', d: 1.9, h: 3, hole: 0.8 },
  'bugle-6': { shape: 'bugle', label: 'Rurka 6 mm (#2)', d: 1.9, h: 6, hole: 0.8 },
  'bugle-9': { shape: 'bugle', label: 'Rurka 9 mm (#3)', d: 1.9, h: 9, hole: 0.8 },
  'bugle-12': { shape: 'bugle', label: 'Rurka 12 mm (#4)', d: 1.9, h: 12, hole: 0.8 },

  // Krople mają otwór w poprzek, przy węższym końcu; d to długość kropli.
  'drop-3.4': { shape: 'drop', label: 'Kropla 3,4 mm', d: 3.4, h: 2.8, hole: 0.8 },
  'magatama-4': { shape: 'drop', label: 'Magatama 4 mm', d: 4.0, h: 3.0, hole: 0.9 },
  'magatama-long': { shape: 'drop', label: 'Long magatama 4×7 mm', d: 7.0, h: 4.0, hole: 0.9 },

  // Tile mają dwa równoległe otwory; d = szerokość w poprzek otworów.
  'tila': { shape: 'tila', label: 'Tila 5×5 mm', d: 5, h: 5, t: 1.9, hole: 0.8 },
  'half-tila': { shape: 'tila', label: 'Half Tila 5×2,3 mm', d: 5, h: 2.3, t: 1.9, hole: 0.8 },
  'quarter-tila': { shape: 'tila', label: 'Quarter Tila 5×1,2 mm', d: 5, h: 1.2, t: 1.9, hole: 0.8 },

  'bicone-3': { shape: 'bicone', label: 'Bicone 3 mm', d: 3, h: 3, hole: 0.8 },
  'bicone-4': { shape: 'bicone', label: 'Bicone 4 mm', d: 4, h: 4, hole: 0.9 },
  'bicone-6': { shape: 'bicone', label: 'Bicone 6 mm', d: 6, h: 6, hole: 1.0 },

  'pearl-3': { shape: 'pearl', label: 'Perełka 3 mm', d: 3, h: 3, hole: 0.6 },
  'pearl-4': { shape: 'pearl', label: 'Perełka 4 mm', d: 4, h: 4, hole: 0.8 },
  'pearl-6': { shape: 'pearl', label: 'Perełka 6 mm', d: 6, h: 6, hole: 1.0 },
  'pearl-8': { shape: 'pearl', label: 'Perełka 8 mm', d: 8, h: 8, hole: 1.0 },
};

export const DEFAULT_BEAD = 'round-11';

// Stare projekty miały jeden rozmiar dla wszystkich koralików.
export const LEGACY_SIZES = { '15/0': 'round-15', '11/0': 'round-11', '8/0': 'round-8', '6/0': 'round-6' };

export const beadType = (id) => BEAD_TYPES[id] || BEAD_TYPES[DEFAULT_BEAD];

// Objętość szkła w mm³ (bez otworu), z grubsza dla każdego kształtu.
function glassVolume(t) {
  const holeArea = Math.PI * (t.hole / 2) ** 2;
  const r = t.d / 2;
  switch (t.shape) {
    case 'cylinder':
    case 'bugle':
      return Math.PI * r * r * t.h - holeArea * t.h;
    case 'cube':
      return t.d * t.d * t.h - holeArea * t.h;
    case 'triangle':
      return (Math.sqrt(3) / 4) * t.d * t.d * t.h - holeArea * t.h;
    case 'tila':
      return t.d * t.h * t.t - 2 * holeArea * t.h;
    case 'drop':
      return (4 / 3) * Math.PI * (t.d / 2) * (t.h / 2) ** 2 * 0.85;
    case 'bicone':
      return (Math.PI * r * r * t.h) / 3 - holeArea * t.h;
    case 'pearl':
      return (4 / 3) * Math.PI * r ** 3 - holeArea * t.h;
    default: // round, demi: zaokrąglony pierścień
      return Math.PI * r * r * t.h * 0.78 - holeArea * t.h;
  }
}

// Gęstość dobrana tak, żeby okrągłe 11/0 wychodziły ok. 110 szt./g.
const MG_PER_MM3 = 1000 / 110 / glassVolume(BEAD_TYPES['round-11']);

export function beadsPerGram(id) {
  const t = beadType(id);
  return t.perGram ?? Math.max(1, Math.round(1000 / (glassVolume(t) * MG_PER_MM3)));
}

export function beadsToGrams(count, id) {
  return count / beadsPerGram(id);
}

export const FINISHES = {
  opaque: 'Nieprzezroczysty',
  transparent: 'Przezroczysty',
  matte: 'Matowy',
  pearl: 'Perłowy (ceylon)',
  metallic: 'Metaliczny',
};

// Paleta startowa inspirowana kolorowymi naszyjnikami z drobnych koralików.
export const DEFAULT_PALETTE = [
  { name: 'Różowy neon', hex: '#ff4f7b', finish: 'opaque' },
  { name: 'Pudrowy róż', hex: '#f6a9c3', finish: 'pearl' },
  { name: 'Miętowy', hex: '#93dcc0', finish: 'opaque' },
  { name: 'Cytrynowy', hex: '#f5dc3f', finish: 'opaque' },
  { name: 'Pomarańczowy', hex: '#ff8a3d', finish: 'opaque' },
  { name: 'Błękitny', hex: '#86c3ee', finish: 'transparent' },
  { name: 'Biały', hex: '#f6f4ef', finish: 'opaque' },
  { name: 'Złoty', hex: '#d3a548', finish: 'metallic' },
  { name: 'Czerwony', hex: '#df2638', finish: 'opaque' },
  { name: 'Czarny', hex: '#1d1b22', finish: 'opaque' },
].map((c) => ({ ...c, bead: DEFAULT_BEAD }));

// Kolory, które łatwo dobrać przy dodawaniu nowego koloru do palety.
export const SUGGESTED_COLORS = [
  '#ff4f7b', '#f6a9c3', '#c48ae8', '#7b5cd6', '#2f56c9', '#86c3ee', '#3fb6b2',
  '#93dcc0', '#4fa84a', '#c9de5a', '#f5dc3f', '#ffb347', '#ff8a3d', '#df2638',
  '#8c2f39', '#8a5a3b', '#d9b48f', '#f6f4ef', '#b9b7bd', '#6d6a73', '#1d1b22',
  '#d3a548', '#c0c4c9', '#b87355',
];
