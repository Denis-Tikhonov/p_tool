(function() {
  let currentScreen = 'main';
  let menuOpen = false;
  let deferredInstallPrompt = null;

  window.app = {
    navigateTo: function(screenName) {
      const screens = document.querySelectorAll('.screen');
      screens.forEach(s => s.classList.remove('active'));
      const targetScreen = document.getElementById(screenName + 'Screen');
      if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenName;
        this.closeMenu();
        this.renderHeader(screenName);
        if (screenName === 'phonebook' && window.initPhonebook) {
          window.initPhonebook();
        } else if (screenName === 'checklists' && window.initChecklists) {
          window.initChecklists();
        } else if (screenName === 'krs' && window.initKRS) {
          window.initKRS();
        }
      }
    },

    renderHeader: function(screenName) {
      const headerLeft = document.getElementById('headerLeft');
      const headerCenter = document.getElementById('headerCenter');
      const headerRight = document.getElementById('headerRight');
      
      if (!headerLeft || !headerCenter || !headerRight) return;

      if (screenName === 'main') {
        headerLeft.innerHTML = window.getIcon(menuOpen ? 'close' : 'menu');
        headerLeft.onclick = () => this.toggleMenu();
        headerCenter.innerHTML = '<div class="header-title">Pilot\'s tool</div>';
        headerRight.innerHTML = '';
      }
    },

    toggleMenu: function() {
      menuOpen = !menuOpen;
      const menu = document.getElementById('sideMenu');
      const overlay = document.getElementById('menuOverlay');
      const btn = document.getElementById('headerLeft');
      
      if (menuOpen) {
        menu.classList.add('open');
        overlay.classList.add('open');
        if (btn) btn.innerHTML = window.getIcon('close');
      } else {
        menu.classList.remove('open');
        overlay.classList.remove('open');
        if (btn) btn.innerHTML = window.getIcon('menu');
      }
    },

    closeMenu: function() {
      if (menuOpen) {
        menuOpen = false;
        const menu = document.getElementById('sideMenu');
        const overlay = document.getElementById('menuOverlay');
        const btn = document.getElementById('headerLeft');
        
        menu.classList.remove('open');
        overlay.classList.remove('open');
        if (btn && currentScreen === 'main') {
          btn.innerHTML = window.getIcon('menu');
        }
      }
    },

    showSkeleton: function(container, type) {
      if (!container) return;
      let html = '';
      
      if (type === 'list') {
        for (let i = 0; i < 6; i++) {
          html += `
            <div class="skeleton-item">
              <div class="skeleton skeleton-avatar"></div>
              <div class="skeleton-lines">
                <div class="skeleton skeleton-line-long"></div>
                <div class="skeleton skeleton-line-short"></div>
              </div>
            </div>
          `;
        }
      } else if (type === 'blocks') {
        for (let i = 0; i < 4; i++) {
          html += `
            <div class="skeleton-block">
              <div class="skeleton skeleton-line-long"></div>
            </div>
          `;
        }
      }
      
      container.innerHTML = html;
    },

    hideSpinner: function(container, htmlContent) {
      if (!container) return;
      container.innerHTML = htmlContent;
    },

    showError: function(container, text) {
      if (!container) return;
      container.innerHTML = `<p class="error-message">${text}</p>`;
    },

    toggleTheme: function() {
      const body = document.body;
      const themeIcon = document.getElementById('themeIcon');
      const themeLabel = document.getElementById('themeLabel');
      const isDark = body.classList.toggle('dark-theme');
      
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      
      if (themeIcon) {
        themeIcon.innerHTML = window.getIcon(isDark ? 'sun' : 'moon');
      }
      if (themeLabel) {
        themeLabel.textContent = isDark ? 'Светлая тема' : 'Ночной режим';
      }
    },

    showInstallPrompt: function() {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(() => {
          deferredInstallPrompt = null;
        });
      } else {
        alert('Приложение уже установлено или браузер не поддерживает установку');
      }
    },

    initServiceWorker: function() {
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
            }
            if (event.data.type === 'CACHE_DONE') {
              if (bar) bar.style.width = '100%';
              if (text) text.textContent = '100%';
              localStorage.setItem('offlineReady', 'true');
              updateOfflineStatus(true);
              setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
                channel.close();
              }, 600);
            }
          };
        }
      }).catch(err => console.error('SW registration failed:', err));
    }
  };

  function updateOfflineStatus(ready) {
    const el = document.getElementById('offlineStatus');
    if (!el) return;
    el.textContent = ready ? '✅ Доступно offline' : '⬇️ Загрузка ресурсов...';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
  });

  document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('themeIcon');
    const themeLabel = document.getElementById('themeLabel');
    
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      if (themeIcon) themeIcon.innerHTML = window.getIcon('sun');
      if (themeLabel) themeLabel.textContent = 'Светлая тема';
    } else {
      if (themeIcon) themeIcon.innerHTML = window.getIcon('moon');
    }

    if (localStorage.getItem('offlineReady') === 'true') {
      updateOfflineStatus(true);
    }

    const overlay = document.getElementById('menuOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => app.closeMenu());
    }

    const installIcon = document.getElementById('installIcon');
    const phoneIcon = document.getElementById('phoneIcon');
    const checklistIcon = document.getElementById('checklistIcon');
    const krsIcon = document.getElementById('krsIcon');
    const linkIcon = document.getElementById('linkIcon');
    const helpIcon = document.getElementById('helpIcon');
    
    if (installIcon) installIcon.innerHTML = window.getIcon('smartphone');
    if (phoneIcon) phoneIcon.innerHTML = window.getIcon('phone');
    if (checklistIcon) checklistIcon.innerHTML = window.getIcon('checklist');
    if (krsIcon) krsIcon.innerHTML = window.getIcon('file-text');
    if (linkIcon) linkIcon.innerHTML = window.getIcon('link');
    if (helpIcon) helpIcon.innerHTML = window.getIcon('help-circle');

    app.renderHeader('main');
  });
})();