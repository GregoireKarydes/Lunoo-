// Service worker : garde Lunoo disponible hors ligne.
// Changez VERSION à chaque mise en ligne pour que les tablettes récupèrent la nouvelle version.
const VERSION = 'lunoo-v1.9.0';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/ctx.js',
  'js/store.js',
  'js/data.js',
  'js/animal.js',
  'js/sound.js',
  'js/narrator.js',
  'js/ui.js',
  'js/onboarding.js',
  'js/child.js',
  'js/parent.js',
  'js/studio.js',
  'js/clock.js',
  'js/rewards.js',
  'js/preview.js',
  'assets/awake.mp4',
  'fonts/fredoka-latin-500-normal.woff2',
  'fonts/fredoka-latin-600-normal.woff2',
  'fonts/nunito-latin-400-normal.woff2',
  'fonts/nunito-latin-700-normal.woff2',
  'fonts/nunito-latin-800-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' : on prend les fichiers sur le serveur, pas dans le cache du navigateur (sinon une
  // tablette pouvait garder l'ancienne version de certains fichiers après une mise à jour).
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache d'abord (hors ligne), puis réseau ; les nouvelles réponses sont mises en cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match('index.html'))),
  );
});
