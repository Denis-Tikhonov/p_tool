/* ======================================================================
   app.js — Pilot's Tool (Nordwind Aviation)
   Core JS: navigation, header, menu, theme, skeleton, PhotoSwipe, PDF,
   bottom panel (IndexedDB photos + localStorage notes), PWA helpers.
   ====================================================================== */

/* ------------------------------------------------------------------
   1. Top-level variable declarations
   ------------------------------------------------------------------ */
var FLIGHT_META_KEY = 'flight_docs_meta';
var FLIGHT_NOTES_KEY = 'flight_docs_notes';
var FLIGHT_MAX_PHOTOS = 12;
var _toastTimer = null;
var _fullPhotosCache = null;
var deferredInstallPrompt = null;

/* ------------------------------------------------------------------
   2. window.app — global namespace (MUST be first)
   ------------------------------------------------------------------ */
window.app = {};

/* ------------------------------------------------------------------
   3. Core navigation functions
   ------------------------------------------------------------------ */
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

  if (screenName === 'main')             app.renderMainHeader();
  if (screenName === 'phonebook')        initPhonebook();
  if (screenName === 'checklists')       initChecklists();
  if (screenName === 'krs')             initKRS();
  if (screenName === 'flightprocedures') initFlightProcedures();
};

window.app.resetHeader = function() {
  var left   = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right  = document.getElementById('headerRight');
  if (left)   { left.innerHTML = '';   left.onclick = null; }
  if (center) {
    center.innerHTML = '';
    delete center.dataset.tabDelegated;
  }
  if (right)  { right.innerHTML = '';  right.onclick = null; }
};

window.app.renderMainHeader = function() {
  var left   = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right  = document.getElementById('headerRight');
  if (!left || !center || !right) return;

  left.innerHTML = '<button id="menuBtn" class="icon-btn" aria-label="Меню" onclick="app.toggleMenu()">'
    + window.ICONS.menu + '</button>';
  left.onclick = null;

  center.innerHTML = '<div class="hc-default">Pilot\'s Tool</div>';

  right.innerHTML = '';
  right.onclick = null;
};

/* ------------------------------------------------------------------
   4. Utility functions (skeleton, spinner, error)
   ------------------------------------------------------------------ */
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

window.app.hideSpinner = window.app.hideSkeleton;

window.app.showError = function(container, text, retryFn) {
  if (!container) return;
  container.innerHTML = '<div class="error-message"><p class="error-text">' + text + '</p>' +
    (retryFn ? '<button class="error-retry-btn">Повторить</button>' : '') + '</div>';
  if (retryFn) {
    var btn = container.querySelector('.error-retry-btn');
    if (btn) btn.addEventListener('click', retryFn);
  }
};

/* ------------------------------------------------------------------
   5. Menu functions
   ------------------------------------------------------------------ */
