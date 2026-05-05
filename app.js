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
      const header = document.getElementById('header');
      if (!header) return;
      if (screenName === 'main') {
        header.innerHTML = `
          <button class="header-btn" onclick="app.toggleMenu()" id="menuToggleBtn">
            ${menuOpen ? window.ICONS.close : window.ICONS.menu}
          </button>
          <div class="header-title">Pilot's tool</div>
          <div style="width:44px;"></div>
        `;
      }
    },

    toggleMenu: function() {
      menuOpen = !menuOpen;
      const menu = document.getElementById('sideMenu');
      const overlay = document.getElementById('menuOverlay');
      const btn = document.getElementById('menuToggleBtn');
      if (menuOpen) {
        menu.classList.add('open');
        overlay.classList.add('open');
        if (btn) btn.innerHTML = window.ICONS.close;
      } else {
        menu.classList.remove('open');
        overlay.classList.remove('open');
        if (btn) btn.innerHTML = window.ICONS.menu;
      }
    },

    closeMenu: function() {
      if (menuOpen) {
        menuOpen = false;
        const menu = document.getElementById('sideMenu');
        const overlay = document.getElementById('menuOverlay');
        const btn = document.getElementById('menuToggleBtn');
        menu.classList.remove('open');
        overlay.classList.remove('open');
        if (btn) btn.innerHTML = window.ICONS.menu;
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
      const themeToggle = document.getElementById('themeToggle');
      const isDark = body.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (themeToggle) {
        themeToggle.textContent = isDark ? '☀️ Светлая тема' : '🌙 Темная тема';
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
    }
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
  });

  document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
    }

    const overlay = document.getElementById('menuOverlay');
    if (overlay) {
      overlay.addEventListener('click', function() {
        app.closeMenu();
      });
    }

    app.renderHeader('main');
  });
})();