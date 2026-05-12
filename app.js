// app.js
window.app = {};

// ========== Утилиты skeleton / error ==========
window.app.showSkeleton = function(container, type) {
  if (!container) return;
  const COUNT = type === 'list' ? 6 : 4;
  const templates = {
    list: () => `<div class="skeleton-item" style="display:flex;gap:12px;padding:12px 16px;align-items:center;"><div class="skeleton skeleton-avatar"></div><div style="flex:1;min-width:0;"><div class="skeleton skeleton-line" style="width:60%;"></div><div class="skeleton skeleton-line" style="width:40%;margin-bottom:0;"></div></div></div>`,
    blocks: () => `<div class="skeleton skeleton-block" style="height:56px;margin:8px 16px;border-radius:var(--border-radius-sm);"></div>`
  };
  const render = templates[type] || templates.blocks;
  container.innerHTML = Array.from({ length: COUNT }, render).join('');
};
window.app.hideSkeleton = function(container, htmlContent) {
  if (!container) return;
  container.innerHTML = htmlContent;
};
window.app.hideSpinner = window.app.hideSkeleton;
window.app.showError = function(container, text, retryFn) {
  if (!container) return;
  container.innerHTML = `<div class="error-message"><p class="error-text">${text}</p>${retryFn ? `<button class="error-retry-btn">Повторить</button>` : ''}</div>`;
  if (retryFn) {
    const btn = container.querySelector('.error-retry-btn');
    if (btn) btn.addEventListener('click', retryFn);
  }
};

// ========== Роутинг ==========
window.app.resetHeader = function() {
  const left = document.getElementById('headerLeft');
  const center = document.getElementById('headerCenter');
  const right = document.getElementById('headerRight');
  if (left) { left.innerHTML = ''; left.onclick = null; }
  if (center) { center.innerHTML = ''; }
  if (right) { right.innerHTML = ''; right.onclick = null; }
};
window.app.renderMainHeader = function() {
  const left = document.getElementById('headerLeft');
  const center = document.getElementById('headerCenter');
  const right = document.getElementById('headerRight');
  if (left) left.innerHTML = `<button class="icon-btn" aria-label="Меню">${window.ICONS.menu}</button>`;
  if (center) center.innerHTML = `<div class="hc-default">Pilot's tool</div>`;
  if (right) right.innerHTML = '';
  const menuBtn = left?.querySelector('.icon-btn');
  if (menuBtn) menuBtn.onclick = () => window.app.toggleMenu();
};
window.app.navigateTo = function(screenName) {
  window.app.resetHeader();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenName + 'Screen');
  if (screen) screen.classList.add('active');
  window.app.closeMenu();
  if (screenName === 'main') window.app.renderMainHeader();
  else if (screenName === 'phonebook' && window.initPhonebook) window.initPhonebook();
  else if (screenName === 'checklists' && window.initChecklists) window.initChecklists();
  else if (screenName === 'krs' && window.initKRS) window.initKRS();
  else if (screenName === 'flightprocedures' && window.initFlightProcedures) window.initFlightProcedures();
};

// ========== Меню ==========
window.app.toggleMenu = function() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  if (!menu || !overlay) return;
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    menu.classList.add('open');
    overlay.classList.add('open');
  }
};
window.app.closeMenu = function() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
};

// ========== Тема ==========
window.app.toggleTheme = function() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('darkTheme', isDark);
  window.app.updateThemeIcon();
};
window.app.updateThemeIcon = function() {
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  const isDark = document.body.classList.contains('dark-theme');
  if (themeIcon) themeIcon.innerHTML = isDark ? window.ICONS.sun : window.ICONS.moon;
  if (themeLabel) themeLabel.textContent = isDark ? 'Дневной режим' : 'Ночной режим';
};

// ========== Универсальный хедер с поиском (используется модулями) ==========
window.app.renderSearchableHeader = function(title, onSearch, onClear) {
  const center = document.getElementById('headerCenter');
  if (!center) return;
  center.innerHTML = `<div class="hc-default">${title}</div><div class="hc-search"><input type="search" id="headerSearchInput" placeholder="Поиск..." autocomplete="off"></div>`;
  const left = document.getElementById('headerLeft');
  const right = document.getElementById('headerRight');
  const showDefault = () => {
    const def = center.querySelector('.hc-default');
    const srch = center.querySelector('.hc-search');
    if (def) def.classList.remove('hidden');
    if (srch) srch.classList.remove('visible');
    if (left) left.innerHTML = `<button class="icon-btn" aria-label="Меню">${window.ICONS.menu}</button>`;
    if (right) right.innerHTML = `<button class="icon-btn" aria-label="Поиск">${window.ICONS.search}</button>`;
    const menuBtn = left?.querySelector('.icon-btn');
    if (menuBtn) menuBtn.onclick = () => window.app.toggleMenu();
    const searchBtn = right?.querySelector('.icon-btn');
    if (searchBtn) searchBtn.onclick = showSearch;
    if (onClear) onClear();
  };
  const showSearch = () => {
    const def = center.querySelector('.hc-default');
    const srch = center.querySelector('.hc-search');
    const input = document.getElementById('headerSearchInput');
    if (def) def.classList.add('hidden');
    if (srch) srch.classList.add('visible');
    if (left) left.innerHTML = '';
    if (right) right.innerHTML = `<button class="icon-btn" aria-label="Отмена">${window.ICONS.back}</button>`;
    const cancelBtn = right?.querySelector('.icon-btn');
    if (cancelBtn) cancelBtn.onclick = showDefault;
    if (input) { input.value = ''; input.focus(); }
  };
  const input = center.querySelector('#headerSearchInput');
  if (input) input.addEventListener('input', (e) => { if (onSearch) onSearch(e.target.value); });
  showDefault();
};

