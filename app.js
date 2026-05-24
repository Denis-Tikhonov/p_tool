// app.js
window.app = {};

// -----------------------------
// Глобальные утилиты (скелетон, ошибки)
// -----------------------------
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

// -----------------------------
// Навигация и хедер
// -----------------------------
window.app.navigateTo = function(screenName) {
  window.app.resetHeader();
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var screen = document.getElementById(screenName + 'Screen');
  if (screen) screen.classList.add('active');
  window.app.closeMenu();
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    item.classList.remove('menu-item--active');
    if (item.dataset.nav === screenName) item.classList.add('menu-item--active');
  });
  if (screenName === 'main') window.app.renderMainHeader();
  if (screenName === 'phonebook' && typeof initPhonebook === 'function') initPhonebook();
  if (screenName === 'checklists' && typeof initChecklists === 'function') initChecklists();
  if (screenName === 'krs' && typeof initKRS === 'function') initKRS();
  if (screenName === 'flightprocedures' && typeof initFlightProcedures === 'function') initFlightProcedures();
  if (screenName === 'notes' && typeof initNotes === 'function') initNotes();
  if (screenName === 'faq' && typeof initFAQ === 'function') initFAQ();
  if (screenName === 'worktime' && typeof initWorktime === 'function') initWorktime();
};
window.app.resetHeader = function() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (left) { left.innerHTML = ''; left.onclick = null; }
  if (center) { center.innerHTML = ''; delete center.dataset.tabDelegated; }
  if (right) { right.innerHTML = ''; right.onclick = null; }
};
window.app.renderMainHeader = function() {
  var left = document.getElementById('headerLeft');
  var center = document.getElementById('headerCenter');
  var right = document.getElementById('headerRight');
  if (!left || !center || !right) return;
  left.innerHTML = '<button id="menuBtn" class="icon-btn" aria-label="Меню" onclick="window.app.toggleMenu()">' + window.ICONS.menu + '</button>';
  center.innerHTML = '<div class="hc-default">Pilot\'s Tool</div>';
  right.innerHTML = '';
  window.app.renderMainQuote();
};

// -----------------------------
// Цитаты главного экрана (typewriter)
// -----------------------------
window.app._twCancel = false;
window.app.typewriterQuote = function(text, speed) {
  if (!speed) speed = 38;
  var textEl = document.getElementById('mainQuoteText');
  var cursorEl = document.getElementById('mainQuoteCursor');
  if (!textEl) return;
  window.app._twCancel = true;
  textEl.textContent = '';
  if (cursorEl) cursorEl.classList.remove('visible');
  setTimeout(function() {
    window.app._twCancel = false;
    var i = 0;
    if (cursorEl) cursorEl.classList.add('visible');
    function typeNext() {
      if (window.app._twCancel) {
        if (cursorEl) cursorEl.classList.remove('visible');
        return;
      }
      i++;
      textEl.textContent = text.slice(0, i);
      if (i < text.length) {
        setTimeout(typeNext, speed);
      } else {
        setTimeout(function() {
          if (!window.app._twCancel && cursorEl) cursorEl.classList.remove('visible');
        }, 1200);
      }
    }
    setTimeout(typeNext, 200);
  }, 20);
};
window.app.renderMainQuote = function() {
  var STORAGE_KEY_IDX = 'mainQuoteIndex';
  var STORAGE_KEY_DATA = 'mainQuoteData';
  function applyQuote(sayings) {
    var raw = localStorage.getItem(STORAGE_KEY_IDX);
    var idx = raw !== null ? parseInt(raw, 10) : -1;
    idx = (idx + 1) % sayings.length;
    localStorage.setItem(STORAGE_KEY_IDX, String(idx));
    var item = sayings[idx];
    var text = (item.ru || item.en || '').trim();
    window.app.typewriterQuote(text, 38);
  }
  var cached = null;
  try {
    var rawCache = localStorage.getItem(STORAGE_KEY_DATA);
    if (rawCache) cached = JSON.parse(rawCache);
  } catch(e) { cached = null; }
  if (cached && cached.length) {
    applyQuote(cached);
    return;
  }
  fetch('modules/aviation_sayings.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var sayings = (data && data.sayings) ? data.sayings : (Array.isArray(data) ? data : []);
      if (!sayings.length) return;
      try { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(sayings)); } catch(e) {}
      applyQuote(sayings);
    })
    .catch(function() {
      var textEl = document.getElementById('mainQuoteText');
      if (textEl) textEl.textContent = 'Лучше тупой карандаш, чем острая память!';
    });
};
window.app.initMarquee = function(container) {
  var titles = container.querySelectorAll('.collapsible-title');
  for (var i = 0; i < titles.length; i++) {
    (function(title) {
      var inner = title.querySelector('.marquee-inner');
      if (!inner) return;
      if (inner.scrollWidth > title.clientWidth) {
        inner.classList.add('is-overflowing');
      } else {
        inner.classList.remove('is-overflowing');
      }
    })(titles[i]);
  }
};