function initMenuIcons() {
  var iconMap = {
    'phonebook':        window.ICONS.phone,
    'checklists':       window.ICONS.checklist,
    'krs':              window.ICONS['file-text'],
    'flightprocedures': window.ICONS.plane,
    'links':            window.ICONS.link,
    'faq':              window.ICONS['help-circle'],
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

  var commitDocsIcon = document.getElementById('commitDocsIcon');
  if (commitDocsIcon) commitDocsIcon.innerHTML = window.ICONS['file-text'];

  app.updateThemeIcon();
}

window.app.toggleMenu = function() {
  var menu    = document.getElementById('sideMenu');
  var overlay = document.getElementById('menuOverlay');
  var btn     = document.getElementById('menuBtn');
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
  var menu    = document.getElementById('sideMenu');
  var overlay = document.getElementById('menuOverlay');
  var btn     = document.getElementById('menuBtn');
  if (menu)    menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (btn) {
    btn.classList.remove('menu-btn-open');
    btn.innerHTML = window.ICONS.menu;
  }
};

window.app.toggleTheme = function() {
  var isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  app.updateThemeIcon();
};

window.app.updateThemeIcon = function() {
  var themeIcon  = document.getElementById('themeIcon');
  var themeLabel = document.getElementById('themeLabel');
  var isDark = document.body.classList.contains('dark-theme');
  if (themeIcon)  themeIcon.innerHTML  = isDark ? window.ICONS.sun  : window.ICONS.moon;
  if (themeLabel) themeLabel.textContent = isDark ? 'Дневной режим' : 'Ночной режим';
};

/* ------------------------------------------------------------------
   6. Offline / Update status
   ------------------------------------------------------------------ */
window.app.updateOfflineStatus = function(ready) {
  var el = document.getElementById('offlineStatus');
  if (!el) return;
  var badge = document.getElementById('updateBadge');
  el.textContent = ready
    ? '✅ Приложение готово к работе offline'
    : '⬇️ Загрузка ресурсов...';
  if (badge) el.appendChild(badge);
};

window.app.showUpdateBadge = function(moduleName) {
  var badge = document.getElementById('updateBadge');
  if (!badge) return;

  var textEl = badge.querySelector('.update-badge-text');
  if (textEl) textEl.textContent = 'Обновлено: ' + moduleName;

  badge.classList.remove('update-badge-hidden');
  badge.classList.add('update-badge-visible');

  if (window._updateBadgeTimer) clearTimeout(window._updateBadgeTimer);

  window._updateBadgeTimer = setTimeout(function() {
    badge.classList.remove('update-badge-visible');
    badge.classList.add('update-badge-hidden');
    window._updateBadgeTimer = null;
  }, 8000);
};

/* ------------------------------------------------------------------
   7. PWA functions
   ------------------------------------------------------------------ */
window.app.showInstallPrompt = function() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
  } else {
    alert('Приложение уже установлено или браузер не поддерживает установку');
  }
};

window.app.initServiceWorker = function() {
  if (!('serviceWorker' in navigator)) return;

  var swChannel = new BroadcastChannel('sw-progress');

  swChannel.onmessage = function(event) {
    var data = event.data;

    if (data.type === 'CACHE_PROGRESS') {
      var bar  = document.getElementById('cacheProgressBar');
      var text = document.getElementById('cacheProgressText');
      var pct  = Math.round(data.progress * 100);
      if (bar)  bar.style.width = pct + '%';
      if (text) text.textContent = pct + '%';
    }

    if (data.type === 'CACHE_DONE') {
      var bar     = document.getElementById('cacheProgressBar');
      var text    = document.getElementById('cacheProgressText');
      var overlay = document.getElementById('cacheProgressOverlay');
      if (bar)  bar.style.width = '100%';
      if (text) text.textContent = '100%';
      localStorage.setItem('offlineReady', 'true');
      app.updateOfflineStatus(true);
      setTimeout(function() {
        if (overlay) overlay.style.display = 'none';
      }, 600);
    }

    if (data.type === 'JSON_UPDATED') {
      app.showUpdateBadge(data.module);
    }
  };

  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    if (reg.installing) {
      var overlay = document.getElementById('cacheProgressOverlay');
      if (overlay) overlay.style.display = 'flex';
    }
  }).catch(function(err) {
    console.error('SW registration failed:', err);
  });
};

/* ------------------------------------------------------------------
   8. PhotoSwipe — app.openPhotoSwipe
   ------------------------------------------------------------------ */
