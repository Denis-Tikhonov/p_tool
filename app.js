window.app = {};

// ========== GLOBAL UTILITIES ==========
window.app.showSkeleton = function(container, type) {
  if (!container) return;
  var COUNT = type === 'list' ? 6 : 4;
  var templates = {
    list: function() {
      return '<div class="skeleton-item" style="display:flex;gap:12px;padding:12px 16px;align-items:center;">' +
        '<div class="skeleton skeleton-avatar"></div>' +
        '<div style="flex:1;min-width:0;">' +
        '<div class="skeleton skeleton-line" style="width:60%;"></div>' +
        '<div class="skeleton skeleton-line" style="width:40%;margin-bottom:0;"></div>' +
        '</div></div>';
    },
    blocks: function() {
      return '<div class="skeleton skeleton-block" style="height:56px;margin:8px 16px;border-radius:var(--border-radius-md);"></div>';
    }
  };
  var render = templates[type] || templates.blocks;
  container.innerHTML = Array.from({ length: COUNT }, render).join('');
};

window.app.hideSkeleton = function(container, htmlContent) {
  if (!container) return;
  container.innerHTML = htmlContent;
};

window.app.showError = function(container, text, retryFn) {
  if (!container) return;
  container.innerHTML = '<div class="error-message"><p class="error-text">' + text + '</p>' +
    (retryFn ? '<button class="error-retry-btn">Повторить</button>' : '') + '</div>';
  if (retryFn) {
    var btn = container.querySelector('.error-retry-btn');
    if (btn) btn.addEventListener('click', retryFn);
  }
};

// ========== NAVIGATION ==========
window.app.navigateTo = function(screenName) {
  app.resetHeader();
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  var screen = document.getElementById(screenName + 'Screen');
  if (screen) screen.classList.add('active');
  app.closeMenu();
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    item.classList.remove('menu-item--active');
    if (item.dataset.nav === screenName) {
      item.classList.add('menu-item--active');
    }
  });
  if (screenName === 'main') app.renderMainHeader();
  if (screenName === 'phonebook' && window.initPhonebook) initPhonebook();
  if (screenName === 'checklists' && window.initChecklists) initChecklists();
  if (screenName === 'krs' && window.initKRS) initKRS();
  if (screenName === 'flightprocedures' && window.initFlightProcedures) initFlightProcedures();
};

window.app.resetHeader = function() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (left) { left.innerHTML = ''; left.onclick = null; }
  if (center) { center.innerHTML = ''; }
  if (right) { right.innerHTML = ''; right.onclick = null; }
};

window.app.renderMainHeader = function() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (!left || !center || !right) return;
  left.innerHTML = '<button id="menuBtn" class="icon-btn" aria-label="Меню" onclick="app.toggleMenu()">' + window.ICONS.menu + '</button>';
  left.onclick = null;
  center.innerHTML = '<div class="hc-default">Pilot\'s Tool</div>';
  right.innerHTML = '';
  right.onclick = null;
};

// ========== MENU ==========
window.app.toggleMenu = function() {
  var menu = document.getElementById('sideMenu');
  var overlay = document.getElementById('menuOverlay');
  var btn = document.getElementById('menuBtn');
  if (!menu || !overlay) return;
  var isOpen = menu.classList.contains('open');
  menu.classList.toggle('open');
  overlay.classList.toggle('open');
  if (btn) {
    if (isOpen) {
      btn.classList.remove('menu-btn-open');
      btn.innerHTML = window.ICONS.menu;
    } else {
      btn.classList.add('menu-btn-open');
      btn.innerHTML = window.ICONS.close;
    }
  }
};

window.app.closeMenu = function() {
  var menu = document.getElementById('sideMenu');
  var overlay = document.getElementById('menuOverlay');
  var btn = document.getElementById('menuBtn');
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (btn) {
    btn.classList.remove('menu-btn-open');
    btn.innerHTML = window.ICONS.menu;
  }
};

// ========== THEME ==========
window.app.toggleTheme = function() {
  var isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  app.updateThemeIcon();
};

window.app.updateThemeIcon = function() {
  var themeIcon = document.getElementById('themeIcon');
  var themeLabel = document.getElementById('themeLabel');
  var isDark = document.body.classList.contains('dark-theme');
  if (themeIcon) themeIcon.innerHTML = isDark ? window.ICONS.sun : window.ICONS.moon;
  if (themeLabel) themeLabel.textContent = isDark ? 'Дневной режим' : 'Ночной режим';
};

// ========== OFFLINE STATUS ==========
window.app.updateOfflineStatus = function(ready) {
  var el = document.getElementById('offlineStatus');
  if (!el) return;
  el.textContent = ready ? '✅ Приложение готово к работе offline' : '⬇️ Загрузка ресурсов...';
};

// ========== PWA INSTALL ==========
var deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
});
window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;
});
window.app.showInstallPrompt = function() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
  } else {
    alert('Приложение уже установлено или браузер не поддерживает установку');
  }
};

