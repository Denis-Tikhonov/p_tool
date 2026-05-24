// sw.js
const CACHE_NAME = 'pilot-tool-v3';
const JSON_MODULE_NAMES = {
  'modules/phonebook.json': 'Телефонный справочник',
  'modules/checklist.json': 'Чеклисты',
  'modules/krs.json': 'Указания КРС',
  'modules/flightprocedures.json': 'Лётные процедуры',
  'modules/aviation_sayings.json': 'Авиационные цитаты',
};
const STATIC_ASSETS = [
  './', './index.html', './style.css', './app.js', './background.jpg', './manifest.json',
  './icons/favicon.ico', './icons/favicon-16.png', './icons/favicon-32.png',
  './icons/apple-touch-icon.png', './icons/android-chrome-192.png', './icons/android-chrome-512.png',
  './icons.js',
  './fonts/Roboto-Regular.woff2', './fonts/Roboto-Medium.woff2', './fonts/Roboto-Bold.woff2',
  './fonts/Caveat-Bold.woff2',
  './modules/phonebook.js', './modules/checklist.js', './modules/krs.js',
  './modules/flightprocedures.js', './modules/notes.js',
  './modules/phonebook.json', './modules/checklist.json', './modules/krs.json',
  './modules/flightprocedures.json', './modules/aviation_sayings.json',
  './modules/flightprocedures/AOMA.pdf', './modules/flightprocedures/AOMB.pdf',
  './modules/flightprocedures/oxy_chart.jpg', './modules/flightprocedures/oxy_chart_full.jpg',
  './modules/flightprocedures/ext_walk.jpg', './modules/flightprocedures/ext_walk_full.jpg',
  './modules/krs/page_1.pdf', './modules/krs/page027_1.pdf', './modules/krs/page027_2.pdf',
  './modules/krs/image_1.jpg', './modules/krs/image_2.jpg',
  './libs/photoswipe/photoswipe.min.js', './libs/photoswipe/photoswipe-ui-default.min.js',
  './libs/photoswipe/photoswipe.css', './libs/photoswipe/default-skin/default-skin.css',
  './libs/photoswipe/default-skin/default-skin.png', './libs/photoswipe/default-skin/default-skin.svg',
  './libs/photoswipe/default-skin/preloader.gif',
  './libs/pdfjs/pdf.min.js', './libs/pdfjs/pdf.worker.min.js',
];
const progressChannel = new BroadcastChannel('sw-progress');
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      let cached = 0;
      const total = STATIC_ASSETS.length;
      await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('SW: не удалось кэшировать:', url, err))
            .finally(() => {
              cached++;
              progressChannel.postMessage({ type: 'CACHE_PROGRESS', progress: cached / total, cached, total });
            })
        )
      );
      progressChannel.postMessage({ type: 'CACHE_DONE' });
    }).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request).then(async (response) => {
          if (!response || response.status !== 200) return response;
          const newSize = response.headers.get('Content-Length');
          let changed = false;
          if (newSize && cached) {
            const oldSize = cached.headers.get('Content-Length');
            changed = (oldSize !== newSize);
          } else if (cached) {
            try {
              const [newBlob, oldBlob] = await Promise.all([response.clone().blob(), cached.clone().blob()]);
              changed = (newBlob.size !== oldBlob.size);
            } catch(e) { changed = false; }
          } else { changed = false; }
          await cache.put(event.request, response.clone());
          if (changed) {
            const relPath = url.pathname.replace(/^\//, '');
            const moduleName = JSON_MODULE_NAMES[relPath] || relPath;
            progressChannel.postMessage({ type: 'JSON_UPDATED', module: moduleName });
          }
          return response;
        }).catch(() => null);
        return cached || networkFetch;
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : new Response(null, { status: 204 }));
    })
  );
});