window.app.openPhotoSwipe = function(thumbEl, container) {
  var fullSrcFallback = thumbEl.dataset.fullSrc || thumbEl.src;

  if (!window.PhotoSwipe || !window.PhotoSwipeUI_Default) {
    window.open(fullSrcFallback, '_blank');
    return;
  }

  var thumbs = [];
  if (container) {
    var allImgs = container.querySelectorAll('img[src]');
    for (var i = 0; i < allImgs.length; i++) {
      if (allImgs[i].classList.contains('krs-photo-thumb') ||
          allImgs[i].classList.contains('fp-photo-thumb')) {
        thumbs.push(allImgs[i]);
      }
    }
  }
  if (thumbs.length === 0) {
    thumbs = [thumbEl];
  }

  var clickedIndex = 0;
  for (var j = 0; j < thumbs.length; j++) {
    if (thumbs[j] === thumbEl) { clickedIndex = j; break; }
  }

  var items = [];
  for (var k = 0; k < thumbs.length; k++) {
    var img = thumbs[k];
    var w = img.naturalWidth  || screen.width;
    var h = img.naturalHeight || screen.height;
    items.push({
      src: img.dataset.fullSrc || img.src,
      msrc: img.src,
      w: w,
      h: h,
      el: img
    });
  }

  var getThumbBoundsFn = function(index) {
    var el = items[index].el;
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    var pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
    return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
  };

  var options = {
    index:                    clickedIndex,
    bgOpacity:                0.92,
    showHideOpacity:          true,
    tapToClose:               true,
    clickToCloseNonZoomable:  true,
    pinchToClose:             true,
    closeOnScroll:            false,
    history:                  false,
    getThumbBoundsFn:         getThumbBoundsFn
  };

  var pswpEl = document.querySelector('.pswp');
  var gallery = new window.PhotoSwipe(pswpEl, window.PhotoSwipeUI_Default, items, options);

  gallery.listen('gettingData', function(idx, item) {
    if (item.w < 2 || item.h < 2) {
      var tmpImg = new Image();
      tmpImg.onload = function() {
        item.w = tmpImg.naturalWidth;
        item.h = tmpImg.naturalHeight;
        gallery.updateSize(true);
      };
      tmpImg.src = item.src;
    }
  });

  gallery.init();
};

/* ------------------------------------------------------------------
   9. PDF Modal — app.openPDFModal
   ------------------------------------------------------------------ */
window.app.openPDFModal = function(url, startPage) {
  if (!window.pdfjsLib) { window.open(url, '_blank'); return; }

  var overlay = document.createElement('div');
  overlay.className = 'pdf-modal-overlay';

  var content = document.createElement('div');
  content.className = 'pdf-modal-content';

  var toolbar = document.createElement('div');
  toolbar.className = 'pdf-modal-toolbar';

  var btnPrev = document.createElement('button');
  btnPrev.className = 'pdf-nav-btn';
  btnPrev.setAttribute('aria-label', 'Предыдущая страница');
  btnPrev.innerHTML = window.ICONS ? window.ICONS.back : '&#8592;';

  var counter = document.createElement('span');
  counter.className = 'pdf-page-counter';
  counter.textContent = '...';

  var btnNext = document.createElement('button');
  btnNext.className = 'pdf-nav-btn';
  btnNext.setAttribute('aria-label', 'Следующая страница');
  btnNext.innerHTML = window.ICONS ? window.ICONS.back : '&#8594;';
  btnNext.classList.add('pdf-nav-btn--next');

  var btnClose = document.createElement('button');
  btnClose.className = 'pdf-modal-close';
  btnClose.setAttribute('aria-label', 'Закрыть');
  btnClose.innerHTML = window.ICONS ? window.ICONS.close : '&#10005;';

  toolbar.appendChild(btnPrev);
  toolbar.appendChild(counter);
  toolbar.appendChild(btnNext);
  toolbar.appendChild(btnClose);

  var canvas = document.createElement('canvas');
  canvas.id  = 'pdfCanvas';

  content.appendChild(toolbar);
  content.appendChild(canvas);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  var closeFn = function() { overlay.remove(); };
  overlay.addEventListener('click', closeFn);
  content.addEventListener('click', function(e) { e.stopPropagation(); });
  btnClose.addEventListener('click', closeFn);

  var pdfDoc     = null;
  var currentPage = startPage || 1;
  var rendering  = false;

  var renderPage = function(num) {
    if (rendering) return;
    rendering = true;
    btnPrev.disabled = true;
    btnNext.disabled = true;

    pdfDoc.getPage(num).then(function(page) {
      var desiredWidth = Math.min(content.clientWidth - 32, 900);
      var viewport = page.getViewport({ scale: 1 });
      var scale = desiredWidth / viewport.width;
      var scaledViewport = page.getViewport({ scale: scale });

      canvas.width  = scaledViewport.width;
      canvas.height = scaledViewport.height;

      page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: scaledViewport
      }).promise.then(function() {
        rendering = false;
        counter.textContent = num + ' / ' + pdfDoc.numPages;
        btnPrev.disabled = (num <= 1);
        btnNext.disabled = (num >= pdfDoc.numPages);
        content.scrollTop = toolbar.offsetHeight;
      });
    });
  };

  btnPrev.addEventListener('click', function() {
    if (currentPage > 1) { currentPage--; renderPage(currentPage); }
  });
  btnNext.addEventListener('click', function() {
    if (pdfDoc && currentPage < pdfDoc.numPages) { currentPage++; renderPage(currentPage); }
  });

  var touchStartX = 0;
  canvas.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  canvas.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && currentPage < pdfDoc.numPages) { currentPage++; renderPage(currentPage); }
      if (dx > 0 && currentPage > 1)              { currentPage--; renderPage(currentPage); }
    }
  }, { passive: true });

  counter.textContent = 'Загрузка...';
  window.pdfjsLib.getDocument(url).promise.then(function(pdf) {
    pdfDoc = pdf;
    currentPage = Math.max(1, Math.min(currentPage, pdf.numPages));
    renderPage(currentPage);
  }).catch(function() {
    counter.textContent = 'Ошибка загрузки';
  });
};