// -----------------------------
// Меню и тема
// -----------------------------
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
window.app.toggleTheme = function() {
  var isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.app.updateThemeIcon();
};
window.app.updateThemeIcon = function() {
  var themeIcon = document.getElementById('themeIcon');
  var themeLabel = document.getElementById('themeLabel');
  var isDark = document.body.classList.contains('dark-theme');
  if (themeIcon) themeIcon.innerHTML = isDark ? window.ICONS.sun : window.ICONS.moon;
  if (themeLabel) themeLabel.textContent = isDark ? 'Дневной режим' : 'Ночной режим';
};
window.app.updateOfflineStatus = function(ready) {
  var iconEl = document.getElementById('offlineStatusIcon');
  var textEl = document.getElementById('offlineStatusText');
  if (!iconEl || !textEl) return;
  if (ready) {
    iconEl.innerHTML = window.ICONS['check-circle'] || '';
    textEl.textContent = 'Приложение готово к работе offline';
  } else {
    iconEl.innerHTML = window.ICONS.download || '';
    textEl.textContent = 'Загрузка ресурсов...';
  }
};
window.app.showUpdateBadge = function(moduleName) {
  window.app.showToast('Обновлено: ' + moduleName);
};

// -----------------------------
// Toast, Confirm
// -----------------------------
var _toastTimer = null;
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
var _confirmCleanup = null;
window.app.showConfirm = function(message, onConfirm, okLabel) {
  var overlay = document.getElementById('globalConfirmOverlay');
  var msgEl = document.getElementById('globalConfirmMessage');
  var okBtn = document.getElementById('globalConfirmOk');
  var cancelBtn = document.getElementById('globalConfirmCancel');
  if (!overlay || !msgEl || !okBtn || !cancelBtn) {
    if (window.confirm(message)) { if (typeof onConfirm === 'function') onConfirm(); }
    return;
  }
  if (typeof _confirmCleanup === 'function') { _confirmCleanup(); _confirmCleanup = null; }
  msgEl.textContent = message;
  okBtn.textContent = okLabel || 'Подтвердить';
  function close() {
    overlay.classList.remove('visible');
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', handleCancel);
    overlay.removeEventListener('click', handleOverlay);
    _confirmCleanup = null;
  }
  function handleOk() { close(); if (typeof onConfirm === 'function') onConfirm(); }
  function handleCancel() { close(); }
  function handleOverlay(e) { if (e.target === overlay) close(); }
  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  overlay.addEventListener('click', handleOverlay);
  _confirmCleanup = close;
  overlay.classList.add('visible');
};

