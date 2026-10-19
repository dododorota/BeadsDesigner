// Motywy na naszyjniku: stokrotki (daisy chain), pętelki i frędzle.
//
// Motyw to grupa kolejnych koralików na tej samej nitce, np. 6 płatków i środek
// stokrotki. Koraliki zostają w zwykłej liście `strand.beads` (więc malowanie,
// zużycie i waga działają bez zmian), a `strand.groups` mówi, które z nich
// układają się w motyw: { start, n, kind, side, rev }.
//   side — pętelka na zewnątrz ('out') albo do środka naszyjnika ('in'),
//   rev  — pętelka idzie w drugą stronę (lustrzane odbicie prawej połowy naszyjnika).
// Kolejność nawlekania w motywie jest zawsze ta sama: stokrotka — płatki, potem środek;
// frędzel — od góry do koralika zwrotnego; owocek — szypułka, potem owoc.

export const MOTIFS = {
  daisy: { name: 'Stokrotka', sizeLabel: 'Płatków', size: [4, 10], def: 6, accentLabel: 'Środek' },
  loop: { name: 'Pętelka', sizeLabel: 'Koralików', size: [3, 40], def: 12, accentLabel: null },
  dangle: { name: 'Frędzel', sizeLabel: 'Koralików', size: [2, 40], def: 6, accentLabel: 'Koralik zwrotny' },
  // Owocek (truskawka, malina, winogrono, cytrynka): szypułka zostaje na nitce, a pod nią
  // wisi kiść z kilku koralików — igła wraca przez szypułkę i owoc się zamyka.
  berry: { name: 'Owocek', sizeLabel: 'Koralików owocu', size: [1, 12], def: 3, accentLabel: 'Szypułka' },
};

export const MAX_STRAND = 2000;

const clampSize = (kind, v) => {
  const [lo, hi] = MOTIFS[kind].size;
  return Math.max(lo, Math.min(hi, Math.round(Number(v) || MOTIFS[kind].def)));
};

// Ile koralików zajmuje motyw: stokrotka ma jeszcze środek.
export const motifBeads = (kind, size) => (kind === 'daisy' || kind === 'berry' ? size + 1 : size);

// Rola koralika w grupie: płatek / środek stokrotki, koralik / zwrotny frędzla.
export function roleInGroup(g, i) {
  const k = i - g.start;
  if (g.kind === 'daisy') return k === g.n - 1 ? { part: 'center', k } : { part: 'petal', k };
  if (g.kind === 'dangle') return k === g.n - 1 ? { part: 'turn', k } : { part: 'bead', k };
  if (g.kind === 'berry') return k === 0 ? { part: 'stem', k } : { part: 'fruit', k: k - 1 };
  return { part: 'bead', k };
}

// Poprawia listę grup po wczytaniu pliku: tylko znane motywy, w granicach sznurka, bez nakładania.
export function fixGroups(groups, count) {
  if (!Array.isArray(groups)) return [];
  const out = [];
  let end = 0;
  for (const g of [...groups].sort((a, b) => a.start - b.start)) {
    if (!g || !MOTIFS[g.kind]) continue;
    const start = Math.round(Number(g.start)), n = Math.round(Number(g.n));
    if (!(start >= end) || !(n >= 2) || start + n > count) continue;
    out.push({ start, n, kind: g.kind, side: g.side === 'in' ? 'in' : 'out', rev: Boolean(g.rev) });
    end = start + n;
  }
  return out;
}

export const groupAt = (s, i) => s.groups.find((g) => i >= g.start && i < g.start + g.n) || null;

// Wstawia motyw za koralikiem `after` (-1 = na samym początku). Zwraca false, gdy brak miejsca.
export function insertMotif(s, after, kind, size, colors) {
  size = clampSize(kind, size);
  const n = motifBeads(kind, size);
  if (s.count + n > MAX_STRAND) return false;
  // Nie wstawiamy w środek innego motywu — przesuwamy się za niego.
  const inside = groupAt(s, after);
  if (inside && after < inside.start + inside.n - 1) after = inside.start + inside.n - 1;
  const at = after + 1;
  const beads = Array.from({ length: n }, (_, k) => {
    if (kind === 'daisy' && k === n - 1) return colors.accent;
    if (kind === 'dangle' && k === n - 1) return colors.accent;
    if (kind === 'berry' && k === 0) return colors.accent;
    return colors.main;
  });
  s.beads.splice(at, 0, ...beads);
  s.count += n;
  for (const g of s.groups) if (g.start >= at) g.start += n;
  s.groups.push({ start: at, n, kind, side: colors.side === 'in' ? 'in' : 'out', rev: false });
  s.groups.sort((a, b) => a.start - b.start);
  return true;
}