// ========== PHOTOSWIPE ==========
window.app.openPhotoSwipe = function(src, fullSrc) {
  if (window.PhotoSwipe && window.PhotoSwipeUI_Default) {
    var items = [{ src: fullSrc, w: 0, h: 0 }];
    var options = { index: 0, bgOpacity: 0.9, showHideOpacity: true };
    var pswpEl = document.querySelector('.pswp');
    var gallery = new window.PhotoSwipe(pswpEl, window.PhotoSwipeUI_Default, items, options);
    gallery.listen('gettingData', function(index, item) {
      if (item.w < 1 || item.h < 1) {
        var img = new Image();
        img.onload = function() {
          item.w = img.naturalWidth;
          item.h = img.naturalHeight;
          gallery.updateSize(true);
        };
        img.src = item.src;
      }
    });
    gallery.init();
  } else {
    window.open(fullSrc, '_blank');
  }
};

// ========== PDF MODAL ==========
window.app.openPDFModal = async function(url, startPage) {
  if (!window.pdfjsLib) { window.open(url, '_blank'); return; }
  var modal = document.createElement('div');
  modal.className = 'pdf-modal';
  modal.innerHTML = '<button class="pdf-modal-close">✕</button>';
  document.body.appendChild(modal);
  modal.querySelector('.pdf-modal-close').onclick = function() { modal.remove(); };
  try {
    var pdf = await window.pdfjsLib.getDocument(url).promise;
    var pageNum = startPage || 1;
    for (var i = pageNum; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var viewport = page.getViewport({ scale: 1 });
      var scale = viewport.width > window.innerWidth ? window.innerWidth / viewport.width : 1;
      var scaledViewport = page.getViewport({ scale: scale });
      var canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.marginBottom = '8px';
      modal.appendChild(canvas);
      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: scaledViewport
      }).promise;
    }
  } catch (err) {
    console.error('PDF error:', err);
    modal.remove();
    window.open(url, '_blank');
  }
};

// ========== SERVICE WORKER ==========
window.app.initServiceWorker = function() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    if (reg.installing) {
      var overlay = document.getElementById('cacheProgressOverlay');
      var bar = document.getElementById('cacheProgressBar');
      var text = document.getElementById('cacheProgressText');
      if (overlay) overlay.style.display = 'flex';
      var channel = new BroadcastChannel('sw-progress');
      channel.onmessage = function(event) {
        if (event.data.type === 'CACHE_PROGRESS') {
          var pct = Math.round(event.data.progress * 100);
          if (bar) bar.style.width = pct + '%';
          if (text) text.textContent = pct + '%';
        }
        if (event.data.type === 'CACHE_DONE') {
          if (bar) bar.style.width = '100%';
          if (text) text.textContent = '100%';
          localStorage.setItem('offlineReady', 'true');
          app.updateOfflineStatus(true);
          setTimeout(function() {
            if (overlay) overlay.style.display = 'none';
            channel.close();
          }, 600);
        }
      };
    }
  }).catch(function(err) { console.error('SW registration failed:', err); });
};

// ========== DOM CONTENT LOADED ==========
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }
  app.updateThemeIcon();

  // Menu icons injection
  var iconMap = {
    'phonebook': window.ICONS.phone,
    'checklists': window.ICONS.checklist,
    'krs': window.ICONS['file-text'],
    'flightprocedures': window.ICONS.plane,
    'links': window.ICONS.link,
    'faq': window.ICONS['help-circle']
  };
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    var icon = item.querySelector('.menu-icon');
    if (icon) icon.innerHTML = iconMap[item.dataset.nav] || '';
  });
  document.querySelectorAll('.menu-item[data-placeholder]').forEach(function(item) {
    var icon = item.querySelector('.menu-icon');
    if (icon) icon.innerHTML = iconMap[item.dataset.placeholder] || '';
  });
  var installIcon = document.querySelector('#installApp .menu-icon');
  if (installIcon) installIcon.innerHTML = window.ICONS.download;
  var bannerIcon = document.getElementById('menuBannerIcon');
  if (bannerIcon) bannerIcon.innerHTML = window.ICONS.plane;

  // Placeholder clicks
  document.querySelectorAll('.menu-item[data-placeholder]').forEach(function(item) {
    item.addEventListener('click', function() {
      alert('Раздел в разработке');
      app.closeMenu();
    });
  });

  // Theme toggle
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      app.toggleTheme();
      app.closeMenu();
    });
  }

  // Install app
  var installApp = document.getElementById('installApp');
  if (installApp) {
    installApp.addEventListener('click', function() {
      if (window.app && typeof window.app.showInstallPrompt === 'function') {
        window.app.showInstallPrompt();
      }
      app.closeMenu();
    });
  }

  // Navigation
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    item.addEventListener('click', function() {
      app.navigateTo(item.dataset.nav);
    });
  });

  // Network status in menu footer
  if (localStorage.getItem('offlineReady') === 'true') {
    app.updateOfflineStatus(true);
  }
  var networkStatusEl = document.getElementById('menuNetworkStatus');
  window.addEventListener('online', function() {
    if (networkStatusEl) { networkStatusEl.textContent = '● Онлайн'; networkStatusEl.style.color = ''; }
  });
  window.addEventListener('offline', function() {
    if (networkStatusEl) { networkStatusEl.textContent = '● Офлайн'; networkStatusEl.style.color = 'var(--color-text-muted)'; }
  });

  // Start on main screen
  app.navigateTo('main');
});