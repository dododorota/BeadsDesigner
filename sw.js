// Service worker: aplikacja działa bez internetu (np. na iPadzie zainstalowanym
// jako aplikacja). Pliki są podawane z pamięci od razu, a w tle pobierana jest
// nowa wersja — zmiany pojawiają się przy następnym uruchomieniu.
const CACHE = 'beads-designer-v7';
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/ball.js',
  'js/beads.js',
  'js/chart.js',
  'js/main.js',
  'js/model.js',
  'js/motifs.js',
  'js/preview3d.js',
  'js/stitches.js',
  'js/storage.js',
  'vendor/three.module.min.js',
  'vendor/OrbitControls.js',
  'vendor/RoomEnvironment.js',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
