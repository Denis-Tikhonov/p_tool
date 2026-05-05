const CACHE_NAME = 'pilot-tool-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './favicon.ico',
  './background.jpg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './icons.js',
  './fonts/Roboto-Regular.woff2',
  './fonts/Roboto-Medium.woff2',
  './fonts/Roboto-Bold.woff2',
  './fonts/DancingScript-Bold.woff2',
  './modules/phonebook.js',
  './modules/checklist.js',
  './modules/krs.js',
  './modules/phonebook.json',
  './modules/checklist.json',
  './modules/krs.json',
  './modules/krs/page1.pdf',
  './modules/krs/page1_image_1.jpg',
  './libs/photoswipe/photoswipe.min.js',
  './libs/photoswipe/photoswipe-ui-default.min.js',
  './libs/photoswipe/photoswipe.css',
  './libs/photoswipe/default-skin/default-skin.css',
  './libs/photoswipe/default-skin/default-skin.png',
  './libs/photoswipe/default-skin/default-skin.svg',
  './libs/photoswipe/default-skin/preloader.gif',
  './libs/pdfjs/pdf.min.js',
  './libs/pdfjs/pdf.worker.min.js'
];

const progressChannel = new BroadcastChannel('sw-progress');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      let cached = 0;
      const total = STATIC_ASSETS.length;

      await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url)
            .catch(err => console.warn('SW: не удалось кэшировать:', url, err))
            .finally(() => {
              cached++;
              progressChannel.postMessage({
                type: 'CACHE_PROGRESS',
                progress: cached / total,
                cached,
                total
              });
            })
        )
      );

      progressChannel.postMessage({ type: 'CACHE_DONE' });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => null);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, response.clone())
          );
        }
        return response;
      }).catch(() =>
        event.request.mode === 'navigate'
          ? caches.match('./index.html')
          : new Response(null, { status: 204 })
      );
    })
  );
});