// Usuwa motyw, do którego należy koralik `i` (razem z jego koralikami).
export function removeMotifAt(s, i) {
  const g = groupAt(s, i);
  if (!g) return false;
  s.beads.splice(g.start, g.n);
  s.count -= g.n;
  s.groups = s.groups.filter((q) => q !== g);
  for (const q of s.groups) if (q.start > g.start) q.start -= g.n;
  return true;
}

export function clearMotifs(s) {
  for (const g of [...s.groups].sort((a, b) => b.start - a.start)) {
    s.beads.splice(g.start, g.n);
    s.count -= g.n;
  }
  s.groups = [];
}

// Daisy chain jednym przyciskiem: usuwa stare motywy i wstawia nowy co `every`
// zwykłych koralików, z równym odstępem od zapięcia po obu stronach.
// Przy `alternate` pętelki są na zmianę na zewnątrz i do środka.
export function fillMotifs(s, every, kind, size, colors, alternate = false) {
  clearMotifs(s);
  every = Math.max(1, Math.round(every));
  const base = s.count;
  const slots = Math.floor((base - every) / every);
  if (slots < 1) return 0;
  const lead = Math.floor((base - slots * every) / 2);
  let added = 0;
  // Od końca, żeby wcześniejsze numery koralików się nie przesuwały.
  for (let k = slots - 1; k >= 0; k--) {
    const side = alternate && k % 2 ? (colors.side === 'in' ? 'out' : 'in') : colors.side;
    if (!insertMotif(s, lead + k * every + Math.floor(every / 2) - 1, kind, size, { ...colors, side })) break;
    added++;
  }
  return added;
}

// Powiela pierwsze `len` koralików razem z motywami, które w całości się w nich mieszczą.
export function repeatWithMotifs(s, len) {
  len = Math.max(1, Math.min(s.count, len | 0));
  const inFirst = s.groups.filter((g) => g.start + g.n <= len);
  for (let i = len; i < s.count; i++) s.beads[i] = s.beads[i % len];
  const groups = [];
  for (let off = 0; off < s.count; off += len) {
    for (const g of inFirst) if (off + g.start + g.n <= s.count) groups.push({ ...g, start: off + g.start });
  }
  s.groups = groups;
}

// Prawa połowa jako lustro lewej — motywy też się odbijają (z odwróconą kolejnością).
// Motyw na samym środku (np. kwiatek-zawieszka) zostaje bez zmian.
export function mirrorWithMotifs(s) {
  const half = Math.floor(s.count / 2);
  const middle = s.groups.filter((g) => g.start < half && g.start + g.n > half);
  const inMiddle = (i) => middle.some((g) => i >= g.start && i < g.start + g.n);
  for (let i = 0; i < half; i++) {
    const j = s.count - 1 - i;
    if (!inMiddle(i) && !inMiddle(j)) s.beads[j] = s.beads[i];
  }
  const left = s.groups.filter((g) => g.start + g.n <= half);
  const mirrored = left.map((g) => {
    const ms = s.count - g.start - g.n;
    const src = s.beads.slice(g.start, g.start + g.n);
    // Lustro odwraca kolejność, ale stokrotkę, frędzel i owocek nawleka się zawsze tak samo.
    if (g.kind === 'daisy') src.splice(0, g.n - 1, ...src.slice(0, g.n - 1).reverse());
    else if (g.kind === 'loop') src.reverse();
    s.beads.splice(ms, g.n, ...src);
    return { ...g, start: ms, rev: g.kind === 'loop' ? !g.rev : false };
  });
  s.groups = fixGroups([...left, ...middle, ...mirrored], s.count);
}

// Po zmianie długości sznurka znikają motywy, które się nie mieszczą.
export function trimGroups(s) {
  s.groups = s.groups.filter((g) => g.start + g.n <= s.count);
}

// Kolejne „miejsca” na nitce: pojedynczy koralik albo cały motyw — z długością,
// jaką zajmują wzdłuż naszyjnika (mm). `beadOf(color)` daje typ koralika.
export function strandSlots(s, beadOf) {
  const slots = [];
  const starts = new Map(s.groups.map((g) => [g.start, g]));
  for (let i = 0; i < s.count;) {
    const g = starts.get(i);
    if (!g) {
      slots.push({ type: 'bead', i, len: beadOf(s.beads[i]).h });
      i++;
      continue;
    }
    const first = beadOf(s.beads[g.start]);
    let len;
    if (g.kind === 'daisy') {
      const center = beadOf(s.beads[g.start + g.n - 1]);
      len = 2 * (center.d / 2 + first.d / 2) + first.d;
    } else if (g.kind === 'berry') {
      // Szypułka leży na nitce; owoc pod nią jest trochę szerszy.
      const fruit = beadOf(s.beads[g.start + 1]);
      len = Math.max(first.h, fruit.d * (g.n > 2 ? 1.6 : 1));
    } else {
      len = first.d * (g.kind === 'loop' ? 1.2 : 1);
    }
    slots.push({ type: 'group', g, len });
    i += g.n;
  }
  return slots;
}