// -----------------------------
// Bottom Panel – данные и фото (IndexedDB)
// -----------------------------
var FLIGHT_META_KEY = 'flight_docs_meta';
var FLIGHT_NOTES_KEY = 'flight_docs_notes';
var FLIGHT_MAX_PHOTOS = 12;
window.app.initFlightDB = function() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open('pilot-tool-fs', 2);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      }
      if (e.oldVersion < 2) {
        if (!db.objectStoreNames.contains('handwritten-notes')) {
          db.createObjectStore('handwritten-notes', { keyPath: 'id', autoIncrement: true });
        }
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
function getFlightMeta() {
  try { var raw = localStorage.getItem(FLIGHT_META_KEY); return raw ? JSON.parse(raw) : []; } catch(e) { return []; }
}
function saveFlightMeta(meta) { try { localStorage.setItem(FLIGHT_META_KEY, JSON.stringify(meta)); } catch(e) {} }
function getFlightComments() {
  try {
    var raw = localStorage.getItem(FLIGHT_NOTES_KEY);
    if (!raw) return [];
    if (typeof raw === 'string' && (raw.startsWith('[') === false)) {
      return raw.split('\n').filter(function(line) { return line.trim().length > 0; });
    }
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch(e) { return []; }
}
function saveFlightComments(commentsArray) { try { localStorage.setItem(FLIGHT_NOTES_KEY, JSON.stringify(commentsArray)); } catch(e) {} }
function addFlightComment(newComment) {
  if (!newComment || newComment.trim() === '') return;
  var comments = getFlightComments();
  comments.push(newComment.trim());
  saveFlightComments(comments);
  renderCommentsList();
}
function renderCommentsList() {
  var container = document.getElementById('bottomPanelCommentsList');
  if (!container) return;
  var comments = getFlightComments();
  if (comments.length === 0) {
    container.innerHTML = '<div class="comments-empty">Нет комментариев</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < comments.length; i++) {
    var safeText = comments[i].replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    }).replace(/\n/g, '<br>');
    html += '<div class="comment-item" data-index="' + i + '">' +
      '<span class="comment-text">' + safeText + '</span>' +
      '<button class="comment-delete" data-index="' + i + '" aria-label="Удалить комментарий">' + (window.ICONS.close || '✕') + '</button>' +
      '</div>';
  }
  container.innerHTML = html;
}
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
var _fullPhotosCache = null;
function loadFullPhotosCache() {
  if (_fullPhotosCache) return Promise.resolve();
  _fullPhotosCache = {};
  var meta = getFlightMeta();
  var promises = [];
  for (var i = 0; i < meta.length; i++) {
    (function(id) {
      promises.push(window.app.getPhotoFromDB(id).then(function(fullData) {
        if (fullData) _fullPhotosCache[id] = fullData;
      }));
    })(meta[i].id);
  }
  return Promise.all(promises);
}
function clearFullPhotosCache() { _fullPhotosCache = null; }
function renderBottomPanelPhotos() {
  var container = document.getElementById('bottomPanelPhotos');
  var emptyMsg = document.getElementById('bottomPanelPhotosEmpty');
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
    var fullSrc = (_fullPhotosCache && _fullPhotosCache[m.id]) ? _fullPhotosCache[m.id] : m.thumb;
    html += '<div class="bottom-panel-photo-item" data-photo-id="' + m.id + '">' +
      '<img class="bottom-panel-photo-thumb" src="' + m.thumb + '" data-full-src="' + fullSrc + '" alt="Фото документа" onerror="this.src=\'icons/android-chrome-192.png\'">' +
      '<button class="bottom-panel-photo-delete" data-photo-id="' + m.id + '" aria-label="Удалить фото">' + window.ICONS.close + '</button>' +
      '</div>';
  }
  container.innerHTML = html;
}
window.app.openBottomPanel = function(options) {
  var panel = document.getElementById('bottomPanel');
  var overlay = document.getElementById('bottomPanelOverlay');
  var closeBtn = document.getElementById('bottomPanelCloseBtn');
  if (!panel) return;
  if (closeBtn && !closeBtn.innerHTML) closeBtn.innerHTML = window.ICONS.close;
  var addBtn = document.getElementById('bottomPanelAddPhotoBtn');
  if (addBtn && !addBtn.innerHTML) addBtn.innerHTML = window.ICONS.image || window.ICONS.plus;
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('open');
  renderCommentsList();
  loadFullPhotosCache().then(function() { renderBottomPanelPhotos(); });
  var clearBtn = document.getElementById('bottomPanelClearBtn');
  if (clearBtn) clearBtn.textContent = 'Очистить';
  if (options && options.autoFocus === 'camera') {
    setTimeout(function() {
      var input = document.getElementById('bottomPanelFileInput');
      if (input) input.click();
    }, 350);
  }
};
window.app.closeBottomPanel = function() {
  var panel = document.getElementById('bottomPanel');
  var overlay = document.getElementById('bottomPanelOverlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  clearFullPhotosCache();
  var clearBtn = document.getElementById('bottomPanelClearBtn');
  if (clearBtn) clearBtn.textContent = 'Очистить';
};
window.app.clearBottomPanelData = function() {
  window.app.showConfirm('Очистить все документы рейса? Это действие необратимо.', function() {
    window.app.clearPhotosDB().then(function() {
      saveFlightMeta([]);
      saveFlightComments([]);
      clearFullPhotosCache();
      renderBottomPanelPhotos();
      renderCommentsList();
      window.app.showToast('Данные рейса очищены');
    });
  }, 'Очистить');
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
      createThumbnail(fullBase64, 200, 0.6).then(function(thumbBase64) {
        meta.push({ id: newId, thumb: thumbBase64, ts: Date.now() });
        saveFlightMeta(meta);
        if (_fullPhotosCache) _fullPhotosCache[newId] = fullBase64;
        renderBottomPanelPhotos();
      });
    }).catch(function() { window.app.showToast('Ошибка сохранения фото'); });
  };
  reader.readAsDataURL(file);
}

