(function() {
  let cachedData = null;
  let activeTab = 'safa';
  let openBlocks = {};

  window.initChecklists = function() {
    const container = document.getElementById('checklistsContainer');
    if (!container) {
      console.error('Контейнер checklistsContainer не найден!');
      return;
    }

    renderChecklistsHeader();
    setupCommitsPanel();

    if (cachedData) {
      renderChecklists();
      return;
    }

    window.app.showSkeleton(container, 'blocks');

    fetch('modules/checklist.json')
      .then(response => response.json())
      .then(data => {
        cachedData = data;
        renderChecklists();
      })
      .catch(() => {
        window.app.showError(container, 'Не удалось загрузить чеклисты');
      });
  };

  function renderChecklistsHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    header.innerHTML = `
      <button class="header-btn" onclick="window.app.navigateTo('main')">
        ${window.ICONS.back}
      </button>
      <div class="tab-group">
        <button class="tab-btn ${activeTab === 'safa' ? 'active' : ''}" onclick="window.switchChecklistTab('safa')">
          SAFA Инспекция
        </button>
        <button class="tab-btn ${activeTab === 'customs' ? 'active' : ''}" onclick="window.switchChecklistTab('customs')">
          Customs чеклисты
        </button>
      </div>
      <button class="header-btn" onclick="window.openCommitsPanel()">+</button>
    `;
  }

  window.switchChecklistTab = function(tab) {
    activeTab = tab;
    renderChecklistsHeader();
    renderChecklists();
  };

  function setupCommitsPanel() {
    const overlay = document.getElementById('commitsOverlay');
    const panel = document.getElementById('commitsPanel');
    const closeBtn = document.getElementById('commitsPanelClose');

    if (overlay) {
      overlay.addEventListener('click', closeCommitsPanel);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCommitsPanel);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCommitsPanel();
    });
  }

  window.openCommitsPanel = function() {
    const overlay = document.getElementById('commitsOverlay');
    const panel = document.getElementById('commitsPanel');
    if (overlay) overlay.classList.add('open');
    if (panel) panel.classList.add('open');
  };

  function closeCommitsPanel() {
    const overlay = document.getElementById('commitsOverlay');
    const panel = document.getElementById('commitsPanel');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
  }

  function renderChecklists() {
    const container = document.getElementById('checklistsContainer');
    if (!container || !cachedData) return;

    const blocks = cachedData[activeTab] || [];
    
    if (blocks.length === 0) {
      window.app.hideSpinner(container, '<p class="empty-message">Нет заданий</p>');
      return;
    }

    let html = '';
    blocks.forEach(block => {
      const allChecked = block.items.every(item => {
        const key = `checklist_${block.id}_${item.id}`;
        return sessionStorage.getItem(key) === 'true';
      });

      const badgeClass = allChecked ? 'ok' : 'no';
      const badgeText = allChecked ? 'OK' : 'NO';
      const isOpen = openBlocks[block.id] || false;

      html += `
        <div class="block-header" onclick="window.toggleChecklistBlock('${block.id}')">
          <div class="block-badge ${badgeClass}" id="badge_${block.id}">${badgeText}</div>
          <div class="block-title">${block.title}</div>
          <div class="block-chevron ${isOpen ? 'rotated' : ''}" id="chevron_${block.id}">
            ${window.ICONS.chevronDown}
          </div>
        </div>
        <div class="block-content ${isOpen ? 'open' : ''}" id="content_${block.id}">
          ${renderChecklistItems(block)}
        </div>
      `;
    });

    window.app.hideSpinner(container, html);

    blocks.forEach(block => {
      block.items.forEach(item => {
        const checkbox = document.getElementById(`checkbox_${block.id}_${item.id}`);
        if (checkbox) {
          const key = `checklist_${block.id}_${item.id}`;
          checkbox.checked = sessionStorage.getItem(key) === 'true';
          checkbox.addEventListener('change', () => {
            sessionStorage.setItem(key, checkbox.checked);
            updateBlockBadge(block.id, block.items);
          });
        }
      });
    });
  }

  function renderChecklistItems(block) {
    let html = '';
    block.items.forEach(item => {
      html += `
        <div class="checklist-item">
          <input type="checkbox" id="checkbox_${block.id}_${item.id}">
          <label for="checkbox_${block.id}_${item.id}">${item.label}</label>
        </div>
      `;
    });
    return html;
  }

  window.toggleChecklistBlock = function(blockId) {
    openBlocks[blockId] = !openBlocks[blockId];
    const content = document.getElementById(`content_${blockId}`);
    const chevron = document.getElementById(`chevron_${blockId}`);
    if (content) {
      content.classList.toggle('open');
    }
    if (chevron) {
      chevron.classList.toggle('rotated');
    }
  };

  function updateBlockBadge(blockId, items) {
    const allChecked = items.every(item => {
      const key = `checklist_${blockId}_${item.id}`;
      return sessionStorage.getItem(key) === 'true';
    });
    const badge = document.getElementById(`badge_${blockId}`);
    if (badge) {
      badge.className = `block-badge ${allChecked ? 'ok' : 'no'}`;
      badge.textContent = allChecked ? 'OK' : 'NO';
    }
  }
})();