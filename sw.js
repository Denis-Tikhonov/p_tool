var CACHE_NAME = 'pilot-tool-v2';

var JSON_MODULE_NAMES = {
  'modules/phonebook.json':        'Телефонный справочник',
  'modules/checklist.json':        'Чеклисты',
  'modules/krs.json':              'Указания КРС',
  'modules/flightprocedures.json': 'Лётные процедуры',
};

var STATIC_ASSETS = [
  // Корень
  './',
  './index.html',
  './style.css',
  './app.js',
  './favicon.ico',
  './background.jpg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  // Иконки SVG (icons.js)
  './icons.js',
  // Шрифты
  './fonts/Roboto-Regular.woff2',
  './fonts/Roboto-Medium.woff2',
  './fonts/Roboto-Bold.woff2',
  './fonts/Caveat-Bold.woff2',
  // Модули JS
  './modules/phonebook.js',
  './modules/checklist.js',
  './modules/krs.js',
  './modules/flightprocedures.js',
  // JSON данных — ОБЯЗАТЕЛЬНО кэшировать здесь, не ждать первого открытия раздела
  './modules/phonebook.json',
  './modules/checklist.json',
  './modules/krs.json',
  './modules/flightprocedures.json',
  // Медиафайлы FP — ОБЯЗАТЕЛЬНО кэшировать здесь, не ждать первого открытия раздела
  './modules/flightprocedures/AOMA.pdf',
  './modules/flightprocedures/AOMB.pdf',
  './modules/flightprocedures/oxy_chart.jpg',
  './modules/flightprocedures/oxy_chart_full.jpg',
  './modules/flightprocedures/ext_walk.jpg',
  './modules/flightprocedures/ext_walk_full.jpg',
  // Медиафайлы КРС — ОБЯЗАТЕЛЬНО кэшировать здесь, не ждать первого открытия раздела
  './modules/krs/page_1.pdf',
  './modules/krs/page027_1.pdf',
  './modules/krs/page027_2.pdf',
  './modules/krs/image_1.jpg',
  './modules/krs/image_2.jpg',
  // Библиотеки
  './libs/photoswipe/photoswipe.min.js',
  './libs/photoswipe/photoswipe-ui-default.min.js',
  './libs/photoswipe/photoswipe.css',
  './libs/photoswipe/default-skin/default-skin.css',
  './libs/photoswipe/default-skin/default-skin.png',
  './libs/photoswipe/default-skin/default-skin.svg',
  './libs/photoswipe/default-skin/preloader.gif',
  './libs/pdfjs/pdf.min.js',
  './libs/pdfjs/pdf.worker.min.js',
];

// Единый канал для всех сообщений SW → страница
var progressChannel = new BroadcastChannel('sw-progress');

// Событие install — кэширование с прогрессом
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      var cached = 0;
      var total = STATIC_ASSETS.length;

      return Promise.allSettled(
        STATIC_ASSETS.map(function(url) {
          return cache.add(url)
            .catch(function(err) { console.warn('SW: не удалось кэшировать:', url, err); })
            .finally(function() {
              cached++;
              progressChannel.postMessage({
                type: 'CACHE_PROGRESS',
                progress: cached / total,
                cached: cached,
                total: total
              });
            });
        })
      ).then(function() {
        progressChannel.postMessage({ type: 'CACHE_DONE' });
      });
    }).then(function() { return self.skipWaiting(); })
  );
});

// Событие activate — очистка старого кэша
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
        );
      })
      .then(function() { return self.clients.claim(); })
  );
});

// Стратегии fetch + детекция обновления JSON
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Не перехватывать внешние запросы
  if (url.origin !== self.location.origin) return;

  // ── Стратегия для JSON: Stale While Revalidate + детекция обновления ──
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          // Фоновый запрос к сети
          var networkFetch = fetch(event.request).then(function(response) {
            if (!response || response.status !== 200) return response;

            // Определить, изменился ли файл
            var newSize = response.headers.get('Content-Length');
            var changed = false;

            if (newSize && cached) {
              var oldSize = cached.headers.get('Content-Length');
              changed = (oldSize !== newSize);
            } else if (cached) {
              // Content-Length недоступен — сравниваем по размеру blob
              try {
                Promise.all([
                  response.clone().blob(),
                  cached.clone().blob()
                ]).then(function(results) {
                  changed = (results[0].size !== results[1].size);
                });
              } catch (e) {
                changed = false;
              }
            } else {
              // Первое кэширование — не считается обновлением
              changed = false;
            }

            cache.put(event.request, response.clone());

            if (changed) {
              // Определить название модуля из маппинга
              var relPath = url.pathname.replace(/^\//, '');
              var moduleName = JSON_MODULE_NAMES[relPath] || relPath;
              progressChannel.postMessage({
                type: 'JSON_UPDATED',
                module: moduleName,
              });
            }

            return response;
          }).catch(function() { return null; });

          // Отдать кэш немедленно; фоновый запрос продолжается
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // ── Стратегия для всего остального: Cache First ──
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      }).catch(function() {
        // Fallback для навигационных запросов
        return event.request.mode === 'navigate'
          ? caches.match('./index.html')
          : new Response(null, { status: 204 });
      });
    })
  );
});