// -----------------------------
// PhotoSwipe
// -----------------------------
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
          allImgs[i].classList.contains('fp-photo-thumb') ||
          allImgs[i].classList.contains('bottom-panel-photo-thumb')) {
        thumbs.push(allImgs[i]);
      }
    }
  }
  if (thumbs.length === 0) thumbs = [thumbEl];
  var clickedIndex = 0;
  for (var j = 0; j < thumbs.length; j++) {
    if (thumbs[j] === thumbEl) { clickedIndex = j; break; }
  }
  var items = [];
  for (var k = 0; k < thumbs.length; k++) {
    var img = thumbs[k];
    var isBottomPanelPhoto = img.classList.contains('bottom-panel-photo-thumb');
    var w = isBottomPanelPhoto ? 0 : (img.naturalWidth || screen.width);
    var h = isBottomPanelPhoto ? 0 : (img.naturalHeight || screen.height);
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
    index: clickedIndex,
    bgOpacity: 0.92,
    showHideOpacity: true,
    tapToClose: true,
    clickToCloseNonZoomable: true,
    pinchToClose: true,
    closeOnScroll: false,
    history: false,
    getThumbBoundsFn: getThumbBoundsFn
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

// -----------------------------
// PDF Modal
// -----------------------------
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
  counter.textContent = '…';
  var btnNext = document.createElement('button');
  btnNext.className = 'pdf-nav-btn pdf-nav-btn--next';
  btnNext.setAttribute('aria-label', 'Следующая страница');
  btnNext.innerHTML = window.ICONS ? window.ICONS.back : '&#8594;';
  var btnZoomOut = document.createElement('button');
  btnZoomOut.className = 'pdf-zoom-btn';
  btnZoomOut.setAttribute('aria-label', 'Уменьшить');
  btnZoomOut.innerHTML = window.ICONS ? window.ICONS['zoom-out'] : '−';
  var btnZoomIn = document.createElement('button');
  btnZoomIn.className = 'pdf-zoom-btn';
  btnZoomIn.setAttribute('aria-label', 'Увеличить');
  btnZoomIn.innerHTML = window.ICONS ? window.ICONS['zoom-in'] : '+';
  var btnSearch = document.createElement('button');
  btnSearch.className = 'pdf-search-toggle-btn';
  btnSearch.setAttribute('aria-label', 'Поиск по документу');
  btnSearch.innerHTML = window.ICONS ? window.ICONS.search : '🔍';
  var btnClose = document.createElement('button');
  btnClose.className = 'pdf-modal-close';
  btnClose.setAttribute('aria-label', 'Закрыть');
  btnClose.innerHTML = window.ICONS ? window.ICONS.close : '&#10005;';
  toolbar.appendChild(btnPrev);
  toolbar.appendChild(counter);
  toolbar.appendChild(btnNext);
  toolbar.appendChild(btnZoomOut);
  toolbar.appendChild(btnZoomIn);
  toolbar.appendChild(btnSearch);
  toolbar.appendChild(btnClose);
  var searchBar = document.createElement('div');
  searchBar.className = 'pdf-search-bar';
  searchBar.style.display = 'none';
  var searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'pdf-search-input';
  searchInput.placeholder = 'Поиск в документе…';
  searchInput.autocomplete = 'off';
  var searchCounter = document.createElement('span');
  searchCounter.className = 'pdf-search-counter';
  searchCounter.textContent = '';
  var btnSearchPrev = document.createElement('button');
  btnSearchPrev.className = 'pdf-search-nav-btn';
  btnSearchPrev.innerHTML = window.ICONS ? window.ICONS['chevron-up'] : '↑';
  var btnSearchNext = document.createElement('button');
  btnSearchNext.className = 'pdf-search-nav-btn';
  btnSearchNext.innerHTML = window.ICONS ? window.ICONS['chevron-down'] : '↓';
  var btnSearchClose = document.createElement('button');
  btnSearchClose.className = 'pdf-search-nav-btn';
  btnSearchClose.innerHTML = window.ICONS ? window.ICONS.close : '✕';
  searchBar.appendChild(searchInput);
  searchBar.appendChild(searchCounter);
  searchBar.appendChild(btnSearchPrev);
  searchBar.appendChild(btnSearchNext);
  searchBar.appendChild(btnSearchClose);
  var canvas = document.createElement('canvas');
  canvas.id = 'pdfCanvas';
  content.appendChild(toolbar);
  content.appendChild(searchBar);
  content.appendChild(canvas);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  var pdfDoc = null;
  var currentPage = startPage || 1;
  var rendering = false;
  var zoomLevels = [0.75, 1.0, 1.25, 1.5, 2.0];
  var zoomIdx = 1;
  var searchMatches = [];
  var searchMatchIdx = 0;
  var closeFn = function() { overlay.remove(); };
  overlay.addEventListener('click', closeFn);
  content.addEventListener('click', function(e) { e.stopPropagation(); });
  btnClose.addEventListener('click', closeFn);
  var renderPage = function(num) {
    if (rendering || !pdfDoc) return;
    rendering = true;
    btnPrev.disabled = true;
    btnNext.disabled = true;
    pdfDoc.getPage(num).then(function(page) {
      var dpr = window.devicePixelRatio || 1;
      var zoom = zoomLevels[zoomIdx];
      var desiredWidth = Math.min(content.clientWidth - 32, 1100) * zoom;
      var viewport = page.getViewport({ scale: 1 });
      var scale = desiredWidth / viewport.width;
      var scaledViewport = page.getViewport({ scale: scale });
      canvas.width = Math.round(scaledViewport.width * dpr);
      canvas.height = Math.round(scaledViewport.height * dpr);
      canvas.style.width = scaledViewport.width + 'px';
      canvas.style.height = scaledViewport.height + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      page.render({ canvasContext: ctx, viewport: scaledViewport }).promise.then(function() {
        rendering = false;
        counter.textContent = num + ' / ' + pdfDoc.numPages;
        btnPrev.disabled = (num <= 1);
        btnNext.disabled = (num >= pdfDoc.numPages);
        content.scrollTop = 0;
        if (searchBar.style.display !== 'none' && searchInput.value.trim()) {
          doSearch(searchInput.value.trim(), false);
        }
      });
    }).catch(function() { rendering = false; });
  };
  btnPrev.addEventListener('click', function() { if (currentPage > 1) { currentPage--; renderPage(currentPage); } });
  btnNext.addEventListener('click', function() { if (pdfDoc && currentPage < pdfDoc.numPages) { currentPage++; renderPage(currentPage); } });
  btnZoomOut.addEventListener('click', function() { if (zoomIdx > 0) { zoomIdx--; renderPage(currentPage); } btnZoomOut.disabled = (zoomIdx === 0); btnZoomIn.disabled = (zoomIdx === zoomLevels.length - 1); });
  btnZoomIn.addEventListener('click', function() { if (zoomIdx < zoomLevels.length - 1) { zoomIdx++; renderPage(currentPage); } btnZoomOut.disabled = (zoomIdx === 0); btnZoomIn.disabled = (zoomIdx === zoomLevels.length - 1); });
  btnSearch.addEventListener('click', function() {
    var visible = searchBar.style.display !== 'none';
    searchBar.style.display = visible ? 'none' : 'flex';
    if (!visible) searchInput.focus();
  });
  btnSearchClose.addEventListener('click', function() {
    searchBar.style.display = 'none';
    searchInput.value = '';
    searchMatches = [];
    searchCounter.textContent = '';
  });
  function doSearch(query, keepIdx) {
    if (!pdfDoc || !query) {
      searchMatches = [];
      searchCounter.textContent = '';
      return;
    }
    var lq = query.toLowerCase();
    pdfDoc.getPage(currentPage).then(function(page) { return page.getTextContent(); }).then(function(textContent) {
      var text = textContent.items.map(function(it) { return it.str; }).join(' ');
      var matches = [];
      var idx = 0;
      while (true) {
        var pos = text.toLowerCase().indexOf(lq, idx);
        if (pos === -1) break;
        matches.push(pos);
        idx = pos + 1;
      }
      searchMatches = matches;
      if (!keepIdx || searchMatchIdx >= matches.length) searchMatchIdx = 0;
      if (matches.length > 0) {
        searchCounter.textContent = (searchMatchIdx + 1) + ' из ' + matches.length;
      } else {
        searchCounter.textContent = 'Не найдено';
      }
    }).catch(function() { searchCounter.textContent = 'Ошибка'; });
  }
  var _searchTimer = null;
  searchInput.addEventListener('input', function() {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function() { doSearch(searchInput.value.trim(), false); }, 300);
  });
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && searchMatches.length > 0) {
      searchMatchIdx = (searchMatchIdx + 1) % searchMatches.length;
      searchCounter.textContent = (searchMatchIdx + 1) + ' из ' + searchMatches.length;
    }
  });
  btnSearchNext.addEventListener('click', function() {
    if (searchMatches.length === 0) return;
    searchMatchIdx = (searchMatchIdx + 1) % searchMatches.length;
    searchCounter.textContent = (searchMatchIdx + 1) + ' из ' + searchMatches.length;
  });
  btnSearchPrev.addEventListener('click', function() {
    if (searchMatches.length === 0) return;
    searchMatchIdx = (searchMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    searchCounter.textContent = (searchMatchIdx + 1) + ' из ' + searchMatches.length;
  });
  var touchStartX = 0;
  canvas.addEventListener('touchstart', function(e) { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  canvas.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && currentPage < pdfDoc.numPages) { currentPage++; renderPage(currentPage); }
      if (dx > 0 && currentPage > 1) { currentPage--; renderPage(currentPage); }
    }
  }, { passive: true });
  counter.textContent = 'Загрузка…';
  window.pdfjsLib.getDocument(url).promise.then(function(pdf) {
    pdfDoc = pdf;
    currentPage = Math.max(1, Math.min(currentPage, pdf.numPages));
    renderPage(currentPage);
  }).catch(function() { counter.textContent = 'Ошибка загрузки'; });
};

