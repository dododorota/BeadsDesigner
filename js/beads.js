// Stałe związane z koralikami: rozmiary, wykończenia, domyślna paleta.

// Wymiary w mm (d = średnica zewnętrzna, h = wysokość wzdłuż otworu).
// perGram to przybliżona liczba koralików japońskich (Miyuki/Toho) na gram.
export const BEAD_SIZES = {
  '15/0': { d: 1.5, h: 1.0, hole: 0.6, perGram: 250 },
  '11/0': { d: 2.0, h: 1.4, hole: 0.8, perGram: 110 },
  '8/0': { d: 3.0, h: 2.2, hole: 1.1, perGram: 37 },
  '6/0': { d: 4.0, h: 3.0, hole: 1.5, perGram: 13 },
};

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
];

// Kolory, które łatwo dobrać przy dodawaniu nowego koloru do palety.
export const SUGGESTED_COLORS = [
  '#ff4f7b', '#f6a9c3', '#c48ae8', '#7b5cd6', '#2f56c9', '#86c3ee', '#3fb6b2',
  '#93dcc0', '#4fa84a', '#c9de5a', '#f5dc3f', '#ffb347', '#ff8a3d', '#df2638',
  '#8c2f39', '#8a5a3b', '#d9b48f', '#f6f4ef', '#b9b7bd', '#6d6a73', '#1d1b22',
  '#d3a548', '#c0c4c9', '#b87355',
];

export function beadsToGrams(count, size) {
  const s = BEAD_SIZES[size] || BEAD_SIZES['11/0'];
  return count / s.perGram;
}
