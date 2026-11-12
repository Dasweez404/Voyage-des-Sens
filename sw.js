/* Service worker — fonctionne entièrement hors-ligne (réseau d'abord) */
const CACHE = 'vds-2611121437';
const ASSETS = ['./', 'index.html', 'css/style.css?v=2611121437', 'js/notes_extra.js?v=2611121437', 'js/notes.js?v=2611121437', 'js/scenes.js?v=2611121437', 'js/destinations.js?v=2611121437', 'js/eo.js?v=2611121437', 'js/prefs.js?v=2611121437', 'js/art.js?v=2611121437', 'js/engine.js?v=2611121437', 'js/quiz.js?v=2611121437', 'js/app.js?v=2611121437',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // réseau d'abord, en forçant la revalidation (jamais un fichier périmé du cache HTTP) ; le cache ne sert qu'hors-ligne
  const url = new URL(e.request.url);
  const live = url.origin === location.origin ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request);
  e.respondWith(live.then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res;
  }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html'))));
});