// -----------------------------
// Service Worker инициализация (вызывается только из inline-скрипта)
// -----------------------------
window.app.initServiceWorker = function() {
  if (!('serviceWorker' in navigator)) return;
  var swChannel = new BroadcastChannel('sw-progress');
  swChannel.onmessage = function(event) {
    var data = event.data;
    if (data.type === 'CACHE_PROGRESS') {
      var bar = document.getElementById('cacheProgressBar');
      var text = document.getElementById('cacheProgressText');
      var pct = Math.round(data.progress * 100);
      if (bar) bar.style.width = pct + '%';
      if (text) text.textContent = pct + '%';
    }
    if (data.type === 'CACHE_DONE') {
      var bar = document.getElementById('cacheProgressBar');
      var text = document.getElementById('cacheProgressText');
      var overlay = document.getElementById('cacheProgressOverlay');
      if (bar) bar.style.width = '100%';
      if (text) text.textContent = '100%';
      localStorage.setItem('offlineReady', 'true');
      window.app.updateOfflineStatus(true);
      setTimeout(function() { if (overlay) overlay.style.display = 'none'; }, 600);
    }
    if (data.type === 'JSON_UPDATED') {
      window.app.showUpdateBadge(data.module);
    }
  };
  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    if (reg.installing) {
      var overlay = document.getElementById('cacheProgressOverlay');
      if (overlay) overlay.style.display = 'flex';
    }
  }).catch(function(err) { console.error('SW registration failed:', err); });
};

