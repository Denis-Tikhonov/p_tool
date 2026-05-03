/* ==================== GLOBAL APP ==================== */
window.app = {
  currentScreen: 'main',

  showSpinner(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="spinner">
        <div class="spinner-circle"></div>
      </div>
    `;
  },

  hideSpinner(container, htmlContent) {
    if (!container) return;
    container.innerHTML = htmlContent;
  },

  showError(container, text) {
    if (!container) return;
    container.innerHTML = `
      <div class="error-message">
        <p>${text}</p>
      </div>
    `;
  },

  navigateTo(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenName + 'Screen');
    if (target) {
      target.classList.add('active');
    }

    this.currentScreen = screenName;
    renderHeader(screenName);

    if (screenName === 'phonebook' && typeof initPhonebook === 'function') {
      initPhonebook();
    }
    if (screenName === 'checklists' && typeof initChecklists === 'function') {
      initChecklists();
    }
    if (screenName === 'krs' && typeof initKRS === 'function') {
      initKRS();
    }
  }
};

/* ==================== HEADER ==================== */
function renderHeader(screenName) {
  const left = document.getElementById('headerLeft');
  const center = document.getElementById('headerCenter');
  const right = document.getElementById('headerRight');

  if (!left || !center || !right) return;

  if (screenName === 'main') {
    const isMenuOpen = document.getElementById('sideMenu').classList.contains('open');
    left.innerHTML = `<button class="header-btn" onclick="toggleSideMenu()" aria-label="Menu">${isMenuOpen ? '✕' : '☰'}</button>`;
    center.textContent = "Pilot's tool";
    right.innerHTML = '';
    return;
  }

  if (screenName === 'phonebook') {
    if (typeof renderPhonebookHeader === 'function') {
      renderPhonebookHeader(left, center, right);
    }
    return;
  }

  if (screenName === 'checklists') {
    if (typeof renderChecklistsHeader === 'function') {
      renderChecklistsHeader(left, center, right);
    }
    return;
  }

  if (screenName === 'krs') {
    if (typeof renderKRSHeader === 'function') {
      renderKRSHeader(left, center, right);
    }
    return;
  }
}

/* ==================== SIDE MENU ==================== */
function toggleSideMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  const isOpen = menu.classList.contains('open');

  if (isOpen) {
    closeSideMenu();
  } else {
    menu.classList.add('open');
    overlay.classList.add('open');
    if (app.currentScreen === 'main') {
      renderHeader('main');
    }
  }
}

function closeSideMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  menu.classList.remove('open');
  overlay.classList.remove('open');
  if (app.currentScreen === 'main') {
    renderHeader('main');
  }
}

/* ==================== PWA INSTALL PROMPT ==================== */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
});

function showInstallPrompt() {
  if (deferredInstallPrompt !== null) {
    deferredInstallPrompt.prompt();
  } else {
    alert('Приложение уже установлено или браузер не поддерживает установку');
  }
}

/* ==================== OVERLAY CLICK ==================== */
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('sideMenuOverlay');
  if (e.target === overlay && overlay.classList.contains('open')) {
    closeSideMenu();
  }
});

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
  renderHeader('main');
});