/* ------------------------------------------------------------------
   10. Bottom Panel — IndexedDB helpers
   ------------------------------------------------------------------ */
window.app.initFlightDB = function() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open('pilot-tool-fs', 1);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = function() { resolve(request.result); };
    request.onerror = function() { reject(request.error); };
  });
};

window.app.addPhotoToDB = function(base64Data) {
  return window.app.initFlightDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('photos', 'readwrite');
      var store = tx.objectStore('photos');
      var req = store.add({ data: base64Data, ts: Date.now() });
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
};

window.app.getPhotoFromDB = function(id) {
  return window.app.initFlightDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('photos', 'readonly');
      var store = tx.objectStore('photos');
      var req = store.get(id);
      req.onsuccess = function() { resolve(req.result ? req.result.data : null); };
      req.onerror = function() { reject(req.error); };
    });
  });
};

window.app.deletePhotoFromDB = function(id) {
  return window.app.initFlightDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('photos', 'readwrite');
      var store = tx.objectStore('photos');
      var req = store.delete(id);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
};

window.app.clearPhotosDB = function() {
  return window.app.initFlightDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('photos', 'readwrite');
      var store = tx.objectStore('photos');
      var req = store.clear();
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
};

/* ------------------------------------------------------------------
   11. Bottom Panel — localStorage helpers
   ------------------------------------------------------------------ */
function getFlightMeta() {
  try {
    var raw = localStorage.getItem(FLIGHT_META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveFlightMeta(meta) {
  try { localStorage.setItem(FLIGHT_META_KEY, JSON.stringify(meta)); } catch(e) {}
}

function getFlightNotes() {
  try { return localStorage.getItem(FLIGHT_NOTES_KEY) || ''; } catch(e) { return ''; }
}

function saveFlightNotes(text) {
  try { localStorage.setItem(FLIGHT_NOTES_KEY, text); } catch(e) {}
}

/* ------------------------------------------------------------------
   12. Bottom Panel — Toast
   ------------------------------------------------------------------ */
window.app.showToast = function(message) {
  var toast = document.getElementById('globalToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    toast.classList.remove('visible');
    _toastTimer = null;
  }, 3000);
};

/* ------------------------------------------------------------------
   13. Bottom Panel — Thumbnail (Promise-based, NOT async)
   ------------------------------------------------------------------ */
function createThumbnail(base64Data, maxWidth, quality) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var w = img.width;
      var h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * maxWidth / w);
        w = maxWidth;
      }
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { resolve(base64Data); };
    img.src = base64Data;
  });
}