// ========== PhotoSwipe ==========
window.app.openPhotoSwipe = function(src, fullSrc) {
  if (window.PhotoSwipe && window.PhotoSwipeUI_Default) {
    const items = [{ src: fullSrc || src, w: 0, h: 0 }];
    const options = { index: 0, bgOpacity: 0.9, showHideOpacity: true };
    const pswpEl = document.querySelector('.pswp');
    const gallery = new window.PhotoSwipe(pswpEl, window.PhotoSwipeUI_Default, items, options);
    gallery.listen('gettingData', (index, item) => {
      if (item.w < 1 || item.h < 1) {
        const img = new Image();
        img.onload = () => { item.w = img.naturalWidth; item.h = img.naturalHeight; gallery.updateSize(true); };
        img.src = item.src;
      }
    });
    gallery.init();
  } else {
    window.open(fullSrc || src, '_blank');
  }
};

// ========== PDF модал ==========
window.app.openPDFModal = async function(url, startPage) {
  if (!window.pdfjsLib) { window.open(url, '_blank'); return; }
  const modal = document.createElement('div');
  modal.className = 'pdf-modal';
  modal.innerHTML = `<button class="pdf-modal-close">✕</button>`;
  document.body.appendChild(modal);
  modal.querySelector('.pdf-modal-close').onclick = () => modal.remove();
  try {
    const pdf = await window.pdfjsLib.getDocument(url).promise;
    const pageNum = startPage || 1;
    for (let i = pageNum; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = viewport.width > window.innerWidth ? window.innerWidth / viewport.width : 1;
      const scaledViewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.marginBottom = '8px';
      modal.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;
    }
  } catch (err) {
    console.error('PDF error', err);
    modal.remove();
    window.open(url, '_blank');
  }
};

// ========== PWA ==========
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; });
window.app.showInstallPrompt = function() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
  } else {
    alert('Приложение уже установлено или браузер не поддерживает установку');
  }
};
window.app.updateOfflineStatus = function(ready) {
  const el = document.getElementById('offlineStatus');
  if (!el) return;
  el.textContent = ready ? '✅ Доступно offline' : '⬇️ Загрузка ресурсов...';
};
window.app.initServiceWorker = function() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    if (reg.installing) {
      const overlay = document.getElementById('cacheProgressOverlay');
      const bar = document.getElementById('cacheProgressBar');
      const text = document.getElementById('cacheProgressText');
      if (overlay) overlay.style.display = 'flex';
      const channel = new BroadcastChannel('sw-progress');
      channel.onmessage = (event) => {
        if (event.data.type === 'CACHE_PROGRESS') {
          const pct = Math.round(event.data.progress * 100);
          if (bar) bar.style.width = pct + '%';
          if (text) text.textContent = pct + '%';
        } else if (event.data.type === 'CACHE_DONE') {
          if (bar) bar.style.width = '100%';
          if (text) text.textContent = '100%';
          localStorage.setItem('offlineReady', 'true');
          window.app.updateOfflineStatus(true);
          setTimeout(() => { if (overlay) overlay.style.display = 'none'; channel.close(); }, 600);
        }
      };
    }
  }).catch(err => console.error('SW registration failed:', err));
};

// ========== Инициализация DOM ==========
document.addEventListener('DOMContentLoaded', () => {
  // Восстановление темы
  const savedTheme = localStorage.getItem('darkTheme');
  if (savedTheme === 'true') document.body.classList.add('dark-theme');
  window.app.updateThemeIcon();
  // Статус offline из localStorage
  if (localStorage.getItem('offlineReady') === 'true') window.app.updateOfflineStatus(true);
  // Статус сети в футере
  const updateNetworkStatus = () => {
    const el = document.getElementById('menuNetworkStatus');
    if (!el) return;
    if (navigator.onLine) {
      el.textContent = '● Онлайн';
      el.style.color = 'rgba(255,255,255,0.6)';
    } else {
      el.textContent = '● Офлайн';
      el.style.color = 'rgba(255,255,255,0.4)';
    }
  };
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
  // Навигация по меню
  document.querySelectorAll('.menu-item[data-nav]').forEach(item => {
    const nav = item.dataset.nav;
    item.addEventListener('click', () => window.app.navigateTo(nav));
  });
  document.querySelectorAll('.menu-item[data-placeholder]').forEach(item => {
    item.addEventListener('click', () => { alert('Раздел в разработке'); window.app.closeMenu(); });
  });
  document.getElementById('themeToggle')?.addEventListener('click', () => { window.app.toggleTheme(); window.app.closeMenu(); });
  document.getElementById('installApp')?.addEventListener('click', () => { window.app.showInstallPrompt(); window.app.closeMenu(); });
  // Инициализация иконок меню
  const iconMap = {
    phonebook: window.ICONS.phone,
    checklists: window.ICONS.checklist,
    krs: window.ICONS['file-text'],
    flightprocedures: window.ICONS.plane,
    links: window.ICONS.link,
    faq: window.ICONS['help-circle']
  };
  document.querySelectorAll('.menu-item[data-nav], .menu-item[data-placeholder]').forEach(item => {
    const icon = item.querySelector('.menu-icon');
    if (icon) icon.innerHTML = iconMap[item.dataset.nav || item.dataset.placeholder] || '';
  });
  const installIcon = document.querySelector('#installApp .menu-icon');
  if (installIcon) installIcon.innerHTML = window.ICONS.smartphone;
  // Показать главный экран по умолчанию
  window.app.navigateTo('main');
});