/* Service worker — fonctionne entièrement hors-ligne (cache-first) */
const CACHE = 'vds-v16';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/notes_extra.js', 'js/notes.js', 'js/scenes.js', 'js/destinations.js', 'js/prefs.js', 'js/art.js', 'js/engine.js', 'js/quiz.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // réseau d'abord : on sert toujours la dernière version en ligne, le cache ne sert qu'hors-ligne
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res;
  }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html'))));
});
