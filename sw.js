const CACHE_NAME = 'pilot-tool-v1';
const urlsToCache = [
  'index.html',
  'style.css',
  'app.js',
  'icons.js',
  'favicon.ico',
  'background.jpg',
  'icon-192.png',
  'icon-512.png',
  'manifest.json',
  'fonts/Roboto-Regular.woff2',
  'fonts/Roboto-Medium.woff2',
  'fonts/Roboto-Bold.woff2',
  'fonts/DancingScript-Bold.woff2',
  'modules/phonebook.js',
  'modules/phonebook.json',
  'modules/checklist.js',
  'modules/checklist.json',
  'modules/krs.js',
  'modules/krs.json',
  'modules/krs/page1.pdf',
  'modules/krs/page1_image_1.jpg',
  'libs/photoswipe/photoswipe.min.js',
  'libs/photoswipe/photoswipe-ui-default.min.js',
  'libs/photoswipe/photoswipe.css',
  'libs/photoswipe/default-skin/default-skin.css',
  'libs/photoswipe/default-skin/default-skin.png',
  'libs/photoswipe/default-skin/default-skin.svg',
  'libs/photoswipe/default-skin/preloader.gif',
  'libs/pdfjs/pdf.min.js',
  'libs/pdfjs/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      let cached = 0;
      await Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url)
            .catch(err => console.warn('SW: не удалось кэшировать:', url, err))
            .finally(() => {
              cached++;
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({
                  type: 'CACHE_PROGRESS',
                  progress: cached / urlsToCache.length
                }));
              });
            })
        )
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('.json') && url.pathname.includes('modules/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          return caches.match('index.html');
        });
      })
    );
  }
});