/* ------------------------------------------------------------------
   14. Bottom Panel — Photo cache (Promise-based, NOT async)
   ------------------------------------------------------------------ */
function loadFullPhotosCache() {
  if (_fullPhotosCache) return Promise.resolve();
  _fullPhotosCache = {};
  var meta = getFlightMeta();
  if (meta.length === 0) return Promise.resolve();

  var chain = Promise.resolve();
  for (var i = 0; i < meta.length; i++) {
    (function(entry) {
      chain = chain.then(function() {
        return window.app.getPhotoFromDB(entry.id).then(function(fullData) {
          if (fullData) _fullPhotosCache[entry.id] = fullData;
        }).catch(function() {});
      });
    })(meta[i]);
  }
  return chain;
}

function clearFullPhotosCache() {
  _fullPhotosCache = null;
}

/* ------------------------------------------------------------------
   15. Bottom Panel — Render photos
   ------------------------------------------------------------------ */
function renderBottomPanelPhotos() {
  var container = document.getElementById('bottomPanelPhotos');
  var emptyMsg  = document.getElementById('bottomPanelPhotosEmpty');
  if (!container) return;
  var meta = getFlightMeta();
  if (meta.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';
  var html = '';
  for (var i = 0; i < meta.length; i++) {
    var m = meta[i];
    var fullSrc = (_fullPhotosCache && _fullPhotosCache[m.id])
      ? _fullPhotosCache[m.id]
      : m.thumb;
    html += '<div class="bottom-panel-photo-item" data-photo-id="' + m.id + '">'
      + '<img class="bottom-panel-photo-thumb fp-photo-thumb" '
      + 'src="' + m.thumb + '" '
      + 'data-full-src="' + fullSrc + '" '
      + 'data-gallery="1" '
      + 'alt="Фото документа">'
      + '<button class="bottom-panel-photo-delete" data-photo-id="' + m.id + '" '
      + 'aria-label="Удалить фото">'
      + window.ICONS.close + '</button>'
      + '</div>';
  }
  container.innerHTML = html;
}

/* ------------------------------------------------------------------
   16. Bottom Panel — Main functions (Promise-based, NOT async)
   ------------------------------------------------------------------ */
window.app.openBottomPanel = function(options) {
  var panel   = document.getElementById('bottomPanel');
  var overlay = document.getElementById('bottomPanelOverlay');
  var closeBtn = document.getElementById('bottomPanelCloseBtn');
  if (!panel) return;

  if (closeBtn && !closeBtn.innerHTML) {
    closeBtn.innerHTML = window.ICONS.close;
  }

  var addBtn = document.getElementById('bottomPanelAddPhotoBtn');
  if (addBtn && !addBtn.innerHTML) {
    addBtn.innerHTML = window.ICONS.image || window.ICONS.plus;
  }

  panel.classList.add('open');
  if (overlay) overlay.classList.add('open');

  var notes = getFlightNotes();
  var notesEl = document.getElementById('bottomPanelNotes');
  if (notesEl) notesEl.value = notes;

  loadFullPhotosCache().then(function() {
    renderBottomPanelPhotos();

    var clearBtn = document.getElementById('bottomPanelClearBtn');
    if (clearBtn) {
      clearBtn.textContent = 'Очистить';
      clearBtn.dataset.confirmPending = '';
      if (window._clearConfirmTimer) {
        clearTimeout(window._clearConfirmTimer);
        window._clearConfirmTimer = null;
      }
    }

    if (options && options.autoFocus === 'camera') {
      setTimeout(function() {
        var input = document.getElementById('bottomPanelFileInput');
        if (input) input.click();
      }, 350);
    }
    if (options && options.autoFocus === 'notes') {
      setTimeout(function() {
        var ta = document.getElementById('bottomPanelNotes');
        if (ta) ta.focus();
      }, 350);
    }
  });
};

window.app.closeBottomPanel = function() {
  var panel   = document.getElementById('bottomPanel');
  var overlay = document.getElementById('bottomPanelOverlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  clearFullPhotosCache();

  var clearBtn = document.getElementById('bottomPanelClearBtn');
  if (clearBtn) {
    clearBtn.textContent = 'Очистить';
    clearBtn.dataset.confirmPending = '';
  }
  if (window._clearConfirmTimer) {
    clearTimeout(window._clearConfirmTimer);
    window._clearConfirmTimer = null;
  }
};

window.app.clearBottomPanelData = function() {
  var clearBtn = document.getElementById('bottomPanelClearBtn');
  if (!clearBtn) return;

  if (clearBtn.dataset.confirmPending === 'true') {
    clearBtn.dataset.confirmPending = '';
    clearBtn.textContent = 'Очистить';
    if (window._clearConfirmTimer) {
      clearTimeout(window._clearConfirmTimer);
      window._clearConfirmTimer = null;
    }

    window.app.clearPhotosDB().then(function() {
      saveFlightMeta([]);
      saveFlightNotes('');
      clearFullPhotosCache();
      renderBottomPanelPhotos();
      var notesEl = document.getElementById('bottomPanelNotes');
      if (notesEl) notesEl.value = '';
    });
  } else {
    clearBtn.dataset.confirmPending = 'true';
    clearBtn.textContent = 'Точно очистить?';
    window._clearConfirmTimer = setTimeout(function() {
      clearBtn.textContent = 'Очистить';
      clearBtn.dataset.confirmPending = '';
      window._clearConfirmTimer = null;
    }, 3000);
  }
};

window.app.addBottomPanelPhoto = function() {
  var input = document.getElementById('bottomPanelFileInput');
  if (input) input.click();
};

window.app.deleteBottomPanelPhoto = function(photoId) {
  var id = parseInt(photoId, 10);
  if (isNaN(id)) return;

  window.app.deletePhotoFromDB(id).then(function() {
    var meta = getFlightMeta();
    var filtered = [];
    for (var i = 0; i < meta.length; i++) {
      if (meta[i].id !== id) filtered.push(meta[i]);
    }
    saveFlightMeta(filtered);
    if (_fullPhotosCache) delete _fullPhotosCache[id];
    renderBottomPanelPhotos();
  });
};

/* ------------------------------------------------------------------
   17. Bottom Panel — File handler (Promise-based, NOT async)
   ------------------------------------------------------------------ */
function handlePhotoSelected(file) {
  if (!file || !file.type.match(/^image\//)) return;

  var meta = getFlightMeta();
  if (meta.length >= FLIGHT_MAX_PHOTOS) {
    window.app.showToast('Максимум ' + FLIGHT_MAX_PHOTOS + ' фото');
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    var fullBase64 = e.target.result;
    window.app.addPhotoToDB(fullBase64).then(function(newId) {
      return createThumbnail(fullBase64, 200, 0.6).then(function(thumbBase64) {
        meta.push({ id: newId, thumb: thumbBase64, ts: Date.now() });
        saveFlightMeta(meta);
        if (_fullPhotosCache) _fullPhotosCache[newId] = fullBase64;
        renderBottomPanelPhotos();
      });
    }).catch(function() {
      window.app.showToast('Ошибка сохранения фото');
    });
  };
  reader.readAsDataURL(file);
}

/* ------------------------------------------------------------------
   18. DOMContentLoaded event handler
   ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function() {
  /* -- Restore theme -- */
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }

  /* -- Init menu icons -- */
  initMenuIcons();

  /* -- Placeholder menu items -- */
  document.querySelectorAll('.menu-item[data-placeholder]').forEach(function(item) {
    item.addEventListener('click', function() {
      alert('Раздел в разработке');
      app.closeMenu();
    });
  });

  /* -- Theme toggle -- */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      app.toggleTheme();
      app.closeMenu();
    });
  }

  /* -- Install app -- */
  var installApp = document.getElementById('installApp');
  if (installApp) {
    installApp.addEventListener('click', function() {
      if (window.app && typeof window.app.showInstallPrompt === 'function') {
        window.app.showInstallPrompt();
      }
      app.closeMenu();
    });
  }

  /* -- Menu navigation items -- */
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    item.addEventListener('click', function() {
      app.navigateTo(item.dataset.nav);
    });
  });

  /* -- Restore offline status -- */
  if (localStorage.getItem('offlineReady') === 'true') {
    app.updateOfflineStatus(true);
  }

  /* -- Online / offline network status banner -- */
  window.addEventListener('online', function() {
    var el = document.getElementById('menuNetworkStatus');
    if (el) { el.textContent = '● Онлайн'; el.style.color = ''; }
  });
  window.addEventListener('offline', function() {
    var el = document.getElementById('menuNetworkStatus');
    if (el) { el.textContent = '● Офлайн'; el.style.color = 'rgba(255,255,255,0.4)'; }
  });

  /* -- Bottom panel listeners -- */
  var bpOverlay = document.getElementById('bottomPanelOverlay');
  if (bpOverlay) {
    bpOverlay.addEventListener('click', function() {
      window.app.closeBottomPanel();
    });
  }

  var bpCloseBtn = document.getElementById('bottomPanelCloseBtn');
  if (bpCloseBtn) {
    bpCloseBtn.addEventListener('click', function() {
      window.app.closeBottomPanel();
    });
  }

  var bpClearBtn = document.getElementById('bottomPanelClearBtn');
  if (bpClearBtn) {
    bpClearBtn.addEventListener('click', function() {
      window.app.clearBottomPanelData();
    });
  }

  var bpAddPhotoBtn = document.getElementById('bottomPanelAddPhotoBtn');
  if (bpAddPhotoBtn) {
    bpAddPhotoBtn.addEventListener('click', function() {
      window.app.addBottomPanelPhoto();
    });
  }

  var bpBody = document.getElementById('bottomPanelBody');
  if (bpBody && !bpBody.dataset.delegated) {
    bpBody.addEventListener('click', function(e) {
      var thumb = e.target.closest('.bottom-panel-photo-thumb');
      if (thumb) {
        window.app.openPhotoSwipe(thumb, document.getElementById('bottomPanelPhotos'));
        return;
      }
      var delBtn = e.target.closest('.bottom-panel-photo-delete');
      if (delBtn) {
        window.app.deleteBottomPanelPhoto(delBtn.dataset.photoId);
        return;
      }
    });
    bpBody.dataset.delegated = 'true';
  }

  var bpNotes = document.getElementById('bottomPanelNotes');
  if (bpNotes && !bpNotes.dataset.delegated) {
    bpNotes.addEventListener('input', function() {
      saveFlightNotes(bpNotes.value);
    });
    bpNotes.dataset.delegated = 'true';
  }

  var bpFileInput = document.getElementById('bottomPanelFileInput');
  if (bpFileInput && !bpFileInput.dataset.delegated) {
    bpFileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) {
        handlePhotoSelected(e.target.files[0]);
      }
      e.target.value = '';
    });
    bpFileInput.dataset.delegated = 'true';
  }

  /* -- Eager-init IndexedDB -- */
  if (window.app && typeof window.app.initFlightDB === 'function') {
    window.app.initFlightDB().catch(function(e) {
      console.warn('IndexedDB init failed:', e);
    });
  }

  /* -- MANDATORY LAST LINE: show main screen -- */
  window.app.navigateTo('main');
});

/* ------------------------------------------------------------------
   19. beforeinstallprompt / appinstalled listeners (top level)
   ------------------------------------------------------------------ */
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;
});