// -----------------------------
// Инициализация меню иконок
// -----------------------------
function initMenuIcons() {
  var iconMap = {
    'phonebook': window.ICONS.phone,
    'checklists': window.ICONS.checklist,
    'krs': window.ICONS['file-text'],
    'flightprocedures': window.ICONS.plane,
    'faq': window.ICONS['help-circle'],
    'notes': window.ICONS['edit-3'],
    'worktime': window.ICONS.clock
  };
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    var icon = item.querySelector('.menu-icon');
    if (icon) icon.innerHTML = iconMap[item.dataset.nav] || '';
  });
  var offlineIcon = document.getElementById('offlineStatusIcon');
  if (offlineIcon) offlineIcon.innerHTML = window.ICONS.download || '';
  var bannerIcon = document.getElementById('menuBannerIcon');
  if (bannerIcon) bannerIcon.innerHTML = window.ICONS.plane;
  var commitDocsIcon = document.getElementById('commitDocsIcon');
  if (commitDocsIcon) commitDocsIcon.innerHTML = window.ICONS['file-text'];
  window.app.updateThemeIcon();
}
function initNotesQuickBtn() {
  var btn = document.getElementById('notesQuickBtn');
  if (!btn) return;
  if (window.ICONS && window.ICONS['edit-3']) btn.innerHTML = window.ICONS['edit-3'];
  var saved = null;
  try { var raw = localStorage.getItem('notesQuickBtnPos'); if (raw) saved = JSON.parse(raw); } catch(e) {}
  if (saved && typeof saved.right === 'number' && typeof saved.bottom === 'number') {
    btn.style.left = 'auto'; btn.style.top = 'auto';
    btn.style.right = saved.right + 'px'; btn.style.bottom = saved.bottom + 'px';
  }
  var dragging = false;
  var startX = 0, startY = 0;
  var startRight = 0, startBottom = 0;
  var moved = false;
  btn.addEventListener('pointerdown', function(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; moved = false;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('dragging');
    var rect = btn.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startRight = window.innerWidth - rect.right;
    startBottom = window.innerHeight - rect.bottom;
    btn.style.left = 'auto'; btn.style.top = 'auto';
    btn.style.right = startRight + 'px'; btn.style.bottom = startBottom + 'px';
    e.preventDefault();
  }, { passive: false });
  btn.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    if (!moved) return;
    var newRight = startRight - dx;
    var newBottom = startBottom - dy;
    var maxRight = window.innerWidth - btn.offsetWidth - 8;
    var maxBottom = window.innerHeight - btn.offsetHeight - 8;
    newRight = Math.max(8, Math.min(newRight, maxRight));
    newBottom = Math.max(8, Math.min(newBottom, maxBottom));
    btn.style.right = newRight + 'px'; btn.style.bottom = newBottom + 'px';
    e.preventDefault();
  }, { passive: false });
  btn.addEventListener('pointerup', function(e) {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove('dragging');
    btn.releasePointerCapture(e.pointerId);
    if (moved) {
      try { localStorage.setItem('notesQuickBtnPos', JSON.stringify({ right: parseFloat(btn.style.right), bottom: parseFloat(btn.style.bottom) })); } catch(e2) {}
    } else {
      window._notesOpenDraw = true;
      window.app.navigateTo('notes');
    }
  });
  btn.addEventListener('pointercancel', function() { dragging = false; btn.classList.remove('dragging'); });
}
function openCommentModal() {
  var modal = document.getElementById('commentModalOverlay');
  var input = document.getElementById('commentInput');
  if (!modal || !input) return;
  input.value = '';
  modal.classList.add('open');
  input.focus();
}
function closeCommentModal() {
  var modal = document.getElementById('commentModalOverlay');
  if (modal) modal.classList.remove('open');
}
function saveCommentFromModal() {
  var input = document.getElementById('commentInput');
  var newComment = input.value;
  if (newComment && newComment.trim() !== '') {
    addFlightComment(newComment);
    window.app.showToast('Комментарий добавлен');
  }
  closeCommentModal();
}
function initCommentModal() {
  var overlay = document.getElementById('commentModalOverlay');
  if (!overlay) return;
  var closeBtn = document.getElementById('commentModalClose');
  var saveBtn = document.getElementById('commentSaveBtn');
  var cancelBtn = document.getElementById('commentCancelBtn');
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeCommentModal(); });
  if (closeBtn) closeBtn.addEventListener('click', closeCommentModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCommentModal);
  if (saveBtn) saveBtn.addEventListener('click', saveCommentFromModal);
}

// -----------------------------
// DOMContentLoaded
// -----------------------------
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
  initMenuIcons();
  document.querySelectorAll('.menu-item[data-placeholder]').forEach(function(item) {
    item.addEventListener('click', function() { alert('Раздел в разработке'); window.app.closeMenu(); });
  });
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() { window.app.toggleTheme(); window.app.closeMenu(); });
  }
  document.querySelectorAll('.menu-item[data-nav]').forEach(function(item) {
    item.addEventListener('click', function() { window.app.navigateTo(item.dataset.nav); });
  });
  if (localStorage.getItem('offlineReady') === 'true') window.app.updateOfflineStatus(true);
  window.addEventListener('online', function() {
    var el = document.getElementById('menuNetworkStatus');
    if (el) { el.textContent = '● Онлайн'; el.style.color = ''; }
  });
  window.addEventListener('offline', function() {
    var el = document.getElementById('menuNetworkStatus');
    if (el) { el.textContent = '● Офлайн'; el.style.color = 'rgba(255,255,255,0.4)'; }
  });
  var bpOverlay = document.getElementById('bottomPanelOverlay');
  if (bpOverlay && !bpOverlay.dataset.delegated) {
    bpOverlay.addEventListener('click', function() { window.app.closeBottomPanel(); });
    bpOverlay.dataset.delegated = 'true';
  }
  var bpCloseBtn = document.getElementById('bottomPanelCloseBtn');
  if (bpCloseBtn && !bpCloseBtn.dataset.delegated) {
    bpCloseBtn.addEventListener('click', function() { window.app.closeBottomPanel(); });
    bpCloseBtn.dataset.delegated = 'true';
  }
  var bpClearBtn = document.getElementById('bottomPanelClearBtn');
  if (bpClearBtn && !bpClearBtn.dataset.delegated) {
    bpClearBtn.addEventListener('click', function() { window.app.clearBottomPanelData(); });
    bpClearBtn.dataset.delegated = 'true';
  }
  var bpAddPhotoBtn = document.getElementById('bottomPanelAddPhotoBtn');
  if (bpAddPhotoBtn && !bpAddPhotoBtn.dataset.delegated) {
    bpAddPhotoBtn.addEventListener('click', function() { window.app.addBottomPanelPhoto(); });
    bpAddPhotoBtn.dataset.delegated = 'true';
  }
  var bpBody = document.getElementById('bottomPanelBody');
  if (bpBody && !bpBody.dataset.delegated) {
    bpBody.addEventListener('click', function(e) {
      var thumb = e.target.closest('.bottom-panel-photo-thumb');
      if (thumb) { window.app.openPhotoSwipe(thumb, document.getElementById('bottomPanelPhotos')); return; }
      var delPhotoBtn = e.target.closest('.bottom-panel-photo-delete');
      if (delPhotoBtn) { window.app.deleteBottomPanelPhoto(delPhotoBtn.dataset.photoId); return; }
      var delCommentBtn = e.target.closest('.comment-delete');
      if (delCommentBtn) {
        var index = parseInt(delCommentBtn.dataset.index, 10);
        if (!isNaN(index)) {
          var comments = getFlightComments();
          comments.splice(index, 1);
          saveFlightComments(comments);
          renderCommentsList();
          window.app.showToast('Комментарий удалён');
        }
        return;
      }
    });
    bpBody.dataset.delegated = 'true';
  }
  var bpAddCommentBtn = document.getElementById('bottomPanelAddCommentBtn');
  if (bpAddCommentBtn && !bpAddCommentBtn.dataset.delegated) {
    bpAddCommentBtn.addEventListener('click', function() { openCommentModal(); });
    bpAddCommentBtn.dataset.delegated = 'true';
  }
  var bpFileInput = document.getElementById('bottomPanelFileInput');
  if (bpFileInput && !bpFileInput.dataset.delegated) {
    bpFileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) handlePhotoSelected(e.target.files[0]);
      e.target.value = '';
    });
    bpFileInput.dataset.delegated = 'true';
  }
  if (window.app && typeof window.app.initFlightDB === 'function') {
    window.app.initFlightDB().catch(function(e) { console.warn('IndexedDB init failed:', e); });
  }
  initNotesQuickBtn();
  initCommentModal();
  window.app.navigateTo('main');
});